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
    const res = await checkGoogleAdsReadiness('c1', 'u1', {
      ...defaultDeps,
      findCampaign: async () => null,
    });
    expect(res.ready).toBe(false);
    expect(res.errors[0]).toBe('Campanha não encontrada');
  });

  it('fails if critical checklist items pending', async () => {
    const res = await checkGoogleAdsReadiness('c1', 'u1', {
      ...defaultDeps,
      findChecklists: async () => [
        { isCritical: true, isChecked: false, step: 1, itemLabel: 'Aprovação' },
        { isCritical: true, isChecked: false, step: 9, itemLabel: 'Lançar' }, // Step 9 should be ignored
      ],
    });
    expect(res.ready).toBe(false);
    expect(res.errors[0]).toContain('Complete os itens críticos');
    expect(res.errors[0]).toContain('Aprovação');
    expect(res.errors[0]).not.toContain('Lançar');
  });

  it('fails if missing final URL', async () => {
    const res = await checkGoogleAdsReadiness('c1', 'u1', {
      ...defaultDeps,
      findCampaign: async () => ({
        name: 'Campanha 1',
        keywords: [{ keyword: 'test', matchType: 'phrase', isSelected: true }],
      }),
    });
    expect(res.ready).toBe(false);
    expect(res.errors[0]).toContain('Configure a URL da pré-sell');
  });

  it('fails if missing config', async () => {
    const res = await checkGoogleAdsReadiness('c1', 'u1', {
      ...defaultDeps,
      getAdsConfig: async () => null,
    });
    expect(res.ready).toBe(false);
    expect(res.errors[0]).toContain('Credenciais do Google Ads não configuradas');
  });

  it('fails if no selected keyword', async () => {
    const res = await checkGoogleAdsReadiness('c1', 'u1', {
      ...defaultDeps,
      findCampaign: async () => ({
        name: 'Campanha 1',
        presellUrl: 'https://example.com',
        keywords: [{ keyword: 'test', matchType: 'phrase', isSelected: false }],
      }),
    });
    expect(res.ready).toBe(false);
    expect(res.errors[0]).toContain('Selecione ao menos uma keyword');
  });

  it('fails if brand bidding forbidden term in keywords', async () => {
    const res = await checkGoogleAdsReadiness('c1', 'u1', {
      ...defaultDeps,
      findCampaign: async () => ({
        name: 'Campanha 1',
        presellUrl: 'https://example.com',
        productResearchId: 'p1',
        keywords: [{ keyword: 'buy femicore', matchType: 'phrase', isSelected: true }],
      }),
      findProduct: async () => ({ id: 'p1', name: 'FemiCore' }),
    });
    expect(res.ready).toBe(false);
    expect(res.errors[0]).toContain('Brand bidding proibido pelo vendor');
  });

  it('succeeds and returns structured data', async () => {
    const res = await checkGoogleAdsReadiness('c1', 'u1', defaultDeps);
    expect(res.ready).toBe(true);
    expect(res.errors).toHaveLength(0);
    expect(res.data?.campaignName).toBe('Campanha 1');
    expect(res.data?.budgetDaily).toBe(100);
    expect(res.data?.keywords[0].text).toBe('test');
    expect(res.data?.keywords[0].matchType).toBe('PHRASE');
  });
});
