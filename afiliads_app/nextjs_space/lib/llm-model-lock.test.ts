import { afterEach, describe, expect, it, vi } from 'vitest';

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

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('Roteamento preferencial de Presell & Bridge Page', () => {
  it('tenta Kimi K3 primeiro no presell-builder e faz fallback se a credencial falhar', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
      if (String(url).includes('moonshot.ai')) {
        const requestBody = JSON.parse(String(init?.body));
        expect(requestBody.model).toBe('kimi-k3');
        expect(requestBody.reasoning_effort).toBe('low');
        expect(requestBody.max_completion_tokens).toBe(4096);
        expect(requestBody).not.toHaveProperty('max_tokens');
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

  it('prefere o modelo oficial Kimi Code para bridge-page-builder', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
      if (String(url).includes('moonshot.ai')) {
        const requestBody = JSON.parse(String(init?.body));
        expect(requestBody.model).toBe('kimi-k2.7-code');
        expect(requestBody.max_completion_tokens).toBe(4096);
        expect(requestBody).not.toHaveProperty('max_tokens');
        expect(requestBody).not.toHaveProperty('reasoning_effort');
        expect(requestBody.thinking).toEqual({ type: 'enabled', keep: 'all' });
        return {
          ok: true,
          json: async () => ({
            choices: [{ message: { content: '{"titulo_pagina":"Página Teste"}' } }],
            usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
            model: 'kimi-k2.7-code',
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
    expect(res.model).toBe('kimi-k2.7-code');
    expect(res.data).toEqual({ titulo_pagina: 'Página Teste' });
    fetchSpy.mockRestore();
  });

  it('respeita o modelo Kimi configurado pelo usuário antes do padrão do agente', async () => {
    vi.mocked(prisma.integration.findMany).mockResolvedValueOnce([
      { serviceName: 'llm', fieldName: 'api_key_kimi', fieldValue: 'kimi-test-key' } as any,
      { serviceName: 'llm', fieldName: 'model_kimi', fieldValue: 'kimi-k2.6' } as any,
    ]);
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
      expect(JSON.parse(String(init?.body)).model).toBe('kimi-k2.6');
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: '{"ok":true}' } }],
          usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
          model: 'kimi-k2.6',
        }),
      } as any;
    });

    const res = await callAgent('user-1', {
      agent: 'presell-builder',
      systemPrompt: 'System',
      userPrompt: 'User',
    });

    expect(res.model).toBe('kimi-k2.6');
    fetchSpy.mockRestore();
  });

  it('usa KIMI_API_BASE_URL sem alterar o contrato OpenAI-compatible', async () => {
    vi.stubEnv('KIMI_API_BASE_URL', 'https://kimi.example.test/v1/');
    vi.stubEnv('KIMI_API_ALLOWED_HOSTS', 'kimi.example.test');
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"ok":true}' } }],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
        model: 'kimi-k3',
      }),
    } as any);

    await callAgent('user-1', {
      agent: 'presell-builder',
      systemPrompt: 'System',
      userPrompt: 'User',
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://kimi.example.test/v1/chat/completions',
      expect.objectContaining({ method: 'POST' })
    );
    fetchSpy.mockRestore();
  });

  it.each([
    { baseUrl: 'http://api.moonshot.ai/v1', expectedError: 'KIMI_API_BASE_URL deve usar HTTPS' },
    {
      baseUrl: 'https://credential:secret@api.moonshot.ai/v1',
      expectedError: 'KIMI_API_BASE_URL não pode conter credenciais',
    },
    {
      baseUrl: 'https://untrusted.example.test/v1',
      expectedError: 'Host de KIMI_API_BASE_URL não autorizado',
    },
    {
      baseUrl: 'https://api.moonshot.ai:8443/v1',
      expectedError: 'Host de KIMI_API_BASE_URL não autorizado',
    },
  ])('rejeita endpoint Kimi inseguro ou não autorizado antes de enviar a chave: $baseUrl', async ({ baseUrl, expectedError }) => {
    vi.stubEnv('KIMI_API_BASE_URL', baseUrl);
    vi.mocked(prisma.integration.findMany).mockResolvedValueOnce([
      { serviceName: 'llm', fieldName: 'api_key_kimi', fieldValue: 'kimi-test-key' } as any,
    ]);
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    await expect(callAgent('user-1', {
      agent: 'presell-builder',
      systemPrompt: 'System',
      userPrompt: 'User',
    })).rejects.toThrow(expectedError);

    expect(fetchSpy).not.toHaveBeenCalled();
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

  it.each([
    {
      label: 'quota insuficiente',
      status: 429,
      error: { type: 'exceeded_current_quota_error', message: 'Token quota is insufficient' },
    },
    {
      label: 'conteúdo filtrado',
      status: 400,
      error: { type: 'content_filter', message: 'The request was rejected because it was considered high risk' },
    },
  ])('faz fallback real sem fabricar HTML quando Kimi retorna $label', async ({ status, error }) => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      if (String(url).includes('moonshot.ai')) {
        return {
          ok: false,
          status,
          text: async () => JSON.stringify({ error }),
        } as any;
      }
      if (String(url).includes('openai.com')) {
        return {
          ok: true,
          json: async () => ({
            choices: [{ message: { content: '{"ok":true,"source":"fallback"}' } }],
            usage: { prompt_tokens: 2, completion_tokens: 3, total_tokens: 5 },
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

    const calledUrls = fetchSpy.mock.calls.map(([url]) => String(url));
    expect(calledUrls.filter((url) => url.includes('moonshot.ai'))).toHaveLength(1);
    expect(calledUrls.filter((url) => url.includes('openai.com'))).toHaveLength(1);
    expect(res.provider).toBe('openai');
    expect(res.data).toEqual({ ok: true, source: 'fallback' });
    expect(res.text).not.toContain('<!--');
    fetchSpy.mockRestore();
  });
});
