import { prisma } from '../lib/prisma';
(async () => {
  const email = process.env.DEMO_EMAIL;
  const user = email
    ? await prisma.user.findUniqueOrThrow({ where: { email } })
    : await prisma.user.findFirstOrThrow();
  const c = await prisma.campaign.findFirstOrThrow({ where: { userId: user.id, name: 'DEMO_PAINEL_LANCAMENTO' } });
  await prisma.channelLaunch.deleteMany({ where: { campaignId: c.id } });
  await prisma.campaign.update({
    where: { id: c.id },
    data: { googleCampaignId: null, googleAdGroupId: null, metaCampaignId: null, metaAdSetId: null, metaAdId: null, launchCheckpoint: 'DRAFT' },
  });
  console.log('demo resetada:', c.id);
})().finally(() => prisma.$disconnect());
