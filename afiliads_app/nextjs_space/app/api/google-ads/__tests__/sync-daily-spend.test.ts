// A03 — o pull do Google Ads tem que gravar gasto diário no DailyLog.
// Antes ele atualizava keyword e não escrevia `spend` em lugar nenhum: o loop, que decide
// olhando DailyLog, ficava permanentemente em SEM_DADOS.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';

const mocks = vi.hoisted(() => ({
  campaignFindFirst: vi.fn(),
  campaignUpdate: vi.fn(),
  decisionCreate: vi.fn(),
  keywordFindMany: vi.fn(),
  dailyLogUpsert: vi.fn(),
  fetchGoogleCampaign: vi.fn(),
  fetchKeywordMetrics: vi.fn(),
  fetchDailyMetrics: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    campaign: { findFirst: mocks.campaignFindFirst, update: mocks.campaignUpdate },
    campaignDecision: { create: mocks.decisionCreate },
    keyword: { findMany: mocks.keywordFindMany, update: vi.fn() },
    dailyLog: { upsert: mocks.dailyLogUpsert },
  },
}));
vi.mock('@/lib/google-ads', () => ({
  fetchGoogleCampaign: mocks.fetchGoogleCampaign,
  fetchGoogleAdsKeywordMetrics: mocks.fetchKeywordMetrics,
  fetchGoogleAdsDailyMetrics: mocks.fetchDailyMetrics,
  mutateGoogleCampaign: vi.fn(),
  getGoogleAdsConfig: vi.fn(),
  isMockMode: vi.fn(() => false),
}));
vi.mock('@/lib/google-ads/route-mutation-authorization', () => ({ authorizeMutation: vi.fn() }));
vi.mock('@/lib/google-ads/mutation-guard', () => ({ assertMutationAllowed: vi.fn() }));
vi.mock('@/lib/campaign-launch-state', () => ({ deriveCampaignLaunchState: () => 'PREPARADA' }));
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));

import { POST } from '../sync/route';

function req(body: unknown) {
  return new NextRequest('http://localhost/api/google-ads/sync', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

describe('A03 — sync grava gasto diário', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-1' } } as never);
    mocks.campaignFindFirst.mockResolvedValue({
      id: 'c1', name: 'camp', googleCampaignName: 'camp', googleCampaignId: '123',
      status: 'ATIVA', loopEnabled: true,
    });
    mocks.campaignUpdate.mockResolvedValue({ id: 'c1' });
    mocks.decisionCreate.mockResolvedValue({});
    mocks.keywordFindMany.mockResolvedValue([]);
    mocks.fetchKeywordMetrics.mockResolvedValue([]);
    mocks.dailyLogUpsert.mockResolvedValue({});
    mocks.fetchGoogleCampaign.mockResolvedValue({
      googleCampaignId: '123', name: 'camp', status: 'ENABLED',
      budgetDaily: 50, bidStrategy: 'MAXIMIZE_CONVERSIONS',
    });
  });

  it('gasto 50 e 100 cliques viram DailyLog.spend=50 com syncedAt', async () => {
    mocks.fetchDailyMetrics.mockResolvedValue([
      { date: '2026-09-06', costMicros: 50_000_000, clicks: 100, impressions: 900, conversions: 2 },
    ]);

    const res = await POST(req({ campaignId: 'c1', direction: 'pull' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.dailyLogsUpdated).toBe(1);
    const chamada = mocks.dailyLogUpsert.mock.calls[0][0];
    expect(chamada.update.spend).toBe(50);
    expect(chamada.update.clicks).toBe(100);
    expect(chamada.update.impressions).toBe(900);
    expect(chamada.update.syncedAt).toBeInstanceOf(Date);
  });

  it('não escreve receita nem reembolso — esses campos são do ClickBank (M04)', async () => {
    mocks.fetchDailyMetrics.mockResolvedValue([
      { date: '2026-09-06', costMicros: 50_000_000, clicks: 100, impressions: 900, conversions: 2 },
    ]);

    await POST(req({ campaignId: 'c1', direction: 'pull' }));

    const update = mocks.dailyLogUpsert.mock.calls[0][0].update;
    expect(update).not.toHaveProperty('revenue');
    expect(update).not.toHaveProperty('refunds');
    expect(update).not.toHaveProperty('conversions');
  });

  it('falha na consulta de métricas vira erro real na resposta, não silêncio', async () => {
    mocks.fetchDailyMetrics.mockRejectedValue(new Error('Google Ads recusou a consulta (403)'));

    const res = await POST(req({ campaignId: 'c1', direction: 'pull' }));
    const json = await res.json();

    expect(res.status).toBe(200); // o sync de campanha em si funcionou
    expect(json.dailyLogsUpdated).toBe(0);
    expect(json.dailyMetricsError).toContain('403');
  });

  it('vários dias geram um upsert por dia', async () => {
    mocks.fetchDailyMetrics.mockResolvedValue([
      { date: '2026-09-05', costMicros: 10_000_000, clicks: 10, impressions: 100, conversions: 0 },
      { date: '2026-09-06', costMicros: 20_000_000, clicks: 20, impressions: 200, conversions: 1 },
    ]);

    const res = await POST(req({ campaignId: 'c1', direction: 'pull' }));
    expect((await res.json()).dailyLogsUpdated).toBe(2);
    expect(mocks.dailyLogUpsert).toHaveBeenCalledTimes(2);
  });
});
