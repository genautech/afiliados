// Tipos canônicos de domínio pros Experimentos A/B do Google Ads (Tarefa 5 do plano). Listas
// `as const` compartilhadas com schemas.ts (z.enum) e com lib/google-ads-experiments/backfill.ts
// (Tarefa 3) — única fonte de verdade pros valores conhecidos de status/variação/etc.

export const EXPERIMENT_STATUSES = [
  'SETUP',
  'SCHEDULED',
  'RUNNING',
  'PROMOTED',
  'GRADUATED',
  'ENDED',
  'ERROR',
] as const;
export type ExperimentStatus = (typeof EXPERIMENT_STATUSES)[number];

export const EXPERIMENT_VARIATION_TYPES = ['PRESELL_URL', 'ADS_COPY', 'BID_STRATEGY'] as const;
export type ExperimentVariationType = (typeof EXPERIMENT_VARIATION_TYPES)[number];

export const EXPERIMENT_FEASIBILITY = ['VIABLE', 'UNDERPOWERED', 'UNVIABLE'] as const;
export type ExperimentFeasibility = (typeof EXPERIMENT_FEASIBILITY)[number];

export const EXPERIMENT_ACTIONS = ['END', 'PROMOTE', 'GRADUATE'] as const;
export type ExperimentActionType = (typeof EXPERIMENT_ACTIONS)[number];

export interface ExperimentMetricPoint {
  impressions: number;
  clicks: number;
  costMicros: number;
  conversions: number;
  conversionValue: number;
}

export interface ExperimentStatistic {
  pointEstimate: number | null;
  marginOfError: number | null;
  pValue: number | null;
}
