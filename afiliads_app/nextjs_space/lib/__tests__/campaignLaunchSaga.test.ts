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
    claimLedgerEntry: {
      aggregate: vi.fn().mockResolvedValue({ _max: { version: null } }),
      findMany: vi.fn().mockResolvedValue([]),
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
    // clearAllMocks nao apaga implementacao: sem ledger por padrao, cada teste
    // que quiser exercitar o gate reprograma estes dois.
    (prisma.claimLedgerEntry.aggregate as any).mockResolvedValue({ _max: { version: null } });
    (prisma.claimLedgerEntry.findMany as any).mockResolvedValue([]);
  });

  it('blocks launch when the claim ledger has a forbidden claim in copy', async () => {
    (prisma.campaign.findFirst as any).mockResolvedValue({
      id: 'campaign-claims',
      userId: 'user-1',
      platform: 'ClickBank',
      launchCheckpoint: 'DRAFT',
      keywords: [],
    });
    (prisma.claimLedgerEntry.aggregate as any).mockResolvedValue({ _max: { version: 2 } });
    (prisma.claimLedgerEntry.findMany as any).mockResolvedValue([
      { id: 'c1', claim: 'Cura em 7 dias', status: 'PROIBIDO', source: null, allowedChannels: ['landing'] },
    ]);

    const result = await executeLaunchSaga('campaign-claims', 'user-1', { isMockMode: true });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Ledger de claims reprovado');
    expect(createGoogleCampaign).not.toHaveBeenCalled();
    expect(prisma.claimLedgerEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ version: 2 }) }),
    );
  });

  it('does not let bypassReadiness skip the claim gate', async () => {
    (prisma.campaign.findFirst as any).mockResolvedValue({
      id: 'campaign-claims',
      userId: 'user-1',
      platform: 'ClickBank',
      launchCheckpoint: 'DRAFT',
      keywords: [],
    });
    (prisma.claimLedgerEntry.aggregate as any).mockResolvedValue({ _max: { version: 1 } });
    (prisma.claimLedgerEntry.findMany as any).mockResolvedValue([
      { id: 'c1', claim: 'Ganho garantido', status: 'INFERENCIA', source: null, allowedChannels: ['google-ads'] },
    ]);

    const result = await executeLaunchSaga('campaign-claims', 'user-1', {
      isMockMode: true,
      bypassReadiness: true,
    });

    expect(result.success).toBe(false);
    expect(createGoogleCampaign).not.toHaveBeenCalled();
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
