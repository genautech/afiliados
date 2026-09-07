import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    campaign: { updateMany: vi.fn() },
    campaignDecision: { create: vi.fn() },
  },
}));

vi.mock('@/lib/google-ads', () => ({
  getGoogleAdsConfig: vi.fn(),
  isMockMode: vi.fn(() => false),
  fetchGoogleCampaignStatus: vi.fn(),
}));

import { reconcileCampaignStatus } from '../reconcile-status';
import { prisma } from '@/lib/prisma';
import { getGoogleAdsConfig, isMockMode, fetchGoogleCampaignStatus } from '@/lib/google-ads';
import { PENDING_LAUNCH, PENDING_PAUSE } from '@/lib/campaign-status';

const pendente = (status: string, extra: any = {}) => ({
  id: 'c1', status, googleCampaignId: '111', metaCampaignId: null, loopEnabled: true, ...extra,
});

describe('A01/A02 — reconcileCampaignStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (isMockMode as any).mockReturnValue(false);
    (getGoogleAdsConfig as any).mockResolvedValue({ customerId: '1234567890' });
    (prisma.campaign.updateMany as any).mockResolvedValue({ count: 1 });
  });

  it('não toca em status que não é pendente', async () => {
    const r = await reconcileCampaignStatus('u1', pendente('ATIVA'));
    expect(r).toMatchObject({ status: 'ATIVA', reconciliado: false });
    expect(fetchGoogleCampaignStatus).not.toHaveBeenCalled();
  });

  it('promove PENDING_LAUNCH a ATIVA quando o remoto está ENABLED', async () => {
    (fetchGoogleCampaignStatus as any).mockResolvedValue('ENABLED');
    const r = await reconcileCampaignStatus('u1', pendente(PENDING_LAUNCH));
    expect(r).toMatchObject({ status: 'ATIVA', reconciliado: true });
    expect((prisma.campaign.updateMany as any).mock.calls[0][0].where.status).toBe(PENDING_LAUNCH);
    expect((prisma.campaignDecision.create as any).mock.calls[0][0].data.decision).toBe('STATUS_RECONCILED');
  });

  it('rebaixa PENDING_LAUNCH a PAUSADA quando o lançamento subiu pausado', async () => {
    (fetchGoogleCampaignStatus as any).mockResolvedValue('PAUSED');
    const r = await reconcileCampaignStatus('u1', pendente(PENDING_LAUNCH));
    expect(r).toMatchObject({ status: 'PAUSADA', reconciliado: true });
    expect((prisma.campaign.updateMany as any).mock.calls[0][0].data).not.toHaveProperty('loopEnabled');
  });

  it('confirma PENDING_PAUSE e desliga o loop quando o remoto reporta PAUSED', async () => {
    (fetchGoogleCampaignStatus as any).mockResolvedValue('PAUSED');
    const r = await reconcileCampaignStatus('u1', pendente(PENDING_PAUSE));
    expect(r).toMatchObject({ status: 'PAUSADA', loopEnabled: false, reconciliado: true });
    expect((prisma.campaign.updateMany as any).mock.calls[0][0].data).toMatchObject({ loopEnabled: false });
  });

  it('mantém PENDING_PAUSE quando o remoto ainda está ENABLED — pausa não foi aplicada', async () => {
    (fetchGoogleCampaignStatus as any).mockResolvedValue('ENABLED');
    const r = await reconcileCampaignStatus('u1', pendente(PENDING_PAUSE));
    expect(r).toMatchObject({ status: PENDING_PAUSE, reconciliado: false });
    expect(prisma.campaign.updateMany).not.toHaveBeenCalled();
  });

  it('status remoto UNKNOWN não resolve pendência', async () => {
    (fetchGoogleCampaignStatus as any).mockResolvedValue('UNKNOWN');
    const r = await reconcileCampaignStatus('u1', pendente(PENDING_LAUNCH));
    expect(r.reconciliado).toBe(false);
    expect(prisma.campaign.updateMany).not.toHaveBeenCalled();
  });

  it('falha de rede mantém a pendência, sem gravar decisão', async () => {
    (fetchGoogleCampaignStatus as any).mockRejectedValue(new Error('503 backend error'));
    const r = await reconcileCampaignStatus('u1', pendente(PENDING_LAUNCH));
    expect(r).toMatchObject({ status: PENDING_LAUNCH, reconciliado: false });
    expect(r.motivo).toContain('503');
    expect(prisma.campaignDecision.create).not.toHaveBeenCalled();
  });

  it('modo mock nunca resolve pendência — mock não confirma nada', async () => {
    (isMockMode as any).mockReturnValue(true);
    const r = await reconcileCampaignStatus('u1', pendente(PENDING_LAUNCH));
    expect(r.reconciliado).toBe(false);
    expect(fetchGoogleCampaignStatus).not.toHaveBeenCalled();
  });

  it('campanha Meta fica para reconciliação manual', async () => {
    const r = await reconcileCampaignStatus('u1', pendente(PENDING_PAUSE, { metaCampaignId: 'm1' }));
    expect(r.reconciliado).toBe(false);
    expect(fetchGoogleCampaignStatus).not.toHaveBeenCalled();
  });

  it('não sobrescreve pendência já resolvida por outro fluxo', async () => {
    (fetchGoogleCampaignStatus as any).mockResolvedValue('ENABLED');
    (prisma.campaign.updateMany as any).mockResolvedValue({ count: 0 });
    const r = await reconcileCampaignStatus('u1', pendente(PENDING_LAUNCH));
    expect(r).toMatchObject({ status: PENDING_LAUNCH, reconciliado: false });
    expect(prisma.campaignDecision.create).not.toHaveBeenCalled();
  });
});
