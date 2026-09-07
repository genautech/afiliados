// A04 — reembolso tem que reduzir receita, lucro e EPC.
import { describe, expect, it } from 'vitest';
import { computeEconomics, evaluateRules } from './campaign-rules';

const campanha = {
  commissionNet: 40,
  epcBreakeven: 1,
  cpcMax: 2,
  budgetTest: 500,
  offerUrl: 'https://exemplo.com/oferta',
};

function log(over: Partial<{ spend: number; revenue: number; refunds: number; clicks: number; conversions: number }>) {
  return {
    spend: 0, revenue: 0, refunds: 0, clicks: 0, conversions: 0,
    logDate: new Date('2026-09-01'),
    ...over,
  };
}

describe('A04 — reembolso na economia da campanha', () => {
  it('reproduz o cenário da auditoria: gasto 100, receita 200, reembolso 200 → lucro -100', () => {
    const econ = computeEconomics(campanha, [
      log({ spend: 100, revenue: 200, refunds: 200, clicks: 100, conversions: 4 }),
    ]);

    expect(econ.revenue).toBe(200);      // bruta preservada para exibição
    expect(econ.refunds).toBe(200);
    expect(econ.revenueNet).toBe(0);
    expect(econ.profit).toBe(-100);      // antes exibia +100
    expect(econ.epcReal).toBe(0);        // antes exibia 2.00
  });

  it('esse cenário NÃO decide SCALE', () => {
    const econ = computeEconomics(campanha, [
      log({ spend: 100, revenue: 200, refunds: 200, clicks: 100, conversions: 4 }),
    ]);
    const res = evaluateRules(econ, campanha);
    expect(res.decision).not.toBe('SCALE');
    expect(res.decision).toBe('KILL');
    expect(res.triggers.join(' ')).toMatch(/reembolso anulou a receita/i);
  });

  it('reembolso parcial mantém lucro positivo e permite SCALE', () => {
    // receita 200, reembolso 50 → líquida 150; gasto 50 em 100 cliques → CPC 0.50, EPC 1.50
    const econ = computeEconomics(campanha, [
      log({ spend: 50, revenue: 200, refunds: 50, clicks: 100, conversions: 4 }),
    ]);
    expect(econ.revenueNet).toBe(150);
    expect(econ.profit).toBe(100);
    expect(econ.epcReal).toBe(1.5);

    const res = evaluateRules(econ, campanha);
    expect(res.decision).toBe('SCALE');
  });

  it('EPC bate o alvo mas lucro é negativo → OTIMIZAR, nunca SCALE', () => {
    // 10 cliques, gasto 1 (CPC 0.10), receita líquida 5 (EPC 0.50 ≥ 1.3×0.10) — mas o
    // reembolso deixa o acumulado no vermelho num segundo dia sem cliques.
    const econ = computeEconomics(campanha, [
      log({ spend: 1, revenue: 5, refunds: 0, clicks: 10, conversions: 2 }),
      log({ spend: 20, revenue: 0, refunds: 0, clicks: 0, conversions: 0 }),
    ]);
    expect(econ.profit).toBeLessThan(0);
    const res = evaluateRules(econ, campanha);
    expect(res.decision).not.toBe('SCALE');
  });

  it('log sem campo refunds continua funcionando (retrocompatível)', () => {
    const econ = computeEconomics(campanha, [
      { spend: 10, revenue: 40, clicks: 20, conversions: 1, logDate: new Date('2026-09-01') },
    ]);
    expect(econ.refunds).toBe(0);
    expect(econ.revenueNet).toBe(40);
    expect(econ.profit).toBe(30);
  });
});
