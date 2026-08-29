import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({
  campaign: { findFirst: vi.fn(), update: vi.fn() },
  campaignChecklist: { findMany: vi.fn() },
  productResearch: { findUnique: vi.fn() },
  campaignDecision: { create: vi.fn() },
}));

vi.mock('@/lib/prisma', () => ({ prisma: h }));
vi.mock('@/lib/google-ads', () => ({
  createGoogleCampaign: vi.fn(),
  getGoogleAdsConfig: vi.fn(),
  isMockMode: vi.fn(() => true),
  mutateGoogleCampaign: vi.fn(),
}));
vi.mock('@/lib/rsa', () => ({ generateRsaCopy: vi.fn() }));
vi.mock('@/lib/google-ads/readiness', () => ({ checkGoogleAdsReadiness: vi.fn() }));

import { googleAdsAdapter } from './google-adapter';
import { createGoogleCampaign, getGoogleAdsConfig, isMockMode, mutateGoogleCampaign } from '@/lib/google-ads';
import { generateRsaCopy } from '@/lib/rsa';
import { checkGoogleAdsReadiness } from '@/lib/google-ads/readiness';

const ctx = { userId: 'u1', campaignId: 'c1', confirmed: true, forceMock: false };

const readyData = {
  campaignName: 'Camp', budgetDaily: 50, geo: 'BR', finalUrl: 'https://x.com',
  forbiddenTerms: [], selectedKeywords: [{ keyword: 'kw', matchType: 'phrase' }],
};

beforeEach(() => {
  vi.clearAllMocks();
  (isMockMode as any).mockReturnValue(true);
  (getGoogleAdsConfig as any).mockResolvedValue({ customerId: '1234567890', developerToken: 'x' });
  (checkGoogleAdsReadiness as any).mockResolvedValue({ ready: true, errors: [], warnings: [], data: readyData });
  h.campaign.findFirst.mockResolvedValue({ id: 'c1', userId: 'u1', geo: 'BR', vertical: 'health', keywords: [] });
  h.campaign.update.mockResolvedValue({});
  h.campaignDecision.create.mockResolvedValue({});
});

describe('googleAdsAdapter.preflight', () => {
  it('reprova sem configuração da conta', async () => {
    (getGoogleAdsConfig as any).mockResolvedValue(null);
    const p = await googleAdsAdapter.preflight(ctx);
    expect(p.ready).toBe(false);
    expect(p.errors[0]).toContain('Configuração do Google Ads');
    expect(checkGoogleAdsReadiness).not.toHaveBeenCalled();
  });

  it('propaga os erros do readiness sem chamar a API', async () => {
    (checkGoogleAdsReadiness as any).mockResolvedValue({ ready: false, errors: ['sem orçamento'], warnings: [] });
    const p = await googleAdsAdapter.preflight(ctx);
    expect(p.ready).toBe(false);
    expect(p.errors).toEqual(['sem orçamento']);
    expect(createGoogleCampaign).not.toHaveBeenCalled();
  });

  it('aprova em MOCK e devolve os avisos do readiness', async () => {
    (checkGoogleAdsReadiness as any).mockResolvedValue({ ready: true, errors: [], warnings: ['url sem https no rastreio'], data: readyData });
    const p = await googleAdsAdapter.preflight(ctx);
    expect(p).toMatchObject({ ready: true, mode: 'MOCK', warnings: ['url sem https no rastreio'] });
  });
});

