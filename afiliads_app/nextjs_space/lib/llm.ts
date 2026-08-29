import { prisma } from './prisma';
import { GoogleAuth } from 'google-auth-library';
import { createHash } from 'crypto';
import { estimateCostUsd, type CostMultipliers } from './llm-pricing';
import { assertCampaignLlmAllowed, type CampaignGuardTarget } from './campaign-guard';
import { readIntegrationFieldValue } from './integration-secrets';
import {
  LlmBudgetExceededError,
  reconcileLlmBudget,
  reserveLlmBudget,
  type AgentRunClient,
  type LlmBudgetReservation,
} from './llm-budget';
import { validateJson } from './json-validation';

const llmBudgetClient = prisma as unknown as AgentRunClient;

// Cache simples em memória pra cortar gasto com regen/retry de prompts idênticos.
const LLM_CACHE_TTL_MS = 10 * 60 * 1000;
const llmResponseCache = new Map<string, { at: number; result: AgentCallResult }>();
const llmCacheEnabled = () => process.env.NODE_ENV !== 'test' && !process.env.VITEST;

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

export function vertexHost(location: string) {
  if (!/^(?:global|[a-z]+(?:-[a-z]+)+\d)$/.test(location)) {
    throw new Error('GCP_VERTEX_LOCATION inválida');
  }
  return location === 'global' ? 'aiplatform.googleapis.com' : `${location}-aiplatform.googleapis.com`;
}

// Endpoint MaaS genérico do Vertex (OpenAI-compatible) — serve qualquer modelo aberto/parceiro
// hospedado como "Model as a Service" (Grok, DeepSeek, Mistral, Qwen, Llama...), sempre no
// formato model: "<publisher>/<model>". Um único helper cobre todos, basta trocar o model id.
async function callVertexMaas(
  publisherModel: string,
  systemPrompt: string,
  userPrompt: string,
  maxOutputTokens: number,
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
        max_tokens: maxOutputTokens,
        stream: false,
      }),
    }
  );
  if (!response.ok) throw new Error(`Erro na API do Vertex MaaS (${publisherModel}): ${await response.text()}`);
  const data = await response.json();
  return {
    text: data?.choices?.[0]?.message?.content || '',
    usage: {
      promptTokens: data?.usage?.prompt_tokens,
      completionTokens: data?.usage?.completion_tokens,
      totalTokens: data?.usage?.total_tokens,
    },
    model: data?.model ?? publisherModel,
  };
}

export interface LlmUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface AgentCallResult {
  text: string;
  data: any;
  usage: LlmUsage;
  durationMs: number;
  provider: string;
  model: string;
  error: string | null;
}

export interface LlmOptions {
  systemPrompt: string;
  userPrompt: string;
  fallbackKey?: string;
  agent?: string;
  campaignId?: string;
  campaignTarget: CampaignGuardTarget;
}

export type Provider = 'anthropic' | 'openai' | 'google' | 'grok' | 'ollama' | 'abacusai' | 'kimi' | 'openrouter';
export const KIMI_MODELS = {
  K3: 'kimi-k3',
  K2_7_CODE: 'kimi-k2.7-code',
  K2_6: 'kimi-k2.6',
  K2_5: 'kimi-k2.5',
} as const;
// Provedores ativos na orquestração (abacusai fora — mantido só no callProvider por compatibilidade).
// Kimi participa do roteamento automático com preferências por agente e fallback;
// isso evita que uma credencial expirada derrube toda a geração.
export const ACTIVE_PROVIDERS: Provider[] = ['anthropic', 'openai', 'google', 'grok', 'ollama', 'kimi', 'openrouter'];
export type Tier = 'premium' | 'standard' | 'light';

type AgentRoutingPreference = {
  providers: Provider[];
  modelOverrides?: Partial<Record<Provider, string>>;
};

