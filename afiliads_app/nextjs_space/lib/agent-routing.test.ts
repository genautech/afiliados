import { describe, expect, it } from 'vitest';
import {
  ACTIVE_PROVIDERS,
  AGENT_ROUTING_PREFERENCES,
  assertAllowedProviderModel,
  KIMI_MODELS,
  resolveAgentChain,
  type Provider,
  type RoutingContext,
} from './llm';

// Contexto com todo provedor disponível: isola a decisão de ORDEM da disponibilidade de chave.
function ctxComTodasAsChaves(): RoutingContext {
  const keys: Partial<Record<Provider, string>> = {};
  const keySources: Partial<Record<Provider, 'byok' | 'platform'>> = {};
  for (const p of ACTIVE_PROVIDERS) {
    keys[p] = 'k';
    keySources[p] = 'platform';
  }
  return {
    mode: 'auto',
    manualProvider: undefined,
    keys,
    keySources,
    models: {},
    budgets: {},
    monthUsage: { anthropic: 0, openai: 0, google: 0, grok: 0, ollama: 0, abacusai: 0, kimi: 0, openrouter: 0 },
    disabled: new Set<Provider>(),
    costMultipliers: {},
  } as unknown as RoutingContext;
}

describe('roteamento por agente', () => {
  it('wizard-validator não começa no ollama local', () => {
    // Validação de campo do wizard alimenta decisão de campanha real. O tier 'light' segue
    // valendo por custo, mas a ordem de provider põe nuvem na frente.
    const chain = resolveAgentChain(ctxComTodasAsChaves(), 'wizard-validator');
    expect(chain[0].provider).not.toBe('ollama');
    expect(chain[0].provider).toBe('openrouter');
    expect(chain[1].provider).toBe('kimi');
    // ollama continua na cadeia como rede de segurança grátis, só que no fim.
    expect(chain.map((s) => s.provider)).toContain('ollama');
  });

  it('kimi é fallback disponível em todo tier', () => {
    for (const agent of ['wizard-validator', 'campaign-strategist', 'compliance-sentinel']) {
      const providers = resolveAgentChain(ctxComTodasAsChaves(), agent).map((s) => s.provider);
      expect(providers, `kimi ausente na cadeia de ${agent}`).toContain('kimi');
    }
  });

  it('não usa kimi-k2.5 na API direta da Moonshot (lá o modelo é 404)', () => {
    // k2.5 só existe via OpenRouter (moonshotai/kimi-k2.5). Na api.moonshot.ai os modelos são
    // k2.6, k2.7-code, k2.7-code-highspeed e k3 — verificado contra a API em 2026-09-07.
    const agentes = ['wizard-validator', 'bridge-page-validator', 'analysis-assistant', 'campaign-strategist'];
    for (const agent of agentes) {
      const passoKimi = resolveAgentChain(ctxComTodasAsChaves(), agent).find((s) => s.provider === 'kimi');
      if (passoKimi) {
        expect(passoKimi.model, `${agent} caiu no k2.5 direto`).not.toBe(KIMI_MODELS.K2_5);
      }
    }
  });

  it('agente premium continua no Claude quando a chave direta da Anthropic morre', () => {
    // Sem crédito na Anthropic, o próximo hop do TIER_CHAINS premium tem que ser Claude via
    // OpenRouter — não um modelo de outra família. Verificado vivo: anthropic/claude-opus-4.8
    // responde pelo OpenRouter mesmo com a conta direta zerada.
    // Usa fact-steward, que é premium sem preferência própria — ads-auditor e
    // compliance-sentinel têm preferência explícita por google e não exercitam a cadeia base.
    const ctx = ctxComTodasAsChaves();
    delete (ctx.keys as Record<string, string>).anthropic;

    const chain = resolveAgentChain(ctx, 'fact-steward');
    expect(chain[0].provider).toBe('openrouter');
    expect(chain[0].model).toContain('claude');
  });

  it('todo modelo default e override existe na allowlist do provedor', () => {
    // Pega id de modelo inventado antes de virar 404 em runtime: foi assim que o
    // gemini-2.5-pro-preview-06-05 entrou como premium do google (404 no Vertex).
    for (const agent of Object.keys(AGENT_ROUTING_PREFERENCES)) {
      for (const step of resolveAgentChain(ctxComTodasAsChaves(), agent)) {
        expect(
          () => assertAllowedProviderModel(step.provider, step.model),
          `${agent} -> ${step.provider}:${step.model}`,
        ).not.toThrow();
      }
    }
  });

  it('preferência de provider só reordena — não descarta provedor da cadeia', () => {
    const base = resolveAgentChain(ctxComTodasAsChaves(), 'agente-sem-preferencia-definida');
    const comPref = resolveAgentChain(ctxComTodasAsChaves(), 'wizard-validator');
    expect(AGENT_ROUTING_PREFERENCES['wizard-validator']).toBeDefined();
    expect(new Set(comPref.map((s) => s.provider))).toEqual(new Set(base.map((s) => s.provider)));
  });
});
