// Lógica pura (sem Prisma/rede) de mapeamento dos campos-protótipo legado em Campaign
// (isExperiment/experimentId/...) para o desenho novo (GoogleAdsExperiment + arms).
// Mantida separada do script CLI em scripts/backfill-google-ads-experiments.ts para poder
// ser testada sem banco real — ver plano seção 4 "Compatibilidade com os campos já
// adicionados a Campaign".

import { EXPERIMENT_STATUSES } from './types';

export interface LegacyExperimentCampaign {
  id: string;
  userId: string;
  isExperiment: boolean;
  experimentId: string | null;
  experimentStatus: string | null;
  experimentTrafficSplit: number;
  baseCampaignId: string | null;
  googleTrialCampaignId: string | null;
  experimentVariationType: string | null;
  experimentVariationValue: string | null;
  presellUrl: string | null;
  googleCampaignId: string | null;
}

export interface ExperimentArmDraft {
  name: string;
  isControl: boolean;
  trafficSplit: number;
  googleCampaignId: string | null;
  finalUrl: string | null;
}

export interface ExperimentDraft {
  idempotencyKey: string;
  data: {
    userId: string;
    campaignId: string;
    googleExperimentId: string | null;
    name: string;
    status: string;
    trafficAllocationType: string;
    variationType: string;
    variationConfig: Record<string, unknown>;
  };
  arms: [ExperimentArmDraft, ExperimentArmDraft];
}

const KNOWN_EXPERIMENT_STATUSES = new Set<string>(EXPERIMENT_STATUSES);

export function buildBackfillIdempotencyKey(campaignId: string): string {
  return `legacy-backfill-${campaignId}`;
}

// O campo legado Campaign.experimentVariationType documenta "PRESELL" no comentário; a
// modelagem nova usa "PRESELL_URL" (ver schema.prisma). Esta função normaliza o drift.
export function normalizeLegacyVariationType(value: string | null): string {
  if (!value) return "PRESELL_URL";
  const upper = value.trim().toUpperCase();
  if (upper === "PRESELL") return "PRESELL_URL";
  return upper;
}

export function normalizeLegacyStatus(value: string | null): string {
  if (!value) return "SETUP";
  const upper = value.trim().toUpperCase();
  return KNOWN_EXPERIMENT_STATUSES.has(upper) ? upper : "SETUP";
}

export function clampTrafficSplit(value: number): number {
  if (!Number.isFinite(value)) return 50;
  return Math.min(99, Math.max(1, Math.round(value)));
}

export function mapLegacyCampaignToExperimentDraft(
  campaign: LegacyExperimentCampaign
): ExperimentDraft | null {
  if (!campaign.isExperiment) return null;

  const treatmentSplit = clampTrafficSplit(campaign.experimentTrafficSplit);
  const controlSplit = 100 - treatmentSplit;

  return {
    idempotencyKey: buildBackfillIdempotencyKey(campaign.id),
    data: {
      userId: campaign.userId,
      campaignId: campaign.id,
      googleExperimentId: campaign.experimentId,
      name: `Backfill legado — ${campaign.id}`,
      status: normalizeLegacyStatus(campaign.experimentStatus),
      trafficAllocationType: "SEARCH_CUSTOM",
      variationType: normalizeLegacyVariationType(campaign.experimentVariationType),
      variationConfig: {
        source: "legacy-campaign-fields",
        rawVariationValue: campaign.experimentVariationValue,
      },
    },
    arms: [
      {
        name: "control",
        isControl: true,
        trafficSplit: controlSplit,
        googleCampaignId: campaign.baseCampaignId ?? campaign.googleCampaignId,
        finalUrl: campaign.presellUrl,
      },
      {
        name: "treatment",
        isControl: false,
        trafficSplit: treatmentSplit,
        googleCampaignId: campaign.googleTrialCampaignId,
        finalUrl: campaign.experimentVariationValue,
      },
    ],
  };
}

export function shouldSkipBackfill(
  idempotencyKey: string,
  existingIdempotencyKeys: ReadonlySet<string>
): boolean {
  return existingIdempotencyKeys.has(idempotencyKey);
}