export const AGENT_ROUTING_PREFERENCES: Record<string, AgentRoutingPreference> = {
  'presell-builder': {
    providers: ['kimi', 'grok', 'google', 'ollama', 'openai', 'anthropic'],
    modelOverrides: { kimi: KIMI_MODELS.K3 },
  },
  'bridge-page-builder': {
    providers: ['kimi', 'grok', 'google', 'ollama', 'openai', 'anthropic'],
    modelOverrides: { kimi: KIMI_MODELS.K2_7_CODE },
  },
  'bridge-page-validator': {
    providers: ['google', 'grok', 'kimi', 'ollama', 'openai', 'anthropic'],
    modelOverrides: { kimi: KIMI_MODELS.K2_5 },
  },
};

export const AGENT_MODEL_LOCKS: Partial<Record<string, { provider: Provider; model: string }>> = {
  'presell-builder': { provider: 'kimi', model: KIMI_MODELS.K3 },
  'bridge-page-builder': { provider: 'kimi', model: KIMI_MODELS.K2_7_CODE },
};

export function selectKimiModel({
  agent,
  requestedModel,
  fallbackModel,
}: {
  agent: string;
  requestedModel?: string;
  fallbackModel: string;
}): string {
  return requestedModel?.trim()
    || AGENT_ROUTING_PREFERENCES[agent]?.modelOverrides?.kimi
    || fallbackModel;
}

const KIMI_OFFICIAL_API_HOSTS = new Set(['api.moonshot.ai', 'api.kimi.com']);

export function resolveKimiApiBaseUrl(
  rawBaseUrl = process.env.KIMI_API_BASE_URL || 'https://api.moonshot.ai/v1',
  additionalHosts = process.env.KIMI_API_ALLOWED_HOSTS || ''
): string {
  let url: URL;
  try {
    url = new URL(rawBaseUrl);
  } catch {
    throw new Error('KIMI_API_BASE_URL inválida');
  }

  if (url.protocol !== 'https:') {
    throw new Error('KIMI_API_BASE_URL deve usar HTTPS');
  }
  if (url.username || url.password) {
    throw new Error('KIMI_API_BASE_URL não pode conter credenciais');
  }
  if (url.search || url.hash) {
    throw new Error('KIMI_API_BASE_URL não pode conter query string ou fragmento');
  }

  const allowedHosts = new Set([
    ...KIMI_OFFICIAL_API_HOSTS,
    ...additionalHosts.split(',').map((host) => host.trim().toLowerCase()).filter(Boolean),
  ]);
  if (!allowedHosts.has(url.host.toLowerCase())) {
    throw new Error('Host de KIMI_API_BASE_URL não autorizado');
  }

  return url.toString().replace(/\/+$/, '');
}

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
  'campaign-strategist': 'standard',
  'presell-builder': 'standard',
  'bridge-page-builder': 'standard',
  'bridge-page-validator': 'standard',
  // Produto próprio / infoproduto (importados de ~/infoprod, agnósticos de marca)
  'fact-steward': 'premium',
  'brand-dna-extractor': 'standard',
  'offer-architect': 'standard',
  'content-architect': 'standard',
  'creative-producer': 'standard',
  'anti-slop-editor': 'standard',
  'visual-system-designer': 'standard',
  'launch-strategist': 'standard',
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
  premium: ['anthropic', 'grok', 'google', 'openai', 'openrouter', 'ollama'],
  standard: ['openrouter', 'grok', 'google', 'openai', 'anthropic', 'ollama'],
  light: ['ollama', 'openrouter', 'grok', 'google', 'openai', 'anthropic'],
};

const DEFAULT_MODELS: Record<Provider, Record<Tier, string>> = {
  anthropic: { premium: 'claude-opus-4-8', standard: 'claude-fable-5', light: 'claude-fable-5' },
  openai: { premium: 'gpt-4o', standard: 'gpt-4o-mini', light: 'gpt-4o-mini' },
  google: { premium: 'gemini-2.5-pro', standard: 'gemini-3.5-flash', light: 'gemini-3.5-flash' },
  grok: { premium: 'grok-4.20-reasoning', standard: 'grok-4.1-fast-reasoning', light: 'grok-4.1-fast-non-reasoning' },
  ollama: { premium: 'gpt-oss:120b', standard: 'gpt-oss:20b', light: 'gpt-oss:20b' },
  abacusai: { premium: 'gpt-5.4-mini', standard: 'gpt-5.4-mini', light: 'gpt-5.4-mini' },
  kimi: { premium: KIMI_MODELS.K3, standard: KIMI_MODELS.K3, light: KIMI_MODELS.K2_5 },
  openrouter: { premium: 'moonshotai/kimi-k3', standard: 'moonshotai/kimi-k2.5', light: 'moonshotai/kimi-k2.5' },
};