describe('googleAdsAdapter.create', () => {
  it('não cria uma segunda campanha quando já existe ID remoto', async () => {
    h.campaign.findFirst.mockResolvedValue({
      id: 'c1', userId: 'u1', keywords: [], googleCampaignId: 'g-1', googleAdGroupId: 'ag-1',
    });
    const r = await googleAdsAdapter.create(ctx);
    expect(r.alreadyExisted).toBe(true);
    expect(r.externalIds).toEqual({ campaignId: 'g-1', adGroupId: 'ag-1' });
    expect(createGoogleCampaign).not.toHaveBeenCalled();
  });

  it('bloqueia brand bidding proibido antes de tocar na API', async () => {
    (checkGoogleAdsReadiness as any).mockResolvedValue({
      ready: true, errors: [], warnings: [],
      data: { ...readyData, forbiddenTerms: ['MarcaX'] },
    });
    (generateRsaCopy as any).mockResolvedValue({ titles: ['Compre MarcaX hoje'], descriptions: ['desc'] });
    await expect(googleAdsAdapter.create(ctx)).rejects.toThrow(/Brand bidding proibido/);
    expect(createGoogleCampaign).not.toHaveBeenCalled();
  });

  it('não persiste ID quando a API não devolve campaignId', async () => {
    (generateRsaCopy as any).mockResolvedValue({ titles: ['t'], descriptions: ['d'] });
    (createGoogleCampaign as any).mockResolvedValue({ success: false, googleCampaignId: null, logs: ['erro remoto'] });
    await expect(googleAdsAdapter.create(ctx)).rejects.toThrow(/não devolveu ID/);
    expect(h.campaign.update).not.toHaveBeenCalled();
  });

  it('persiste IDs e registra a decisão no caminho feliz', async () => {
    (generateRsaCopy as any).mockResolvedValue({ titles: ['t'], descriptions: ['d'] });
    (createGoogleCampaign as any).mockResolvedValue({
      success: true, googleCampaignId: 'g-9', googleAdGroupId: 'ag-9', mock: true, logs: ['ok'],
    });
    const r = await googleAdsAdapter.create(ctx);
    expect(r.mode).toBe('MOCK');
    expect(r.externalIds).toEqual({ campaignId: 'g-9', adGroupId: 'ag-9' });
    expect(h.campaign.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ googleCampaignId: 'g-9' }),
    }));
    expect(h.campaignDecision.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ decision: 'GADS_CREATE_MOCK' }),
    }));
  });
});

describe('googleAdsAdapter — modo simulado é honesto', () => {
  it('forceMock segura o LIVE: conta configurada para real roda como MOCK', async () => {
    (isMockMode as any).mockReturnValue(false);   // a conta É live
    (createGoogleCampaign as any).mockResolvedValue({
      success: true, mock: true,
      googleCampaignId: 'MOCK-CAMPAIGN-1', googleAdGroupId: 'MOCK-ADGROUP-1', logs: [],
    });

    const pre = await googleAdsAdapter.preflight({ ...ctx, forceMock: true });
    expect(pre.mode).toBe('MOCK');

    const res = await googleAdsAdapter.create({ ...ctx, forceMock: true });
    expect(res.mode).toBe('MOCK');
    // o pedido do operador atravessa a fronteira do módulo
    expect((createGoogleCampaign as any).mock.calls[0][1].forceMock).toBe(true);
  });

  it('ID MOCK já persistido não é reportado como LIVE no caminho idempotente', async () => {
    h.campaign.findFirst.mockResolvedValue({
      id: 'c1', userId: 'u1', googleCampaignId: 'MOCK-CAMPAIGN-9', keywords: [],
    });
    const res = await googleAdsAdapter.create(ctx);
    expect(res.alreadyExisted).toBe(true);
    expect(res.mode).toBe('MOCK');
  });
});

describe('googleAdsAdapter.compensate', () => {
  it('pausa a campanha remota', async () => {
    (mutateGoogleCampaign as any).mockResolvedValue({ success: true, log: 'pausada' });
    const r = await googleAdsAdapter.compensate(ctx, { campaignId: 'g-9' });
    expect(r.ok).toBe(true);
    expect(mutateGoogleCampaign).toHaveBeenCalledWith('u1', 'g-9', { status: 'PAUSED' });
  });

  it('é no-op quando não há ID remoto registrado', async () => {
    const r = await googleAdsAdapter.compensate(ctx, {});
    expect(r.ok).toBe(true);
    expect(mutateGoogleCampaign).not.toHaveBeenCalled();
  });

  it('devolve ok=false quando a pausa falha, sem estourar', async () => {
    (mutateGoogleCampaign as any).mockRejectedValue(new Error('rede caiu'));
    const r = await googleAdsAdapter.compensate(ctx, { campaignId: 'g-9' });
    expect(r.ok).toBe(false);
    expect(r.logs[0]).toContain('rede caiu');
  });
});
