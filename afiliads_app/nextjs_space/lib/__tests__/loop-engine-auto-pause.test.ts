import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ORIGINAL_ENV = { ...process.env };

vi.mock('@/lib/prisma', () => ({
  prisma: {
    campaign: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
    },
    campaignDecision: { create: vi.fn().mockResolvedValue({}) },
    testResult: { upsert: vi.fn().mockResolvedValue({}) },
    loopRun: { create: vi.fn().mockResolvedValue({ id: 'lr-1' }) },
  },
}));

vi.mock('@/lib/llm', () => ({
  callAgent: vi.fn().mockResolvedValue({
    data: { concorda: true, diagnostico: 'ok', ajustes: [] },
    usage: { totalTokens: 50 },
  }),
}));

const mockGetGoogleAdsConfig = vi.fn();
const mockFetchGoogleCampaign = vi.fn();
const mockMutateGoogleCampaign = vi.fn().mockResolvedValue({ success: true, log: 'Paused' });
const mockIsMockMode = vi.fn();

vi.mock('@/lib/google-ads', () => ({
  getGoogleAdsConfig: (...args: any[]) => mockGetGoogleAdsConfig(...args),
  fetchGoogleCampaign: (...args: any[]) => mockFetchGoogleCampaign(...args),
  mutateGoogleCampaign: (...args: any[]) => mockMutateGoogleCampaign(...args),
  isMockMode: (...args: any[]) => mockIsMockMode(...args),
}));

vi.mock('@/lib/campaign-rules', () => ({
  computeEconomics: vi.fn().mockReturnValue({
    spend: 100, revenue: 0, profit: -100, clicks: 50, hops: 0,
    hopRatePct: 0, conversions: 0, epcReal: 0, cpcReal: 2,
    cvrRealPct: 0, budgetBurnPct: 200, logCount: 5,
  }),
  evaluateRules: vi.fn(),
}));

import { prisma } from '@/lib/prisma';
import { evaluateRules } from '@/lib/campaign-rules';
import { runCampaignLoop } from '@/lib/loop-engine';

function makeCampaign(overrides: Record<string, any> = {}) {
  return {
    id: 'camp-1',
    userId: 'user-1',
    name: 'Test Campaign',
    status: 'EM_TESTE',
    platform: 'clickbank',
    vertical: 'health',
    funnel: 'BRIDGE',
    budgetDaily: 50,
    budgetTest: 100,
    bidStrategy: 'MANUAL_CPC',
    commissionNet: 30,
    epcBreakeven: 1,
    cpcMax: 3,
    cpcScale: 2,
    presellUrl: null,
    loopEnabled: true,
    loopAgents: 'ads',
    loopInterval: '24h',
    lastLoopRunAt: null,
    launchedAt: new Date(),
    createdAt: new Date(),
    dailyLogs: [],
    googleCampaignId: '12345',
    googleCampaignName: 'Test Campaign',
    ...overrides,
  };
}

