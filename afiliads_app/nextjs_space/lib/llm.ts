import { prisma } from './prisma';
import { GoogleAuth } from 'google-auth-library';
import { estimateCostUsd } from './llm-pricing';

let vertexAuth: GoogleAuth | null = null;
let vertexClientPromise: Promise<any> | null = null;

function getVertexAuth(): GoogleAuth {
  if (!vertexAuth) {
    const raw = process.env.GCP_SERVICE_ACCOUNT_JSON;
    if (!raw) throw new Error('GCP_SERVICE_ACCOUNT_JSON não configurado');
    vertexAuth = new GoogleAuth({
      credentials: JSON.parse(raw),
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
  }
  return vertexAuth;
}

async function getVertexAccessToken(): Promise<string> {
  if (!vertexClientPromise) vertexClientPromise = getVertexAuth().getClient();
  const client = await vertexClientPromise;
  const { token } = await client.getAccessToken();
  if (!token) throw new Error('Falha ao obter access token do Vertex AI');
  return token;
}

function vertexHost(location: string) {
  return location === 'global' ? 'aiplatform.googleapis.com' : `${location}-aiplatform.googleapis.com`;
}

// Endpoint MaaS genérico do Vertex (OpenAI-compatible) — serve qualquer modelo aberto/parceiro
// hospedado como "Model as a Service" (Grok, DeepSeek, Mistral, Qwen, Llama...), sempre no
// formato model: "<publisher>/<model>". Um único helper cobre todos, basta trocar o model id.
async function callVertexMaas(
  publisherModel: string,
  systemPrompt: string,
  userPrompt: string
): Promise<{ text: string; usage: LlmUsage; model: string }> {
  const project = process.env.GCP_PROJECT_ID;
  const location = process.env.GCP_VERTEX_LOCATION || 'global';
  const token = await getVertexAccessToken();
  const response = await fetch(
    `https://${vertexHost(location)}/v1/projects/${project}/locations/${location}/endpoints/openapi/chat/completions`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        model: publisherModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 4000,
        stream: false,
      }),
    }
  );
  if (!response.ok) throw new Error(`Erro na API do Vertex MaaS (${publisherModel}): ${await response.text()}`);
  const data = await response.json();
  return {
    text: data?.choices?.[0]?.message?.content || '',
    usage: {
      promptTokens: data?.usage?.prompt_tokens ?? 0,
      completionTokens: data?.usage?.completion_tokens ?? 0,
      totalTokens: data?.usage?.total_tokens ?? 0,
    },
    model: data?.model ?? publisherModel,
  };
}

export interface LlmUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface AgentCallResult {
  text: string;
  data: any;
  usage: LlmUsage;
  durationMs: number;
  provider: string;
  model: string;
}

interface LlmOptions {
  systemPrompt: string;
  userPrompt: string;
  fallbackKey?: string;
  agent?: string;
}

export type Provider = 'anthropic' | 'openai' | 'google' | 'grok' | 'ollama' | 'abacusai';
// Provedores ativos na orquestração (abacusai fora — mantido só no callProvider por compatibilidade)
export const ACTIVE_PROVIDERS: Provider[] = ['anthropic', 'openai', 'google', 'grok', 'ollama'];
export type Tier = 'premium' | 'standard' | 'light';

// Tier por agente: premium = raciocínio pesado (qualidade > custo);
// standard = geração estruturada; light = chat/validações simples.
export const AGENT_TIERS: Record<string, Tier> = {
  'compliance-sentinel': 'premium',
  'compliance': 'premium',
  'ads-auditor': 'premium',
  'affiliate-page-analyst': 'premium',
  'product-hunter': 'standard',
  'hunter': 'standard',
  'seo-architect': 'standard',
  'seo': 'standard',
  'atp-keyword-analyst': 'standard',
  'cro-copywriter': 'standard',
  'analysis-assistant': 'light',
  'wizard-validator': 'light',
};

