import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PRODUCTS = [
  { name: 'FemiCore', vertical: "Women's Health", avgPayout: 223.44, conversionRate: '0.78%', commissionPct: 'CPA/RevShare (aprovação)', rebill: true, score: 88, riskLevel: 'medio', summary: 'Suplemento para microbioma urinário de mulheres 45+ (incontinência e UTIs). #1 oficial ClickBank em julho/2026. VSL de alta conversão com upsells; exige aprovação prévia do vendor.', tags: ['nutra', 'womens-health', 'supplement', 'vsl', 'aprovacao-previa', 'us'] },
  { name: 'Lymph Tonic', vertical: 'Dietary Supplements', avgPayout: 193.63, conversionRate: '0.96%', commissionPct: 'CPA/RevShare', rebill: true, score: 85, riskLevel: 'medio', summary: 'Suplemento herbal de drenagem linfática — mercado pouco explorado para condições crônicas. Top 5 oficial ClickBank julho/2026, payout alto e boa conversão.', tags: ['nutra', 'lymphatic', 'supplement', 'evergreen', 'us'] },
  { name: 'YuSleep', vertical: 'Sleep & Dreams', avgPayout: 154.03, conversionRate: '0.49%', commissionPct: 'CPA/RevShare (aprovação)', rebill: true, score: 82, riskLevel: 'medio', summary: 'Sleep aid de vendor Diamond Elite. Funciona bem em email, Facebook, Google, YouTube e TikTok. Exige aprovação de afiliado.', tags: ['nutra', 'sleep', 'supplement', 'diamond-vendor', 'multi-canal'] },
  { name: 'Energy Revolution System', vertical: 'Alternative Energy', avgPayout: 49.56, conversionRate: '1.68%', commissionPct: '75% (digital)', rebill: false, score: 78, riskLevel: 'baixo', summary: 'Produto digital (gerar a própria energia / reduzir conta de luz). EPC ~$0.70, conversão alta, materiais promocionais prontos. Vertical não-nutra = compliance mais fácil no Google.', tags: ['digital', 'diy-energy', 'survival-adjacent', 'epc-alto', 'google-friendly'] },
  { name: 'Water Freedom System', vertical: 'Survival', avgPayout: 52.52, conversionRate: '1.79%', commissionPct: '75% (digital)', rebill: false, score: 76, riskLevel: 'baixo', summary: 'Oferta survival de geração de água potável. Maior conversão do top 5 oficial (1.79%), toolkit promocional completo, ângulos de escassez hídrica.', tags: ['digital', 'survival', 'prepper', 'conversao-alta', 'google-friendly'] },
  { name: 'ProDentim', vertical: 'Dental Health', avgPayout: 137.21, conversionRate: '', commissionPct: 'CPA até ~$146', rebill: true, score: 74, riskLevel: 'alto', summary: 'Probiótico dental, campeão histórico de gravity no ClickBank. Listado no top 10 de suplementos 2026 da própria ClickBank. Vertical saturada = criativo precisa diferenciar.', tags: ['nutra', 'dental', 'probiotic', 'gravity-alto', 'competitivo'] },
  { name: 'GlucoTrust', vertical: 'Blood Sugar', avgPayout: 145.34, conversionRate: '', commissionPct: 'CPA disponível', rebill: true, score: 72, riskLevel: 'alto', summary: 'Suporte a glicose no sangue — payout forte, mas claims de diabetes são zona crítica de compliance no Google Ads (health in personalized ads). Bridge page obrigatória.', tags: ['nutra', 'blood-sugar', 'diabetes-adjacent', 'compliance-critico'] },
  { name: 'Puravive', vertical: 'Weight Loss', avgPayout: 138.21, conversionRate: '', commissionPct: 'CPA/RevShare', rebill: true, score: 71, riskLevel: 'alto', summary: 'Weight loss (BAT/brown fat angle) do top 10 oficial de suplementos 2026. Volume de busca alto; weight loss exige linguagem condicional rígida no Google.', tags: ['nutra', 'weight-loss', 'bat-angle', 'volume-alto', 'compliance-critico'] },
  { name: 'Prostadine', vertical: "Men's Health", avgPayout: 130.59, conversionRate: '', commissionPct: 'CPA disponível', rebill: true, score: 68, riskLevel: 'alto', summary: 'Suplemento de próstata do top 10 oficial 2026. Público 50+ responde bem a YouTube/native; claims de saúde masculina sob escrutínio no Google.', tags: ['nutra', 'mens-health', 'prostate', '50plus', 'youtube'] },
  { name: 'Sumatra Slim Belly Tonic', vertical: 'Weight Loss', avgPayout: 135.39, conversionRate: '', commissionPct: 'CPA/RevShare', rebill: true, score: 66, riskLevel: 'alto', summary: 'Tônico weight loss (ângulo "blue light/sono") do top 10 oficial 2026. Ângulo diferenciado, mas vertical hipercompetitiva e sensível a compliance.', tags: ['nutra', 'weight-loss', 'tonic', 'angulo-sono', 'competitivo'] },
];

async function main() {
  const users = await prisma.user.findMany({ select: { id: true, email: true } });
  for (const user of users) {
    for (const p of PRODUCTS) {
      await prisma.productResearch.upsert({
        where: { userId_name: { userId: user.id, name: p.name } },
        update: { source: 'seed' },
        create: {
          userId: user.id,
          name: p.name,
          network: 'clickbank',
          vertical: p.vertical,
          avgPayout: p.avgPayout,
          conversionRate: p.conversionRate,
          commissionPct: p.commissionPct,
          rebill: p.rebill,
          score: p.score,
          riskLevel: p.riskLevel,
          summary: p.summary,
          tags: p.tags,
          source: 'seed',
          status: 'novo',
        },
      });
    }
    console.log(`Seed ok para ${user.email}: ${PRODUCTS.length} produtos`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
