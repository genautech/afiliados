import { describe, it, expect } from 'vitest';
import { normalizeProductIdea, revenueScoreTone } from '../_components/step-product-search';

describe('normalizeProductIdea', () => {
  it('lê a forma camelCase direta', () => {
    expect(normalizeProductIdea({
      id: 'pr_1', name: 'Jejum Sem Sofrimento', vertical: 'saúde', summary: 'Protocolo de 14 dias.',
      revenueScore: 87, suggestedPrice: 47.9, suggestedAov: 97, leadMagnet: 'Checklist de 7 dias',
      upsells: ['Mentoria em grupo', 'Planilha de macros'],
    })).toEqual({
      id: 'pr_1', name: 'Jejum Sem Sofrimento', vertical: 'saúde', summary: 'Protocolo de 14 dias.',
      revenueScore: 87, suggestedPrice: 47.9, suggestedAov: 97, leadMagnet: 'Checklist de 7 dias',
      upsells: ['Mentoria em grupo', 'Planilha de macros'],
    });
  });

  it('desembrulha a ideia aninhada e o snake_case', () => {
    const out = normalizeProductIdea({
      idea: {
        id: 'pr_2', nome: 'Automação de Planilhas', nicho: 'produtividade',
        revenue_score: 62, suggested_price: 37, suggested_aov: 87, lead_magnet: 'Template grátis',
      },
    });
    expect(out).toMatchObject({
      id: 'pr_2', name: 'Automação de Planilhas', vertical: 'produtividade',
      revenueScore: 62, suggestedPrice: 37, suggestedAov: 87, leadMagnet: 'Template grátis',
    });
  });

  it('converte o upsell singular {name, value} do offer-architect em badge', () => {
    expect(normalizeProductIdea({ name: 'X', upsell: { name: 'Sessão 1:1', value: 297, rationale: 'passo natural' } })?.upsells)
      .toEqual(['Sessão 1:1 · R$ 297.00']);
  });

  it('descarta upsell sem nome em vez de renderizar badge vazio', () => {
    expect(normalizeProductIdea({ name: 'X', upsells: ['', { value: 97 }, 'Bump de checklist'] })?.upsells)
      .toEqual(['Bump de checklist']);
  });

  it('trava o revenueScore na faixa 0-100', () => {
    expect(normalizeProductIdea({ name: 'X', revenueScore: 140 })?.revenueScore).toBe(100);
    expect(normalizeProductIdea({ name: 'X', revenueScore: -8 })?.revenueScore).toBe(0);
    expect(normalizeProductIdea({ name: 'X', revenueScore: 71.6 })?.revenueScore).toBe(72);
    expect(normalizeProductIdea({ name: 'X' })?.revenueScore).toBe(0);
  });

  it('deixa id nulo quando a ideia não foi persistida, para travar o Importar', () => {
    expect(normalizeProductIdea({ name: 'X' })?.id).toBeNull();
  });

  it('devolve null sem nome: card sem título não vale renderizar', () => {
    expect(normalizeProductIdea({ revenueScore: 90 })).toBeNull();
    expect(normalizeProductIdea(null)).toBeNull();
    expect(normalizeProductIdea([])).toBeNull();
  });

  it('mantém preço ausente como null em vez de virar 0', () => {
    const out = normalizeProductIdea({ name: 'X' });
    expect(out?.suggestedPrice).toBeNull();
    expect(out?.suggestedAov).toBeNull();
  });
});

describe('revenueScoreTone', () => {
  it('verde acima de 80, âmbar acima de 50, cinza abaixo', () => {
    expect(revenueScoreTone(81)).toContain('emerald');
    expect(revenueScoreTone(80)).toContain('amber');
    expect(revenueScoreTone(51)).toContain('amber');
    expect(revenueScoreTone(50)).toContain('slate');
    expect(revenueScoreTone(0)).toContain('slate');
  });
});
