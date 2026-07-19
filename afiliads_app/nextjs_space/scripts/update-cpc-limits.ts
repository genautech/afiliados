import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Updating campaign CPC limits...');
  
  const user = await prisma.user.findUnique({
    where: { email: 'john@doe.com' },
  });
  
  if (!user) {
    console.error('User john@doe.com not found.');
    process.exit(1);
  }
  
  const userId = user.id;
  
  const updated = await prisma.campaign.updateMany({
    where: {
      userId,
      platform: 'ClickBank',
      vertical: 'Weight Loss',
    },
    data: {
      cpcMax: 10.0,
      cpcScale: 8.0,
    },
  });
  
  console.log(`Updated CPC limits for ${updated.count} ClickBank Weight Loss campaign(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
