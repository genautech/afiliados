/**
 * A01: estados locais intermediários. Existem porque o status da campanha aqui não pode
 * afirmar o que a API do anunciante ainda não confirmou — um lançamento que subiu PAUSED
 * não é ATIVA, e uma pausa que não voltou confirmada não é PAUSADO.
 */
export const PENDING_LAUNCH = 'PENDING_LAUNCH';
export const PENDING_PAUSE = 'PENDING_PAUSE';

/** Status que representam intenção pendente de confirmação remota. */
export const PENDING_STATUSES = [PENDING_LAUNCH, PENDING_PAUSE] as const;

export function isPendingStatus(status: string | null | undefined): boolean {
  return status === PENDING_LAUNCH || status === PENDING_PAUSE;
}
