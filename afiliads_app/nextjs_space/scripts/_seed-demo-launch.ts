// Seed da campanha de demonstração do Painel de Lançamento (MOCK).
//
//   DEMO_EMAIL=... DEMO_PASSWORD=... npx tsx scripts/_seed-demo-launch.ts
//
// Cria (ou reaproveita) um usuário descartável, uma campanha completa o bastante para
// passar nos gates reais — presell publicada com HTML que satisfaz as checagens auto,
// economia calculada, keywords selecionadas — e as credenciais MOCK do Google Ads.
// Nenhum gate é afrouxado aqui: o que o app exige de verdade é o que o seed preenche.
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import {
  ANTISTRIKE_ITEMS, BRIDGE_CHECKLIST, GOOGLE_ADS_CHECKLIST,
  TRACKING_CHECKLIST_CB, GOLIVE_CHECKLIST, getChecklistVerificationType,
} from '../lib/wizard-data';

const PRESELL_URL = 'https://example.com/';

const HTML = `<!doctype html><html lang="en"><head>
<script async src="https://www.googletagmanager.com/gtag/js?id=G-DEMO12345"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
gtag('js', new Date()); gtag('config', 'G-DEMO12345');</script>
</head><body>
<h1>Weight Loss Supplement Review: an honest look</h1>
<p>Individual results may vary. This page is editorial and not medical advice.</p>
<h2>Frequently Asked Questions</h2>
<p>Nothing here is a promise of a specific outcome.</p>
<p>Disclosure: this site participates in affiliate programs and may earn a commission.</p>
<a href="/privacy-policy">Privacy Policy</a>
<a class="cta" href="https://hop.example.com/demo">Read the full review</a>
</body></html>`;

