// Teste REAL (sem mock de LLM): bate na rota com o callAgent de verdade, provedor de verdade,
// rede de verdade. Fica fora da suíte padrão porque depende de chave + rede; rode com:
//
//   RUN_LIVE_LLM=1 npx vitest run app/api/wizard-field-check/__tests__/route.live.test.ts
//
// Só o next-auth é stubado (a sessão não tem como ser real fora do browser). Nenhum campaignId
// é enviado de propósito: o alvo vira { kind: 'non-campaign' }, então o CampaignGuard não é
// acionado e nenhum token é gasto em cima de campanha real (ver ~/Scripts/campaign-guard/POLICY.md).
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { AGENT_TIERS, buildChain, callAgent, getRoutingContext } from '@/lib/llm';
import { POST } from '../route';

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));

const live = process.env.RUN_LIVE_LLM === '1';

function request(body: unknown) {
  return new NextRequest('http://localhost/api/wizard-field-check', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe.skipIf(!live)('POST /api/wizard-field-check — LIVE', () => {
  let userId: string;

  beforeAll(async () => {
    const user = await prisma.user.findFirst({ select: { id: true } });
    if (!user) throw new Error('Nenhum usuário no banco — não dá pra rodar o teste real.');
    userId = user.id;
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: userId } } as never);
  });

  it('tem pelo menos um provedor com chave resolvida', async () => {
    const ctx = await getRoutingContext(userId);
    const providers = Object.keys(ctx.keys);
    console.log('[LIVE] provedores com chave:', providers.join(', ') || '(nenhum)');
    expect(providers.length).toBeGreaterThan(0);
  });

  it('mostra qual provedor/modelo realmente atendeu (pega fallback silencioso)', async () => {
    // wizard-validator é tier 'light' — a cadeia dele começa no ollama local de propósito.
    const tier = AGENT_TIERS['wizard-validator'] ?? 'standard';
    const ctx = await getRoutingContext(userId);
    const chain = buildChain(ctx, tier);
    console.log(`[LIVE] cadeia ${tier}:`, chain.map((s) => `${s.provider}:${s.model}`).join(' → '));

    const res = await callAgent(userId, {
      agent: 'wizard-validator',
      systemPrompt: 'Responda em uma frase curta.',
      userPrompt: 'Diga apenas: ping.',
      campaignTarget: { kind: 'non-campaign' },
    });
    console.log(`[LIVE] atendeu: provider=${res.provider} model=${res.model} tokens=${res.usage.totalTokens} ${res.durationMs}ms`);

    expect(res.error).toBeNull();
    expect(res.provider).toBeTruthy();
    // O provedor que atendeu tem que ser o primeiro da cadeia; se não for, houve fallback
    // silencioso (chave morta / quota) e a campanha está rodando num modelo que não é o escolhido.
    expect(res.provider).toBe(chain[0]?.provider);
  }, 120_000);

  it('valida o campo vertical com diagnóstico real do LLM', async () => {
    const res = await POST(request({ fieldKey: 'vertical', fieldValue: 'Weight Loss' }));
    const json = await res.json();
    console.log('[LIVE] resposta:', JSON.stringify(json).slice(0, 600));

    expect(res.status).toBe(200);
    expect(json.error).toBeUndefined();
    expect(json.success).toBe(true);
    expect(typeof json.response).toBe('string');
    // Diagnóstico real tem corpo; resposta vazia ou de uma palavra significa provider degradado.
    expect(json.response.length).toBeGreaterThan(80);
    // valorSugerido só pode sair se for uma vertical válida do wizard (schema da rota).
    expect(json.valorSugerido === null || typeof json.valorSugerido === 'string').toBe(true);
  }, 120_000);

  it('valida um campo numérico real (commission) sem sugerir valor fora de faixa', async () => {
    const res = await POST(request({
      fieldKey: 'commission',
      fieldValue: '75',
      context: { vertical: 'Weight Loss', channel: 'SEARCH', platform: 'ClickBank' },
    }));
    const json = await res.json();
    console.log('[LIVE] commission:', JSON.stringify(json).slice(0, 600));

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    if (json.valorSugerido !== null) {
      expect(Number(json.valorSugerido)).toBeGreaterThanOrEqual(0);
    }
  }, 120_000);
});
