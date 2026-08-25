import { describe, expect, it } from 'vitest';
import { evaluateWizardGate } from './wizard-gates';

const checkedAt = new Date('2026-08-25T12:00:00.000Z');

describe('evaluateWizardGate', () => {
  it('bloqueia o passo 7 quando falta item crítico', () => {
    const result = evaluateWizardGate(7, 'ClickBank', [
      { itemKey: 'search_on', itemLabel: 'Search ON', isCritical: true, isChecked: true, checkedAt },
    ]);
    expect(result.allowed).toBe(false);
    expect(result.pending).toContain('Search Partners: OFF');
  });

  it('exige resultado fresco para itens automáticos do passo 7', () => {
    const rows = [
      ...['search_on', 'partners_off', 'display_off', 'geo_correto', 'location_presence'].map((itemKey) => ({ itemKey, isCritical: true, isChecked: true, checkedAt })),
      { itemKey: 'budget_diario', isCritical: true, isChecked: true, checkedAt: null },
      { itemKey: 'lance_manual', isCritical: true, isChecked: true, checkedAt },
    ];
    const result = evaluateWizardGate(7, 'ClickBank', rows);
    expect(result.allowed).toBe(false);
    expect(result.pending).toContain('Budget diário calculado');
  });

  it('usa o checklist específico da plataforma no passo 8', () => {
    const maxweb = evaluateWizardGate(8, 'MaxWeb', [
      { itemKey: 'postback_url', isCritical: true, isChecked: true, checkedAt },
      { itemKey: 'clickid_token', isCritical: true, isChecked: true, checkedAt },
      { itemKey: 'teste_postback', isCritical: true, isChecked: true, checkedAt },
    ]);
    const clickbank = evaluateWizardGate(8, 'ClickBank', [
      { itemKey: 'hop_stats', isCritical: true, isChecked: true, checkedAt },
    ]);
    expect(maxweb.allowed).toBe(true);
    expect(clickbank.allowed).toBe(true);
  });
});
