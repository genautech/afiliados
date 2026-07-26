export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const decisions = await prisma.campaignDecision.findMany({ where: { campaignId: params?.id }, orderBy: { createdAt: 'desc' } });
    return NextResponse.json(decisions ?? []);
  } catch (err: any) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const userId = (session.user as any)?.id;
    const body = await request.json();
    const decision = await prisma.campaignDecision.create({
      data: {
        campaignId: params?.id,
        userId,
        decision: body?.decision ?? 'OTIMIZAR',
        rationale: body?.rationale ?? null,
      },
    });
    // Update campaign status based on decision
    const statusMap: Record<string, string> = { KILL: 'KILL', OTIMIZAR: 'OTIMIZANDO', SCALE: 'SCALE' };
    const newStatus = statusMap?.[body?.decision] ?? 'EM_TESTE';
    const campaign = await prisma.campaign.update({ where: { id: params?.id }, data: { status: newStatus } });

    // Confirmar SCALE aplica o budget de scale (definido no Wizard) como orçamento diário
    // real no Google Ads — é o único ponto do sistema que aumenta gasto de verdade, e só
    // acontece por clique humano aqui (o loop automático nunca faz isso sozinho).
    let gadsLog: string | null = null;
    if (body?.decision === 'SCALE' && campaign.budgetScale > 0 && campaign.googleCampaignId) {
      try {
        const { mutateGoogleCampaign } = await import('@/lib/google-ads');
        const result = await mutateGoogleCampaign(userId, campaign.googleCampaignId, {
          budgetDaily: campaign.budgetScale,
          status: 'ENABLED',
        });
        gadsLog = result.log;
      } catch (e: any) {
        gadsLog = `Falha ao aplicar budget de scale no Google Ads: ${e?.message}`;
      }
    }
    return NextResponse.json({ ...decision, gadsLog }, { status: 201 });
  } catch (err: any) {
    console.error('POST decision error:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
