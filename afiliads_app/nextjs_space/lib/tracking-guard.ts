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

// R02 — deduplicação com ciclo de vida.
//
// A versão anterior guardava só o `eventId`, e guardava ANTES de falar com o Meta. Dois
// buracos:
//  (a) chave global — o `eventId` "1" de uma conta silenciava o `eventId` "1" de outra, e o
//      mesmo id reaproveitado num PageView bloqueava o Purchase correspondente;
//  (b) falso-positivo em falha real — se a CAPI devolvia 503, o evento nunca foi entregue mas
//      já constava como visto; o retry do cliente voltava `deduplicated: true` e a conversão
//      sumia de vez.
// Agora a chave é composta e cada evento passa por PENDING → DELIVERED | FAILED. Só DELIVERED
// (e um PENDING ainda recente, ou seja, requisição gêmea em voo) deduplica; FAILED e PENDING
// vencido liberam o retry.

export type EstadoEvento = 'PENDING' | 'DELIVERED' | 'FAILED';

export interface ChaveEvento {
  /** Conta dona do evento. Anônimo (navegação sem sessão) cai em 'anon'. */
  accountId: string | null;
  pixelId: string;
  eventType: string;
  eventId: string;
}

/** Chave composta: `${accountId}_${pixelId}_${eventType}_${eventId}`. */
export function montarChaveEvento({ accountId, pixelId, eventType, eventId }: ChaveEvento): string {
  return `${accountId ?? 'anon'}_${pixelId}_${eventType}_${eventId}`;
}

type RegistroEvento = { estado: EstadoEvento; em: number };
const eventosVistos = new Map<string, RegistroEvento>();

export const DEDUP_TTL_MS = 24 * 3600_000;
/** Janela em que um PENDING ainda é considerado "em voo". Depois disso, é retry legítimo. */
export const PENDING_TTL_MS = 120_000;

export interface EventoReivindicado {
  duplicado: false;
  chave: string;
  /** Meta confirmou a entrega: a chave passa a deduplicar retries. */
  confirmar(): void;
  /** Entrega falhou de verdade: libera a chave para o retry do cliente. */
  falhar(): void;
}

export interface EventoDuplicado {
  duplicado: true;
  chave: string;
  estado: Extract<EstadoEvento, 'PENDING' | 'DELIVERED'>;
}

export type ReivindicacaoEvento = EventoReivindicado | EventoDuplicado;

function limparVencidos(agora: number, ttlMs: number): void {
  for (const [chave, registro] of eventosVistos) {
    const limite = registro.estado === 'PENDING' ? PENDING_TTL_MS : ttlMs;
    if (agora - registro.em >= limite) eventosVistos.delete(chave);
  }
}

/**
 * Reivindica o direito de processar um evento. Devolve `duplicado: false` com os callbacks de
 * fim de ciclo, ou `duplicado: true` quando outra requisição já entregou (DELIVERED) ou está
 * entregando agora (PENDING recente).
 */
export function reivindicarEvento(
  chaveEvento: ChaveEvento,
  agora = Date.now(),
  ttlMs = DEDUP_TTL_MS,
): ReivindicacaoEvento {
  limparVencidos(agora, ttlMs);
  const chave = montarChaveEvento(chaveEvento);
  const anterior = eventosVistos.get(chave);

  if (anterior) {
    if (anterior.estado === 'DELIVERED' && agora - anterior.em < ttlMs) {
      return { duplicado: true, chave, estado: 'DELIVERED' };
    }
    if (anterior.estado === 'PENDING' && agora - anterior.em < PENDING_TTL_MS) {
      return { duplicado: true, chave, estado: 'PENDING' };
    }
    // FAILED, ou PENDING vencido: o evento não chegou ao Meta. Retry pode seguir.
  }

  eventosVistos.set(chave, { estado: 'PENDING', em: agora });
  return {
    duplicado: false,
    chave,
    confirmar: () => eventosVistos.set(chave, { estado: 'DELIVERED', em: Date.now() }),
    falhar: () => eventosVistos.set(chave, { estado: 'FAILED', em: Date.now() }),
  };
}

/** Só para inspeção em teste. */
export function estadoEvento(chaveEvento: ChaveEvento): EstadoEvento | undefined {
  return eventosVistos.get(montarChaveEvento(chaveEvento))?.estado;
}

/** Só para teste: zera o estado em memória entre casos. */
export function resetTrackingGuardState(): void {
  janelas.clear();
  eventosVistos.clear();
}
