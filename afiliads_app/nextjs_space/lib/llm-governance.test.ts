import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { integrationFindMany, usageGroupBy, runCreate, runUpdate, budgetTransaction, budgetAggregate, reservationCreate } = vi.hoisted(() => ({
  integrationFindMany: vi.fn(),
  usageGroupBy: vi.fn(),
  runCreate: vi.fn(),
  runUpdate: vi.fn(),
  budgetTransaction: vi.fn(),
  budgetAggregate: vi.fn(),
  reservationCreate: vi.fn(),
}));
vi.mock('./prisma', () => ({
  prisma: {
    $transaction: budgetTransaction,
    campaign: { findFirst: vi.fn() },
    integration: { findMany: integrationFindMany },
    agentRun: { groupBy: usageGroupBy, create: runCreate, update: runUpdate },
  },
}));
vi.mock('./integration-secrets', () => ({
  readIntegrationFieldValue: (_fieldName: string, value: string) => value,
}));

import {
  buildChain,
  callAgent,
  getRoutingContext,
  resolveOllamaApiBaseUrl,
  vertexHost,
} from './llm';

describe('LLM governance', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    integrationFindMany.mockResolvedValue([]);
    usageGroupBy.mockResolvedValue([]);
    runCreate.mockResolvedValue({});
    runUpdate.mockResolvedValue({});
    budgetAggregate.mockResolvedValue({ _sum: { totalTokens: 0 } });
    reservationCreate.mockResolvedValue({ id: 'reservation-1' });
    budgetTransaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => callback({
      agentRun: { aggregate: budgetAggregate, create: reservationCreate },
    }));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('kill switch com todos os providers desabilitados produz cadeia vazia', () => {
    const keys = { anthropic: 'a', openai: 'o' };
    const chain = buildChain({
      mode: 'auto', manualProvider: null, keys, keySources: {}, models: {},
      budgets: { anthropic: 0, openai: 0, google: 0, grok: 0, ollama: 0, abacusai: 0, kimi: 0 },
      monthUsage: { anthropic: 0, openai: 0, google: 0, grok: 0, ollama: 0, abacusai: 0, kimi: 0 },
      disabled: new Set(['anthropic', 'openai']),
    } as any, 'standard');
    expect(chain).toEqual([]);
  });

  it('hard cap remove provider acima do orçamento', () => {
    const chain = buildChain({
      mode: 'auto', manualProvider: null, keys: { anthropic: 'a', openai: 'o' }, keySources: {}, models: {},
      budgets: { anthropic: 10, openai: 0, google: 0, grok: 0, ollama: 0, abacusai: 0, kimi: 0 },
      monthUsage: { anthropic: 10, openai: 0, google: 0, grok: 0, ollama: 0, abacusai: 0, kimi: 0 },
      disabled: new Set(),
    } as any, 'premium');
    expect(chain.map((step) => step.provider)).toEqual(['openai']);
  });

  it('hard cap reserva a saída máxima antes de iniciar chamada', () => {
    const chain = buildChain({
      mode: 'auto', manualProvider: null, keys: { openai: 'o' }, keySources: {}, models: {},
      budgets: { openai: 100 }, monthUsage: { openai: 90 }, disabled: new Set(),
    } as any, 'standard', 20);
    expect(chain).toEqual([]);
  });

  it('rejeita model override fora da allowlist antes de chamar provider', async () => {
    integrationFindMany.mockResolvedValue([
      { fieldName: 'api_key_openai', fieldValue: 'key' },
      { fieldName: 'model_openai', fieldValue: 'gpt-ultra-expensive-unknown' },
    ]);
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    await expect(getRoutingContext('u1')).rejects.toThrow('Modelo não permitido');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('preserva Gemini BYOK mesmo quando Vertex está configurado', async () => {
    integrationFindMany.mockResolvedValue([{ fieldName: 'api_key_google', fieldValue: 'byok-google' }]);
    vi.stubEnv('GCP_PROJECT_ID', 'project');
    vi.stubEnv('GCP_SERVICE_ACCOUNT_JSON', '{}');
    const ctx = await getRoutingContext('u1');
    expect(ctx.keys.google).toBe('byok-google');
    expect(ctx.keySources.google).toBe('byok');
  });

  it('valida região Vertex e endpoint Ollama com bearer antes da rede', () => {
    expect(() => vertexHost('evil.example/path')).toThrow('GCP_VERTEX_LOCATION inválida');
    expect(() => resolveOllamaApiBaseUrl('https://evil.example/v1', true, '')).toThrow('Host de OLLAMA_BASE_URL não autorizado');
    expect(resolveOllamaApiBaseUrl('http://127.0.0.1:11434/v1', false, '')).toBe('http://127.0.0.1:11434/v1');
  });

  it('não entrega sucesso nem repete chamada paga quando AgentRun falha', async () => {
    integrationFindMany.mockResolvedValue([{ fieldName: 'api_key_openai', fieldValue: 'key' }]);
    runCreate.mockRejectedValue(new Error('database unavailable'));
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"ok":true}' } }],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
        model: 'gpt-4o-mini',
      }),
    } as any);

    await expect(callAgent('u1', { agent: 'product-hunter', systemPrompt: 's', userPrompt: 'u', campaignTarget: { kind: 'non-campaign' } }))
      .rejects.toThrow('Falha ao persistir telemetria financeira');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('reserva saldo atomicamente e limita a saída enviada ao provider', async () => {
    integrationFindMany.mockResolvedValue([
      { fieldName: 'api_key_openai', fieldValue: 'key' },
      { fieldName: 'budget_tokens_openai', fieldValue: '200' },
    ]);
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"ok":true}' } }],
        usage: { prompt_tokens: 2, completion_tokens: 4, total_tokens: 6 },
        model: 'gpt-4o-mini',
      }),
    } as any);

    await callAgent('u1', { agent: 'product-hunter', systemPrompt: 's', userPrompt: 'u', campaignTarget: { kind: 'non-campaign' } });

    const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
    const promptReserve = new TextEncoder().encode('s' + 'u').length + 64;
    expect(body.max_completion_tokens).toBe(200 - promptReserve);
    expect(reservationCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ totalTokens: 200 }),
    }));
    expect(runUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ totalTokens: 6, success: true }),
    }));
  });
});
