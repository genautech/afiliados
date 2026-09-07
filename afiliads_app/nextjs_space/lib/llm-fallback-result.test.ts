import { describe, expect, it, vi, afterEach } from 'vitest';

vi.mock('./prisma', () => ({
  prisma: {
    campaign: { findFirst: vi.fn() },
    agentRun: { create: vi.fn().mockResolvedValue({}), groupBy: vi.fn().mockResolvedValue([]) },
    integration: {
      findMany: vi.fn().mockResolvedValue([
        { serviceName: 'llm', fieldName: 'api_key_anthropic', fieldValue: 'anthropic-sem-credito' },
        { serviceName: 'llm', fieldName: 'api_key_openrouter', fieldValue: 'openrouter-ok' },
      ]),
    },
  },
}));
vi.mock('./integration-secrets', () => ({
  readIntegrationFieldValue: (_field: string, value: string) => value,
}));

import { callAgent } from './llm';

afterEach(() => { vi.restoreAllMocks(); });

describe('resultado depois de fallback', () => {
  it('não marca como erro uma chamada que só deu certo no segundo provedor', async () => {
    // Contrato sob teste: qualquer hop abandonado antes do sucesso não pode vazar para
    // `result.error`. Aqui o anthropic é descartado antes mesmo da chamada HTTP (o prisma
    // mockado não tem $transaction, então a reserva de budget falha) — o caminho é outro, mas
    // o efeito é o mesmo: lastError populado com sucesso no hop seguinte. O cenário real
    // equivalente — conta Anthropic sem crédito na frente do tier premium — foi verificado
    // vivo em 2026-09-07 por lib/providers.live.test.ts.
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const u = String(url);
      if (u.includes('api.anthropic.com')) {
        return { ok: false, text: async () => 'Your credit balance is too low' } as any;
      }
      if (u.includes('openrouter.ai')) {
        return {
          ok: true,
          json: async () => ({
            choices: [{ message: { content: 'pong' } }],
            usage: { prompt_tokens: 5, completion_tokens: 1, total_tokens: 6 },
            model: 'anthropic/claude-opus-4.8',
          }),
        } as any;
      }
      throw new Error(`Provedor inesperado: ${u}`);
    });

    const res = await callAgent('user-1', {
      agent: 'compliance-sentinel',
      systemPrompt: 'curto',
      userPrompt: 'ping',
      campaignTarget: { kind: 'non-campaign' },
    });

    expect(res.provider).toBe('openrouter');
    expect(res.text).toContain('pong');
    // O consumidor (ex.: app/api/campaign-audit/route.ts) usa `!result.error` como sinal de
    // sucesso — se o erro do hop anterior vazar aqui, toda auditoria bem-sucedida vira falha.
    expect(res.error).toBeNull();
  });
});