// Ordem de preferência por tier, otimizada por custo real no Vertex (2026-07):
// - premium (compliance/auditoria): Claude direto lidera; Grok 4.20 Reasoning entra em seguida
//   ($1.25/$2.50 por 1M tokens, baixa taxa de alucinação, ótimo pra analisar claims de compliance
//   — e mais barato que Opus $5/$25 ou a saída do Gemini Pro $12); Google e OpenAI reforçam;
//   Ollama é o último recurso grátis.
// - standard (keywords, score de produto, RSA): Grok 4.1 Fast Reasoning lidera — $0.20/$0.50,
//   tool-calling forte, mais barato que o Gemini Flash; Google como reforço estabelecido;
//   Ollama grátis como rede de segurança.
// - light (chat, validação simples): Ollama grátis lidera; Grok non-reasoning (barato, baixa
//   latência) como fallback pago antes de subir pra Gemini/Claude.
const TIER_CHAINS: Record<Tier, Provider[]> = {
  premium: ['anthropic', 'grok', 'google', 'openai', 'ollama'],
  standard: ['grok', 'google', 'ollama', 'openai', 'anthropic'],
  light: ['ollama', 'grok', 'google', 'openai', 'anthropic'],
};

const DEFAULT_MODELS: Record<Provider, Record<Tier, string>> = {
  anthropic: { premium: 'claude-opus-4-8', standard: 'claude-fable-5', light: 'claude-fable-5' },
  openai: { premium: 'gpt-4o', standard: 'gpt-4o-mini', light: 'gpt-4o-mini' },
  google: { premium: 'gemini-2.5-pro', standard: 'gemini-3.5-flash', light: 'gemini-3.5-flash' },
  grok: { premium: 'grok-4.20-reasoning', standard: 'grok-4.1-fast-reasoning', light: 'grok-4.1-fast-non-reasoning' },
  ollama: { premium: 'gpt-oss:120b', standard: 'gpt-oss:20b', light: 'gpt-oss:20b' },
  abacusai: { premium: 'gpt-5.4-mini', standard: 'gpt-5.4-mini', light: 'gpt-5.4-mini' },
};

// Modelos Claude alternativos por tier, tentados em ordem dentro do mesmo passo
// "anthropic" antes de desistir e cair para o próximo provider da cadeia. Existem
// porque cada modelo tem sua própria quota no Vertex — se um estiver com quota
// zerada/pendente de aprovação, o próximo ainda pode funcionar.
const ANTHROPIC_MODEL_FALLBACKS: Record<Tier, string[]> = {
  premium: ['claude-opus-4-8', 'claude-opus-4-7', 'claude-fable-5'],
  standard: ['claude-fable-5', 'claude-opus-4-7', 'claude-opus-4-8'],
  light: ['claude-fable-5', 'claude-opus-4-7'],
};

function isQuotaError(message: string): boolean {
  return /RESOURCE_EXHAUSTED|429|quota/i.test(message ?? '');
}

// Orçamento mensal de tokens por provider (0 = ilimitado). Estourou → provider
// vai para o fim da fila e só é usado se os demais falharem.
const DEFAULT_BUDGETS: Record<Provider, number> = {
  anthropic: 2_000_000,
  openai: 0,
  google: 0,
  grok: 0,
  ollama: 0,
  abacusai: 0,
};

// Origem da chave usada em cada provider: 'byok' = chave configurada pelo próprio
// usuário em Configurações (sem cobrança do admin); 'platform' = chave global do
// ambiente/Vertex compartilhada pelo dono da plataforma (uso a pagar ao admin).
export type KeySource = 'platform' | 'byok';

interface RoutingContext {
  mode: 'auto' | 'manual';
  manualProvider: Provider | null;
  keys: Partial<Record<Provider, string>>;
  keySources: Partial<Record<Provider, KeySource>>;
  models: Partial<Record<Provider, string>>;
  budgets: Record<Provider, number>;
  monthUsage: Record<Provider, number>;
  disabled: Set<Provider>;
}

