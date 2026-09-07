import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

// O guard de mutação é default-deny; a saga A01 só existe depois dele. Habilitar aqui exercita
// o caminho real do guard em vez de mocká-lo.
const envAnterior = {
  enabled: process.env.GOOGLE_ADS_MUTATIONS_ENABLED,
  allowlist: process.env.GOOGLE_ADS_MUTATION_ALLOWLIST,
};
process.env.GOOGLE_ADS_MUTATIONS_ENABLED = 'true';
process.env.GOOGLE_ADS_MUTATION_ALLOWLIST = '1234567890';
afterAll(() => {
  process.env.GOOGLE_ADS_MUTATIONS_ENABLED = envAnterior.enabled;
  process.env.GOOGLE_ADS_MUTATION_ALLOWLIST = envAnterior.allowlist;
});

vi.mock('@/lib/prisma', () => ({
  prisma: {
    campaign: { findFirst: vi.fn(), update: vi.fn() },
    campaignDecision: { create: vi.fn().mockResolvedValue({}) },
    keyword: { findMany: vi.fn().mockResolvedValue([]), update: vi.fn() },
  },
}));

vi.mock('@/lib/google-ads', () => ({
  fetchGoogleCampaign: vi.fn(),
  fetchGoogleAdsKeywordMetrics: vi.fn().mockResolvedValue([]),
  fetchGoogleAdsDailyMetrics: vi.fn(),
  fetchGoogleCampaignStatus: vi.fn(),
  mutateGoogleCampaign: vi.fn(),
  getGoogleAdsConfig: vi.fn().mockResolvedValue({ customerId: '1234567890', developerToken: 'real' }),
  isMockMode: vi.fn(() => false),
}));

vi.mock('next-auth', () => ({
  getServerSession: vi.fn().mockResolvedValue({ user: { id: 'user-1' } }),
}));

import { prisma } from '@/lib/prisma';
import { fetchGoogleCampaignStatus, mutateGoogleCampaign } from '@/lib/google-ads';
import { POST } from '../route';
import { NextRequest } from 'next/server';

const campanha = {
  id: 'camp-1',
  userId: 'user-1',
  name: 'Alpha',
  googleCampaignName: 'CB_ALPHA',
  googleCampaignId: '9876543210',
  status: 'ATIVA',
  budgetDaily: 50,
  loopEnabled: true,
  wizardCompleted: true,
  updatedAt: new Date(1234),
};

function requisicao(status: string) {
  return new NextRequest('http://localhost:3000/api/google-ads/sync', {
    method: 'POST',
    body: JSON.stringify({
      campaignId: 'camp-1',
      direction: 'push',
      updates: { status },
      authorization: {
        confirmed: true, operation: 'MUTATE_CAMPAIGN', resourceId: 'camp-1',
        revision: '1234', idempotencyKey: 'push_saga_key_001',
      },
    }),
  });
}

const statusGravado = () =>
  vi.mocked(prisma.campaign.update).mock.calls.map((c: any) => c[0]?.data?.status).filter(Boolean);

describe('A01 — PUSH de status só muda o estado local depois da confirmação remota', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.campaign.findFirst).mockResolvedValue(campanha as any);
    (prisma.campaign.update as any).mockImplementation(async (args: any) => ({ ...campanha, ...args.data }));
    vi.mocked(prisma.campaignDecision.create).mockResolvedValue({} as any);
  });

  it('mutação que explode deixa PENDING_PAUSE e registra a pendência, sem afirmar PAUSADA', async () => {
    vi.mocked(mutateGoogleCampaign).mockRejectedValue(new Error('503 do Google Ads'));

    const res = await POST(requisicao('PAUSADO'));
    const json = await res.json();

    expect(res.status).toBe(502);
    expect(json.retryable).toBe(true);
    expect(statusGravado()).toEqual(['PENDING_PAUSE']);
    expect(statusGravado()).not.toContain('PAUSADA');
    expect(vi.mocked(prisma.campaignDecision.create).mock.calls[0][0].data).toMatchObject({
      decision: 'SYNC_PUSH_FAILED',
    });
  });

  it('mutação aceita mas estado remoto ainda ENABLED não vira PAUSADA local', async () => {
    vi.mocked(mutateGoogleCampaign).mockResolvedValue({ success: true, log: 'aceito' } as any);
    vi.mocked(fetchGoogleCampaignStatus).mockResolvedValue('ENABLED' as any);

    const res = await POST(requisicao('PAUSADO'));

    expect(res.status).toBe(502);
    expect(statusGravado()).toEqual(['PENDING_PAUSE']);
  });

  it('success:false do mutate é falha, não confirmação', async () => {
    vi.mocked(mutateGoogleCampaign).mockResolvedValue({ success: false, log: 'quota' } as any);

    const res = await POST(requisicao('PAUSADO'));

    expect(res.status).toBe(502);
    expect(fetchGoogleCampaignStatus).not.toHaveBeenCalled();
    expect(statusGravado()).toEqual(['PENDING_PAUSE']);
  });

  it('ativação não confirmada fica PENDING_LAUNCH, nunca ATIVA', async () => {
    vi.mocked(mutateGoogleCampaign).mockResolvedValue({ success: true, log: 'aceito' } as any);
    vi.mocked(fetchGoogleCampaignStatus).mockResolvedValue('PAUSED' as any);

    const res = await POST(requisicao('ATIVO'));

    expect(res.status).toBe(502);
    expect(statusGravado()).toEqual(['PENDING_LAUNCH']);
  });

  it('releitura remota batendo com o pedido confirma o estado local', async () => {
    vi.mocked(mutateGoogleCampaign).mockResolvedValue({ success: true, log: 'ok' } as any);
    vi.mocked(fetchGoogleCampaignStatus).mockResolvedValue('PAUSED' as any);

    const res = await POST(requisicao('PAUSADO'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(statusGravado()).toEqual(['PAUSADA']);
    expect(json.launchState).toBe('PAUSED');
    expect(vi.mocked(prisma.campaignDecision.create).mock.calls[0][0].data).toMatchObject({ decision: 'SYNC_PUSH' });
  });
});
