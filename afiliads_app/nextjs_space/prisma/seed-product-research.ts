import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const userEmail = 'test_agent@afiliads.dev'; // Novo email para o usuário de teste
  const userName = 'Test Agent';
  const userPassword = 'testpassword'; // Senha simples para o usuário de teste (hasheada abaixo)

  // Crie um novo usuário se ele não existir
  let user = await prisma.user.findUnique({ where: { email: userEmail } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: userEmail,
        name: userName,
        password: await bcrypt.hash(userPassword, 12),
        role: 'USER',
        isActive: true,
      },
    });
    console.log(`Created new user: ${user.id} (${user.email})`);
  } else {
    console.log(`User ${user.email} already exists.`);
  }

  const userId = user.id;

  const productResearch = await prisma.productResearch.create({
    data: {
      userId: userId,
      name: 'Produto de Teste para Bridge Page',
      network: 'clickbank',
      vertical: 'saúde',
      gravity: 100.0,
      avgPayout: 50.0,
      commissionPct: '50%',
      conversionRate: '2%',
      rebill: false,
      score: 80,
      riskLevel: 'baixo',
      source: 'manual',
      summary: 'Um produto de teste para validar a funcionalidade de recomendação de bridge pages.',
      hopLink: 'https://hoplink.test.com',
      vendorPageUrl: 'https://vendorpage.test.com',
    },
  });
  console.log(`Created new ProductResearch: ${productResearch.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