const ALLOWED_MODELS: Record<Provider, ReadonlySet<string>> = {
  anthropic: new Set(['claude-opus-4-8', 'claude-opus-4-7', 'claude-fable-5']),
  openai: new Set(['gpt-4o', 'gpt-4o-mini']),
  google: new Set(['gemini-2.5-pro', 'gemini-3.5-flash']),
  grok: new Set(['grok-4.20-reasoning', 'grok-4.1-fast-reasoning', 'grok-4.1-fast-non-reasoning']),
  ollama: new Set(['gpt-oss:120b', 'gpt-oss:20b']),
  abacusai: new Set(['gpt-5.4-mini']),
  kimi: new Set(Object.values(KIMI_MODELS)),
  openrouter: new Set(['openrouter/auto', 'moonshotai/kimi-k3', 'moonshotai/kimi-k2.6', 'moonshotai/kimi-k2.5']),
};

export function assertAllowedProviderModel(provider: Provider, model: string): void {
  if (!ALLOWED_MODELS[provider]?.has(model)) {
    throw new Error(`Modelo não permitido para ${provider}`);
  }
}

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
  kimi: 0,
  openrouter: 0,
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
  costMultipliers: CostMultipliers;
}

async function getLlmIntegrations(userId: string): Promise<Record<string, string>> {
  const rows = await prisma.integration.findMany({
    where: { userId, serviceName: 'llm' },
  });
  const map: Record<string, string> = {};
  for (const r of rows) {
    if (!r.fieldValue) continue;
    map[r.fieldName] = readIntegrationFieldValue(r.fieldName, r.fieldValue);
  }
  return map;
}

async function getMonthUsage(userId: string): Promise<Record<Provider, number>> {
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const grouped = await prisma.agentRun.groupBy({
    by: ['provider'],
    where: { userId, createdAt: { gte: monthStart }, totalTokens: { gt: 0 } },
    _sum: { totalTokens: true },
  });
  const usage: Record<Provider, number> = { anthropic: 0, openai: 0, google: 0, grok: 0, ollama: 0, abacusai: 0, kimi: 0, openrouter: 0 };
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
    kimi: process.env.KIMI_API_KEY,
    openrouter: process.env.OPENROUTER_API_KEY,
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
    if (!keys.google) { keys.google = 'vertex'; keySources.google = 'platform'; }
    if (!keys.grok) { keys.grok = 'vertex'; keySources.grok = 'platform'; }
    if (map['vertex_claude_enabled'] === 'on') { keys.anthropic = 'vertex'; keySources.anthropic = 'platform'; }
  }
  const models: Partial<Record<Provider, string>> = {};
  for (const p of ACTIVE_PROVIDERS) {
    const configuredModel = map[`model_${p}`];
    if (configuredModel) {
      assertAllowedProviderModel(p, configuredModel);
      models[p] = configuredModel;
    }
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
  const costMultipliers: CostMultipliers = { 
    anthropic: { prompt: Number(map['cost_anthropic_prompt']) || 1, completion: Number(map['cost_anthropic_completion']) || 1 },
    openai: { prompt: Number(map['cost_openai_prompt']) || 1, completion: Number(map['cost_openai_completion']) || 1 },
    google: { prompt: Number(map['cost_google_prompt']) || 1, completion: Number(map['cost_google_completion']) || 1 },
    grok: { prompt: Number(map['cost_grok_prompt']) || 1, completion: Number(map['cost_grok_completion']) || 1 },
    ollama: { prompt: Number(map['cost_ollama_prompt']) || 1, completion: Number(map['cost_ollama_completion']) || 1 },
    kimi: { prompt: Number(map['cost_kimi_prompt']) || 1, completion: Number(map['cost_kimi_completion']) || 1 },
    abacusai: { prompt: Number(map['cost_abacusai_prompt']) || 1, completion: Number(map['cost_abacusai_completion']) || 1 },
    openrouter: { prompt: Number(map['cost_openrouter_prompt']) || 1, completion: Number(map['cost_openrouter_completion']) || 1 },
  };
  return { mode, manualProvider, keys, keySources, models, budgets, monthUsage, disabled, costMultipliers };
}

