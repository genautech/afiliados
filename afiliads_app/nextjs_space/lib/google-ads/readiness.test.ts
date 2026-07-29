import { describe, it, expect, vi } from 'vitest';
import { checkGoogleAdsReadiness, ReadinessDependencies } from './readiness';

// mock de dependências puras sem bater no sistema
vi.mock('@/lib/campaign-strategy', () => ({
  getForbiddenAdTerms: vi.fn((product) => {
    return product?.name === 'FemiCore' ? ['femicore'] : [];
  }),
}));

describe('checkGoogleAdsReadiness', () => {
  const defaultDeps: ReadinessDependencies = {
    findCampaign: async () => ({
      name: 'Campanha 1',
      budgetDaily: 100,
      geo: 'BR',
      presellUrl: 'https://example.com',
      keywords: [{ keyword: 'test', matchType: 'phrase', isSelected: true }],
    }),
    findChecklists: async () => [],
    getAdsConfig: async () => ({ customerId: '123' }),
    findProduct: async () => null,
  };

  it('fails if campaign not found', async () => {
    const res = await checkGoogleAdsReadiness('c1', 'u1', 'PREPARE', {
      ...defaultDeps,
      findCampaign: async () => null,
    });
    expect(res.ready).toBe(false);
    expect(res.errors[0]).toBe('Campanha não encontrada');
  });

  it('fails if critical checklist pending', async () => {
    const res = await checkGoogleAdsReadiness('c1', 'u1', 'PREPARE', {
      ...defaultDeps,
      findChecklists: async () => [
        { isCritical: true, isChecked: false, step: 2, itemLabel: 'Aprovação presell' },
        { isCritical: true, isChecked: false, step: 9, itemLabel: 'Lançar' }, // Step 9 should be ignored
      ],
    });
    expect(res.ready).toBe(false);
    expect(res.errors[0]).toContain('Complete os itens críticos');
    expect(res.errors[0]).toContain('Aprovação');
    expect(res.errors[0]).not.toContain('Lançar');
  });

  it('fails if finalUrl is empty', async () => {
    const res = await checkGoogleAdsReadiness('c1', 'u1', 'PREPARE', {
      ...defaultDeps,
      findCampaign: async () => ({
        name: 'Campanha 1',
        budgetDaily: 100,
        presellUrl: null,
        keywords: [{ keyword: 'test', isSelected: true }],
      }),
    });
    expect(res.ready).toBe(false);
    expect(res.errors[0]).toContain('Configure a URL da pré-sell');
  });

  it('succeeds and returns warning for unverified URL in PREPARE mode', async () => {
    const res = await checkGoogleAdsReadiness('c1', 'u1', 'PREPARE', defaultDeps);
    expect(res.ready).toBe(true);
    expect(res.errors).toHaveLength(0);
    expect(res.warnings).toContain('Não é possível garantir que a URL atual (modificada) foi a mesma aprovada no checklist. Revalidação estrutural necessária (lacuna técnica documentada para a Tarefa 10B).');
  });

  it('fails for unverified URL in SCHEDULE mode', async () => {
    const res = await checkGoogleAdsReadiness('c1', 'u1', 'SCHEDULE', defaultDeps);
    expect(res.ready).toBe(false);
    expect(res.errors).toContain('Não é possível garantir que a URL atual (modificada) foi a mesma aprovada no checklist. Revalidação estrutural necessária (lacuna técnica documentada para a Tarefa 10B).');
  });

  it('fails if missing config', async () => {
    const res = await checkGoogleAdsReadiness('c1', 'u1', 'PREPARE', {
      ...defaultDeps,
      getAdsConfig: async () => null,
    });
    expect(res.ready).toBe(false);
    expect(res.errors.join(' ')).toContain('Credenciais do Google Ads não configuradas');
  });

  it('fails if no selected keyword', async () => {
    const res = await checkGoogleAdsReadiness('c1', 'u1', 'PREPARE', {
      ...defaultDeps,
      findCampaign: async () => ({
        name: 'Campanha 1',
        budgetDaily: 100,
        presellUrl: 'https://example.com',
        keywords: [{ keyword: 'test', matchType: 'phrase', isSelected: false }],
      }),
    });
    expect(res.ready).toBe(false);
    expect(res.errors.join(' ')).toContain('Selecione ao menos uma keyword');
  });

  it('fails if brand bidding forbidden term in keywords', async () => {
    const res = await checkGoogleAdsReadiness('c1', 'u1', 'PREPARE', {
      ...defaultDeps,
      findCampaign: async () => ({
        name: 'Campanha 1',
        budgetDaily: 100,
        presellUrl: 'https://example.com',
        keywords: [{ keyword: 'femicore scam', isSelected: true }],
        productResearchId: 'p1',
      }),
      findProduct: async () => ({ id: 'p1', name: 'FemiCore' }),
    });
    expect(res.ready).toBe(false);
    expect(res.errors.join(' ')).toContain('Brand bidding proibido pelo vendor');
  });

  it('fails if invalid match type', async () => {
    const res = await checkGoogleAdsReadiness('c1', 'u1', 'PREPARE', {
      ...defaultDeps,
      findCampaign: async () => ({
        name: 'Campanha 1',
        budgetDaily: 100,
        presellUrl: 'https://example.com',
        keywords: [{ keyword: 'test', matchType: 'invalid', isSelected: true }],
      }),
    });
    expect(res.ready).toBe(false);
    expect(res.errors.join(' ')).toContain('Match type desconhecido');
  });

  it('fails if URL is invalid or HTTP', async () => {
    const res = await checkGoogleAdsReadiness('c1', 'u1', 'PREPARE', {
      ...defaultDeps,
      findCampaign: async () => ({
        name: 'Campanha 1',
        budgetDaily: 100,
        presellUrl: 'http://example.com',
        keywords: [{ keyword: 'test', matchType: 'phrase', isSelected: true }],
      }),
    });
    expect(res.ready).toBe(false);
    expect(res.errors.join(' ')).toContain('HTTPS');
  });


});
