// Tipos canônicos de domínio pros Experimentos A/B do Google Ads (Tarefa 5 do plano). Listas
// `as const` compartilhadas com schemas.ts (z.enum) e com lib/google-ads-experiments/backfill.ts
// (Tarefa 3) — única fonte de verdade pros valores conhecidos de status/variação/etc.

// Workflow LOCAL (nosso app/DB) — não é o enum remoto da API. Dirige o que a UI/gates internos
// permitem (ex.: `assertActionAllowedFromStatus`). Nunca escrever aqui um valor vindo direto da
// API sem passar por `mapGoogleExperimentRemoteStatus` primeiro (A4, checkpoint pós-Tarefa 8).
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

// Enum REMOTO real do recurso `experiment` na Google Ads API v25 (`ExperimentStatusEnum.
// ExperimentStatus`) — não confundir com `ExperimentStatus` (workflow local) acima. Fonte:
// .hermes/handoffs/2026-07-29_task8-cross-flow-quality-gate.md, item A4.
export const GOOGLE_EXPERIMENT_REMOTE_STATUSES = [
  'UNSPECIFIED',
  'UNKNOWN',
  'SETUP',
  'INITIATED',
  'ENABLED',
  'GRADUATED',
  'REMOVED',
  'PROMOTED',
  'HALTED',
] as const;
export type GoogleExperimentRemoteStatus = (typeof GOOGLE_EXPERIMENT_REMOTE_STATUSES)[number];

export interface MappedExperimentStatus {
  local: ExperimentStatus;
  // Sempre preservado tal como veio da API, mesmo quando `local` é uma aproximação (ex.:
  // REMOVED e HALTED os dois mapeiam pra ENDED localmente, mas remoteStatusRaw distingue).
  remoteStatusRaw: string;
}

// Mapper explícito e puro — nunca cai em SETUP como default pra um valor desconhecido (regra
// A4: "nunca converter status remoto desconhecido em SETUP"). UNKNOWN/UNSPECIFIED ou qualquer
// string fora do enum mapeiam pra ERROR local, forçando revisão humana em vez de assumir que o
// experimento ainda está em SETUP.
export function mapGoogleExperimentRemoteStatus(remoteStatus: string): MappedExperimentStatus {
  const local: ExperimentStatus = (() => {
    switch (remoteStatus as GoogleExperimentRemoteStatus) {
      case 'SETUP':
        return 'SETUP';
      case 'INITIATED':
        return 'SCHEDULED';
      case 'ENABLED':
        return 'RUNNING';
      case 'HALTED':
        return 'ENDED';
      case 'REMOVED':
        return 'ENDED';
      case 'PROMOTED':
        return 'PROMOTED';
      case 'GRADUATED':
        return 'GRADUATED';
      case 'UNKNOWN':
      case 'UNSPECIFIED':
      default:
        return 'ERROR';
    }
  })();
  return { local, remoteStatusRaw: remoteStatus };
}

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
