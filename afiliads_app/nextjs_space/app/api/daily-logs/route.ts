export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { runCampaignLoop } from '@/lib/loop-engine';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const userId = (session.user as any)?.id;
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId');
    const where: any = { userId };
    if (campaignId) where.campaignId = campaignId;
    const logs = await prisma.dailyLog.findMany({ where, orderBy: { logDate: 'desc' }, take: 100 });
    return NextResponse.json(logs ?? []);
  } catch (err: any) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    let userId: string | null = null;
    const mcpToken = request.headers.get('x-afiliads-token');
    if (mcpToken && process.env.AFILIADS_MCP_TOKEN && mcpToken === process.env.AFILIADS_MCP_TOKEN) {
      const email = process.env.AFILIADS_MCP_USER_EMAIL;
      const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
      userId = user?.id ?? null;
    } else {
      const session = await getServerSession(authOptions);
      if (session?.user) userId = (session.user as any)?.id;
    }
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const uid: string = userId;
    const body = await request.json();

    // Preenche rede/vertical/geo/canal/funil a partir da campanha quando o form não envia
    const parentCampaign = await prisma.campaign.findFirst({
      where: { id: body?.campaignId, userId: uid },
      select: { platform: true, vertical: true, geo: true, channel: true, funnel: true, name: true, loopEnabled: true },
    });
    if (!parentCampaign) return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 });
    body.network = body?.network ?? parentCampaign.platform;
    body.vertical = body?.vertical ?? parentCampaign.vertical;
    body.geo = body?.geo ?? parentCampaign.geo;
    body.channel = body?.channel ?? parentCampaign.channel;
    body.funnel = body?.funnel ?? parentCampaign.funnel;
    body.offerName = body?.offerName ?? parentCampaign.name;
    const logDate = new Date(body?.logDate ?? new Date());
    logDate.setHours(0, 0, 0, 0);
    const log = await prisma.dailyLog.upsert({
      where: { campaignId_logDate: { campaignId: body?.campaignId, logDate } },
      update: {
        impressions: body?.impressions ?? 0,
        spend: body?.spend ?? 0,
        clicks: body?.clicks ?? 0,
        hops: body?.hops ?? 0,
        conversions: body?.conversions ?? 0,
        revenue: body?.revenue ?? 0,
        refunds: body?.refunds ?? 0,
        network: body?.network ?? null,
        offerName: body?.offerName ?? null,
        vertical: body?.vertical ?? null,
        geo: body?.geo ?? null,
        channel: body?.channel ?? null,
        funnel: body?.funnel ?? null,
        decision: body?.decision ?? null,
        notes: body?.notes ?? null,
      },
      create: {
        campaignId: body?.campaignId,
        userId: uid,
        logDate,
        impressions: body?.impressions ?? 0,
        spend: body?.spend ?? 0,
        clicks: body?.clicks ?? 0,
        hops: body?.hops ?? 0,
        conversions: body?.conversions ?? 0,
        revenue: body?.revenue ?? 0,
        refunds: body?.refunds ?? 0,
        network: body?.network ?? null,
        offerName: body?.offerName ?? null,
        vertical: body?.vertical ?? null,
        geo: body?.geo ?? null,
        channel: body?.channel ?? null,
        funnel: body?.funnel ?? null,
        decision: body?.decision ?? null,
        notes: body?.notes ?? null,
      },
    });

    // Dado novo de performance dispara o loop da campanha (se habilitado), sem segurar a resposta
    if (parentCampaign.loopEnabled) {
      runCampaignLoop(uid, body.campaignId, 'daily-log')
        .then((r) => console.log(`[loop:daily-log] ${r.campaignName} → ${r.decision}`))
        .catch((e) => console.error('[loop:daily-log] erro:', e?.message));
    }

    return NextResponse.json(log, { status: 201 });
  } catch (err: any) {
    console.error('POST daily-log error:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
