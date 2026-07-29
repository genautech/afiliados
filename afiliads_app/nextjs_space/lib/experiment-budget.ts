// Motor determinístico de budget/decisão pra Experimentos A/B do Google Ads (Tarefa 5 do
// plano, seção 6). LLM nunca define o valor final aqui — só explica o resultado já calculado.
// Fórmula literal do plano:
//   economicCap = clamp(commissionNet * 1.5, 50, userLossCap)
//   sampleCost = estimatedCpc * targetClicks
//   recommendedTotal = min(max(economicCap, sampleCost), userLossCap)
//   recommendedTotal < sampleCost -> UNDERPOWERED (não fingir que o teste será conclusivo)

import type { ExperimentFeasibility } from './google-ads-experiments/types';

export interface ExperimentBudgetInput {
  commissionNet: number; // comissão líquida esperada por conversão (USD)
  cpcMax: number; // CPC máximo/breakeven já calculado pra campanha (USD) — fallback do CPC estimado
  estimatedCpc: number; // CPC estimado/real observado (USD)
  cvrExpected: number; // taxa de conversão esperada, em % (ex.: 1.5 = 1.5%) — mesma convenção de Campaign.cvrExpected
  durationDays: number; // duração desejada do teste
  userLossCap: number; // limite máximo de perda que o usuário aceita (USD)
}

export interface ExperimentBudgetResult {
  lossCap: number;
  targetClicks: number;
  dailyBudget: number;
  durationDays: number;
  expectedClicks: number;
  feasibility: ExperimentFeasibility;
  rationale: string;
  warnings: string[];
}

const MIN_TARGET_CLICKS = 50;
const MAX_TARGET_CLICKS = 100;
const MIN_ECONOMIC_CAP = 50;
const ECONOMIC_CAP_MULTIPLIER = 1.5;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// targetClicks começa em 50-100 (seção 6), ajustado pela CVR esperada — quanto menor a CVR,
// mais cliques o piso operacional pede. NÃO é cálculo de significância estatística (isso vem
// da API do Google depois do teste rodar), é só a base pra orçar a amostra inicial.
function computeTargetClicks(cvrExpected: number): number {
  if (!(cvrExpected > 0)) return MAX_TARGET_CLICKS;
  const cvrFactor = clamp(1 - cvrExpected / 5, 0, 1);
  return Math.round(MIN_TARGET_CLICKS + cvrFactor * (MAX_TARGET_CLICKS - MIN_TARGET_CLICKS));
}

export function calculateExperimentBudget(input: ExperimentBudgetInput): ExperimentBudgetResult {
  const warnings: string[] = [];

  const commissionNet = Math.max(0, input.commissionNet || 0);
  const estimatedCpc = Math.max(0, input.estimatedCpc || input.cpcMax || 0);
  const lossCap = Math.max(0, input.userLossCap || 0);
  const durationDays = Math.max(1, Math.round(input.durationDays || 1));
  const targetClicks = computeTargetClicks(input.cvrExpected);

  if (commissionNet <= 0) {
    warnings.push('commissionNet zerado ou negativo — economicCap caiu no piso mínimo.');
  }
  if (estimatedCpc <= 0) {
    warnings.push('CPC estimado/máximo indisponível — não dá pra estimar cliques esperados com confiança.');
  }
  if (lossCap <= 0) {
    warnings.push('userLossCap zerado ou negativo — nenhum orçamento real pode ser recomendado.');
  }

  const economicCap = clamp(commissionNet * ECONOMIC_CAP_MULTIPLIER, MIN_ECONOMIC_CAP, lossCap);
  const sampleCost = estimatedCpc * targetClicks;
  const recommendedTotal = lossCap > 0 ? Math.min(Math.max(economicCap, sampleCost), lossCap) : 0;

  const dailyBudget = recommendedTotal / durationDays;
  const expectedClicks = estimatedCpc > 0 ? recommendedTotal / estimatedCpc : 0;

  let feasibility: ExperimentFeasibility;
  if (lossCap <= 0 || estimatedCpc <= 0) {
    feasibility = 'UNVIABLE';
  } else if (recommendedTotal < sampleCost) {
    feasibility = 'UNDERPOWERED';
  } else {
    feasibility = 'VIABLE';
  }

  if (feasibility === 'UNDERPOWERED') {
    warnings.push(
      `Orçamento recomendado ($${recommendedTotal.toFixed(2)}) é menor que o custo estimado da amostra ($${sampleCost.toFixed(2)}) — resultado tende a ficar inconclusivo, não prometer significância.`
    );
  }
  if (feasibility === 'UNVIABLE') {
    warnings.push('Sem loss cap ou CPC válido — não é possível recomendar um teste viável.');
  }

  const rationale =
    `economicCap = clamp(commissionNet($${commissionNet.toFixed(2)}) × ${ECONOMIC_CAP_MULTIPLIER}, $${MIN_ECONOMIC_CAP}, lossCap($${lossCap.toFixed(2)})) = $${economicCap.toFixed(2)}; ` +
    `sampleCost = CPC($${estimatedCpc.toFixed(2)}) × targetClicks(${targetClicks}) = $${sampleCost.toFixed(2)}; ` +
    `recommendedTotal = min(max(economicCap, sampleCost), lossCap) = $${recommendedTotal.toFixed(2)}.`;

  return {
    lossCap,
    targetClicks,
    dailyBudget: Number(dailyBudget.toFixed(2)),
    durationDays,
    expectedClicks: Number(expectedClicks.toFixed(1)),
    feasibility,
    rationale,
    warnings,
  };
}
