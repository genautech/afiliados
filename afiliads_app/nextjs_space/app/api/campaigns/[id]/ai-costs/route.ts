export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const campaign = await prisma.campaign.findFirst({
      where: { id: params.id, userId },
      select: { id: true },
    });
    if (!campaign) return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 });

    const [logs, aggregate] = await Promise.all([
      prisma.aICostLog.findMany({
        where: { campaignId: campaign.id },
        orderBy: { createdAt: 'desc' },
        take: 500,
        select: {
          id: true, provider: true, model: true, promptTokens: true,
          completionTokens: true, costUsd: true, purpose: true, createdAt: true,
        },
      }),
      prisma.aICostLog.aggregate({ where: { campaignId: campaign.id }, _sum: { costUsd: true } }),
    ]);
    return NextResponse.json({ logs, totalCostUsd: aggregate._sum.costUsd ?? 0 });
  } catch (error) {
    console.error('GET campaign ai-costs error:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