async function getLlmIntegrations(userId: string): Promise<Record<string, string>> {
  const rows = await prisma.integration.findMany({
    where: { userId, serviceName: 'llm' },
  });
  const map: Record<string, string> = {};
  for (const r of rows) if (r.fieldValue) map[r.fieldName] = r.fieldValue;
  return map;
}

async function getMonthUsage(userId: string): Promise<Record<Provider, number>> {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const grouped = await prisma.agentRun.groupBy({
    by: ['provider'],
    where: { userId, createdAt: { gte: monthStart }, success: true },
    _sum: { totalTokens: true },
  });
  const usage: Record<Provider, number> = { anthropic: 0, openai: 0, google: 0, grok: 0, ollama: 0, abacusai: 0 };
  for (const g of grouped) {
    if (g.provider in usage) usage[g.provider as Provider] = g._sum.totalTokens ?? 0;
  }
  return usage;
}

export async function getRoutingContext(userId: string, fallbackKey?: string): Promise<RoutingContext> {
  const map = await getLlmIntegrations(userId);
  const keys: Partial<Record<Provider, string>> = {};
  const envKeys: Partial<Record<Provider, string | undefined>> = {
    anthropic: process.env.ANTHROPIC_API_KEY,
    openai: process.env.OPENAI_API_KEY,
    google: process.env.GEMINI_API_KEY,
    grok: process.env.XAI_API_KEY,
    ollama: process.env.OLLAMA_API_KEY,
  };
  const keySources: Partial<Record<Provider, KeySource>> = {};
  for (const p of ACTIVE_PROVIDERS) {
    const own = map[`api_key_${p}`];
    const k = own || envKeys[p];
    if (k) {
      keys[p] = k;
      keySources[p] = own ? 'byok' : 'platform';
    }
  }
  // Gemini e Grok (xAI) rodam via Vertex AI (GCP) quando a service account está configurada,
  // no lugar de chave direta — testado e funcionando (2026-07-20). Se `keys.grok` já veio de
  // uma chave direta da xAI (api.x.ai), essa segue valendo; o sentinela só entra se não houver
  // chave direta configurada.
  // Claude via Vertex NÃO é usado por padrão: o projeto GCP mkt-4unik teve os 4 pedidos de
  // cota (anthropic-claude-opus-4-7 e anthropic-claude-fable) NEGADOS pelo Google em 2026-07-20
  // (não é cota zero temporária, é negação — ver console.cloud.google.com/iam-admin/quotas/qirs).
  // Sem isso, Claude segue usando a chave direta da Anthropic normalmente. Se a cota for
  // aprovada no futuro, defina Integration llm/vertex_claude_enabled = "on" para reativar.
  if (process.env.GCP_PROJECT_ID && process.env.GCP_SERVICE_ACCOUNT_JSON) {
    // Vertex usa a service account do ambiente (dona da plataforma) → sempre 'platform'
    keys.google = 'vertex';
    keySources.google = 'platform';
    if (!keys.grok) { keys.grok = 'vertex'; keySources.grok = 'platform'; }
    if (map['vertex_claude_enabled'] === 'on') { keys.anthropic = 'vertex'; keySources.anthropic = 'platform'; }
  }
  const models: Partial<Record<Provider, string>> = {};
  for (const p of ACTIVE_PROVIDERS) {
    if (map[`model_${p}`]) models[p] = map[`model_${p}`];
  }
  const disabled = new Set<Provider>(
    (map['disabled_providers'] ?? '')
      .split(',')
      .map(x => x.trim())
      .filter(Boolean) as Provider[]
  );
  const budgets: Record<Provider, number> = { ...DEFAULT_BUDGETS };
  for (const p of Object.keys(budgets) as Provider[]) {
    const b = map[`budget_tokens_${p}`];
    if (b !== undefined && !Number.isNaN(Number(b))) budgets[p] = Number(b);
  }
  const mode = map['routing'] === 'manual' ? 'manual' : 'auto';
  const manualProvider = (map['provider'] as Provider) || null;
  const monthUsage = await getMonthUsage(userId);
  return { mode, manualProvider, keys, keySources, models, budgets, monthUsage, disabled };
}

