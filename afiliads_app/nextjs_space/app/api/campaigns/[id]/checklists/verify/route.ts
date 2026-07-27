export const dynamic = 'force-dynamic';
export const maxDuration = 30;
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { runFullChecklistVerify } from '@/lib/complianceVerifier';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const userId = (session.user as any)?.id;
    const campaignId = params?.id;

    const campaign = await prisma.campaign.findFirst({ where: { id: campaignId, userId }, include: { keywords: true } });
    if (!campaign) return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 });

    const allRows = await runFullChecklistVerify(campaign);

    return NextResponse.json({ verified: allRows.length, items: allRows });
  } catch (err: any) {
    console.error('POST checklists/verify error:', err);
    return NextResponse.json({ error: err?.message ?? 'Erro ao verificar checklist' }, { status: 500 });
  }
}
