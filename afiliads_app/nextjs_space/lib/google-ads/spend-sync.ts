import { prisma } from '@/lib/prisma';
import { fetchGoogleAdsDailyMetrics } from '@/lib/google-ads';

export async function syncCampaignSpend(userId: string, campaignId: string) {
  const startedAt = new Date();
  const campaign = await prisma.campaign.findFirst({ where: { id: campaignId, userId } });
  if (!campaign || !campaign.googleCampaignId) throw new Error('Campanha sem ID Google Ads autorizado');
  const batch = await fetchGoogleAdsDailyMetrics(userId, campaign.googleCampaignId, campaign.launchedAt ?? campaign.createdAt, startedAt);
  const coverage = {
    googleCampaignId: batch.googleCampaignId,
    from: batch.from, through: batch.through, timeZone: batch.timeZone,
    observedAt: batch.observedAt.toISOString(),
  };
  await prisma.$transaction(async tx => {
    // Serializa os writers desta campanha. Confere novamente ownership e identidade remota.
    const claimed = await tx.campaign.updateMany({
      where: { id: campaignId, userId, googleCampaignId: batch.googleCampaignId },
      data: { updatedAt: new Date() },
    });
    if (claimed.count !== 1) throw new Error('Campanha mudou durante a sincronização de gasto');
    const latest = await tx.campaignDecision.findFirst({
      where: { campaignId, userId, decision: 'SPEND_SYNC_COMPLETE' },
      orderBy: { createdAt: 'desc' },
    });
    if (latest && latest.createdAt > startedAt) throw new Error('Já existe sincronização mais recente; dados antigos não foram aplicados');
    for (const metric of batch.metrics) {
      const logDate = new Date(metric.date + 'T00:00:00.000Z');
      const values = { spend: metric.costMicros / 1000000, clicks: metric.clicks, impressions: metric.impressions, syncedAt: startedAt };
      await tx.dailyLog.upsert({
        where: { campaignId_logDate: { campaignId, logDate } },
        update: values,
        create: { campaignId, userId, logDate, network: 'Google Ads', ...values },
      });
    }
    await tx.campaignDecision.create({ data: {
      campaignId, userId, decision: 'SPEND_SYNC_COMPLETE',
      rationale: JSON.stringify(coverage), createdAt: startedAt,
    } });
  }, { timeout: 30000, isolationLevel: 'Serializable' });
  return { coverage, dailyLogsUpdated: batch.metrics.length };
}
