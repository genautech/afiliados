import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Test user
  const hashedPassword = await bcrypt.hash('johndoe123', 12);
  const user = await prisma.user.upsert({
    where: { email: 'john@doe.com' },
    update: {},
    create: {
      email: 'john@doe.com',
      name: 'Admin',
      password: hashedPassword,
    },
  });
  const userId = user.id;

  // ==================== OFERTAS ====================
  const offers = [
    {
      offerId: 'CB-001', network: 'ClickBank', name: 'Offer Alpha WL', vertical: 'Weight Loss',
      geoAllowed: 'US,CA,AU', payoutCommission: 'US$60 avg', model: 'CPA % + upsell',
      gravityEpcRef: 'Gravity 80 / EPC $1.2', upsells: 'Sim', trademarkBidding: 'Proibido',
      googleAllowed: 'Search,YT com bridge', funnelRecommended: 'Bridge', vendorTermsOk: true,
      hopLink: 'https://hop.clickbank.net/?affiliate=YOURID&vendor=ALPHAWEIGHT', breakevenCpc: 1.5,
      status: 'Ativa', testStartDate: new Date('2026-07-01'), result: 'SCALE',
      notes: 'Melhor EPC Search',
    },
    {
      offerId: 'BG-001', network: 'BuyGoods', name: 'Serum X', vertical: 'Beauty',
      geoAllowed: 'US,UK', payoutCommission: 'US$55', model: 'CPA',
      gravityEpcRef: '—', upsells: 'Sim', trademarkBidding: 'Proibido',
      googleAllowed: 'Demand Gen,YT', funnelRecommended: 'Bridge', vendorTermsOk: true,
      hopLink: 'https://buygoods.com/offer/serumx?aff=YOURID', breakevenCpc: 1.1,
      status: 'Teste', testStartDate: new Date('2026-07-10'), result: 'OTIMIZAR',
      notes: 'Precisa criativo UGC',
    },
    {
      offerId: 'MW-001', network: 'MaxWeb', name: 'Smartlink Nutra BR', vertical: 'Nutra',
      geoAllowed: 'BR', payoutCommission: 'R$8 CPL', model: 'CPL',
      gravityEpcRef: '—', upsells: '', trademarkBidding: '',
      googleAllowed: 'YT,Search', funnelRecommended: 'Smartlink', vendorTermsOk: true,
      hopLink: 'https://maxweb.com/smartlink/nutra?aff=YOURID', breakevenCpc: 0.6,
      status: 'Ativa', testStartDate: new Date('2026-07-05'), result: 'OTIMIZAR',
      notes: 'Postback OK',
    },
    {
      offerId: 'HT-001', network: 'Hotmart', name: 'Curso Y', vertical: 'Educacao',
      geoAllowed: 'BR', payoutCommission: 'R$80 (50%)', model: '% comissao',
      gravityEpcRef: '—', upsells: 'Bump', trademarkBidding: 'Ver produtor',
      googleAllowed: 'Search', funnelRecommended: 'Direct/Lancamento', vendorTermsOk: true,
      hopLink: 'https://hotmart.com/product/curso-y?ref=YOURID', breakevenCpc: 2.0,
      status: 'Ativa', testStartDate: new Date('2026-07-12'), result: 'SCALE',
      notes: 'Carrinho aberto',
    },
  ];

  for (const o of offers) {
    await prisma.offer.upsert({
      where: { userId_offerId: { userId, offerId: o.offerId } },
      update: { ...o, userId },
      create: { ...o, userId },
    });
  }
  console.log('Offers seeded:', offers.length);

  // ==================== CAMPANHAS ====================
  const campaignsData = [
    {
      name: 'CB_WL_US_SEARCH_BRIDGE_v1', platform: 'ClickBank', vertical: 'Weight Loss',
      geo: 'US', channel: 'SEARCH', funnel: 'BRIDGE', status: 'SCALE',
      commission: 60, refundPct: 0, aov: 60, cvrExpected: 3.5, commissionNet: 60,
      epcBreakeven: 1.5, cpcMax: 1.5, cpcScale: 1.2, budgetTest: 80, budgetDaily: 50,
      offerUrl: 'https://hop.clickbank.net/?affiliate=YOURID&vendor=ALPHAWEIGHT',
      presellUrl: 'https://seusite.com/review-alpha',
      googleCampaignName: 'CB | WL | US | Search | Bridge',
      campaignType: 'Search', bidStrategy: 'Maximizar conversões',
      conversionConfig: 'Compra (valor comissão)', utmCampaign: 'cb_wl_us_search_v1',
      qualityScoreNotes: 'QS 7+', negativesOk: true,
      campaignNameGenerated: 'CB_WL_US_SEARCH_BRIDGE_v1',
      wizardStep: 9, wizardCompleted: true,
      launchedAt: new Date('2026-07-08'),
    },
    {
      name: 'MW_NUTRA_BR_YT_SL_v1', platform: 'MaxWeb', vertical: 'Nutra',
      geo: 'BR', channel: 'YOUTUBE', funnel: 'SMARTLINK', status: 'OTIMIZANDO',
      commission: 8, refundPct: 0, aov: 8, cvrExpected: 5.5, commissionNet: 8,
      epcBreakeven: 0.6, cpcMax: 0.6, cpcScale: 0.45, budgetTest: 50, budgetDaily: 40,
      offerUrl: 'https://maxweb.com/smartlink/nutra?aff=YOURID',
      googleCampaignName: 'MW | Nutra | BR | YT | SL',
      campaignType: 'YouTube', bidStrategy: 'CPV / Max conv',
      conversionConfig: 'Lead postback', utmCampaign: 'mw_nutra_br_yt_v1',
      qualityScoreNotes: '—', negativesOk: true,
      campaignNameGenerated: 'MW_NUTRA_BR_YT_SL_v1',
      wizardStep: 9, wizardCompleted: true,
      launchedAt: new Date('2026-07-09'),
    },
    {
      name: 'BG_BEAUTY_US_DGEN_v1', platform: 'BuyGoods', vertical: 'Beauty',
      geo: 'US', channel: 'DEMAND_GEN', funnel: 'BRIDGE', status: 'PAUSADO',
      commission: 55, refundPct: 0, aov: 55, cvrExpected: 1.5, commissionNet: 55,
      epcBreakeven: 1.1, cpcMax: 1.1, cpcScale: 0.8, budgetTest: 50, budgetDaily: 30,
      offerUrl: 'https://buygoods.com/offer/serumx?aff=YOURID',
      presellUrl: 'https://seusite.com/serum-x',
      googleCampaignName: 'BG | Beauty | US | DGen',
      campaignType: 'Demand Gen', bidStrategy: 'Max conversões',
      conversionConfig: 'Compra', utmCampaign: 'bg_beauty_us_dgen_v1',
      qualityScoreNotes: '—', negativesOk: true,
      campaignNameGenerated: 'BG_BEAUTY_US_DGEN_v1',
      wizardStep: 9, wizardCompleted: true,
      launchedAt: new Date('2026-07-11'),
    },
    {
      name: 'CB_MM_US_SEARCH_v2', platform: 'ClickBank', vertical: 'Make Money',
      geo: 'US', channel: 'SEARCH', funnel: 'BRIDGE', status: 'KILL',
      commission: 50, refundPct: 0, aov: 50, cvrExpected: 1.0, commissionNet: 50,
      epcBreakeven: 1.8, cpcMax: 1.8, cpcScale: 1.4, budgetTest: 60, budgetDaily: 0,
      campaignType: 'Search', bidStrategy: 'Maximizar conversões',
      campaignNameGenerated: 'CB_MM_US_SEARCH_v2',
      wizardStep: 9, wizardCompleted: true,
    },
    {
      name: 'HT_CURSO_BR_SEARCH_v1', platform: 'Hotmart', vertical: 'Educacao',
      geo: 'BR', channel: 'SEARCH', funnel: 'DIRECT', status: 'SCALE',
      commission: 80, refundPct: 0, aov: 160, cvrExpected: 7.0, commissionNet: 80,
      epcBreakeven: 2.0, cpcMax: 2.0, cpcScale: 0.9, budgetTest: 50, budgetDaily: 50,
      offerUrl: 'https://hotmart.com/product/curso-y?ref=YOURID',
      googleCampaignName: 'HT | Curso Y | BR | Search',
      campaignType: 'Search', bidStrategy: 'Maximizar conversões',
      conversionConfig: 'Compra', utmCampaign: 'ht_curso_br_search_v1',
      campaignNameGenerated: 'HT_CURSO_BR_SEARCH_v1',
      wizardStep: 9, wizardCompleted: true,
      launchedAt: new Date('2026-07-12'),
    },
  ];

  const campaignMap: Record<string, string> = {};
  for (const c of campaignsData) {
    const existing = await prisma.campaign.findFirst({ where: { userId, name: c.name } });
    if (existing) {
      await prisma.campaign.update({ where: { id: existing.id }, data: { ...c, userId } });
      campaignMap[c.name] = existing.id;
    } else {
      const created = await prisma.campaign.create({ data: { ...c, userId } });
      campaignMap[c.name] = created.id;
    }
  }
  console.log('Campaigns seeded:', campaignsData.length);

  // ==================== DAILY LOGS ====================
  const dailyLogsData = [
    {
      campaignName: 'CB_WL_US_SEARCH_BRIDGE_v1', logDate: new Date('2026-07-10'),
      impressions: 1200, clicks: 85, spend: 102.0, conversions: 3, revenue: 180.0,
      refunds: 0, network: 'ClickBank', offerName: 'Offer Alpha WL',
      vertical: 'Weight Loss', geo: 'US', channel: 'Search', funnel: 'Bridge',
      decision: 'SCALE', notes: 'Bom QS',
    },
    {
      campaignName: 'CB_WL_US_SEARCH_BRIDGE_v1', logDate: new Date('2026-07-11'),
      impressions: 1350, clicks: 92, spend: 108.0, conversions: 4, revenue: 240.0,
      refunds: 0, network: 'ClickBank', offerName: 'Offer Alpha WL',
      vertical: 'Weight Loss', geo: 'US', channel: 'Search', funnel: 'Bridge',
      decision: 'SCALE', notes: 'EPC subindo',
    },
    {
      campaignName: 'CB_WL_US_SEARCH_BRIDGE_v1', logDate: new Date('2026-07-12'),
      impressions: 1500, clicks: 105, spend: 120.0, conversions: 5, revenue: 300.0,
      refunds: 0, network: 'ClickBank', offerName: 'Offer Alpha WL',
      vertical: 'Weight Loss', geo: 'US', channel: 'Search', funnel: 'Bridge',
      decision: 'SCALE', notes: 'Melhor dia',
    },
    {
      campaignName: 'MW_NUTRA_BR_YT_SL_v1', logDate: new Date('2026-07-11'),
      impressions: 8000, clicks: 220, spend: 99.0, conversions: 12, revenue: 96.0,
      refunds: 1, network: 'MaxWeb', offerName: 'Smartlink Nutra',
      vertical: 'Nutra', geo: 'BR', channel: 'YouTube', funnel: 'Smartlink',
      decision: 'OTIMIZAR', notes: 'Testar hook 2',
    },
    {
      campaignName: 'MW_NUTRA_BR_YT_SL_v1', logDate: new Date('2026-07-12'),
      impressions: 7500, clicks: 200, spend: 90.0, conversions: 10, revenue: 80.0,
      refunds: 0, network: 'MaxWeb', offerName: 'Smartlink Nutra',
      vertical: 'Nutra', geo: 'BR', channel: 'YouTube', funnel: 'Smartlink',
      decision: 'OTIMIZAR', notes: 'Criativo 2 rodando',
    },
    {
      campaignName: 'BG_BEAUTY_US_DGEN_v1', logDate: new Date('2026-07-12'),
      impressions: 3500, clicks: 140, spend: 112.0, conversions: 2, revenue: 110.0,
      refunds: 0, network: 'BuyGoods', offerName: 'Serum X',
      vertical: 'Beauty', geo: 'US', channel: 'Demand Gen', funnel: 'Bridge',
      decision: 'OTIMIZAR', notes: 'CVR baixa',
    },
    {
      campaignName: 'BG_BEAUTY_US_DGEN_v1', logDate: new Date('2026-07-13'),
      impressions: 3200, clicks: 125, spend: 100.0, conversions: 1, revenue: 55.0,
      refunds: 0, network: 'BuyGoods', offerName: 'Serum X',
      vertical: 'Beauty', geo: 'US', channel: 'Demand Gen', funnel: 'Bridge',
      decision: 'PAUSAR', notes: 'Aguardando UGC',
    },
    {
      campaignName: 'CB_MM_US_SEARCH_v2', logDate: new Date('2026-07-13'),
      impressions: 900, clicks: 40, spend: 84.0, conversions: 0, revenue: 0.0,
      refunds: 0, network: 'ClickBank', offerName: 'Offer Beta MMO',
      vertical: 'Make Money', geo: 'US', channel: 'Search', funnel: 'Bridge',
      decision: 'KILL', notes: 'CPC alto zero sale',
    },
    {
      campaignName: 'HT_CURSO_BR_SEARCH_v1', logDate: new Date('2026-07-14'),
      impressions: 600, clicks: 55, spend: 49.5, conversions: 4, revenue: 320.0,
      refunds: 0, network: 'Hotmart', offerName: 'Curso Y',
      vertical: 'Educacao', geo: 'BR', channel: 'Search', funnel: 'Direct',
      decision: 'SCALE', notes: 'Lançamento D2',
    },
    {
      campaignName: 'HT_CURSO_BR_SEARCH_v1', logDate: new Date('2026-07-15'),
      impressions: 750, clicks: 68, spend: 55.0, conversions: 5, revenue: 400.0,
      refunds: 0, network: 'Hotmart', offerName: 'Curso Y',
      vertical: 'Educacao', geo: 'BR', channel: 'Search', funnel: 'Direct',
      decision: 'SCALE', notes: 'Lançamento D3 - melhor conversão',
    },
  ];

  for (const log of dailyLogsData) {
    const campId = campaignMap[log.campaignName];
    if (!campId) continue;
    const { campaignName, ...logData } = log;
    await prisma.dailyLog.upsert({
      where: { campaignId_logDate: { campaignId: campId, logDate: log.logDate } },
      update: { ...logData, campaignId: campId, userId },
      create: { ...logData, campaignId: campId, userId },
    });
  }
  console.log('Daily logs seeded:', dailyLogsData.length);

  // ==================== TEST RESULTS ====================
  const testsData = [
    {
      testId: 'T-001', campaignId: 'CB_WL_US_SEARCH_BRIDGE_v1',
      network: 'ClickBank', offerName: 'Offer Alpha WL',
      hypothesis: "Dor: 'não consigo emagrecer depois dos 40'",
      budgetTest: 80, minClicks: 80, actualSpend: 102.0,
      conversions: 3, revenue: 180.0, epc: 2.12, avgCpc: 1.20, breakevenCpc: 1.5,
      result: 'SCALE', nextStep: 'Subir budget 25%', learning: 'Hook idade converte',
      startDate: new Date('2026-07-10'), endDate: new Date('2026-07-12'),
    },
    {
      testId: 'T-002', campaignId: 'CB_MM_US_SEARCH_v2',
      network: 'ClickBank', offerName: 'Offer Beta MMO',
      hypothesis: 'Promessa renda extra home office',
      budgetTest: 60, minClicks: 50, actualSpend: 84.0,
      conversions: 0, revenue: 0, epc: 0, avgCpc: 2.10, breakevenCpc: 1.8,
      result: 'KILL', nextStep: 'Pausar oferta', learning: 'CPC Search MMO inviável neste geo',
      startDate: new Date('2026-07-11'), endDate: new Date('2026-07-13'),
    },
    {
      testId: 'T-003', campaignId: 'MW_NUTRA_BR_YT_SL_v1',
      network: 'MaxWeb', offerName: 'Smartlink Nutra',
      hypothesis: 'UGC depoimento 15s',
      budgetTest: 50, minClicks: 150, actualSpend: 99.0,
      conversions: 12, revenue: 96.0, epc: 0.44, avgCpc: 0.45, breakevenCpc: 0.6,
      result: 'OTIMIZAR', nextStep: 'Trocar 2 criativos', learning: 'eCPA perto do payout',
      startDate: new Date('2026-07-11'), endDate: new Date('2026-07-14'),
    },
  ];

  for (const t of testsData) {
    const campId = campaignMap[t.campaignId] || t.campaignId;
    await prisma.testResult.upsert({
      where: { userId_testId: { userId, testId: t.testId } },
      update: { ...t, campaignId: campId, userId },
      create: { ...t, campaignId: campId, userId },
    });
  }
  console.log('Test results seeded:', testsData.length);

  // ==================== DECISIONS ====================
  const decisionsData = [
    { campaignName: 'CB_WL_US_SEARCH_BRIDGE_v1', decision: 'SCALE', rationale: 'EPC $2.12 > CPC $1.20. ROAS 1.76x. Subir budget 25%.' },
    { campaignName: 'CB_MM_US_SEARCH_v2', decision: 'KILL', rationale: 'CPC $2.10 > Break-even $1.80. Zero conversões após $84 gastos.' },
    { campaignName: 'MW_NUTRA_BR_YT_SL_v1', decision: 'OTIMIZAR', rationale: 'EPC $0.44 próximo do CPC $0.45. eCPA perto do payout. Trocar criativos.' },
    { campaignName: 'BG_BEAUTY_US_DGEN_v1', decision: 'PAUSAR', rationale: 'CVR muito baixa. Aguardando novo criativo UGC.' },
    { campaignName: 'HT_CURSO_BR_SEARCH_v1', decision: 'SCALE', rationale: 'EPC $5.82 >> CPC $0.90. ROAS 6.46x. Escalar durante lançamento.' },
  ];

  for (const d of decisionsData) {
    const campId = campaignMap[d.campaignName];
    if (!campId) continue;
    const exists = await prisma.campaignDecision.findFirst({
      where: { campaignId: campId, decision: d.decision },
    });
    if (!exists) {
      await prisma.campaignDecision.create({
        data: { campaignId: campId, userId, decision: d.decision, rationale: d.rationale },
      });
    }
  }
  console.log('Decisions seeded');

  // ==================== KEYWORDS ====================
  const keywordsData = [
    // CB Weight Loss keywords
    { keyword: 'weight loss supplements over 40', layer: 'A', matchType: 'phrase', cpcEstimate: 1.10, campaignName: 'CB_WL_US_SEARCH_BRIDGE_v1' },
    { keyword: 'best diet pills for women', layer: 'A', matchType: 'phrase', cpcEstimate: 1.30, campaignName: 'CB_WL_US_SEARCH_BRIDGE_v1' },
    { keyword: 'how to lose belly fat after 40', layer: 'B', matchType: 'phrase', cpcEstimate: 0.90, campaignName: 'CB_WL_US_SEARCH_BRIDGE_v1' },
    { keyword: 'natural weight loss remedies', layer: 'B', matchType: 'exact', cpcEstimate: 1.05, campaignName: 'CB_WL_US_SEARCH_BRIDGE_v1' },
    { keyword: 'metabolism booster supplement', layer: 'C', matchType: 'phrase', cpcEstimate: 0.85, campaignName: 'CB_WL_US_SEARCH_BRIDGE_v1' },
    // Hotmart Educacao keywords
    { keyword: 'curso marketing digital', layer: 'A', matchType: 'phrase', cpcEstimate: 0.60, campaignName: 'HT_CURSO_BR_SEARCH_v1' },
    { keyword: 'como ganhar dinheiro online', layer: 'A', matchType: 'phrase', cpcEstimate: 0.75, campaignName: 'HT_CURSO_BR_SEARCH_v1' },
    { keyword: 'melhor curso de afiliados', layer: 'B', matchType: 'exact', cpcEstimate: 0.55, campaignName: 'HT_CURSO_BR_SEARCH_v1' },
    // Global negatives (no campaign)
    { keyword: 'free', layer: 'NEGATIVE', matchType: 'exact', cpcEstimate: 0, campaignName: '' },
    { keyword: 'reddit', layer: 'NEGATIVE', matchType: 'exact', cpcEstimate: 0, campaignName: '' },
    { keyword: 'scam', layer: 'NEGATIVE', matchType: 'exact', cpcEstimate: 0, campaignName: '' },
    { keyword: 'complaints', layer: 'NEGATIVE', matchType: 'exact', cpcEstimate: 0, campaignName: '' },
    { keyword: 'side effects', layer: 'NEGATIVE', matchType: 'phrase', cpcEstimate: 0, campaignName: '' },
    { keyword: 'lawsuit', layer: 'NEGATIVE', matchType: 'exact', cpcEstimate: 0, campaignName: '' },
  ];

  for (const kw of keywordsData) {
    const campId = kw.campaignName ? campaignMap[kw.campaignName] : null;
    const exists = await prisma.keyword.findFirst({
      where: { userId, keyword: kw.keyword, campaignId: campId },
    });
    if (!exists) {
      await prisma.keyword.create({
        data: {
          userId,
          campaignId: campId,
          keyword: kw.keyword,
          layer: kw.layer,
          matchType: kw.matchType,
          cpcEstimate: kw.cpcEstimate,
          isSelected: true,
          status: kw.layer === 'NEGATIVE' ? 'negativa' : 'ativa',
        },
      });
    }
  }
  console.log('Keywords seeded:', keywordsData.length);

  // ==================== CHECKLISTS ====================
  const checklistItems = [
    // Anti-strike checklist (step 3)
    { step: 3, itemKey: 'vendor_terms', itemLabel: 'Ler e seguir Vendor Terms da oferta', isCritical: true, isChecked: true },
    { step: 3, itemKey: 'no_income_claims', itemLabel: 'Sem claims de renda/resultados garantidos', isCritical: true, isChecked: true },
    { step: 3, itemKey: 'no_health_claims', itemLabel: 'Sem claims médicos absolutos', isCritical: true, isChecked: true },
    { step: 3, itemKey: 'disclaimer_visible', itemLabel: 'Disclaimer visível na pré-sell', isCritical: true, isChecked: true },
    { step: 3, itemKey: 'no_trademark_bid', itemLabel: 'Não usar trademark como keyword', isCritical: true, isChecked: true },
    // Bridge checklist (step 4)
    { step: 4, itemKey: 'h1_keyword', itemLabel: 'H1 alinhado à keyword principal', isCritical: false, isChecked: true },
    { step: 4, itemKey: 'subhead_benefit', itemLabel: 'Subhead com benefício específico', isCritical: false, isChecked: true },
    { step: 4, itemKey: 'social_proof', itemLabel: 'Social proof (depoimentos)', isCritical: false, isChecked: false },
    { step: 4, itemKey: 'cta_clear', itemLabel: 'CTA claro e acima da dobra', isCritical: true, isChecked: true },
    { step: 4, itemKey: 'mobile_responsive', itemLabel: 'Responsivo mobile', isCritical: true, isChecked: true },
    // Google Ads checklist (step 7)
    { step: 7, itemKey: 'conversion_tracking', itemLabel: 'Conversão configurada', isCritical: true, isChecked: true },
    { step: 7, itemKey: 'negatives_added', itemLabel: 'Negativas adicionadas', isCritical: true, isChecked: true },
    { step: 7, itemKey: 'budget_set', itemLabel: 'Orçamento diário definido', isCritical: false, isChecked: true },
    { step: 7, itemKey: 'rsa_approved', itemLabel: 'RSA criado e aprovado', isCritical: false, isChecked: true },
    // Tracking checklist (step 8)
    { step: 8, itemKey: 'utm_configured', itemLabel: 'UTMs configurados', isCritical: true, isChecked: true },
    { step: 8, itemKey: 'postback_tested', itemLabel: 'Postback testado (MaxWeb)', isCritical: true, isChecked: false },
    { step: 8, itemKey: 'gtm_tag', itemLabel: 'GTM Tag instalada', isCritical: false, isChecked: true },
    // Go-live checklist (step 9)
    { step: 9, itemKey: 'final_review', itemLabel: 'Review final da pré-sell', isCritical: false, isChecked: true },
    { step: 9, itemKey: 'budget_confirmed', itemLabel: 'Budget de teste confirmado', isCritical: true, isChecked: true },
    { step: 9, itemKey: 'monitoring_plan', itemLabel: 'Plano de monitoramento 72h', isCritical: false, isChecked: true },
  ];

  // Apply to all campaigns
  for (const campName of Object.keys(campaignMap)) {
    const campId = campaignMap[campName];
    for (const item of checklistItems) {
      await prisma.campaignChecklist.upsert({
        where: { campaignId_step_itemKey: { campaignId: campId, step: item.step, itemKey: item.itemKey } },
        update: { isChecked: item.isChecked, checkedAt: item.isChecked ? new Date() : null },
        create: { ...item, campaignId: campId, checkedAt: item.isChecked ? new Date() : null },
      });
    }
  }
  console.log('Checklists seeded for all campaigns');

  console.log('Seed completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
