// A03 — loop não pode decidir com gasto sincronizado velho.
// A05 — burn de orçamento é acumulado desde o lançamento; performance é janela deslizante.
import { describe, expect, it } from 'vitest';
import { computeEconomics, evaluateRules, MAX_DATA_AGE_HOURS } from './campaign-rules';

const campanha = {
  commissionNet: 40,
  epcBreakeven: 1,
  cpcMax: 2,
  budgetTest: 100,
  offerUrl: 'https://exemplo.com/oferta',
};

const AGORA = new Date('2026-09-07T12:00:00Z');

function diaAtras(n: number) {
  return new Date(AGORA.getTime() - n * 86400_000);
}

/** 30 dias a $5/dia = $150 gastos num budget de teste de $100. */
function trintaDias(syncedAt: Date | null = AGORA) {
  return Array.from({ length: 30 }, (_, i) => ({
    spend: 5,
    revenue: 6,
    refunds: 0,
    clicks: 5,
    conversions: 1,
    logDate: diaAtras(i),
    syncedAt,
  }));
}

describe('A05 — orçamento acumulado vs janela de performance', () => {
  it('burn considera os 30 dias, não só os 14 da janela', () => {
    const econ = computeEconomics(campanha, trintaDias(), {
      performanceWindowDays: 14,
      now: AGORA,
    });

    expect(econ.spendTotal).toBe(150);          // acumulado real
    expect(econ.spend).toBeLessThan(150);       // janela de performance é menor
    expect(econ.budgetBurnPct).toBe(150);       // antes dava 70% e nunca pausava
  });

  it('com 150% de burn a decisão é PAUSAR', () => {
    const econ = computeEconomics(campanha, trintaDias(), {
      performanceWindowDays: 14,
      now: AGORA,
    });
    const res = evaluateRules(econ, campanha);
    expect(res.decision).toBe('PAUSAR');
    expect(res.triggers[0]).toContain('150.00 acumulados');
  });

  it('sem janela configurada, spend e spendTotal coincidem', () => {
    const econ = computeEconomics(campanha, trintaDias(), { now: AGORA });
    expect(econ.spend).toBe(econ.spendTotal);
  });

  it('CPC/EPC usam só a janela — dia antigo caro não contamina a média atual', () => {
    const logs = [
      { spend: 10, revenue: 0, clicks: 1, conversions: 0, logDate: diaAtras(40), syncedAt: AGORA },
      { spend: 10, revenue: 30, clicks: 20, conversions: 2, logDate: diaAtras(1), syncedAt: AGORA },
    ];
    const econ = computeEconomics(campanha, logs, { performanceWindowDays: 14, now: AGORA });

    expect(econ.spendTotal).toBe(20);   // orçamento vê os dois dias
    expect(econ.spend).toBe(10);        // performance vê só o recente
    expect(econ.cpcReal).toBe(0.5);     // 10/20, sem o dia de CPC $10
  });
});

describe('A03 — frescor do dado sincronizado', () => {
  it('sync mais velho que o limite bloqueia a decisão', () => {
    const velho = new Date(AGORA.getTime() - (MAX_DATA_AGE_HOURS + 5) * 3600_000);
    const econ = computeEconomics(campanha, [
      { spend: 20, revenue: 60, clicks: 20, conversions: 2, logDate: diaAtras(1), syncedAt: velho },
    ], { now: AGORA });

    expect(econ.dataAgeHours).toBeGreaterThan(MAX_DATA_AGE_HOURS);
    const res = evaluateRules(econ, campanha);
    expect(res.decision).toBe('SEM_DADOS');
    expect(res.triggers[0]).toMatch(/desatualizados/i);
  });

  it('sync recente deixa o loop decidir normalmente', () => {
    const econ = computeEconomics(campanha, [
      { spend: 20, revenue: 60, clicks: 20, conversions: 2, logDate: diaAtras(1), syncedAt: AGORA },
    ], { now: AGORA });

    expect(econ.dataAgeHours).toBeLessThan(MAX_DATA_AGE_HOURS);
    expect(evaluateRules(econ, campanha).decision).not.toBe('SEM_DADOS');
  });

  it('diário totalmente manual (sem syncedAt) não é bloqueado', () => {
    const econ = computeEconomics(campanha, [
      { spend: 20, revenue: 60, clicks: 20, conversions: 2, logDate: diaAtras(1) },
    ], { now: AGORA });

    expect(econ.dataAgeHours).toBeNull();
    expect(evaluateRules(econ, campanha).decision).not.toBe('SEM_DADOS');
  });

  it('usa o sync mais recente entre os logs, não o mais antigo', () => {
    const velho = new Date(AGORA.getTime() - 100 * 3600_000);
    const econ = computeEconomics(campanha, [
      { spend: 10, revenue: 30, clicks: 10, conversions: 1, logDate: diaAtras(5), syncedAt: velho },
      { spend: 10, revenue: 30, clicks: 10, conversions: 1, logDate: diaAtras(1), syncedAt: AGORA },
    ], { now: AGORA });

    expect(econ.dataAgeHours).toBe(0);
  });
});
