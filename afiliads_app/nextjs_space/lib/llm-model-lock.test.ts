import { describe, expect, it, vi } from 'vitest';

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
        { serviceName: 'llm', fieldName: 'api_key_kimi', fieldValue: 'kimi-key-123' },
        { serviceName: 'llm', fieldName: 'api_key_openai', fieldValue: 'openai-key-123' },
      ]),
    },
  },
}));

import { prisma } from './prisma';
import { callAgent } from './llm';

describe('Model Lock - Presell & Bridge Page', () => {
  it('força o provedor kimi e modelo kimi-k3 para presell-builder sem fallback silencioso', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      if (String(url).includes('moonshot.ai')) {
        return {
          ok: false,
          text: async () => 'Kimi quota exceeded',
        } as any;
      }
      return {
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'OpenAI response' } }] }),
      } as any;
    });

    await expect(
      callAgent('user-1', {
        agent: 'presell-builder',
        systemPrompt: 'System',
        userPrompt: 'User',
      }),
    ).rejects.toThrow(/Kimi/i);

    // Garante que só tentou Moonshot/Kimi e NUNCA chamou OpenAI/Anthropic/Google/Grok
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0][0]).toContain('moonshot.ai');

    fetchSpy.mockRestore();
  });

  it('força o provedor kimi e modelo kimi-k3 para bridge-page-builder', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      if (String(url).includes('moonshot.ai')) {
        return {
          ok: true,
          json: async () => ({
            choices: [{ message: { content: '{"titulo_pagina":"Página Teste"}' } }],
            usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
            model: 'kimi-k3',
          }),
        } as any;
      }
      throw new Error('Provedor não permitido para modelo travado');
    });

    const res = await callAgent('user-1', {
      agent: 'bridge-page-builder',
      systemPrompt: 'System',
      userPrompt: 'User',
    });

    expect(res.provider).toBe('kimi');
    expect(res.model).toBe('kimi-k3');
    expect(res.data).toEqual({ titulo_pagina: 'Página Teste' });

    fetchSpy.mockRestore();
  });

  it('falha imediatamente se a chave do Kimi não estiver configurada', async () => {
    vi.mocked(prisma.integration.findMany).mockResolvedValueOnce([]); // sem chaves

    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    await expect(
      callAgent('user-1', {
        agent: 'presell-builder',
        systemPrompt: 'System',
        userPrompt: 'User',
      }),
    ).rejects.toThrow(/exige Kimi K3/i);

    expect(fetchSpy).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
  });
});
