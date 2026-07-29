import { describe, expect, it } from 'vitest';
import { calculateExperimentBudget, type ExperimentBudgetInput } from '@/lib/experiment-budget';

function input(overrides: Partial<ExperimentBudgetInput> = {}): ExperimentBudgetInput {
  return {
    commissionNet: 40,
    cpcMax: 1.5,
    estimatedCpc: 1.5,
    cvrExpected: 2,
    durationDays: 7,
    userLossCap: 300,
    ...overrides,
  };
}

describe('calculateExperimentBudget — caso viável', () => {
  it('1. economicCap = commissionNet × 1.5 quando abaixo do lossCap, feasibility VIABLE', () => {
    const result = calculateExperimentBudget(input({ commissionNet: 40, userLossCap: 300 }));
    // economicCap = clamp(40*1.5, 50, 300) = 60; sampleCost = 1.5 * targetClicks (<=100) <= 150
    // recommendedTotal = min(max(60, sampleCost), 300) — sempre >= sampleCost aqui, então VIABLE
    expect(result.feasibility).toBe('VIABLE');
    expect(result.dailyBudget).toBeGreaterThan(0);
    expect(result.warnings).toHaveLength(0);
  });

  it('2. dailyBudget = recommendedTotal / durationDays', () => {
    const result = calculateExperimentBudget(input({ durationDays: 10 }));
    expect(result.durationDays).toBe(10);
    expect(Number((result.dailyBudget * 10).toFixed(2))).toBeLessThanOrEqual(result.lossCap);
  });

  it('3. targetClicks fica entre 50 e 100 (piso/teto do plano)', () => {
    const result = calculateExperimentBudget(input({ cvrExpected: 2 }));
    expect(result.targetClicks).toBeGreaterThanOrEqual(50);
    expect(result.targetClicks).toBeLessThanOrEqual(100);
  });

  it('4. CVR esperada mais baixa pede mais cliques-alvo (amostra maior)', () => {
    const highCvr = calculateExperimentBudget(input({ cvrExpected: 5 }));
    const lowCvr = calculateExperimentBudget(input({ cvrExpected: 0.5 }));
    expect(lowCvr.targetClicks).toBeGreaterThan(highCvr.targetClicks);
  });
});

describe('calculateExperimentBudget — UNDERPOWERED', () => {
  it('5. lossCap baixo (abaixo do sampleCost) marca UNDERPOWERED, não finge conclusivo', () => {
    // sampleCost mínimo ~= estimatedCpc * 50; com CPC alto e lossCap baixo, não cobre a amostra.
    const result = calculateExperimentBudget(
      input({ commissionNet: 5, estimatedCpc: 3, cvrExpected: 5, userLossCap: 40 })
    );
    expect(result.feasibility).toBe('UNDERPOWERED');
    expect(result.warnings.some((w) => w.toLowerCase().includes('inconclusivo'))).toBe(true);
  });

  it('6. recommendedTotal nunca excede o userLossCap mesmo quando UNDERPOWERED', () => {
    const result = calculateExperimentBudget(
      input({ commissionNet: 5, estimatedCpc: 3, userLossCap: 40 })
    );
    expect(result.dailyBudget * result.durationDays).toBeLessThanOrEqual(result.lossCap + 0.01);
  });
});

describe('calculateExperimentBudget — payout/CPC zero e cap baixo (UNVIABLE)', () => {
  it('7. commissionNet=0 não trava — cai no piso mínimo do economicCap, mas segue calculável', () => {
    const result = calculateExperimentBudget(input({ commissionNet: 0 }));
    expect(result.warnings.some((w) => w.includes('commissionNet'))).toBe(true);
    expect(Number.isFinite(result.dailyBudget)).toBe(true);
  });

  it('8. estimatedCpc e cpcMax ambos zero -> UNVIABLE (não dá pra estimar cliques)', () => {
    const result = calculateExperimentBudget(input({ estimatedCpc: 0, cpcMax: 0 }));
    expect(result.feasibility).toBe('UNVIABLE');
    expect(result.expectedClicks).toBe(0);
  });

  it('9. userLossCap=0 -> UNVIABLE e orçamento recomendado zerado', () => {
    const result = calculateExperimentBudget(input({ userLossCap: 0 }));
    expect(result.feasibility).toBe('UNVIABLE');
    expect(result.dailyBudget).toBe(0);
  });

  it('10. userLossCap negativo é tratado como zero (fail-safe), não gera orçamento negativo', () => {
    const result = calculateExperimentBudget(input({ userLossCap: -50 }));
    expect(result.lossCap).toBe(0);
    expect(result.dailyBudget).toBeGreaterThanOrEqual(0);
  });

  it('11. estimatedCpc ausente cai pro fallback cpcMax', () => {
    const withEstimated = calculateExperimentBudget(input({ estimatedCpc: 2, cpcMax: 1 }));
    const withoutEstimated = calculateExperimentBudget(input({ estimatedCpc: 0, cpcMax: 2 }));
    // Sem estimatedCpc, usa cpcMax(2) — mesmo resultado que informar estimatedCpc=2 direto.
    expect(withoutEstimated.expectedClicks).toBe(withEstimated.expectedClicks);
  });

  it('12. durationDays fracionário/zero é normalizado pra pelo menos 1 dia inteiro', () => {
    const result = calculateExperimentBudget(input({ durationDays: 0 }));
    expect(result.durationDays).toBe(1);
  });
});

describe('calculateExperimentBudget — rationale', () => {
  it('13. rationale documenta a fórmula com os números usados (auditável, não é caixa-preta)', () => {
    const result = calculateExperimentBudget(input());
    expect(result.rationale).toContain('economicCap');
    expect(result.rationale).toContain('sampleCost');
    expect(result.rationale).toContain('recommendedTotal');
  });
});
