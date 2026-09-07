/**
 * Recorte exato que a última ingestão de gasto cobriu, no fuso da conta do Google Ads.
 * Sem isso, uma decisão do loop não consegue distinguir "gastou pouco" de
 * "sincronizou pouco" — ver A03/A05 no plano de correção.
 */
export interface SpendCoverage {
  googleCampaignId: string;
  /** Primeiro dia coberto, YYYY-MM-DD no fuso da conta. */
  from: string;
  /** Último dia coberto, YYYY-MM-DD no fuso da conta. */
  through: string;
  timeZone: string;
  /** Momento em que a plataforma foi observada, ISO-8601 em UTC. */
  observedAt: string;
}