export function buildChain(ctx: RoutingContext, tier: Tier): { provider: Provider; model: string; overBudget: boolean }[] {
  const base = ctx.mode === 'manual' && ctx.manualProvider
    ? [ctx.manualProvider, ...TIER_CHAINS[tier].filter(p => p !== ctx.manualProvider)]
    : [...TIER_CHAINS[tier]];
  let available = base.filter(p => ctx.keys[p] && !ctx.disabled.has(p));
  // Se tudo foi desativado, ignora o disable para não derrubar o app
  if (available.length === 0) available = base.filter(p => ctx.keys[p]);
  const inBudget = available.filter(p => !ctx.budgets[p] || ctx.monthUsage[p] < ctx.budgets[p]);
  const overBudget = available.filter(p => ctx.budgets[p] && ctx.monthUsage[p] >= ctx.budgets[p]);
  return [...inBudget, ...overBudget].map(p => ({
    provider: p,
    model: ctx.models[p] ?? DEFAULT_MODELS[p][tier],
    overBudget: overBudget.includes(p),
  }));
}

async function callProvider(
  provider: Provider,
  model: string,
  apiKey: string,
  systemPrompt: string,
  userPrompt: string
): Promise<{ text: string; usage: LlmUsage; model: string }> {
  switch (provider) {
    case 'openai': {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        }),
      });
      if (!response.ok) throw new Error(`Erro na API do OpenAI: ${await response.text()}`);
      const data = await response.json();
      return {
        text: data?.choices?.[0]?.message?.content || '',
        usage: {
          promptTokens: data?.usage?.prompt_tokens ?? 0,
          completionTokens: data?.usage?.completion_tokens ?? 0,
          totalTokens: data?.usage?.total_tokens ?? 0,
        },
        model: data?.model ?? model,
      };
    }

    case 'anthropic': {
      if (apiKey === 'vertex') {
        const project = process.env.GCP_PROJECT_ID;
        const location = process.env.GCP_VERTEX_LOCATION || 'global';
        const token = await getVertexAccessToken();
        const response = await fetch(
          `https://${vertexHost(location)}/v1/projects/${project}/locations/${location}/publishers/anthropic/models/${model}:rawPredict`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({
              anthropic_version: 'vertex-2023-10-16',
              max_tokens: 4000,
              system: systemPrompt,
              messages: [{ role: 'user', content: userPrompt }],
            }),
          }
        );
        if (!response.ok) throw new Error(`Erro na API do Anthropic (Vertex): ${await response.text()}`);
        const data = await response.json();
        const inp = data?.usage?.input_tokens ?? 0;
        const out = data?.usage?.output_tokens ?? 0;
        return {
          text: data?.content?.[0]?.text || '',
          usage: { promptTokens: inp, completionTokens: out, totalTokens: inp + out },
          model: data?.model ?? model,
        };
      }
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: 4000,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        }),
      });
      if (!response.ok) throw new Error(`Erro na API do Anthropic: ${await response.text()}`);
      const data = await response.json();
      const inp = data?.usage?.input_tokens ?? 0;
      const out = data?.usage?.output_tokens ?? 0;
      return {
        text: data?.content?.[0]?.text || '',
        usage: { promptTokens: inp, completionTokens: out, totalTokens: inp + out },
        model: data?.model ?? model,
      };
    }

    case 'google': {
      if (apiKey === 'vertex') {
        const project = process.env.GCP_PROJECT_ID;
        const location = process.env.GCP_VERTEX_LOCATION || 'global';
        const token = await getVertexAccessToken();
        const response = await fetch(
          `https://${vertexHost(location)}/v1/projects/${project}/locations/${location}/publishers/google/models/${model}:generateContent`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: systemPrompt }] },
              contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
            }),
          }
        );
        if (!response.ok) throw new Error(`Erro na API do Gemini (Vertex): ${await response.text()}`);
        const data = await response.json();
        const um = data?.usageMetadata ?? {};
        return {
          text: data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text ?? '').join('') || '',
          usage: {
            promptTokens: um?.promptTokenCount ?? 0,
            completionTokens: um?.candidatesTokenCount ?? 0,
            totalTokens: um?.totalTokenCount ?? ((um?.promptTokenCount ?? 0) + (um?.candidatesTokenCount ?? 0)),
          },
          model,
        };
      }
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        }),
      });
      if (!response.ok) throw new Error(`Erro na API do Gemini: ${await response.text()}`);
      const data = await response.json();
      const um = data?.usageMetadata ?? {};
      return {
        text: data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text ?? '').join('') || '',
        usage: {
          promptTokens: um?.promptTokenCount ?? 0,
          completionTokens: um?.candidatesTokenCount ?? 0,
          totalTokens: um?.totalTokenCount ?? ((um?.promptTokenCount ?? 0) + (um?.candidatesTokenCount ?? 0)),
        },
        model,
      };
    }

    case 'grok': {
      if (apiKey === 'vertex') {
        // Modelos xAI no Vertex usam o endpoint MaaS único (OpenAI-compatible), formato "xai/<modelo>"
        return callVertexMaas(`xai/${model}`, systemPrompt, userPrompt);
      }
      const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        }),
      });
      if (!response.ok) throw new Error(`Erro na API do Grok (xAI): ${await response.text()}`);
      const data = await response.json();
      return {
        text: data?.choices?.[0]?.message?.content || '',
        usage: {
          promptTokens: data?.usage?.prompt_tokens ?? 0,
          completionTokens: data?.usage?.completion_tokens ?? 0,
          totalTokens: data?.usage?.total_tokens ?? 0,
        },
        model: data?.model ?? model,
      };
    }

    case 'ollama': {
      // Com API key → Ollama Cloud (ollama.com); sem key → servidor local
      const baseUrl = process.env.OLLAMA_BASE_URL || (apiKey && apiKey !== 'local' ? 'https://ollama.com/v1' : 'http://localhost:11434/v1');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (apiKey && apiKey !== 'local') headers['Authorization'] = `Bearer ${apiKey}`;
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        }),
      });
      if (!response.ok) throw new Error(`Erro na API do Ollama: ${await response.text()}`);
      const data = await response.json();
      return {
        text: data?.choices?.[0]?.message?.content || '',
        usage: {
          promptTokens: data?.usage?.prompt_tokens ?? 0,
          completionTokens: data?.usage?.completion_tokens ?? 0,
          totalTokens: data?.usage?.total_tokens ?? 0,
        },
        model: data?.model ?? model,
      };
    }

    case 'abacusai':
    default: {
      const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        }),
      });
      if (!response.ok) throw new Error(`Erro na API do Abacus.ai: ${await response.text()}`);
      const data = await response.json();
      return {
        text: data?.choices?.[0]?.message?.content || '',
        usage: {
          promptTokens: data?.usage?.prompt_tokens ?? 0,
          completionTokens: data?.usage?.completion_tokens ?? 0,
          totalTokens: data?.usage?.total_tokens ?? 0,
        },
        model: data?.model ?? model,
      };
    }
  }
}

