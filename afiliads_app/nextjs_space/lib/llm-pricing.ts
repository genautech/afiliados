// Preços de referência dos provedores de LLM em USD por 1 milhão de tokens
// (entrada/saída), usados para calcular o custo de cada AgentRun de forma
// transparente — o mesmo número aparece no extrato do usuário e no painel admin.
// Valores alinhados aos comentários de roteamento em lib/llm.ts (2026-07).

export interface ModelPrice {
  inputPer1M: number;
  outputPer1M: number;
}

// Chave = fragmento do nome do modelo (match por inclusão, do mais específico
// para o mais genérico). Modelos Ollama (gpt-oss local/cloud) custam $0.
const MODEL_PRICES: Array<{ match: string; price: ModelPrice }> = [
  // Anthropic
  { match: 'claude-opus-4-8', price: { inputPer1M: 5, outputPer1M: 25 } },
  { match: 'claude-opus-4-7', price: { inputPer1M: 5, outputPer1M: 25 } },
  { match: 'claude-opus', price: { inputPer1M: 5, outputPer1M: 25 } },
  { match: 'claude-fable-5', price: { inputPer1M: 3, outputPer1M: 15 } },
  { match: 'claude', price: { inputPer1M: 3, outputPer1M: 15 } },
  // OpenAI
  { match: 'gpt-4o-mini', price: { inputPer1M: 0.15, outputPer1M: 0.6 } },
  { match: 'gpt-4o', price: { inputPer1M: 2.5, outputPer1M: 10 } },
  { match: 'gpt-5.4-mini', price: { inputPer1M: 0.15, outputPer1M: 0.6 } },
  // Google
  { match: 'gemini-2.5-pro', price: { inputPer1M: 1.25, outputPer1M: 12 } },
  { match: 'gemini-3.5-flash', price: { inputPer1M: 0.3, outputPer1M: 1.2 } },
  { match: 'gemini', price: { inputPer1M: 0.3, outputPer1M: 1.2 } },
  // Grok (xAI) — direto ou via Vertex MaaS
  { match: 'grok-4.20-reasoning', price: { inputPer1M: 1.25, outputPer1M: 2.5 } },
  { match: 'grok-4.1-fast', price: { inputPer1M: 0.2, outputPer1M: 0.5 } },
  { match: 'grok', price: { inputPer1M: 0.2, outputPer1M: 0.5 } },
  // Ollama (local ou cloud) — sem custo por token
  { match: 'gpt-oss', price: { inputPer1M: 0, outputPer1M: 0 } },
];

// Fallback por provedor quando o modelo não está na tabela.
const PROVIDER_DEFAULTS: Record<string, ModelPrice> = {
  anthropic: { inputPer1M: 3, outputPer1M: 15 },
  openai: { inputPer1M: 2.5, outputPer1M: 10 },
  google: { inputPer1M: 0.3, outputPer1M: 1.2 },
  grok: { inputPer1M: 0.2, outputPer1M: 0.5 },
  ollama: { inputPer1M: 0, outputPer1M: 0 },
  abacusai: { inputPer1M: 0.15, outputPer1M: 0.6 },
};

export function getModelPrice(provider: string, model: string): ModelPrice {
  const normalized = (model ?? '').toLowerCase();
  for (const entry of MODEL_PRICES) {
    if (normalized.includes(entry.match)) return entry.price;
  }
  return PROVIDER_DEFAULTS[provider] ?? { inputPer1M: 0, outputPer1M: 0 };
}

export function estimateCostUsd(
  provider: string,
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  const price = getModelPrice(provider, model);
  const cost =
    (promptTokens / 1_000_000) * price.inputPer1M +
    (completionTokens / 1_000_000) * price.outputPer1M;
  // 6 casas decimais é suficiente (fração de centavo) e evita ruído de float no DB
  return Math.round(cost * 1_000_000) / 1_000_000;
}
