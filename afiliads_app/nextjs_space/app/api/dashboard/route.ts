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

    const campaigns = await prisma.campaign.findMany({
      where: { userId },
      include: { dailyLogs: true },
    });

    const totalCampaigns = campaigns?.length ?? 0;
    const byStatus: Record<string, number> = {};
    const byPlatform: Record<string, { count: number; spend: number; revenue: number }> = {};
    let totalSpend = 0;
    let totalRevenue = 0;
    let totalClicks = 0;
    let totalConversions = 0;
    const alerts: Array<{ type: string; message: string; campaignId: string; campaignName: string }> = [];

    for (const c of campaigns ?? []) {
      byStatus[c?.status ?? 'UNKNOWN'] = (byStatus[c?.status ?? 'UNKNOWN'] ?? 0) + 1;
      if (!byPlatform[c?.platform ?? 'Unknown']) byPlatform[c?.platform ?? 'Unknown'] = { count: 0, spend: 0, revenue: 0 };
      byPlatform[c?.platform ?? 'Unknown'].count++;

      let cSpend = 0, cRevenue = 0, cClicks = 0, cConversions = 0;
      for (const log of c?.dailyLogs ?? []) {
        cSpend += log?.spend ?? 0;
        cRevenue += log?.revenue ?? 0;
        cClicks += log?.clicks ?? 0;
        cConversions += log?.conversions ?? 0;
      }
      totalSpend += cSpend;
      totalRevenue += cRevenue;
      totalClicks += cClicks;
      totalConversions += cConversions;
      byPlatform[c?.platform ?? 'Unknown'].spend += cSpend;
      byPlatform[c?.platform ?? 'Unknown'].revenue += cRevenue;

      // Alerts
      if (cClicks > 0) {
        const epc = cRevenue / cClicks;
        const cpc = cSpend / cClicks;
        if (cpc > 0 && epc / cpc < 1.0 && c?.status !== 'KILL') {
          alerts.push({ type: 'warning', message: `EPC/CPC = ${(epc / cpc)?.toFixed?.(2) ?? '0'} (abaixo de 1.0)`, campaignId: c?.id, campaignName: c?.name ?? '' });
        }
      }
      if (cSpend > 0 && cSpend >= (c?.budgetTest ?? 50) * 0.8 && c?.status === 'EM_TESTE') {
        alerts.push({ type: 'budget', message: `Próximo do budget de teste ($${cSpend?.toFixed?.(0) ?? '0'}/$${c?.budgetTest?.toFixed?.(0) ?? '50'})`, campaignId: c?.id, campaignName: c?.name ?? '' });
      }
    }

    const epcMedio = totalClicks > 0 ? totalRevenue / totalClicks : 0;
    const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0;

    // Recent daily logs for chart
    const recentLogs = await prisma.dailyLog.findMany({
      where: { userId },
      orderBy: { logDate: 'desc' },
      take: 14,
      include: { campaign: { select: { name: true } } },
    });

    // Offers count
    const offersCount = await prisma.offer.count({ where: { userId } });
    // Test results summary
    const testResults = await prisma.testResult.findMany({ where: { userId } });
    const testsScale = testResults?.filter(t => t.result === 'SCALE')?.length ?? 0;
    const testsKill = testResults?.filter(t => t.result === 'KILL')?.length ?? 0;

    return NextResponse.json({
      totalCampaigns,
      totalSpend,
      totalRevenue,
      roas,
      epcMedio,
      totalClicks,
      totalConversions,
      byStatus,
      byPlatform,
      alerts: alerts?.slice?.(0, 10) ?? [],
      recentLogs: (recentLogs ?? []).reverse().map(l => ({
        date: l?.logDate,
        campaign: l?.campaign?.name ?? '',
        spend: l?.spend ?? 0,
        revenue: l?.revenue ?? 0,
        clicks: l?.clicks ?? 0,
        conversions: l?.conversions ?? 0,
        impressions: l?.impressions ?? 0,
      })),
      offersCount,
      testsScale,
      testsKill,
      profit: totalRevenue - totalSpend,
    });
  } catch (err: any) {
    console.error('Dashboard error:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