describe('loop-engine auto-pause via mutation guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.GOOGLE_ADS_MUTATIONS_ENABLED;
    delete process.env.GOOGLE_ADS_MUTATION_ALLOWLIST;
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('KILL: passes MutationCapability to mutateGoogleCampaign in mock mode', async () => {
    const campaign = makeCampaign();
    (prisma.campaign.findFirst as any).mockResolvedValue(campaign);
    (evaluateRules as any).mockReturnValue({ decision: 'KILL', triggers: ['gasto 2x comissão sem conversão'] });
    mockGetGoogleAdsConfig.mockResolvedValue({ customerId: '1112223333' });
    mockIsMockMode.mockReturnValue(true);

    const result = await runCampaignLoop('user-1', 'camp-1', 'manual');

    expect(result.decision).toBe('KILL');
    expect(mockMutateGoogleCampaign).toHaveBeenCalledOnce();

    const [, , updates, capabilities] = mockMutateGoogleCampaign.mock.calls[0];
    expect(updates).toEqual({ status: 'PAUSED' });
    expect(capabilities).toBeDefined();
    expect(capabilities.status).toBeDefined();
    expect(capabilities.status.operation).toBe('mutateGoogleCampaign.status');
    expect(capabilities.status.customerId).toBe('1112223333');
  });

  it('PAUSAR: passes MutationCapability to mutateGoogleCampaign in mock mode', async () => {
    const campaign = makeCampaign();
    (prisma.campaign.findFirst as any).mockResolvedValue(campaign);
    (evaluateRules as any).mockReturnValue({ decision: 'PAUSAR', triggers: ['budget de teste consumido'] });
    mockGetGoogleAdsConfig.mockResolvedValue({ customerId: '1112223333' });
    mockIsMockMode.mockReturnValue(true);

    const result = await runCampaignLoop('user-1', 'camp-1', 'manual');

    expect(result.decision).toBe('PAUSAR');
    expect(mockMutateGoogleCampaign).toHaveBeenCalledOnce();

    const [, , updates, capabilities] = mockMutateGoogleCampaign.mock.calls[0];
    expect(updates).toEqual({ status: 'PAUSED' });
    expect(capabilities?.status).toBeDefined();
  });

  it('KILL: guard blocks when env GOOGLE_ADS_MUTATIONS_ENABLED is not true (real mode)', async () => {
    const campaign = makeCampaign();
    (prisma.campaign.findFirst as any).mockResolvedValue(campaign);
    (evaluateRules as any).mockReturnValue({ decision: 'KILL', triggers: ['gasto 2x'] });
    mockGetGoogleAdsConfig.mockResolvedValue({ customerId: '1112223333' });
    mockIsMockMode.mockReturnValue(false);

    const result = await runCampaignLoop('user-1', 'camp-1', 'manual');

    expect(result.decision).toBe('KILL');
    expect(mockMutateGoogleCampaign).not.toHaveBeenCalled();
    expect(result.triggers).toContainEqual(
      expect.stringContaining('bloqueado pelo guard')
    );
  });

  it('KILL: guard allows when env is true, allowlist matches, and passes capability', async () => {
    process.env.GOOGLE_ADS_MUTATIONS_ENABLED = 'true';
    process.env.GOOGLE_ADS_MUTATION_ALLOWLIST = '1112223333';

    const campaign = makeCampaign();
    (prisma.campaign.findFirst as any).mockResolvedValue(campaign);
    (evaluateRules as any).mockReturnValue({ decision: 'KILL', triggers: ['gasto 2x'] });
    mockGetGoogleAdsConfig.mockResolvedValue({ customerId: '1112223333' });
    mockIsMockMode.mockReturnValue(false);

    const result = await runCampaignLoop('user-1', 'camp-1', 'manual');

    expect(mockMutateGoogleCampaign).toHaveBeenCalledOnce();
    const [, , , capabilities] = mockMutateGoogleCampaign.mock.calls[0];
    expect(capabilities?.status).toBeDefined();
    expect(capabilities.status.operation).toBe('mutateGoogleCampaign.status');
    expect(result.triggers).toContainEqual(
      expect.stringContaining('Campanha pausada na conta de anúncios')
    );
  });

  it('KILL: guard blocks when customer not in allowlist (real mode)', async () => {
    process.env.GOOGLE_ADS_MUTATIONS_ENABLED = 'true';
    process.env.GOOGLE_ADS_MUTATION_ALLOWLIST = '9999999999';

    const campaign = makeCampaign();
    (prisma.campaign.findFirst as any).mockResolvedValue(campaign);
    (evaluateRules as any).mockReturnValue({ decision: 'KILL', triggers: ['gasto 2x'] });
    mockGetGoogleAdsConfig.mockResolvedValue({ customerId: '1112223333' });
    mockIsMockMode.mockReturnValue(false);

    const result = await runCampaignLoop('user-1', 'camp-1', 'manual');

    expect(mockMutateGoogleCampaign).not.toHaveBeenCalled();
    expect(result.triggers).toContainEqual(
      expect.stringContaining('bloqueado pelo guard')
    );
  });

  it('skips auto-pause when no Google Ads config exists', async () => {
    const campaign = makeCampaign();
    (prisma.campaign.findFirst as any).mockResolvedValue(campaign);
    (evaluateRules as any).mockReturnValue({ decision: 'KILL', triggers: ['gasto 2x'] });
    mockGetGoogleAdsConfig.mockResolvedValue(null);

    const result = await runCampaignLoop('user-1', 'camp-1', 'manual');

    expect(result.decision).toBe('KILL');
    expect(mockMutateGoogleCampaign).not.toHaveBeenCalled();
  });

  it('resolves Google campaign ID via remote when local ID is missing', async () => {
    const campaign = makeCampaign({ googleCampaignId: null });
    (prisma.campaign.findFirst as any).mockResolvedValue(campaign);
    (evaluateRules as any).mockReturnValue({ decision: 'KILL', triggers: ['gasto 2x'] });
    mockGetGoogleAdsConfig.mockResolvedValue({ customerId: '1112223333' });
    mockIsMockMode.mockReturnValue(true);
    mockFetchGoogleCampaign.mockResolvedValue({ googleCampaignId: '67890' });

    await runCampaignLoop('user-1', 'camp-1', 'manual');

    expect(mockFetchGoogleCampaign).toHaveBeenCalledWith('user-1', 'Test Campaign');
    expect(mockMutateGoogleCampaign).toHaveBeenCalledOnce();
    expect(mockMutateGoogleCampaign.mock.calls[0][1]).toBe('67890');
  });

  it('CONTINUAR decision does not call Google Ads at all', async () => {
    const campaign = makeCampaign();
    (prisma.campaign.findFirst as any).mockResolvedValue(campaign);
    (evaluateRules as any).mockReturnValue({ decision: 'CONTINUAR', triggers: ['campanha dentro dos parâmetros'] });

    const result = await runCampaignLoop('user-1', 'camp-1', 'manual');

    expect(result.decision).toBe('CONTINUAR');
    expect(mockGetGoogleAdsConfig).not.toHaveBeenCalled();
    expect(mockMutateGoogleCampaign).not.toHaveBeenCalled();
  });

  it('SCALE decision does not auto-apply (human approval only)', async () => {
    const campaign = makeCampaign();
    (prisma.campaign.findFirst as any).mockResolvedValue(campaign);
    (evaluateRules as any).mockReturnValue({ decision: 'SCALE', triggers: ['EPC > CPC'] });

    const result = await runCampaignLoop('user-1', 'camp-1', 'manual');

    expect(result.decision).toBe('SCALE');
    expect(mockGetGoogleAdsConfig).not.toHaveBeenCalled();
    expect(mockMutateGoogleCampaign).not.toHaveBeenCalled();
  });
});
