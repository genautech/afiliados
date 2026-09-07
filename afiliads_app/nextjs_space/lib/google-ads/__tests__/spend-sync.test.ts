import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    campaign: { findFirst: vi.fn(), updateMany: vi.fn() },
    campaignDecision: { findFirst: vi.fn(), create: vi.fn() },
    dailyLog: { upsert: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock('@/lib/google-ads', () => ({
  fetchGoogleAdsDailyMetrics: vi.fn(),
}));

import { syncCampaignSpend } from '../spend-sync';
import { prisma } from '@/lib/prisma';
import { fetchGoogleAdsDailyMetrics } from '@/lib/google-ads';

const campanha = {
  id: 'c1',
  userId: 'u1',
  googleCampaignId: '111',
  launchedAt: new Date('2026-09-01T00:00:00.000Z'),
  createdAt: new Date('2026-08-01T00:00:00.000Z'),
};

const lote = (metrics: any[] = []) => ({
  googleCampaignId: '111',
  from: '2026-09-01',
  through: '2026-09-06',
  timeZone: 'America/Sao_Paulo',
  observedAt: new Date('2026-09-06T12:00:00.000Z'),
  metrics,
});

const metrica = (date: string, costMicros: number) => ({
  date, costMicros, clicks: 10, impressions: 100, conversions: 1,
});

describe('A03/A05 — syncCampaignSpend', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.campaign.findFirst as any).mockResolvedValue(campanha);
    (prisma.campaign.updateMany as any).mockResolvedValue({ count: 1 });
    (prisma.campaignDecision.findFirst as any).mockResolvedValue(null);
    (prisma.$transaction as any).mockImplementation(async (fn: any) => fn(prisma));
    (fetchGoogleAdsDailyMetrics as any).mockResolvedValue(lote([metrica('2026-09-05', 7_500_000)]));
  });

  it('recusa campanha sem ID Google Ads — sem ID não há gasto atribuível', async () => {
    (prisma.campaign.findFirst as any).mockResolvedValue({ ...campanha, googleCampaignId: null });
    await expect(syncCampaignSpend('u1', 'c1')).rejects.toThrow(/sem ID Google Ads/i);
    expect(fetchGoogleAdsDailyMetrics).not.toHaveBeenCalled();
  });

  it('busca a partir do lançamento da campanha, não de uma janela fixa (A05)', async () => {
    await syncCampaignSpend('u1', 'c1');
    const [, id, desde] = (fetchGoogleAdsDailyMetrics as any).mock.calls[0];
    expect(id).toBe('111');
    expect(desde).toEqual(campanha.launchedAt);
  });

  it('cai para createdAt quando a campanha nunca foi lançada', async () => {
    (prisma.campaign.findFirst as any).mockResolvedValue({ ...campanha, launchedAt: null });
    await syncCampaignSpend('u1', 'c1');
    expect((fetchGoogleAdsDailyMetrics as any).mock.calls[0][2]).toEqual(campanha.createdAt);
  });

  it('aborta se a campanha mudou de dono ou de ID remoto durante a busca', async () => {
    (prisma.campaign.updateMany as any).mockResolvedValue({ count: 0 });
    await expect(syncCampaignSpend('u1', 'c1')).rejects.toThrow(/mudou durante a sincronização/i);
    expect(prisma.dailyLog.upsert).not.toHaveBeenCalled();
    expect(prisma.campaignDecision.create).not.toHaveBeenCalled();
  });

  it('descarta lote velho quando já existe sync mais recente gravado', async () => {
    (prisma.campaignDecision.findFirst as any).mockResolvedValue({
      createdAt: new Date(Date.now() + 60_000),
    });
    await expect(syncCampaignSpend('u1', 'c1')).rejects.toThrow(/sincronização mais recente/i);
    expect(prisma.dailyLog.upsert).not.toHaveBeenCalled();
  });

  it('grava só gasto/cliques/impressões — não zera receita nem reembolso do diário', async () => {
    await syncCampaignSpend('u1', 'c1');
    const args = (prisma.dailyLog.upsert as any).mock.calls[0][0];
    expect(args.where).toEqual({
      campaignId_logDate: { campaignId: 'c1', logDate: new Date('2026-09-05T00:00:00.000Z') },
    });
    expect(args.update.spend).toBeCloseTo(7.5, 6);
    expect(args.update.clicks).toBe(10);
    expect(args.update.impressions).toBe(100);
    expect(args.update).not.toHaveProperty('revenue');
    expect(args.update).not.toHaveProperty('refunds');
    expect(args.update).not.toHaveProperty('conversions');
    expect(args.create.network).toBe('Google Ads');
  });

  it('devolve a cobertura observada e registra SPEND_SYNC_COMPLETE com ela', async () => {
    const res = await syncCampaignSpend('u1', 'c1');
    expect(res.dailyLogsUpdated).toBe(1);
    expect(res.coverage).toMatchObject({
      googleCampaignId: '111',
      from: '2026-09-01',
      through: '2026-09-06',
      timeZone: 'America/Sao_Paulo',
      observedAt: '2026-09-06T12:00:00.000Z',
    });
    const decisao = (prisma.campaignDecision.create as any).mock.calls[0][0].data;
    expect(decisao.decision).toBe('SPEND_SYNC_COMPLETE');
    expect(JSON.parse(decisao.rationale)).toEqual(res.coverage);
  });

  it('lote vazio não grava diário, mas ainda registra a cobertura observada', async () => {
    (fetchGoogleAdsDailyMetrics as any).mockResolvedValue(lote([]));
    const res = await syncCampaignSpend('u1', 'c1');
    expect(prisma.dailyLog.upsert).not.toHaveBeenCalled();
    expect(res.dailyLogsUpdated).toBe(0);
    expect((prisma.campaignDecision.create as any).mock.calls[0][0].data.decision).toBe('SPEND_SYNC_COMPLETE');
  });

  it('usa transação serializável — leitura e escrita do lote não podem intercalar', async () => {
    await syncCampaignSpend('u1', 'c1');
    expect((prisma.$transaction as any).mock.calls[0][1]).toMatchObject({ isolationLevel: 'Serializable' });
  });
});
