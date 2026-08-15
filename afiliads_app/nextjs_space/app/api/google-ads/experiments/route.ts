import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { setupExperiment, toExperimentDetailDTO } from '@/lib/google-ads-experiments/orchestration';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const userId = (session.user as any).id;
    const campaignId = request.nextUrl.searchParams.get('campaignId');
    if (!campaignId) return NextResponse.json({ error: 'campaignId obrigatório' }, { status: 400 });

    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, userId },
      select: { id: true, updatedAt: true },
    });
    if (!campaign) return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 });

    const experiments = await prisma.googleAdsExperiment.findMany({
      where: { campaignId, userId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 10,
      include: {
        arms: { orderBy: { isControl: 'desc' } },
        operations: { orderBy: { startedAt: 'desc' }, take: 1 },
        metricSnapshots: { orderBy: { snapshotDate: 'desc' }, take: 1 },
      },
    });
    const activeCount = experiments.filter((experiment: { status: string }) => !['ENDED', 'ERROR'].includes(experiment.status)).length;
    return NextResponse.json({
      experiments: experiments.map(toExperimentDetailDTO),
      setupAuthorization: activeCount > 1 ? null : {
        resourceId: campaign.id,
        revision: String(campaign.updatedAt.getTime()),
      },
      ...(activeCount > 1 ? { conflict: 'Há mais de um experimento ativo para a campanha; reconciliação manual obrigatória' } : {}),
    });
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const userId = (session.user as any).id;

    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Payload JSON inválido' }, { status: 400 });

    const result = await setupExperiment({ userId, payload: body });

    return NextResponse.json(result);
  } catch (error: any) {
    const status = error.status || 500;
    const message = error.message || 'Erro interno';
    return NextResponse.json({ error: message }, { status });
  }
}
