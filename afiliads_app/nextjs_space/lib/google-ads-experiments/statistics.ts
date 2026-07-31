/**
 * Motor de Cálculo Estatístico Determinístico para Experimentos A/B do Google Ads.
 * Calcula Teste Z de Proporções (CTR e Taxa de Conversão), Margem de Erro (95% de confiança)
 * e determina se há significância estatística conclusiva para promoção da variação.
 */

export interface ArmMetrics {
  clicks: number;
  impressions: number;
  conversions: number;
  costMicros: number;
}

export interface StatisticalAnalysisResult {
  controlCtr: number;
  treatmentCtr: number;
  ctrUpliftPct: number;
  controlConvRate: number;
  treatmentConvRate: number;
  convRateUpliftPct: number;
  pValConvRate: number;
  statisticallySignificant: boolean;
  confidencePct: number;
  sampleSufficient: boolean;
  recommendation: 'INSUFFICIENT_DATA' | 'KEEP_TESTING' | 'PROMOTE_TREATMENT' | 'KEEP_CONTROL';
  reason: string;
}

/**
 * Função de distribuição cumulativa normal aproximada (para cálculo de p-value)
 */
function normCdf(z: number): number {
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.sqrt(2);
  // Aproximação de Abramowitz e Stegun para erf(x)
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t) * Math.exp(-x * x);

  return 0.5 * (1.0 + sign * y);
}

/**
 * Z-test de duas proporções independentes
 */
export function calculateTwoSampleZTest(
  successA: number,
  trialsA: number,
  successB: number,
  trialsB: number
): { zScore: number; pValue: number } {
  if (trialsA <= 0 || trialsB <= 0) {
    return { zScore: 0, pValue: 1.0 };
  }

  const pA = successA / trialsA;
  const pB = successB / trialsB;
  const pPooled = (successA + successB) / (trialsA + trialsB);

  if (pPooled <= 0 || pPooled >= 1) {
    return { zScore: 0, pValue: 1.0 };
  }

  const se = Math.sqrt(pPooled * (1 - pPooled) * (1 / trialsA + 1 / trialsB));
  if (se === 0) return { zScore: 0, pValue: 1.0 };

  const zScore = (pB - pA) / se;
  // Teste bicaudal
  const pValue = 2 * (1 - normCdf(Math.abs(zScore)));

  return { zScore, pValue };
}

/**
 * Análise estatística completa para comparar braço de Controle vs Tratamento
 */
export function analyzeExperimentSignificance(
  control: ArmMetrics,
  treatment: ArmMetrics,
  options?: { minClicksPerArm?: number; minConversionsTotal?: number; targetConfidencePct?: number }
): StatisticalAnalysisResult {
  const minClicks = options?.minClicksPerArm ?? 100;
  const minConversions = options?.minConversionsTotal ?? 10;
  const targetConfidence = options?.targetConfidencePct ?? 95;
  const alphaThreshold = 1 - targetConfidence / 100;

  const controlCtr = control.impressions > 0 ? control.clicks / control.impressions : 0;
  const treatmentCtr = treatment.impressions > 0 ? treatment.clicks / treatment.impressions : 0;
  const ctrUpliftPct = controlCtr > 0 ? ((treatmentCtr - controlCtr) / controlCtr) * 100 : 0;

  const controlConvRate = control.clicks > 0 ? control.conversions / control.clicks : 0;
  const treatmentConvRate = treatment.clicks > 0 ? treatment.conversions / treatment.clicks : 0;
  const convRateUpliftPct = controlConvRate > 0 ? ((treatmentConvRate - controlConvRate) / controlConvRate) * 100 : 0;

  const sampleSufficient = control.clicks >= minClicks && treatment.clicks >= minClicks && (control.conversions + treatment.conversions) >= minConversions;

  const { zScore, pValue } = calculateTwoSampleZTest(
    control.conversions,
    control.clicks,
    treatment.conversions,
    treatment.clicks
  );

  const confidencePct = Math.round((1 - pValue) * 100 * 10) / 10;
  const statisticallySignificant = sampleSufficient && pValue <= alphaThreshold;

  let recommendation: StatisticalAnalysisResult['recommendation'] = 'INSUFFICIENT_DATA';
  let reason = 'Amostra insuficiente de cliques/conversões para análise de significância.';

  if (!sampleSufficient) {
    recommendation = 'INSUFFICIENT_DATA';
    reason = `Necessário pelo menos ${minClicks} cliques por braço e ${minConversions} conversões totais.`;
  } else if (statisticallySignificant) {
    if (zScore > 0) {
      recommendation = 'PROMOTE_TREATMENT';
      reason = `A variação de tratamento superou o controle com ${confidencePct}% de confiança estatística (+${convRateUpliftPct.toFixed(1)}% na taxa de conversão).`;
    } else {
      recommendation = 'KEEP_CONTROL';
      reason = `O controle foi estatisticamente superior à variação com ${confidencePct}% de confiança.`;
    }
  } else {
    recommendation = 'KEEP_TESTING';
    reason = `Diferença atual de conversão (${convRateUpliftPct.toFixed(1)}%) ainda não atingiu o nível de confiança de ${targetConfidence}%. Continue acumulando dados.`;
  }

  return {
    controlCtr,
    treatmentCtr,
    ctrUpliftPct,
    controlConvRate,
    treatmentConvRate,
    convRateUpliftPct,
    pValConvRate: pValue,
    statisticallySignificant,
    confidencePct,
    sampleSufficient,
    recommendation,
    reason,
  };
}
