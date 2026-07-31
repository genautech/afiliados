import { describe, expect, it } from 'vitest';
import { analyzeExperimentSignificance, calculateTwoSampleZTest } from '../statistics';

describe('calculateTwoSampleZTest', () => {
  it('retorna pValue 1.0 quando não há amostra', () => {
    const res = calculateTwoSampleZTest(0, 0, 0, 0);
    expect(res.pValue).toBe(1.0);
    expect(res.zScore).toBe(0);
  });

  it('calcula zScore positivo e pValue baixo quando B é significativamente superior a A', () => {
    // A: 10 conversões em 1000 cliques (1%)
    // B: 50 conversões em 1000 cliques (5%)
    const res = calculateTwoSampleZTest(10, 1000, 50, 1000);
    expect(res.zScore).toBeGreaterThan(5);
    expect(res.pValue).toBeLessThan(0.001);
  });
});

describe('analyzeExperimentSignificance', () => {
  it('retorna INSUFFICIENT_DATA se os cliques forem menores que o mínimo', () => {
    const control = { clicks: 10, impressions: 100, conversions: 1, costMicros: 10000 };
    const treatment = { clicks: 15, impressions: 100, conversions: 2, costMicros: 10000 };

    const result = analyzeExperimentSignificance(control, treatment, { minClicksPerArm: 100 });
    expect(result.sampleSufficient).toBe(false);
    expect(result.recommendation).toBe('INSUFFICIENT_DATA');
  });

  it('recomenda PROMOTE_TREATMENT quando o tratamento vence com 95%+ de confiança', () => {
    const control = { clicks: 500, impressions: 5000, conversions: 10, costMicros: 500000 };
    const treatment = { clicks: 500, impressions: 5000, conversions: 35, costMicros: 500000 };

    const result = analyzeExperimentSignificance(control, treatment, { minClicksPerArm: 100, minConversionsTotal: 10 });
    expect(result.sampleSufficient).toBe(true);
    expect(result.statisticallySignificant).toBe(true);
    expect(result.recommendation).toBe('PROMOTE_TREATMENT');
    expect(result.confidencePct).toBeGreaterThanOrEqual(95);
  });

  it('recomenda KEEP_TESTING quando há amostra mas não atingiu 95% de confiança', () => {
    const control = { clicks: 150, impressions: 2000, conversions: 8, costMicros: 100000 };
    const treatment = { clicks: 150, impressions: 2000, conversions: 9, costMicros: 100000 };

    const result = analyzeExperimentSignificance(control, treatment, { minClicksPerArm: 100, minConversionsTotal: 10 });
    expect(result.sampleSufficient).toBe(true);
    expect(result.statisticallySignificant).toBe(false);
    expect(result.recommendation).toBe('KEEP_TESTING');
  });
});
