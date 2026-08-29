import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({
  campaign: { findFirst: vi.fn(), update: vi.fn() },
  campaignDecision: { create: vi.fn() },
}));

vi.mock('@/lib/prisma', () => ({ prisma: h }));
vi.mock('@/lib/meta-ads/config', () => ({
  getMetaAdsCredentials: vi.fn(),
  isMetaMockMode: vi.fn(),
}));
vi.mock('@/lib/meta-ads/mutation-guard', () => ({ assertMetaMutationAllowed: vi.fn() }));
vi.mock('@/lib/meta-ads/client', () => ({
  createMetaCampaign: vi.fn(),
  createMetaAdSet: vi.fn(),
  createMetaAd: vi.fn(),
  pauseMetaObject: vi.fn(),
}));
vi.mock('@/lib/rsa', () => ({ generateRsaCopy: vi.fn() }));

import { metaAdsAdapter } from './meta-adapter';
import { getMetaAdsCredentials, isMetaMockMode } from '@/lib/meta-ads/config';
import { assertMetaMutationAllowed } from '@/lib/meta-ads/mutation-guard';
import { createMetaAd, createMetaAdSet, createMetaCampaign, pauseMetaObject } from '@/lib/meta-ads/client';
import { generateRsaCopy } from '@/lib/rsa';

const ctx = { userId: 'u1', campaignId: 'c1', confirmed: true, forceMock: false };

const baseCampaign = {
  id: 'c1', userId: 'u1', name: 'Camp', presellUrl: 'https://x.com', offerUrl: null,
  budgetDaily: 50, geo: 'BR', vertical: 'health', keywords: [],
  metaCampaignId: null, metaAdSetId: null, metaAdId: null, googleCampaignName: null,
};

const liveCreds = {
  credentials: { accessToken: 't', adAccountId: 'act_1', pixelId: 'px', pageId: 'pg' },
  missing: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  h.campaign.findFirst.mockResolvedValue({ ...baseCampaign });
  h.campaign.update.mockResolvedValue({});
  h.campaignDecision.create.mockResolvedValue({});
  (getMetaAdsCredentials as any).mockResolvedValue({ credentials: null, missing: ['access_token', 'ad_account_id'] });
  (isMetaMockMode as any).mockReturnValue(true);
  (assertMetaMutationAllowed as any).mockReturnValue({ allowed: true });
});

describe('metaAdsAdapter.preflight', () => {
  it('reprova URL de destino não-HTTPS', async () => {
    h.campaign.findFirst.mockResolvedValue({ ...baseCampaign, presellUrl: 'http://x.com' });
    const p = await metaAdsAdapter.preflight(ctx);
    expect(p.ready).toBe(false);
    expect(p.errors[0]).toContain('HTTPS');
  });

  it('reprova sem orçamento e sem geo, acumulando os dois', async () => {
    h.campaign.findFirst.mockResolvedValue({ ...baseCampaign, budgetDaily: 0, geo: '' });
    const p = await metaAdsAdapter.preflight(ctx);
    expect(p.ready).toBe(false);
    expect(p.errors).toHaveLength(2);
  });

  it('sem credencial vira MOCK pronto, com aviso do que falta', async () => {
    const p = await metaAdsAdapter.preflight(ctx);
    expect(p).toMatchObject({ ready: true, mode: 'MOCK' });
    expect(p.warnings[0]).toContain('access_token');
  });

  it('com credencial mas guard fechado, reprova em LIVE', async () => {
    (getMetaAdsCredentials as any).mockResolvedValue(liveCreds);
    (isMetaMockMode as any).mockReturnValue(false);
    (assertMetaMutationAllowed as any).mockReturnValue({ allowed: false, reason: 'META_ADS_MUTATIONS_ENABLED != true' });
    const p = await metaAdsAdapter.preflight(ctx);
    expect(p.mode).toBe('LIVE');
    expect(p.ready).toBe(false);
    expect(p.errors[0]).toContain('guard');
  });
});

