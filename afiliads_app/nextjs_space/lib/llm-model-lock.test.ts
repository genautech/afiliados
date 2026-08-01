import { describe, expect, it, vi } from 'vitest';

vi.mock('./prisma', () => ({
  prisma: {
    campaign: { findFirst: vi.fn() },
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

describe('Roteamento preferencial de Presell & Bridge Page', () => {
  it('tenta Kimi K3 primeiro no presell-builder e faz fallback se a credencial falhar', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
      if (String(url).includes('moonshot.ai')) {
        expect(JSON.parse(String(init?.body)).model).toBe('kimi-k3');
        return { ok: false, text: async () => 'Invalid Authentication' } as any;
      }
      if (String(url).includes('openai.com')) {
        return {
          ok: true,
          json: async () => ({
            choices: [{ message: { content: '{"headline":"Fallback válido"}' } }],
            usage: { prompt_tokens: 5, completion_tokens: 5, total_tokens: 10 },
            model: 'gpt-4o-mini',
          }),
        } as any;
      }
      throw new Error(`Provedor inesperado: ${url}`);
    });

    const res = await callAgent('user-1', {
      agent: 'presell-builder',
      systemPrompt: 'System',
      userPrompt: 'User',
    });

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(res.provider).toBe('openai');
    expect(res.data).toEqual({ headline: 'Fallback válido' });
    fetchSpy.mockRestore();
  });

  it('prefere Kimi K2.5 para bridge-page-builder', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
      if (String(url).includes('moonshot.ai')) {
        const requestBody = JSON.parse(String(init?.body));
        expect(requestBody.model).toBe('kimi-k2.5');
        return {
          ok: true,
          json: async () => ({
            choices: [{ message: { content: '{"titulo_pagina":"Página Teste"}' } }],
            usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
            model: 'kimi-k2.5',
          }),
        } as any;
      }
      throw new Error('Provedor não esperado antes do Kimi');
    });

    const res = await callAgent('user-1', {
      agent: 'bridge-page-builder',
      systemPrompt: 'System',
      userPrompt: 'User',
    });

    expect(res.provider).toBe('kimi');
    expect(res.model).toBe('kimi-k2.5');
    expect(res.data).toEqual({ titulo_pagina: 'Página Teste' });
    fetchSpy.mockRestore();
  });

  it('prefere Google/Gemini no validador para independência do modelo gerador', async () => {
    vi.mocked(prisma.integration.findMany).mockResolvedValueOnce([
      { serviceName: 'llm', fieldName: 'api_key_google', fieldValue: 'google-test-key' } as any,
      { serviceName: 'llm', fieldName: 'api_key_grok', fieldValue: 'grok-test-key' } as any,
    ]);
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      if (!String(url).includes('generativelanguage.googleapis.com')) {
        throw new Error(`Validador chamou provider inesperado primeiro: ${url}`);
      }
      return {
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: '{"approved":true,"score":90,"issues":[],"recommendations":[]}' }] } }],
          usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 10, totalTokenCount: 20 },
        }),
      } as any;
    });

    const res = await callAgent('user-1', {
      agent: 'bridge-page-validator',
      systemPrompt: 'System',
      userPrompt: 'User',
    });

    expect(res.provider).toBe('google');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    fetchSpy.mockRestore();
  });

  it('continua funcionando sem chave Kimi usando o próximo provider disponível', async () => {
    vi.mocked(prisma.integration.findMany).mockResolvedValueOnce([
      { serviceName: 'llm', fieldName: 'api_key_openai', fieldValue: 'openai-test-key' } as any,
    ]);
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"ok":true}' } }],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
        model: 'gpt-4o-mini',
      }),
    } as any);

    const res = await callAgent('user-1', {
      agent: 'presell-builder',
      systemPrompt: 'System',
      userPrompt: 'User',
    });

    expect(res.provider).toBe('openai');
    expect(res.data).toEqual({ ok: true });
    fetchSpy.mockRestore();
  });
});
