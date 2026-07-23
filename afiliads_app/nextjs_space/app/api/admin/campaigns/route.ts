export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin';

export async function GET(_request: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: 'Acesso restrito ao admin' }, { status: 403 });

    const campaigns = await prisma.campaign.findMany({
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true, name: true, platform: true, vertical: true, geo: true, channel: true,
        status: true, budgetDaily: true, launchedAt: true, createdAt: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });

    const spendAgg = await prisma.dailyLog.groupBy({
      by: ['campaignId'],
      _sum: { spend: true, revenue: true, clicks: true, conversions: true },
    });
    const aggMap = new Map(spendAgg.map((a) => [a.campaignId, a._sum]));

    const result = campaigns.map((c) => {
      const agg = aggMap.get(c.id);
      const spend = agg?.spend ?? 0;
      const revenue = agg?.revenue ?? 0;
      return {
        id: c.id,
        name: c.name,
        platform: c.platform,
        vertical: c.vertical,
        geo: c.geo,
        channel: c.channel,
        status: c.status,
        budgetDaily: c.budgetDaily,
        launchedAt: c.launchedAt,
        createdAt: c.createdAt,
        user: c.user,
        spend,
        revenue,
        clicks: agg?.clicks ?? 0,
        conversions: agg?.conversions ?? 0,
        roiPct: spend > 0 ? ((revenue - spend) / spend) * 100 : null,
      };
    });

    return NextResponse.json({ campaigns: result });
  } catch (err) {
    console.error('GET admin/campaigns error:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
