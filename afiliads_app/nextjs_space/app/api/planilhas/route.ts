export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const userId = (session.user as any)?.id;

    const [offers, campaigns, dailyLogs, testResults, keywords, decisions] = await Promise.all([
      prisma.offer.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
      prisma.campaign.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { dailyLogs: true, keywords: true, checklists: true } } },
      }),
      prisma.dailyLog.findMany({
        where: { userId },
        orderBy: { logDate: 'desc' },
        include: { campaign: { select: { name: true } } },
      }),
      prisma.testResult.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
      prisma.keyword.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: { campaign: { select: { name: true } } },
      }),
      prisma.campaignDecision.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: { campaign: { select: { name: true } } },
      }),
    ]);

    // Calculate financial summary
    let totalSpend = 0, totalRevenue = 0, totalRefunds = 0;
    for (const log of dailyLogs ?? []) {
      totalSpend += log?.spend ?? 0;
      totalRevenue += log?.revenue ?? 0;
      totalRefunds += log?.refunds ?? 0;
    }

    // Weekly aggregation
    const weeklyMap: Record<string, { spend: number; revenue: number; clicks: number; conversions: number; impressions: number }> = {};
    for (const log of dailyLogs ?? []) {
      const d = new Date(log.logDate);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const wk = weekStart.toISOString().split('T')[0];
      if (!weeklyMap[wk]) weeklyMap[wk] = { spend: 0, revenue: 0, clicks: 0, conversions: 0, impressions: 0 };
      weeklyMap[wk].spend += log?.spend ?? 0;
      weeklyMap[wk].revenue += log?.revenue ?? 0;
      weeklyMap[wk].clicks += log?.clicks ?? 0;
      weeklyMap[wk].conversions += log?.conversions ?? 0;
      weeklyMap[wk].impressions += log?.impressions ?? 0;
    }
    const weeklyMetrics = Object.entries(weeklyMap).map(([week, data]) => ({
      week,
      ...data,
      roas: data.spend > 0 ? data.revenue / data.spend : 0,
      cpc: data.clicks > 0 ? data.spend / data.clicks : 0,
      epc: data.clicks > 0 ? data.revenue / data.clicks : 0,
      ctr: data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0,
    })).sort((a, b) => b.week.localeCompare(a.week));

    return NextResponse.json({
      offers: offers ?? [],
      campaigns: campaigns ?? [],
      dailyLogs: dailyLogs ?? [],
      testResults: testResults ?? [],
      keywords: keywords ?? [],
      decisions: decisions ?? [],
      financial: {
        totalSpend,
        totalRevenue,
        totalRefunds,
        netRevenue: totalRevenue - totalRefunds,
        profit: totalRevenue - totalRefunds - totalSpend,
        roas: totalSpend > 0 ? (totalRevenue - totalRefunds) / totalSpend : 0,
      },
      weeklyMetrics,
    });
  } catch (err: any) {
    console.error('GET planilhas error:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
