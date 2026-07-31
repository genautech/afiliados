// Contratos Zod dos Experimentos A/B (Tarefa 5 do plano, seção 5 "Contratos e regras de
// domínio"). Objetivo: validar as invariantes de negócio na borda (rota/serviço), não deixar
// pra descobrir em runtime na Google Ads API. Datas/ownership que dependem de relógio ou banco
// (startDate futura, campanha pertence ao usuário) ficam fora do Zod de propósito — viram
// funções puras testáveis com `now`/dados injetados, não regra embutida no schema.

import { z } from 'zod';
import { MutationAuthorizationSchema } from '../google-ads/route-mutation-authorization';
import {
  EXPERIMENT_ACTIONS,
  EXPERIMENT_FEASIBILITY,
  EXPERIMENT_STATUSES,
  EXPERIMENT_VARIATION_TYPES,
} from './types';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}/;
const NUMERIC_ID = /^\d+$/;

// Split de cada braço inteiro entre 1 e 99; MVP sempre 2 braços (control + treatment).
export const trafficSplitSchema = z.number().int().min(1).max(99);

function isPrivateOrLocalHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (lower === 'localhost' || lower.endsWith('.local')) return true;
  if (lower === '0.0.0.0' || /^127\./.test(lower) || /^10\./.test(lower)) return true;
  if (/^192\.168\./.test(lower)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(lower)) return true;
  return false;
}

// URL servível num braço de experimento (control ou treatment): HTTPS, pública, formato de
// URL válido — ver plano seção 5 ("URL de tratamento deve ser HTTPS, pública...").
export const experimentUrlSchema = z
  .string()
  .url('URL inválida')
  .superRefine((url, ctx) => {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'URL inválida' });
      return;
    }
    if (parsed.protocol !== 'https:') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'URL precisa ser HTTPS' });
    }
    if (isPrivateOrLocalHost(parsed.hostname)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'URL precisa ser pública (não localhost/IP privado)',
      });
    }
  });

export const ExperimentStatusSchema = z.enum(EXPERIMENT_STATUSES);
export const ExperimentVariationTypeSchema = z.enum(EXPERIMENT_VARIATION_TYPES);
export const ExperimentFeasibilitySchema = z.enum(EXPERIMENT_FEASIBILITY);
export const ExperimentActionSchema = z.enum(EXPERIMENT_ACTIONS);

// 1. Criar o rascunho local do experimento (antes de qualquer chamada à API real).
export const CreateExperimentDraftInputSchema = z
  .object({
    campaignId: z.string().min(1),
    googleCampaignId: z.string().regex(NUMERIC_ID, 'googleCampaignId deve ser numérico'),
    hypothesis: z.string().min(1).max(2000),
    variationType: ExperimentVariationTypeSchema.default('PRESELL_URL'),
    startDate: z.string().regex(ISO_DATE, 'startDate precisa ser YYYY-MM-DD'),
    endDate: z.string().regex(ISO_DATE, 'endDate precisa ser YYYY-MM-DD'),
    lossCap: z.number().positive('lossCap precisa ser maior que zero'),
  })
  .refine((v) => v.endDate > v.startDate, {
    message: 'endDate precisa ser depois de startDate',
    path: ['endDate'],
  });
export type CreateExperimentDraftInput = z.infer<typeof CreateExperimentDraftInputSchema>;

// 2. Criar os 2 braços (control + treatment) na mesma request — trafficSplitControl é
// derivado, nunca informado direto, pra soma 100 ser garantida por construção.
export const CreateExperimentArmsInputSchema = z
  .object({
    experimentId: z.string().min(1),
    control: z.object({
      name: z.string().min(1).default('control'),
      googleCampaignId: z.string().regex(NUMERIC_ID, 'googleCampaignId deve ser numérico'),
      finalUrl: experimentUrlSchema,
    }),
    treatment: z.object({
      name: z.string().min(1).default('treatment'),
      presellId: z.string().min(1),
      finalUrl: experimentUrlSchema,
    }),
    trafficSplitTreatment: trafficSplitSchema.default(50),
  })
  .transform((v) => ({
    ...v,
    trafficSplitControl: 100 - v.trafficSplitTreatment,
  }));
export type CreateExperimentArmsInput = z.infer<typeof CreateExperimentArmsInputSchema>;

