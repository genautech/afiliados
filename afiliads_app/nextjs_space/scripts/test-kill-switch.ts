// Script de Teste: Campanha de Estresse do Kill Switch
// Executar com: npx tsx scripts/test-kill-switch.ts

import { enforceCompliance } from '../lib/complianceVerifier';
import { AnalyzedClaimItem } from '../lib/validations/market-research';

// --- Cenário A: Nicho de Emagrecimento (Health / Weight Loss) ---
console.log("=== CENÁRIO A: Emagrecimento ===");

const claimsEmagrecimento: AnalyzedClaimItem[] = [
  {
    claim: "Perca 10kg em 5 dias sem dieta",
    riskLevel: "HIGH",
    justification: "Viola políticas de anúncios de saúde e emagrecimento (promessa de resultado irreais e sem esforço).",
    sourceCompetitor: "SlimCapsFake"
  },
  {
    claim: "Cápsula milagrosa seca barriga de forma natural",
    riskLevel: "HIGH",
    justification: "Termo 'milagrosa' proibido e claim absoluto de eliminação de gordura localizada.",
    sourceCompetitor: "BellyBurnerX"
  },
  {
    claim: "Ingredientes 100% naturais podem ajudar na rotina",
    riskLevel: "LOW",
    justification: "Linguagem condicional e sem promessa absoluta.",
    sourceCompetitor: "SlimBom"
  }
];

// Copy gerada pela IA que CONTÉM uma violação
const copyVioladoraA = `
  Descubra como perca 10kg em 5 dias sem dieta com a nossa nova fórmula.
  Nossos ingredientes 100% naturais podem ajudar na sua rotina diária.
`;

const resultadoA = enforceCompliance(copyVioladoraA, claimsEmagrecimento);

console.log(`PASSOU? ${resultadoA.passed}`);
console.log(`VIOLAÇÕES ENCONTRADAS: ${resultadoA.violations.length}`);
resultadoA.violations.forEach(v => {
  console.log(`  🚨 Claim: "${v.claim}"`);
  console.log(`     Match: "${v.matched}"`);
  console.log(`     Fonte: ${v.sourceCompetitor}`);
});
console.log(`TERMO BANIDO: ${resultadoA.bannedTerm}`);
console.log(`\nGUIDANCE:\n${resultadoA.guidance}`);

// --- Cenário B: Nicho de Renda Extra (Wealth / Make Money Online) ---
console.log("\n=== CENÁRIO B: Renda Extra ===");

const claimsRenda: AnalyzedClaimItem[] = [
  {
    claim: "Ganhe R$ 500 por dia no piloto automático",
    riskLevel: "HIGH",
    justification: "Viola políticas de anúncios financeiros (promessa de ganho sem esforço).",
    sourceCompetitor: "BotDinheiro"
  },
  {
    claim: "Robô com 98% de assertividade e retorno garantido",
    riskLevel: "HIGH",
    justification: "Promessa de garantia de retorno financeiro e claim específico de assertividade não verificável.",
    sourceCompetitor: "TradeBotPro"
  }
];

const copyVioladoraB = `
  Aprenda a ganhar dinheiro rápido com nosso método exclusivo.
  Nosso robô opera com 98% de assertividade e retorno garantido.
`;

const resultadoB = enforceCompliance(copyVioladoraB, claimsRenda);

console.log(`PASSOU? ${resultadoB.passed}`);
console.log(`VIOLAÇÕES ENCONTRADAS: ${resultadoB.violations.length}`);
resultadoB.violations.forEach(v => {
  console.log(`  🚨 Claim: "${v.claim}"`);
  console.log(`     Match: "${v.matched}"`);
  console.log(`     Fonte: ${v.sourceCompetitor}`);
});
console.log(`TERMO BANIDO: ${resultadoB.bannedTerm}`);

// --- Cenário C: Copy Segura (Deve Passar) ---
console.log("\n=== CENÁRIO C: Copy Segura (Deve Passar) ===");

const copySegura = `
  Descubra como uma fórmula natural pode apoiar sua rotina de bem-estar.
  Resultados individuais podem variar. Consulte um profissional de saúde.
`;

const resultadoC = enforceCompliance(copySegura, claimsEmagrecimento);

console.log(`PASSOU? ${resultadoC.passed}`);
console.log(`VIOLAÇÕES: ${resultadoC.violations.length}`);
console.log(`TERMO BANIDO: ${resultadoC.bannedTerm}`);

if (resultadoC.passed) {
  console.log("✅ Copy aprovada pelo Kill Switch!");
} else {
  console.log("❌ Falso positivo detectado!");
}

console.log("\n=== TESTE CONCLUÍDO ===");
