export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const userId = (session.user as any)?.id;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const platform = searchParams.get('platform');
    const where: any = { userId };
    if (status) where.status = status;
    if (platform) where.platform = platform;
    const campaigns = await prisma.campaign.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        dailyLogs: { orderBy: { logDate: 'desc' }, take: 30 },
        decisions: { orderBy: { createdAt: 'desc' }, take: 5 },
        _count: { select: { keywords: true, checklists: true } },
      },
    });
    return NextResponse.json(campaigns ?? []);
  } catch (err: any) {
    console.error('GET campaigns error:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const userId = (session.user as any)?.id;
    const body = await request.json();
    const campaign = await prisma.campaign.create({
      data: {
        userId,
        name: body?.name ?? 'Nova Campanha',
        platform: body?.platform ?? 'ClickBank',
        vertical: body?.vertical ?? 'Weight Loss',
        geo: body?.geo ?? 'US',
        channel: body?.channel ?? 'SEARCH',
        funnel: body?.funnel ?? 'BRIDGE',
        status: 'EM_TESTE',
        offerUrl: body?.offerUrl ?? null,
        commission: body?.commission ?? 0,
        refundPct: body?.refundPct ?? 0,
        aov: body?.aov ?? 0,
        cvrExpected: body?.cvrExpected ?? 1.0,
        commissionNet: body?.commissionNet ?? 0,
        epcBreakeven: body?.epcBreakeven ?? 0,
        cpcMax: body?.cpcMax ?? 0,
        cpcScale: body?.cpcScale ?? 0,
        presellUrl: body?.presellUrl ?? null,
        presellHtml: body?.presellHtml ?? null,
        flowpageUrl: body?.flowpageUrl ?? null,
        hostingerDomain: body?.hostingerDomain ?? null,
        postbackUrl: body?.postbackUrl ?? null,
        clickidToken: body?.clickidToken ?? null,
        campaignNameGenerated: body?.campaignNameGenerated ?? null,
        googleCampaignName: body?.googleCampaignName ?? null,
        utmCampaign: body?.utmCampaign ?? null,
        utmString: body?.utmString ?? null,
        loopEnabled: body?.loopEnabled ?? false,
        loopInterval: body?.loopInterval ?? '24h',
        loopAgents: body?.loopAgents ?? 'ads,compliance',
        budgetTest: body?.budgetTest ?? 50,
        budgetDaily: body?.budgetDaily ?? 0,
        testDuration: body?.testDuration ?? '72h',
        wizardStep: 1,
      },
    });
    return NextResponse.json(campaign, { status: 201 });
  } catch (err: any) {
    console.error('POST campaigns error:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
