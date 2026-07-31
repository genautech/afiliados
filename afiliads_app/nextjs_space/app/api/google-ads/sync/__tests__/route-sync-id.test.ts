import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    campaign: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    campaignDecision: {
      create: vi.fn().mockResolvedValue({}),
    },
    keyword: {
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn(),
    },
  },
}));

vi.mock('@/lib/google-ads', () => ({
  fetchGoogleCampaign: vi.fn(),
  fetchGoogleAdsKeywordMetrics: vi.fn().mockResolvedValue([]),
  mutateGoogleCampaign: vi.fn(),
}));

vi.mock('next-auth', () => ({
  getServerSession: vi.fn().mockResolvedValue({
    user: { id: 'user-1' },
  }),
}));

import { prisma } from '@/lib/prisma';
import { fetchGoogleCampaign, mutateGoogleCampaign } from '@/lib/google-ads';
import { POST } from '../route';
import { NextRequest } from 'next/server';

describe('POST /api/google-ads/sync - googleCampaignId handling', () => {
  it('usa campaign.googleCampaignId diretamente em PUSH sem fazer fetch de busca quando o ID numérico já existe', async () => {
    vi.mocked(prisma.campaign.findFirst).mockResolvedValue({
      id: 'camp-1',
      userId: 'user-1',
      name: 'Alpha Campaign',
      googleCampaignName: 'CB_ALPHA_US',
      googleCampaignId: '9876543210',
      status: 'EM_TESTE',
      budgetDaily: 50,
      loopEnabled: true,
    } as any);

    vi.mocked(mutateGoogleCampaign).mockResolvedValue({
      success: true,
      log: 'Campanha 9876543210 atualizada para status PAUSED',
    } as any);

    vi.mocked(prisma.campaign.update).mockResolvedValue({} as any);

    const req = new NextRequest('http://localhost:3000/api/google-ads/sync', {
      method: 'POST',
      body: JSON.stringify({
        campaignId: 'camp-1',
        direction: 'push',
        updates: { status: 'PAUSADO' },
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    // Deve ter chamado mutateGoogleCampaign com o ID numérico '9876543210'
    expect(mutateGoogleCampaign).toHaveBeenCalledWith('user-1', '9876543210', { status: 'PAUSED' });
    // Não deve ter chamado fetchGoogleCampaign porque o ID numérico já estava presente
    expect(fetchGoogleCampaign).not.toHaveBeenCalled();
  });

  it('persiste googleCampaignId no PULL quando o ID é descoberto na busca remota', async () => {
    vi.mocked(prisma.campaign.findFirst).mockResolvedValue({
      id: 'camp-2',
      userId: 'user-1',
      name: 'Beta Campaign',
      googleCampaignName: 'CB_BETA_US',
      googleCampaignId: null,
      status: 'EM_TESTE',
      budgetDaily: 50,
      loopEnabled: true,
    } as any);

    vi.mocked(fetchGoogleCampaign).mockResolvedValue({
      name: 'CB_BETA_US',
      googleCampaignId: '1122334455',
      status: 'ENABLED',
      budgetDaily: 60,
      bidStrategy: 'MANUAL_CPC',
    } as any);

    vi.mocked(prisma.campaign.update).mockResolvedValue({} as any);

    const req = new NextRequest('http://localhost:3000/api/google-ads/sync', {
      method: 'POST',
      body: JSON.stringify({
        campaignId: 'camp-2',
        direction: 'pull',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    // Deve ter persistido googleCampaignId no update do Prisma
    expect(prisma.campaign.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'camp-2' },
        data: expect.objectContaining({
          googleCampaignId: '1122334455',
        }),
      })
    );
  });
});