function logRun(userId: string, agent: string, provider: string, model: string, usage: LlmUsage, durationMs: number, success: boolean, keySource: KeySource, error?: string) {
  prisma.agentRun.create({
    data: {
      userId,
      agent,
      provider,
      model,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      totalTokens: usage.totalTokens,
      costUsd: estimateCostUsd(provider, model, usage.promptTokens, usage.completionTokens),
      keySource,
      durationMs,
      success,
      error: error?.slice(0, 2000) ?? null,
    },
  }).catch((e) => console.error('AgentRun log error:', e));
}

export function parseAgentJson(text: string): any {
  const cleaned = text.replace(/```json|```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); } catch { return null; }
    }
    return null;
  }
}

export async function callAgent(
  userId: string,
  opts: LlmOptions & { agent: string; json?: boolean; validate?: (data: any, text: string) => string | null }
): Promise<AgentCallResult> {
  const tier = AGENT_TIERS[opts.agent] ?? 'standard';
  const ctx = await getRoutingContext(userId, opts.fallbackKey);
  const chain = buildChain(ctx, tier);
  if (chain.length === 0) throw new Error('Nenhuma API key de LLM configurada (Anthropic, OpenAI, Google ou Abacus).');

  const emptyUsage: LlmUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
  let lastError: any = null;
  let userPrompt = opts.userPrompt;
  let validationRetried = false;

  for (let i = 0; i < chain.length; i++) {
    const step = chain[i];
    // Para o provider anthropic, sem modelo fixado manualmente (via integração/DB),
    // tenta os modelos Claude alternativos (4.8 → 4.7 → Fable 5) antes de desistir
    // do provider e cair para o próximo da cadeia — cada um tem quota própria no Vertex.
    const modelAttempts = step.provider === 'anthropic' && !ctx.models.anthropic
      ? Array.from(new Set([step.model, ...ANTHROPIC_MODEL_FALLBACKS[tier]]))
      : [step.model];

    const keySource: KeySource = ctx.keySources[step.provider] ?? 'platform';
    let movedToNextProvider = false;
    for (const modelAttempt of modelAttempts) {
      const start = Date.now();
      try {
        const { text, usage, model } = await callProvider(step.provider, modelAttempt, ctx.keys[step.provider]!, opts.systemPrompt, userPrompt);
        const durationMs = Date.now() - start;
        const data = opts.json === false ? null : parseAgentJson(text);

        // Auto-correção: uma retentativa no MESMO provider/modelo com o erro de validação anexado
        const validationError = opts.validate ? opts.validate(data, text) : null;
        if (validationError) {
          logRun(userId, opts.agent, step.provider, model, usage, durationMs, false, keySource, `validação: ${validationError}`);
          if (!validationRetried) {
            validationRetried = true;
            userPrompt = `${opts.userPrompt}\n\nATENÇÃO: sua resposta anterior foi rejeitada pela validação: "${validationError}". Corrija exatamente esse problema e responda de novo.`;
            i--;
            movedToNextProvider = true; // reprocessa o mesmo passo do zero no próximo turno do loop externo
            break;
          }
          throw new Error(`Resposta do agente reprovada na validação: ${validationError}`);
        }

        logRun(userId, opts.agent, step.provider, model, usage, durationMs, true, keySource);
        return { text, data, usage, durationMs, provider: step.provider, model };
      } catch (err: any) {
        const durationMs = Date.now() - start;
        const message = err?.message ?? '';
        if (!message.startsWith('Resposta do agente reprovada')) {
          logRun(userId, opts.agent, step.provider, modelAttempt, emptyUsage, durationMs, false, keySource, message);
        }
        lastError = err;
        if (message.startsWith('Resposta do agente reprovada')) throw err;
        // Erro que não é de quota (chave inválida, payload malformado, etc.): não adianta
        // tentar outro modelo Claude, pula direto pro próximo provider da cadeia.
        if (!isQuotaError(message)) break;
      }
    }
    if (movedToNextProvider) continue;
  }
  throw lastError ?? new Error('Todos os provedores de LLM falharam.');
}

export async function callLLM(userId: string, opts: LlmOptions): Promise<string> {
  const result = await callAgent(userId, { ...opts, agent: opts.agent ?? 'desconhecido', json: false });
  return result.text;
}
