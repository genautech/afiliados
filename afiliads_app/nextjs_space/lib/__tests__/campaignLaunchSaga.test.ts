import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeLaunchSaga } from '../campaignLaunchSaga';
import { prisma } from '../prisma';
import { createGoogleCampaign } from '../google-ads';

vi.mock('../prisma', () => ({
  prisma: {
    campaign: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    campaignChecklist: {
      findMany: vi.fn(),
    },
    productResearch: {
      findUnique: vi.fn(),
    },
    campaignDecision: {
      create: vi.fn(),
    },
    integration: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    $transaction: vi.fn((arg) => {
      if (typeof arg === 'function') {
        return arg(prisma);
      }
      return Promise.all(arg);
    }),
  },
}));

vi.mock('../google-ads', () => ({
  createGoogleCampaign: vi.fn(),
  getGoogleAdsConfig: vi.fn().mockResolvedValue({ customerId: '1234567890' }),
  isMockMode: vi.fn().mockReturnValue(true),
}));

vi.mock('../google-ads/mutation-guard', () => ({
  assertMutationAllowed: vi.fn().mockReturnValue({ allowed: true, capability: {} }),
}));

describe('Campaign Launch Saga', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should transition through checkpoints to SUCCESS during unified parallel launch', async () => {
    const mockCampaign = {
      id: 'camp_1',
      userId: 'user_1',
      name: 'Launch Campaign',
      geo: 'US',
      keywords: [],
      budgetDaily: 50,
      launchCheckpoint: 'DRAFT',
      launchIdempotencyKey: null,
    };

    vi.mocked(prisma.campaign.findFirst).mockResolvedValue(mockCampaign as any);
    vi.mocked(prisma.campaign.findUnique).mockResolvedValue({
      ...mockCampaign,
      launchCheckpoint: 'SUCCESS',
      googleCampaignId: 'g-camp-1',
      googleAdGroupId: 'g-adg-1',
    } as any);

    vi.mocked(createGoogleCampaign).mockResolvedValue({
      success: true,
      googleCampaignId: 'g-camp-1',
      googleAdGroupId: 'g-adg-1',
      mock: true,
      logs: ['Created google campaign'],
    } as any);

    const result = await executeLaunchSaga('camp_1', 'user_1', {
      idempotencyKey: 'key_1',
      bypassReadiness: true,
      isMockMode: true
    });

    console.log("RESULT LOGS:", result.logs);
    console.log("RESULT ERROR:", result.error);

    expect(result.success).toBe(true);
    expect(result.checkpoint).toBe('SUCCESS');
    expect(result.googleCampaignId).toBe('g-camp-1');
  });
});