export function buildChain(ctx: RoutingContext, tier: Tier, reservedTokens = 0): { provider: Provider; model: string; overBudget: boolean }[] {
  const base = ctx.mode === 'manual' && ctx.manualProvider
    ? [ctx.manualProvider, ...TIER_CHAINS[tier].filter(p => p !== ctx.manualProvider)]
    : [...TIER_CHAINS[tier]];
  const available = base.filter(p => ctx.keys[p] && !ctx.disabled.has(p));
  const inBudget = available.filter(p => (
    !ctx.budgets[p]
    || (ctx.monthUsage[p] < ctx.budgets[p] && ctx.monthUsage[p] + reservedTokens <= ctx.budgets[p])
  ));
  return inBudget.map(p => ({
    provider: p,
    model: ctx.models[p] ?? DEFAULT_MODELS[p][tier],
    overBudget: false,
  }));
}

export function resolveOllamaApiBaseUrl(
  rawBaseUrl: string,
  hasBearerCredential: boolean,
  additionalHosts = process.env.OLLAMA_API_ALLOWED_HOSTS || '',
): string {
  let url: URL;
  try {
    url = new URL(rawBaseUrl);
  } catch {
    throw new Error('OLLAMA_BASE_URL inválida');
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error('OLLAMA_BASE_URL contém componentes não permitidos');
  }
  if (hasBearerCredential) {
    const allowedHosts = new Set([
      'ollama.com',
      ...additionalHosts.split(',').map((host) => host.trim().toLowerCase()).filter(Boolean),
    ]);
    if (url.protocol !== 'https:') throw new Error('OLLAMA_BASE_URL com bearer deve usar HTTPS');
    if ((url.port && url.port !== '443') || !allowedHosts.has(url.hostname.toLowerCase())) {
      throw new Error('Host de OLLAMA_BASE_URL não autorizado');
    }
  } else {
    const loopbackHosts = new Set(['localhost', '127.0.0.1', '::1']);
    if (!loopbackHosts.has(url.hostname.toLowerCase()) || !['http:', 'https:'].includes(url.protocol)) {
      throw new Error('OLLAMA_BASE_URL local deve apontar para loopback');
    }
  }
  return url.toString().replace(/\/+$/, '');
}

