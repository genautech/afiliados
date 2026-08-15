import { describe, expect, it, vi } from 'vitest';
import { CampaignGuardError } from './campaign-guard';

vi.mock('./prisma', () => ({
  prisma: {
    campaign: {
      findFirst: vi.fn(),
    },
    agentRun: {
      create: vi.fn().mockResolvedValue({}),
      groupBy: vi.fn().mockResolvedValue([]),
    },
    integration: {
      findMany: vi.fn().mockResolvedValue([
        { serviceName: 'llm', fieldName: 'api_key_kimi', fieldValue: 'kimi-test-key' },
        { serviceName: 'llm', fieldName: 'api_key_openai', fieldValue: 'openai-test-key' },
      ]),
    },
  },
}));

import { prisma } from './prisma';
import { callAgent } from './llm';

describe('callAgent - Campaign Guard Integration', () => {
  it('bloqueia e não invoca provedor LLM quando o CampaignGuard rejeita a campanha', async () => {
    const oldDate = new Date(Date.now() - 40 * 60 * 1000); // 40 min atrás
    vi.mocked(prisma.campaign.findFirst).mockResolvedValue({
      id: 'camp-123',
      status: 'EM_TESTE',
      updatedAt: oldDate,
    } as any);

    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    await expect(
      callAgent('user-1', {
        agent: 'ads-auditor',
        systemPrompt: 'System',
        userPrompt: 'User',
        campaignId: 'camp-123',
        campaignTarget: { kind: 'campaign', campaignId: 'camp-123' },
      }),
    ).rejects.toThrow(CampaignGuardError);

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('falha fechado se campaignTarget é de campanha mas campaignId é indefinido', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    await expect(
      callAgent('user-1', {
        agent: 'ads-auditor',
        systemPrompt: 'System',
        userPrompt: 'User',
        campaignTarget: { kind: 'campaign' },
      }),
    ).rejects.toThrow('sem campaignId informado');

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('rejeita campaignId combinado com alvo non-campaign', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    await expect(callAgent('user-1', {
      agent: 'ads-auditor', systemPrompt: 'System', userPrompt: 'User',
      campaignId: 'camp-123', campaignTarget: { kind: 'non-campaign' },
    })).rejects.toThrow('campaignTarget contraditório');
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('falha fechado quando o caller omite target explícito', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    await expect(callAgent('user-1', {
      agent: 'product-hunter', systemPrompt: 'System', userPrompt: 'User',
    } as any)).rejects.toThrow('campaignTarget explícito');
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('rejeita IDs divergentes entre campaignTarget e campaignId', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    await expect(callAgent('user-1', {
      agent: 'ads-auditor', systemPrompt: 'System', userPrompt: 'User',
      campaignId: 'camp-budget', campaignTarget: { kind: 'campaign', campaignId: 'camp-guard' },
    })).rejects.toThrow('campaignTarget contraditório');
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('restringe paused-compliance ao compliance-sentinel', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    await expect(callAgent('user-1', {
      agent: 'ads-auditor', systemPrompt: 'System', userPrompt: 'User', campaignId: 'camp-123',
      campaignTarget: { kind: 'campaign', campaignId: 'camp-123', purpose: 'paused-compliance' },
    })).rejects.toThrow('paused-compliance');
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
