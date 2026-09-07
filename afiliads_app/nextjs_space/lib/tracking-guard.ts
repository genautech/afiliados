// S02 — proteções de /api/tracking.
//
// A rota é um proxy para a Conversions API do Meta. Sem essas guardas, qualquer um na
// internet conseguia (a) mandar Purchase com valor arbitrário para o pixel de uma conta,
// envenenando otimização e relatório, e (b) usar a rota como proxy anônimo passando
// accessToken próprio no body.
//
// Limitação conhecida: rate limit e deduplicação vivem na memória do processo. Em várias
// instâncias cada uma tem seu contador. Deduplicação durável exige tabela + migration, que
// não é aplicada sem aprovação explícita (ver Definition of Done do handoff).

/** Eventos que movem dinheiro/otimização. Exigem chamador autenticado. */
export const FINANCIAL_EVENTS = new Set([
  'Purchase',
  'Subscribe',
  'StartTrial',
  'CompleteRegistration',
  'AddPaymentInfo',
  'InitiateCheckout',
  'Lead',
]);

export function isFinancialEvent(eventName: string): boolean {
  return FINANCIAL_EVENTS.has(eventName);
}

type Janela = { inicio: number; contagem: number };
const janelas = new Map<string, Janela>();

export const RATE_LIMIT_MAX = 60;
export const RATE_LIMIT_WINDOW_MS = 60_000;

/** Sliding window simples por chave (IP). Retorna false quando estourou o limite. */
export function consumirRateLimit(
  chave: string,
  agora = Date.now(),
  max = RATE_LIMIT_MAX,
  janelaMs = RATE_LIMIT_WINDOW_MS,
): boolean {
  const atual = janelas.get(chave);
  if (!atual || agora - atual.inicio >= janelaMs) {
    janelas.set(chave, { inicio: agora, contagem: 1 });
    return true;
  }
  if (atual.contagem >= max) return false;
  atual.contagem += 1;
  return true;
}

const eventosVistos = new Map<string, number>();
export const DEDUP_TTL_MS = 24 * 3600_000;

/**
 * Marca um eventId como visto. Retorna true se é a primeira vez (deve processar),
 * false se é repetição dentro da janela (deve deduplicar).
 */
export function registrarEventId(eventId: string, agora = Date.now(), ttlMs = DEDUP_TTL_MS): boolean {
  for (const [id, visto] of eventosVistos) {
    if (agora - visto >= ttlMs) eventosVistos.delete(id);
  }
  const anterior = eventosVistos.get(eventId);
  if (anterior !== undefined && agora - anterior < ttlMs) return false;
  eventosVistos.set(eventId, agora);
  return true;
}

/** Só para teste: zera o estado em memória entre casos. */
export function resetTrackingGuardState(): void {
  janelas.clear();
  eventosVistos.clear();
}