async function callProvider(
  provider: Provider,
  model: string,
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  maxOutputTokens: number,
): Promise<{ text: string; usage: LlmUsage; model: string; durationMs: number }> {
  const startTime = Date.now();
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
          max_completion_tokens: maxOutputTokens,
        }),
      });
      if (!response.ok) throw new Error(`Erro na API do OpenAI: ${await response.text()}`);
      const data = await response.json();
      return {
        text: data?.choices?.[0]?.message?.content || '',
        usage: {
          promptTokens: data?.usage?.prompt_tokens,
          completionTokens: data?.usage?.completion_tokens,
          totalTokens: data?.usage?.total_tokens,
        },
        model: data?.model ?? model,
        durationMs: Date.now() - startTime,
      };
    }

    case 'openrouter': {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: maxOutputTokens,
        }),
      });
      if (!response.ok) throw new Error(`Erro na API do OpenRouter: ${await response.text()}`);
      const data = await response.json();
      return {
        text: data?.choices?.[0]?.message?.content || '',
        usage: {
          promptTokens: data?.usage?.prompt_tokens,
          completionTokens: data?.usage?.completion_tokens,
          totalTokens: data?.usage?.total_tokens,
        },
        model: data?.model ?? model,
        durationMs: Date.now() - startTime,
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
              max_tokens: maxOutputTokens,
              system: systemPrompt,
              messages: [{ role: 'user', content: userPrompt }],
            }),
          }
        );
        if (!response.ok) throw new Error(`Erro na API do Anthropic (Vertex): ${await response.text()}`);
        const data = await response.json();
        const inp = data?.usage?.input_tokens;
        const out = data?.usage?.output_tokens;
        return {
          text: data?.content?.[0]?.text || '',
          usage: { promptTokens: inp, completionTokens: out, totalTokens: (inp ?? 0) + (out ?? 0) },
          model: data?.model ?? model,
          durationMs: Date.now() - startTime,
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
          max_tokens: maxOutputTokens,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        }),
      });
      if (!response.ok) throw new Error(`Erro na API do Anthropic: ${await response.text()}`);
      const data = await response.json();
      const inp = data?.usage?.input_tokens;
      const out = data?.usage?.output_tokens;
      return {
        text: data?.content?.[0]?.text || '',
        usage: { promptTokens: inp, completionTokens: out, totalTokens: (inp ?? 0) + (out ?? 0) },
        model: data?.model ?? model,
        durationMs: Date.now() - startTime,
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
              generationConfig: { maxOutputTokens },
            }),
          }
        );
        if (!response.ok) throw new Error(`Erro na API do Gemini (Vertex): ${await response.text()}`);
        const data = await response.json();
        const um = data?.usageMetadata ?? {};
        return {
          text: data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text ?? '').join('') || '',
          usage: {
            promptTokens: um.promptTokenCount,
            completionTokens: um.candidatesTokenCount,
            totalTokens: um.totalTokenCount,
          },
          model: data?.model ?? model,
          durationMs: Date.now() - startTime,
        };
      }
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: { maxOutputTokens },
        }),
      });
      if (!response.ok) throw new Error(`Erro na API do Gemini: ${await response.text()}`);
      const data = await response.json();
      const um = data?.usageMetadata ?? {};
      return {
        text: data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text ?? '').join('') || '',
        usage: {
          promptTokens: um.promptTokenCount,
          completionTokens: um.candidatesTokenCount,
          totalTokens: um.totalTokenCount,
        },
        model: data?.model ?? model,
        durationMs: Date.now() - startTime,
      };
    }

    case 'grok': {
      if (apiKey === 'vertex') {
        const res = await callVertexMaas(`xai/${model}`, systemPrompt, userPrompt, maxOutputTokens);
        return { ...res, durationMs: Date.now() - startTime };
      }
      const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: maxOutputTokens,
        }),
      });
      if (!response.ok) throw new Error(`Erro na API do Grok (xAI): ${await response.text()}`);
      const data = await response.json();
      return {
        text: data?.choices?.[0]?.message?.content || '',
        usage: {
          promptTokens: data?.usage?.prompt_tokens,
          completionTokens: data?.usage?.completion_tokens,
          totalTokens: data?.usage?.total_tokens,
        },
        model: data?.model ?? model,
        durationMs: Date.now() - startTime,
      };
    }

    case 'ollama': {
      // Com API key → Ollama Cloud (ollama.com); sem key → servidor local
      const hasBearerCredential = Boolean(apiKey && apiKey !== 'local');
      const baseUrl = resolveOllamaApiBaseUrl(
        process.env.OLLAMA_BASE_URL || (hasBearerCredential ? 'https://ollama.com/v1' : 'http://localhost:11434/v1'),
        hasBearerCredential,
      );
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
          max_tokens: maxOutputTokens,
        }),
      });
      if (!response.ok) throw new Error(`Erro na API do Ollama: ${await response.text()}`);
      const data = await response.json();
      return {
        text: data?.choices?.[0]?.message?.content || '',
        usage: {
          promptTokens: data?.usage?.prompt_tokens,
          completionTokens: data?.usage?.completion_tokens,
          totalTokens: data?.usage?.total_tokens,
        },
        model: data?.model ?? model,
        durationMs: Date.now() - startTime,
      };
    }

    case 'kimi': {
      // K3 usa reasoning_effort; K2.7 Code mantém thinking habilitado por contrato.
      // max_completion_tokens substitui o parâmetro max_tokens depreciado.
      const baseUrl = resolveKimiApiBaseUrl();
      const modelOptions = model === KIMI_MODELS.K3
        ? { reasoning_effort: 'low' }
        : {};
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_completion_tokens: maxOutputTokens,
          ...modelOptions,
        }),
      });
      if (!response.ok) throw new Error(`Erro na API do Kimi/Moonshot: ${await response.text()}`);
      const data = await response.json();
      return {
        text: data?.choices?.[0]?.message?.content || '',
        usage: {
          promptTokens: data?.usage?.prompt_tokens,
          completionTokens: data?.usage?.completion_tokens,
          totalTokens: data?.usage?.total_tokens,
        },
        model: data?.model ?? model,
        durationMs: Date.now() - startTime,
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
          max_tokens: maxOutputTokens,
        }),
      });
      if (!response.ok) throw new Error(`Erro na API do AbacusAI: ${await response.text()}`);
      const data = await response.json();
      return {
        text: data?.choices?.[0]?.message?.content || '',
        usage: {
          promptTokens: data?.usage?.prompt_tokens,
          completionTokens: data?.usage?.completion_tokens,
          totalTokens: data?.usage?.total_tokens,
        },
        model: data?.model ?? model,
        durationMs: Date.now() - startTime,
      };
    }
  }
}

