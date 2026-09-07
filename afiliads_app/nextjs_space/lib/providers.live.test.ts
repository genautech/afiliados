// Health-check REAL de cada provedor de LLM: bate na API de verdade com a chave que o app
// resolve, pelo mesmo callProvider que a cadeia de fallback usa. Fora da suíte padrão.
//
//   RUN_LIVE_LLM=1 npx vitest run lib/providers.live.test.ts
//
// Serve pra responder "o Vertex está de pé?", "a chave do OpenRouter entrou?", "o modelo
// configurado existe nesse provedor?" sem depender do fallback esconder a resposta.
import { describe, expect, it, beforeAll } from 'vitest';
import { prisma } from './prisma';
import { ACTIVE_PROVIDERS, callProvider, getRoutingContext, type Provider } from './llm';

const live = process.env.RUN_LIVE_LLM === '1';

describe.skipIf(!live)('provedores de LLM — LIVE', () => {
  let ctx: Awaited<ReturnType<typeof getRoutingContext>>;

  beforeAll(async () => {
    const user = await prisma.user.findFirst({ select: { id: true } });
    if (!user) throw new Error('Nenhum usuário no banco.');
    ctx = await getRoutingContext(user.id);
  });

  it('reporta o estado real de cada provedor com chave', async () => {
    const results: { provider: Provider; model: string; ok: boolean; detail: string }[] = [];

    for (const provider of ACTIVE_PROVIDERS) {
      const key = ctx.keys[provider];
      if (!key) {
        console.log(`[PROVIDER] ${provider.padEnd(11)} SEM CHAVE`);
        continue;
      }
      const model = ctx.models[provider] ?? DEFAULT_LIGHT_MODEL[provider];
      const via = key === 'vertex' ? ' (via Vertex)' : ` (${ctx.keySources[provider]})`;
      try {
        const res = await callProvider(provider, model, key, 'Responda em uma palavra.', 'Diga: pong.', 32);
        console.log(`[PROVIDER] ${provider.padEnd(11)} OK   ${model}${via} ${res.durationMs}ms :: ${res.text.trim().slice(0, 40)}`);
        results.push({ provider, model, ok: true, detail: res.text.trim().slice(0, 40) });
      } catch (err: any) {
        const msg = String(err?.message ?? err).replace(/\s+/g, ' ').slice(0, 220);
        console.log(`[PROVIDER] ${provider.padEnd(11)} FALHA ${model}${via} :: ${msg}`);
        results.push({ provider, model, ok: false, detail: msg });
      }
    }

    // Não falha por provedor individual: o valor aqui é o relatório. O que não pode é a
    // plataforma inteira estar de pé só no ollama local.
    const remotos = results.filter((r) => r.ok && r.provider !== 'ollama');
    expect(remotos.length, `nenhum provedor remoto respondeu: ${JSON.stringify(results)}`).toBeGreaterThan(0);
  }, 300_000);
});

// Espelha DEFAULT_MODELS[provider].light de lib/llm.ts (não exportado).
const DEFAULT_LIGHT_MODEL: Record<Provider, string> = {
  anthropic: 'claude-fable-5',
  openai: 'gpt-4o-mini',
  google: 'gemini-3.5-flash',
  grok: 'grok-4.1-fast-non-reasoning',
  ollama: 'gpt-oss:20b',
  abacusai: 'gpt-5.4-mini',
  kimi: 'kimi-k2.6',
  openrouter: 'moonshotai/kimi-k2.5',
};