describe('metaAdsAdapter.create', () => {
  it('não recria quando já existe ID remoto', async () => {
    h.campaign.findFirst.mockResolvedValue({ ...baseCampaign, metaCampaignId: 'm-1', metaAdSetId: 'as-1' });
    const r = await metaAdsAdapter.create(ctx);
    expect(r.alreadyExisted).toBe(true);
    expect(r.externalIds).toEqual({ campaignId: 'm-1', adSetId: 'as-1' });
    expect(createMetaCampaign).not.toHaveBeenCalled();
  });

  it('recusa lançar quando o preflight reprova', async () => {
    h.campaign.findFirst.mockResolvedValue({ ...baseCampaign, presellUrl: null, offerUrl: null });
    await expect(metaAdsAdapter.create(ctx)).rejects.toThrow(/URL de destino/);
    expect(createMetaCampaign).not.toHaveBeenCalled();
  });

  it('em MOCK persiste IDs simulados sem tocar na Marketing API', async () => {
    const r = await metaAdsAdapter.create(ctx);
    expect(r.mode).toBe('MOCK');
    expect(r.externalIds.campaignId).toMatch(/^MOCK-META-CAMP-/);
    expect(createMetaCampaign).not.toHaveBeenCalled();
    expect(h.campaignDecision.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ decision: 'META_CREATE_MOCK' }),
    }));
  });

  it('em LIVE cria campanha, ad set e anúncio e persiste a cada passo', async () => {
    (getMetaAdsCredentials as any).mockResolvedValue(liveCreds);
    (isMetaMockMode as any).mockReturnValue(false);
    (generateRsaCopy as any).mockResolvedValue({ titles: ['t'], descriptions: ['d'] });
    (createMetaCampaign as any).mockResolvedValue({ id: 'm-9' });
    (createMetaAdSet as any).mockResolvedValue({ id: 'as-9' });
    (createMetaAd as any).mockResolvedValue({ id: 'ad-9' });

    const r = await metaAdsAdapter.create(ctx);
    expect(r.mode).toBe('LIVE');
    expect(r.externalIds).toEqual({ campaignId: 'm-9', adSetId: 'as-9', adId: 'ad-9' });
    expect(h.campaign.update).toHaveBeenCalledTimes(3);
  });

  it('falha no meio do caminho reporta os recursos já criados', async () => {
    (getMetaAdsCredentials as any).mockResolvedValue(liveCreds);
    (isMetaMockMode as any).mockReturnValue(false);
    (generateRsaCopy as any).mockResolvedValue({ titles: ['t'], descriptions: ['d'] });
    (createMetaCampaign as any).mockResolvedValue({ id: 'm-9' });
    (createMetaAdSet as any).mockRejectedValue(new Error('budget inválido'));

    await expect(metaAdsAdapter.create(ctx)).rejects.toThrow(/budget inválido.*m-9/s);
    expect(h.campaign.update).toHaveBeenCalledTimes(1);
  });

  it('converte UK para GB no targeting', async () => {
    (getMetaAdsCredentials as any).mockResolvedValue(liveCreds);
    (isMetaMockMode as any).mockReturnValue(false);
    h.campaign.findFirst.mockResolvedValue({ ...baseCampaign, geo: 'UK' });
    (generateRsaCopy as any).mockResolvedValue({ titles: ['t'], descriptions: ['d'] });
    (createMetaCampaign as any).mockResolvedValue({ id: 'm-9' });
    (createMetaAdSet as any).mockResolvedValue({ id: 'as-9' });
    (createMetaAd as any).mockResolvedValue({ id: 'ad-9' });

    await metaAdsAdapter.create(ctx);
    expect(createMetaAdSet).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ geo: 'GB' }));
  });
});

describe('metaAdsAdapter — modo simulado é honesto', () => {
  it('forceMock segura o LIVE: credencial real presente, nenhuma criação de verdade', async () => {
    (getMetaAdsCredentials as any).mockResolvedValue(liveCreds);
    (isMetaMockMode as any).mockReturnValue(false);   // credencial existe e é live

    const pre = await metaAdsAdapter.preflight({ ...ctx, forceMock: true });
    expect(pre.mode).toBe('MOCK');

    const res = await metaAdsAdapter.create({ ...ctx, forceMock: true });
    expect(res.mode).toBe('MOCK');
    expect(res.externalIds.campaignId).toMatch(/^MOCK-META-CAMP-/);
    expect(createMetaCampaign).not.toHaveBeenCalled();
    expect(createMetaAdSet).not.toHaveBeenCalled();
    expect(createMetaAd).not.toHaveBeenCalled();
  });

  it('ID MOCK já persistido não é reportado como LIVE no caminho idempotente', async () => {
    h.campaign.findFirst.mockResolvedValue({ ...baseCampaign, metaCampaignId: 'MOCK-META-CAMP-9' });
    const res = await metaAdsAdapter.create(ctx);
    expect(res.alreadyExisted).toBe(true);
    expect(res.mode).toBe('MOCK');
  });
});

describe('metaAdsAdapter.compensate', () => {
  it('pausa anúncio, ad set e campanha nessa ordem', async () => {
    (getMetaAdsCredentials as any).mockResolvedValue(liveCreds);
    (pauseMetaObject as any).mockResolvedValue({});
    const r = await metaAdsAdapter.compensate(ctx, { campaignId: 'm-9', adSetId: 'as-9', adId: 'ad-9' });
    expect(r.ok).toBe(true);
    expect((pauseMetaObject as any).mock.calls.map((c: any[]) => c[1])).toEqual(['ad-9', 'as-9', 'm-9']);
  });

  it('IDs simulados não chamam a API', async () => {
    const r = await metaAdsAdapter.compensate(ctx, { campaignId: 'MOCK-META-CAMP-1' });
    expect(r.ok).toBe(true);
    expect(pauseMetaObject).not.toHaveBeenCalled();
  });

  it('sem credencial devolve ok=false em vez de fingir que pausou', async () => {
    const r = await metaAdsAdapter.compensate(ctx, { campaignId: 'm-9' });
    expect(r.ok).toBe(false);
    expect(r.logs[0]).toContain('Sem credencial');
  });
});