export async function callAgent(
  userId: string,
  opts: LlmOptions & { agent: string; json?: boolean; validate?: (data: any, text: string) => string | null }
): Promise<AgentCallResult> {
  const startTime = Date.now();
  if (!opts.campaignTarget) {
    throw new Error('callAgent exige campaignTarget explícito');
  }
  if (opts.campaignId && opts.campaignTarget?.kind === 'non-campaign') {
    throw new Error('campaignTarget contraditório: campaignId não pode ser tratado como non-campaign');
  }
  if (
    opts.campaignTarget.kind === 'campaign'
    && opts.campaignTarget.campaignId
    && opts.campaignId !== opts.campaignTarget.campaignId
  ) {
    throw new Error('campaignTarget contraditório: campaignTarget.campaignId deve ser idêntico a campaignId');
  }
  if (opts.campaignTarget.kind === 'campaign' && opts.campaignTarget.purpose === 'paused-compliance' && opts.agent !== 'compliance-sentinel') {
    throw new Error('paused-compliance é restrito ao agente compliance-sentinel');
  }
  const guardTarget: CampaignGuardTarget = opts.campaignTarget;
  await assertCampaignLlmAllowed(userId, guardTarget);

  const tier = AGENT_TIERS[opts.agent] ?? 'standard';
  const ctx = await getRoutingContext(userId, opts.fallbackKey);
  const preference = AGENT_ROUTING_PREFERENCES[opts.agent];
  const modelLock = AGENT_MODEL_LOCKS[opts.agent];
  // A reserva exata, incluindo prompt e concorrência, ocorre atomicamente por tentativa.
  let chain = buildChain(ctx, tier, 0);
  if (modelLock) {
    // Lock é explícito: garante o provider travado na cadeia mesmo fora das TIER_CHAINS.
    if (ctx.keys[modelLock.provider] && !chain.some((s) => s.provider === modelLock.provider)) {
      chain = [{ provider: modelLock.provider, model: modelLock.model, overBudget: false }, ...chain];
    }
    const lockedProvider = chain.find((step) => step.provider === modelLock.provider);
    chain = lockedProvider ? [{ ...lockedProvider, model: modelLock.model }] : [];
  } else if (preference) {
    const rank = new Map(preference.providers.map((provider, index) => [provider, index]));
    chain = chain
      .sort((a, b) => (rank.get(a.provider) ?? 999) - (rank.get(b.provider) ?? 999))
      .map((step) => ({
        ...step,
        model: step.provider === 'kimi'
          ? selectKimiModel({
              agent: opts.agent,
              requestedModel: ctx.models.kimi,
              fallbackModel: step.model,
            })
          : ctx.models[step.provider] ?? preference.modelOverrides?.[step.provider] ?? step.model,
      }));
  }
  if (chain.length === 0) throw new Error('Nenhuma API key de LLM configurada (Anthropic, OpenAI, Google, Grok, Kimi ou Ollama).');

  const emptyUsage: LlmUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
  let lastError: any = null;
  let userPrompt = opts.userPrompt;
  let validationRetried = false;

  // Cache de resposta em memória (10 min): evita cobrança duplicada quando a UI
  // regenera/refaz retry com o mesmo prompt para o mesmo agente. Só cacheia sucesso.
  const cacheKey = createHash('sha256')
    .update(opts.agent + ' ' + (opts.systemPrompt || '') + ' ' + userPrompt)
    .digest('hex');
  if (llmCacheEnabled()) {
    const cached = llmResponseCache.get(cacheKey);
    if (cached && Date.now() - cached.at < LLM_CACHE_TTL_MS) {
      return { ...cached.result, cached: true } as AgentCallResult;
    }
  }

  for (let i = 0; i < chain.length; i++) {
    const step = chain[i];
    // Para o provider anthropic, sem modelo fixado manualmente (via integração/DB),
    // tenta os modelos Claude alternativos (4.8 → 4.7 → Fable 5) antes de desistir
    // do provider e cair para o próximo da cadeia — cada uno tiene quota própria no Vertex.
    const modelAttempts = step.provider === 'anthropic' && !ctx.models.anthropic
      ? Array.from(new Set([step.model, ...ANTHROPIC_MODEL_FALLBACKS[tier]]))
      : [step.model];

    const keySource: KeySource = ctx.keySources[step.provider] ?? 'platform';
    let movedToNextProvider = false;
    for (const modelAttempt of modelAttempts) {
      let reservation: LlmBudgetReservation | null;
      try {
        reservation = await reserveLlmBudget(llmBudgetClient, {
          userId,
          agent: opts.agent,
          provider: step.provider,
          model: modelAttempt,
          keySource,
          monthlyBudget: ctx.budgets[step.provider] ?? 0,
          promptBytes: new TextEncoder().encode(opts.systemPrompt + userPrompt).length,
          requestedOutputTokens: 4096, // padrão histórico dos providers
          now: new Date(),
        });
      } catch (error: any) {
        const msg = error?.message ?? String(error);
        if (isQuotaError(msg) && i < chain.length - 1) {
          movedToNextProvider = true;
          break;
        }
        if (error?.message) lastError = error.message;
        else lastError = String(error);
        continue;
      }
      if (!reservation) {
        if ((ctx.budgets[step.provider] ?? 0) > 0) {
          movedToNextProvider = true;
          continue;
        }
        // Budget 0 = sem cap configurado: chama sem reserva, mas ainda registra telemetria.
        reservation = { id: '', maxOutputTokens: 4096, reservedTokens: 0 };
      }

      let res: { text: string; usage: LlmUsage; model: string; durationMs: number } | null = null;
      try {
        res = await callProvider(step.provider, modelAttempt, ctx.keys[step.provider] ?? '', opts.systemPrompt, userPrompt, reservation.maxOutputTokens);
      } catch (error: any) {
        const msg = error?.message ?? String(error);
        // O provider falhou, mas a reserva de budget foi feita. Precisa reconciliar.
        // Em caso de quota esgotada, tenta o próximo provider.
        await reconcileLlmBudget(llmBudgetClient, reservation, {
          promptTokens: emptyUsage.promptTokens ?? 0,
          completionTokens: emptyUsage.completionTokens ?? 0,
          totalTokens: emptyUsage.totalTokens ?? 0,
          costUsd: 0,
          durationMs: 0,
          success: false,
          error: msg,
        });
        if (isQuotaError(msg) && i < chain.length - 1) {
          movedToNextProvider = true;
          break;
        }
        lastError = msg;
        continue;
      }

      // Se a resposta LLM exige JSON e o parsing falha, tenta novamente com um prompt
      // extra (instruindo a corrigir o JSON) e mais tokens para a correção.
      if (opts.json && res?.text) {
        const parseError = validateJson(res.text, opts.validate);
        if (parseError) {
          // Se a validação falha e a primeira tentativa não foi suficiente, tenta com prompt de correção.
          if (!validationRetried) {
            userPrompt = `Minha última resposta foi:\n\"\"\"${res.text}\"\"\"\nErro de parsing: ${parseError}. Por favor, corrija o JSON e me dê uma resposta válida.`;
            validationRetried = true;
            i--; // Tenta novamente com o mesmo provider/modelo, mas com o prompt de correção.
            await reconcileLlmBudget(llmBudgetClient, reservation, {
              promptTokens: res.usage.promptTokens ?? 0,
              completionTokens: res.usage.completionTokens ?? 0,
              totalTokens: res.usage.totalTokens ?? 0,
              costUsd: estimateCostUsd(step.provider, modelAttempt, res.usage.promptTokens ?? 0, res.usage.completionTokens ?? 0, ctx.costMultipliers),
              durationMs: res.durationMs,
              success: false,
              error: `JSON_INVALID: ${parseError}`,
            });
            continue;
          }
          // Se a validação falhou e já tentou corrigir, registra o erro final.
          await reconcileLlmBudget(llmBudgetClient, reservation, {
            promptTokens: res.usage.promptTokens ?? 0,
            completionTokens: res.usage.completionTokens ?? 0,
            totalTokens: res.usage.totalTokens ?? 0,
            costUsd: estimateCostUsd(step.provider, modelAttempt, res.usage.promptTokens ?? 0, res.usage.completionTokens ?? 0, ctx.costMultipliers),
            durationMs: res.durationMs,
            success: false,
            error: `JSON_INVALID_FINAL: ${parseError}`,
          });
          lastError = `JSON inválido após correção: ${parseError}`;
          movedToNextProvider = true;
          break; // Sai do loop de modelAttempts e tenta o próximo provider
        }
      }

      // Se chegou aqui, a chamada foi bem-sucedida ou o JSON é válido (se opts.json).
      const finalCostUsd = estimateCostUsd(step.provider, modelAttempt, res?.usage?.promptTokens ?? 0, res?.usage?.completionTokens ?? 0, ctx.costMultipliers);
      const durationMs = Date.now() - startTime;

      if (reservation.id) {
        await reconcileLlmBudget(llmBudgetClient, reservation, {
          promptTokens: res?.usage?.promptTokens ?? 0,
          completionTokens: res?.usage?.completionTokens ?? 0,
          totalTokens: res?.usage?.totalTokens ?? 0,
          costUsd: finalCostUsd,
          durationMs,
          success: true,
          error: null,
        });
      } else {
        // Bypass (sem cap): telemetria direta, sem reserva prévia.
        await (prisma.agentRun.create({
          data: {
            userId,
            agent: opts.agent,
            provider: step.provider,
            model: modelAttempt,
            promptTokens: res?.usage?.promptTokens ?? 0,
            completionTokens: res?.usage?.completionTokens ?? 0,
            totalTokens: res?.usage?.totalTokens ?? 0,
            costUsd: finalCostUsd,
            keySource,
            durationMs,
            success: true,
            error: null,
          },
        }).catch((e: any) => { throw new Error(`Falha ao persistir telemetria financeira: ${e?.message ?? e}`); }));
      }

      const successResult: AgentCallResult = {
        text: res?.text ?? '',
        data: opts.json && res?.text ? JSON.parse(res.text) : res?.text,
        usage: res?.usage ?? emptyUsage,
        durationMs,
        provider: step.provider,
        model: modelAttempt,
        error: lastError ?? null, // Ensure error is explicitly string or null
      };
      if (llmCacheEnabled()) llmResponseCache.set(cacheKey, { at: Date.now(), result: successResult });
      return successResult;
    }
    if (movedToNextProvider) continue; // Continua para o próximo provider na cadeia
  }
  throw new Error(`Falha na chamada LLM: ${lastError ?? 'Erro desconhecido'}`);
}

export async function callLLM(
  userId: string,
  opts: LlmOptions & { json?: boolean; validate?: (data: any, text: string) => string | null }
): Promise<AgentCallResult> {
  const result = await callAgent(userId, { ...opts, agent: opts.agent ?? 'analysis-assistant' });
  return { ...result, error: result.error ?? null };
}
