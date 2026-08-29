// Seed temporário: campanha de demonstração do Painel de Lançamento em MOCK.
import { prisma } from '../lib/prisma';
import { GOLIVE_CHECKLIST } from '../lib/wizard-data';
import bcrypt from 'bcryptjs';

// DEMO_EMAIL/DEMO_PASSWORD criam um usuário local descartável para ver o painel
// pela UI sem tocar na conta real. Sem eles, usa o primeiro usuário do banco.
(async () => {
  const email = process.env.DEMO_EMAIL;
  const user = email
    ? await prisma.user.upsert({
        where: { email },
        update: {},
        create: {
          email,
          name: 'Demo Painel',
          password: await bcrypt.hash(process.env.DEMO_PASSWORD ?? 'demo1234', 10),
        },
        select: { id: true, email: true },
      })
    : await prisma.user.findFirstOrThrow({ select: { id: true, email: true } });

  // Credenciais Google em modo simulado: DEV_TOKEN_MOCK aciona isMockMode().
  for (const [fieldName, fieldValue] of Object.entries({
    customer_id: '1234567890',
    developer_token: 'DEV_TOKEN_MOCK_DEMO',
    client_id: 'CLIENT_ID_MOCK_DEMO',
    client_secret: 'x',
    refresh_token: 'x',
  })) {
    await prisma.integration.upsert({
      where: { userId_serviceName_fieldName: { userId: user.id, serviceName: 'google_ads', fieldName } },
      update: { fieldValue },
      create: { userId: user.id, serviceName: 'google_ads', fieldName, fieldValue },
    });
  }

  const existing = await prisma.campaign.findFirst({ where: { userId: user.id, name: 'DEMO_PAINEL_LANCAMENTO' } });
  if (existing) {
    await prisma.campaign.delete({ where: { id: existing.id } });
  }

  const campaign = await prisma.campaign.create({
    data: {
      userId: user.id,
      name: 'DEMO_PAINEL_LANCAMENTO',
      campaignNameGenerated: 'DEMO_PAINEL_LANCAMENTO',
      platform: 'ClickBank',
      vertical: 'Weight Loss',
      geo: 'US',
      channel: 'Search',
      funnel: 'bridge',
      status: 'EM_TESTE',
      presellUrl: 'https://exemplo-presell.com/analise',
      offerUrl: 'https://exemplo-oferta.com/hop',
      budgetDaily: 20,
      budgetTest: 60,
      wizardStep: 9,
    },
  });

  await prisma.keyword.createMany({
    data: [
      { userId: user.id, campaignId: campaign.id, keyword: 'weight loss supplement review', layer: 'A', matchType: 'phrase', isSelected: true, cpcEstimate: 1.2 },
      { userId: user.id, campaignId: campaign.id, keyword: 'best fat burner 2026', layer: 'B', matchType: 'exact', isSelected: true, cpcEstimate: 0.9 },
    ],
  });

  // Checklist do passo 9 marcado — é o que libera o botão na UI.
  for (const item of GOLIVE_CHECKLIST) {
    await prisma.campaignChecklist.create({
      data: {
        campaignId: campaign.id, step: 9, itemKey: item.key, itemLabel: item.label,
        isCritical: item.critical, isChecked: true, checkedAt: new Date(),
      },
    });
  }

  // Ledger limpo: uma claim verificada liberada em mídia paga, uma inferência só
  // em orgânico e uma proibida sem canal. O gate roda de verdade e aprova.
  await prisma.claimLedgerEntry.createMany({
    data: [
      { userId: user.id, campaignId: campaign.id, version: 1, claim: 'O produto tem garantia de 60 dias pela plataforma.',
        status: 'FATO', source: 'https://exemplo-oferta.com/termos', rewrite: 'Garantia de 60 dias oferecida pela plataforma.',
        allowedChannels: ['google-ads', 'meta-ads', 'landing'], reason: 'Consta na página de termos do vendor.' },
      { userId: user.id, campaignId: campaign.id, version: 1, claim: 'Muitos clientes relatam resultado na primeira semana.',
        status: 'INFERENCIA', source: null, rewrite: 'Alguns relatos mencionam mudança já na primeira semana.',
        allowedChannels: ['organico'], reason: 'Sem amostra medida; não pode ir para mídia paga.' },
      { userId: user.id, campaignId: campaign.id, version: 1, claim: 'Emagrece 10kg em 7 dias sem dieta.',
        status: 'PROIBIDO', source: null, rewrite: '(não usar)',
        allowedChannels: [], reason: 'Promessa de resultado garantido — bloqueada em qualquer canal.' },
    ],
  });

  console.log(JSON.stringify({ user: user.email, campaignId: campaign.id }, null, 2));
})().finally(() => prisma.$disconnect());
