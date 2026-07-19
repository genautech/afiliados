import { fetchGoogleCampaign } from '../lib/google-ads';
import { prisma } from '../lib/prisma';

async function main() {
  const campaignId = 'cmrqprg0j0003360rvvrks4ot';
  const user = await prisma.user.findFirst({ where: { email: 'genaujunior@gmail.com' } });
  if (!user) {
    console.error('User not found');
    return;
  }
  const userId = user.id;
  console.log('User ID:', userId);

  const campaign = await prisma.campaign.findFirst({ where: { id: campaignId } });
  if (!campaign) {
    console.error('Campaign not found');
    return;
  }
  console.log('Before Sync:', {
    name: campaign.name,
    budgetDaily: campaign.budgetDaily,
    bidStrategy: campaign.bidStrategy,
    status: campaign.status,
  });

  const gadsName = campaign.googleCampaignName || campaign.name;
  const gadsData = await fetchGoogleCampaign(userId, gadsName);
  console.log('Gads Data fetched:', gadsData);

  if (gadsData) {
    let localStatus = campaign.status;
    let loopEnabled = campaign.loopEnabled;

    if (gadsData.status === 'PAUSED') {
      localStatus = 'PAUSADO';
      loopEnabled = false;
    } else if (gadsData.status === 'ENABLED' && campaign.status === 'PAUSADO') {
      localStatus = 'EM_TESTE';
    }

    const updated = await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        googleCampaignName: gadsData.name,
        budgetDaily: gadsData.budgetDaily,
        bidStrategy: gadsData.bidStrategy,
        status: localStatus,
        loopEnabled,
      },
    });

    console.log('After Sync:', {
      name: updated.name,
      budgetDaily: updated.budgetDaily,
      bidStrategy: updated.bidStrategy,
      status: updated.status,
    });
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
