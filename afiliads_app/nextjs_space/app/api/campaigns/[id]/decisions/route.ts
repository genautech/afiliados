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
    await prisma.campaign.update({ where: { id: params?.id }, data: { status: newStatus } });
    return NextResponse.json(decision, { status: 201 });
  } catch (err: any) {
    console.error('POST decision error:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