(async () => {
  const email = process.env.DEMO_EMAIL;
  const user = email
    ? await prisma.user.upsert({
        where: { email },
        update: {},
        create: {
          email,
          name: 'Demo Painel',
          password: await bcrypt.hash(process.env.DEMO_PASSWORD || 'demo1234', 10),
        },
      })
    : await prisma.user.findFirstOrThrow();

  const campaign = await prisma.campaign.upsert({
    where: { id: (await prisma.campaign.findFirst({ where: { userId: user.id, name: 'DEMO_PAINEL_LANCAMENTO' } }))?.id ?? 'nao-existe' },
    update: {},
    create: {
      userId: user.id,
      name: 'DEMO_PAINEL_LANCAMENTO',
      platform: 'ClickBank',
      vertical: 'Weight Loss',
      geo: 'US',
      channel: 'Search',
      funnel: 'Bridge',
      status: 'EM_TESTE',
      wizardStep: 9,
    },
  });

  await prisma.campaign.update({
    where: { id: campaign.id },
    data: {
      offerUrl: 'https://hop.example.com/demo',
      presellUrl: PRESELL_URL,
      budgetDaily: 20,
      budgetTest: 100,
      testDuration: '72h',
      commission: 40,
      commissionNet: 36,
      epcBreakeven: 0.8,
      cpcMax: 0.4,
      bidStrategy: 'MANUAL_CPC',
      utmCampaign: 'demo_painel',
      launchCheckpoint: 'DRAFT',
      googleCampaignId: null,
      metaCampaignId: null,
      metaAdSetId: null,
      metaAdId: null,
    },
  });

  // Presell publicada e vinculada — é dela que sai o HTML das checagens auto do Passo 4.
  const existingPresell = await prisma.presell.findFirst({ where: { campaignId: campaign.id } });
  if (existingPresell) {
    await prisma.presell.update({ where: { id: existingPresell.id }, data: { html: HTML, status: 'publicada' } });
  } else {
    await prisma.presell.create({
      data: {
        userId: user.id,
        campaignId: campaign.id,
        slug: `demo-painel-${campaign.id.slice(-6)}`,
        title: 'Weight Loss Supplement Review',
        productName: 'Demo Offer',
        hopLink: 'https://hop.example.com/demo',
        geo: 'US',
        language: 'en',
        html: HTML,
        status: 'publicada',
      },
    });
  }

  await prisma.keyword.deleteMany({ where: { campaignId: campaign.id } });
  await prisma.keyword.createMany({
    data: [
      { userId: user.id, campaignId: campaign.id, keyword: 'weight loss supplement review', layer: 'A', matchType: 'phrase', isSelected: true, cpcEstimate: 0.35 },
      { userId: user.id, campaignId: campaign.id, keyword: 'best fat burner 2026', layer: 'B', matchType: 'exact', isSelected: true, cpcEstimate: 0.3 },
    ],
  });

  // Checklists: marca os itens do wizard. Os 'auto' são reescritos pela verificação real
  // quando o operador clica em "verificar" — o seed não decide por eles.
  const steps: Array<[number, Array<{ key: string; label: string; critical?: boolean }>]> = [
    [3, ANTISTRIKE_ITEMS], [4, BRIDGE_CHECKLIST], [7, GOOGLE_ADS_CHECKLIST],
    [8, TRACKING_CHECKLIST_CB], [9, GOLIVE_CHECKLIST],
  ];
  await prisma.campaignChecklist.deleteMany({ where: { campaignId: campaign.id } });
  for (const [step, items] of steps) {
    for (const it of items) {
      await prisma.campaignChecklist.create({
        data: {
          campaignId: campaign.id, step,
          itemKey: it.key, itemLabel: it.label, isCritical: !!it.critical, isChecked: true,
          verificationType: getChecklistVerificationType(it.key), checkedAt: new Date(),
        },
      });
    }
  }

  // Credenciais MOCK do Google Ads (isMockMode reconhece DEV_TOKEN_MOCK/CLIENT_ID_MOCK).
  const creds: Record<string, string> = {
    customer_id: '1234567890', developer_token: 'DEV_TOKEN_MOCK',
    client_id: 'CLIENT_ID_MOCK', client_secret: 'SECRET_MOCK', refresh_token: 'REFRESH_MOCK',
  };
  for (const [fieldName, fieldValue] of Object.entries(creds)) {
    const row = await prisma.integration.findFirst({ where: { userId: user.id, serviceName: 'google_ads', fieldName } });
    if (row) await prisma.integration.update({ where: { id: row.id }, data: { fieldValue } });
    else await prisma.integration.create({ data: { userId: user.id, serviceName: 'google_ads', fieldName, fieldValue } });
  }

  // Ledger de claims: um FATO liberado em paga, um INFERENCIA só no orgânico, um PROIBIDO.
  await prisma.claimLedgerEntry.deleteMany({ where: { campaignId: campaign.id } });
  await prisma.claimLedgerEntry.createMany({
    data: [
      { userId: user.id, campaignId: campaign.id, version: 1, claim: 'Fórmula com 3 ingredientes listados no rótulo', status: 'FATO', source: 'https://exemplo.com/rotulo', rewrite: 'Fórmula com 3 ingredientes listados no rótulo', allowedChannels: ['google-ads', 'meta-ads', 'landing'], reason: 'Rótulo do fabricante' },
      { userId: user.id, campaignId: campaign.id, version: 1, claim: 'Ajuda no controle do apetite', status: 'INFERENCIA', source: null, rewrite: 'Alguns usuários relatam menos vontade de beliscar', allowedChannels: ['organico'], reason: 'Sem estudo citado' },
      { userId: user.id, campaignId: campaign.id, version: 1, claim: 'Cura obesidade', status: 'PROIBIDO', source: null, rewrite: '(não usar)', allowedChannels: [], reason: 'Claim de cura' },
    ],
  });

  console.log('user     ', user.email, user.id);
  console.log('campaign ', campaign.id);
})().finally(() => prisma.$disconnect());
