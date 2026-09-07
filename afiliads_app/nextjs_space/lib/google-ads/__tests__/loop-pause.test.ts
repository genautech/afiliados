import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    campaign: { update: vi.fn(), updateMany: vi.fn() },
    campaignDecision: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock('@/lib/google-ads', () => ({
  getGoogleAdsConfig: vi.fn(),
  isMockMode: vi.fn(() => false),
  mutateGoogleCampaign: vi.fn(),
  fetchGoogleCampaignStatus: vi.fn(),
}));

vi.mock('../mutation-guard', () => ({
  assertMutationAllowed: vi.fn(() => ({ allowed: true, capability: { token: 'ok' } })),
}));

import { confirmLoopPause } from '../loop-pause';
import { prisma } from '@/lib/prisma';
import { getGoogleAdsConfig, isMockMode, mutateGoogleCampaign, fetchGoogleCampaignStatus } from '@/lib/google-ads';
import { PENDING_PAUSE } from '@/lib/campaign-status';

const campanha = { id: 'c1', googleCampaignId: '111', loopEnabled: true, metaCampaignId: null };

const decisoes = () => (prisma.campaignDecision.create as any).mock.calls.map((c: any[]) => c[0].data.decision);

describe('A01 — confirmLoopPause só rebaixa status local após confirmação remota', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (isMockMode as any).mockReturnValue(false);
    (getGoogleAdsConfig as any).mockResolvedValue({ customerId: '1234567890' });
    // O tx enxerga os mesmos mocks: o que interessa é a ordem das decisões gravadas.
    (prisma.$transaction as any).mockImplementation(async (fn: any) => fn(prisma));
  });

  it('confirma pausa quando o Google Ads passa a reportar PAUSED', async () => {
    (fetchGoogleCampaignStatus as any)
      .mockResolvedValueOnce('ENABLED')
      .mockResolvedValueOnce('PAUSED');
    (mutateGoogleCampaign as any).mockResolvedValue({ success: true });

    await confirmLoopPause('u1', campanha, 'PAUSADO');

    expect(mutateGoogleCampaign).toHaveBeenCalledWith('u1', '111', { status: 'PAUSED' }, expect.anything());
    expect(decisoes()).toEqual(['AUTO_PAUSE_PENDING', 'AUTO_PAUSE_CONFIRMED']);
    expect(prisma.campaign.updateMany).not.toHaveBeenCalled();
  });

  it('não chama mutação quando a campanha já está pausada remotamente', async () => {
    (fetchGoogleCampaignStatus as any).mockResolvedValue('PAUSED');

    await confirmLoopPause('u1', campanha, 'KILL');

    expect(mutateGoogleCampaign).not.toHaveBeenCalled();
    expect(decisoes()).toEqual(['AUTO_PAUSE_PENDING', 'AUTO_PAUSE_CONFIRMED']);
  });

  it('falha da API remota deixa PENDING_PAUSE e AUTO_PAUSE_FAILED, sem marcar pausado', async () => {
    (fetchGoogleCampaignStatus as any).mockResolvedValueOnce('ENABLED');
    (mutateGoogleCampaign as any).mockRejectedValue(new Error('503 do Google Ads'));

    await expect(confirmLoopPause('u1', campanha, 'PAUSADO')).rejects.toThrow('503');

    expect(decisoes()).toEqual(['AUTO_PAUSE_PENDING', 'AUTO_PAUSE_FAILED']);
    expect(prisma.campaign.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: { status: PENDING_PAUSE },
    }));
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('mutação aceita mas status remoto ainda ENABLED não confirma pausa local', async () => {
    (fetchGoogleCampaignStatus as any)
      .mockResolvedValueOnce('ENABLED')
      .mockResolvedValueOnce('ENABLED');
    (mutateGoogleCampaign as any).mockResolvedValue({ success: true });

    await expect(confirmLoopPause('u1', campanha, 'PAUSADO')).rejects.toThrow('não confirmada remotamente');

    expect(decisoes()).toEqual(['AUTO_PAUSE_PENDING', 'AUTO_PAUSE_FAILED']);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('recusa pausa sem ID Google Ads, sem loop habilitado, em mock ou com Meta pendente', async () => {
    (fetchGoogleCampaignStatus as any).mockResolvedValue('PAUSED');

    await expect(confirmLoopPause('u1', { ...campanha, loopEnabled: false }, 'PAUSADO')).rejects.toThrow('loop habilitado');
    await expect(confirmLoopPause('u1', { ...campanha, googleCampaignId: null }, 'PAUSADO')).rejects.toThrow('reconciliação manual');
    await expect(confirmLoopPause('u1', { ...campanha, metaCampaignId: 'm1' }, 'PAUSADO')).rejects.toThrow('Meta');

    (isMockMode as any).mockReturnValue(true);
    await expect(confirmLoopPause('u1', campanha, 'PAUSADO')).rejects.toThrow('integração Google Ads real');

    expect(prisma.campaignDecision.create).not.toHaveBeenCalled();
    expect(mutateGoogleCampaign).not.toHaveBeenCalled();
  });
});
