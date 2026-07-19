import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding integrations...');
  
  const user = await prisma.user.findUnique({
    where: { email: 'john@doe.com' },
  });
  
  if (!user) {
    console.error('User john@doe.com not found. Seed the database first.');
    process.exit(1);
  }
  
  const userId = user.id;
  
  const integrations = [
    // Google Ads
    { serviceName: 'google_ads', fieldName: 'customer_id', fieldValue: '123-456-7890' },
    { serviceName: 'google_ads', fieldName: 'developer_token', fieldValue: 'DEV_TOKEN_MOCK_XYZ_987' },
    { serviceName: 'google_ads', fieldName: 'client_id', fieldValue: 'CLIENT_ID_MOCK_XYZ_123.apps.googleusercontent.com' },
    { serviceName: 'google_ads', fieldName: 'client_secret', fieldValue: 'CLIENT_SECRET_MOCK_XYZ_456' },
    { serviceName: 'google_ads', fieldName: 'refresh_token', fieldValue: 'REFRESH_TOKEN_MOCK_XYZ_789' },
    
    // ClickBank
    { serviceName: 'clickbank', fieldName: 'api_key', fieldValue: 'CB_API_KEY_MOCK_XYZ_000' },
    { serviceName: 'clickbank', fieldName: 'account_nickname', fieldValue: 'john_affiliate' },
    
    // MaxWeb
    { serviceName: 'maxweb', fieldName: 'api_key', fieldValue: 'MW_API_KEY_MOCK_XYZ_111' },
    { serviceName: 'maxweb', fieldName: 'postback_base_url', fieldValue: 'https://track.maxweb.com/postback?clickid={clickid}' },
    
    // BuyGoods
    { serviceName: 'buygoods', fieldName: 'affiliate_id', fieldValue: 'BG_AFF_ID_MOCK_123' },
    
    // Hotmart
    { serviceName: 'hotmart', fieldName: 'token', fieldValue: 'HM_TOKEN_MOCK_XYZ_222' },
  ];
  
  for (const item of integrations) {
    await prisma.integration.upsert({
      where: {
        userId_serviceName_fieldName: {
          userId,
          serviceName: item.serviceName,
          fieldName: item.fieldName,
        },
      },
      update: { fieldValue: item.fieldValue },
      create: { userId, ...item },
    });
  }
  
  console.log('Integrations seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
