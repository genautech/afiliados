// Módulo folha (sem prisma / sem provider SDK) para que tanto lib/llm.ts quanto as rotas de API
// possam importar a mesma mensagem de erro. Antes, a rota reconhecia "sem chave configurada" por
// regex solta e a lista de provedores estava duplicada em dois lugares — a de lib/llm.ts já tinha
// divergido (não citava OpenRouter, que é justamente o provedor padrão).

/** Rótulo de exibição de cada provedor. Precisa cobrir todo ACTIVE_PROVIDERS — ver llm-errors.test.ts. */
export const LLM_PROVIDER_LABELS: Record<string, string> = {
  openrouter: 'OpenRouter',
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google',
  grok: 'Grok',
  kimi: 'Kimi',
  ollama: 'Ollama',
};

/** Ordem de exibição na mensagem: a mesma da tela de Configurações → Provedores de IA. */
export const LLM_PROVIDER_DISPLAY_ORDER = [
  'openrouter', 'openai', 'anthropic', 'google', 'grok', 'kimi', 'ollama',
] as const;

export const LLM_PROVIDER_LIST = LLM_PROVIDER_DISPLAY_ORDER
  .map((p) => LLM_PROVIDER_LABELS[p])
  .join(', ');

/** Prefixo estável: é por ele que as rotas identificam o erro, não pela lista de provedores. */
export const NO_LLM_KEY_ERROR_PREFIX = 'Nenhuma API key de LLM configurada';

export const NO_LLM_KEY_ERROR = `${NO_LLM_KEY_ERROR_PREFIX} (${LLM_PROVIDER_LIST}).`;

/**
 * Só é `true` para o caso real de "nenhuma chave configurada" (cadeia de roteamento vazia).
 * Falha de quota, timeout, 401 de um provedor específico ou instabilidade NÃO entram aqui —
 * mandar o usuário reconfigurar chave nesses casos é o falso positivo que essa função evita.
 */
export function isNoLlmKeyError(message: string): boolean {
  return message.includes(NO_LLM_KEY_ERROR_PREFIX);
}