// 3. Aplicar a variação (troca de finalUrls) no in-design treatment campaign.
export const ApplyPresellVariationInputSchema = z.object({
  experimentId: z.string().min(1),
  armId: z.string().min(1),
  presellId: z.string().min(1),
  finalUrl: experimentUrlSchema,
});
export type ApplyPresellVariationInput = z.infer<typeof ApplyPresellVariationInputSchema>;

// 4. Agendar (ScheduleExperiment) — materializa o treatment servível, pode gastar a partir de
// startDate. treatmentModified precisa vir true (evidência real de que finalUrls mudou —
// checada no serviço, não só um boolean confiado do cliente) e confirmRealMutation precisa
// ser explícito (nunca inferido) pra bater com o mutation guard da Tarefa 2.
export const ScheduleExperimentInputSchema = z
  .object({
    experimentId: z.string().min(1),
    treatmentModified: z.boolean(),
    confirmRealMutation: z.boolean(),
  })
  .refine((v) => v.treatmentModified === true, {
    message: 'Tratamento precisa ter sido alterado (finalUrls) antes de agendar',
    path: ['treatmentModified'],
  });
export type ScheduleExperimentInput = z.infer<typeof ScheduleExperimentInputSchema>;

// 5. Ações finais — END/PROMOTE/GRADUATE, sempre com confirmação humana no MVP.
export const ExperimentActionInputSchema = z.object({
  experimentId: z.string().min(1),
  action: ExperimentActionSchema,
  confirmRealMutation: z.boolean(),
  reason: z.string().min(1).max(500).optional(),
});
export type ExperimentActionInput = z.infer<typeof ExperimentActionInputSchema>;

const ExperimentMetricPointSchema = z.object({
  impressions: z.number().int().min(0),
  clicks: z.number().int().min(0),
  costMicros: z.number().min(0),
  conversions: z.number().min(0),
  conversionValue: z.number().min(0),
});

const ExperimentStatisticSchema = z.object({
  pointEstimate: z.number().nullable(),
  marginOfError: z.number().nullable(),
  pValue: z.number().nullable(),
});

// 6. Resultado de um pull/sync (polling de estado remoto).
export const ExperimentSyncResultSchema = z.object({
  experimentId: z.string().min(1),
  status: ExperimentStatusSchema,
  remoteStatusRaw: z.string().trim().min(1),
  lastSyncedAt: z.string(),
  changed: z.boolean(),
  warnings: z.array(z.string()),
});
export type ExperimentSyncResult = z.infer<typeof ExperimentSyncResultSchema>;

// 7. Relatório consolidado (recurso `experiment` da API — controle/tratamento/estatística).
export const ExperimentReportSchema = z.object({
  experimentId: z.string().min(1),
  status: ExperimentStatusSchema,
  remoteStatusRaw: z.string().trim().min(1),
  metricsValid: z.boolean(),
  control: ExperimentMetricPointSchema,
  treatment: ExperimentMetricPointSchema,
  statistics: z.record(ExperimentStatisticSchema),
  hasSignificantResult: z.boolean(),
  feasibility: ExperimentFeasibilitySchema,
  summary: z.string(),
});
export type ExperimentReport = z.infer<typeof ExperimentReportSchema>;

// startDate precisa ser futura — depende de relógio, por isso fica fora do Zod acima (schema
// puro não deveria embutir Date.now()). `now` é injetado pra ficar testável sem mockar relógio.
export function assertStartDateIsFuture(startDate: string, now: Date = new Date()): boolean {
  const startUtcMidnight = new Date(`${startDate}T00:00:00Z`).getTime();
  const todayUtcMidnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return startUtcMidnight > todayUtcMidnight;
}

// 8. Payload completo de setup (POST /api/google-ads/experiments) com validação estrita.
export const SetupExperimentPayloadSchema = z
  .object({
    campaignId: z.string().min(1),
    presellId: z.string().min(1),
    treatmentFinalUrl: experimentUrlSchema,
    name: z.string().min(1).max(255).optional(),
    startDate: z.string().regex(ISO_DATE, 'startDate precisa ser YYYY-MM-DD').optional(),
    endDate: z.string().regex(ISO_DATE, 'endDate precisa ser YYYY-MM-DD').optional(),
    trafficSplitTreatment: z.number().int().min(1).max(99).optional().default(50),
    authorization: MutationAuthorizationSchema.strict(),
  })
  .strict();
export type SetupExperimentPayload = z.infer<typeof SetupExperimentPayloadSchema>;
