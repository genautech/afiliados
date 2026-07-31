import { describe, expect, it, vi } from 'vitest';

vi.mock('../../prisma', () => ({
  prisma: {
    googleAdsExperiment: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('../../google-ads/client', () => ({
  getGoogleAdsConfig: vi.fn().mockResolvedValue({
    developerToken: 'mock-dev-token',
    customerId: '1234567890',
  }),
  isMockMode: vi.fn().mockReturnValue(true),
}));

import { prisma } from '../../prisma';
import { syncDueExperiments } from '../orchestration';

describe('syncDueExperiments (Deterministic Worker)', () => {
  it('sincroniza experimentos ativos em lote sem consumir tokens de LLM', async () => {
    vi.mocked(prisma.googleAdsExperiment.findMany).mockResolvedValue([
      { id: 'exp-1', userId: 'user-1', campaignId: 'camp-1', status: 'RUNNING', resourceName: 'customers/123/experiments/1' },
      { id: 'exp-2', userId: 'user-2', campaignId: 'camp-2', status: 'SCHEDULED', resourceName: 'customers/123/experiments/2' },
    ] as any);

    const syncSingleMock = vi.fn().mockResolvedValue({ status: 'RUNNING' });

    const result = await syncDueExperiments({
      syncSingle: syncSingleMock,
    });

    expect(result.syncedCount).toBe(2);
    expect(syncSingleMock).toHaveBeenCalledWith('exp-1', 'user-1');
    expect(syncSingleMock).toHaveBeenCalledWith('exp-2', 'user-2');
  });

  it('captura falhas individuais sem interromper os demais experimentos na fila', async () => {
    vi.mocked(prisma.googleAdsExperiment.findMany).mockResolvedValue([
      { id: 'exp-1', userId: 'user-1', campaignId: 'camp-1', status: 'RUNNING', resourceName: 'customers/123/experiments/1' },
      { id: 'exp-2', userId: 'user-2', campaignId: 'camp-2', status: 'SCHEDULED', resourceName: 'customers/123/experiments/2' },
    ] as any);

    const syncSingleMock = vi.fn()
      .mockRejectedValueOnce(new Error('Erro de conexão no exp-1'))
      .mockResolvedValueOnce({ status: 'SCHEDULED' });

    const result = await syncDueExperiments({
      syncSingle: syncSingleMock,
    });

    expect(result.syncedCount).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toEqual({
      experimentId: 'exp-1',
      error: 'Erro de conexão no exp-1',
    });
  });
});
