// Tarefa 9 — Reporting oficial de Experimentos Google Ads (recurso `experiment`, v25).
// Campos GAQL confirmados contra
// developers.google.com/google-ads/api/fields/v25/experiment_query_builder (não inferidos —
// lição da Tarefa 8R, que corrigiu contratos inventados). Determinístico, sem LLM: uplift e
// p-value vêm sempre da API; a única decisão local é o corte de amostra mínima (`targetClicks`,
// vindo do budget determinístico da Tarefa 5) usado só pra diferenciar "sem dado suficiente" de
// "sem efeito real" — nunca escolhe vencedor.
//
// Leitura pura: não passa pelo mutation guard (Tarefa 2/8R-A5) porque não muta nada — só
// `googleAdsRequest` (wrapper de leitura).

import { googleAdsRequest, isMockMode, type GoogleAdsCredentials } from './client';
import { mapGoogleExperimentRemoteStatus } from '../google-ads-experiments/types';
import type { PrismaClient } from '@prisma/client';
import type { ExperimentReport } from '../google-ads-experiments/schemas';

type ExperimentMetricPoint = ExperimentReport['control'];
type ExperimentStatistics = ExperimentReport['statistics'];

// Ordem/nomes exatos confirmados no query builder oficial v25. Note as 3 famílias de sufixo
// não uniformes entre métricas (achado da exploração desta sessão, não uma escolha nossa):
// clicks/impressions -> "_point_estimate"; cost_micros/conversion_value -> "_change_point_estimate"
// (mas "_margin_of_error"/"_p_value" sem "_change_"); conversions -> família própria
// "_absolute_change_*". Reproduzir fiel, não normalizar.
const REPORT_FIELDS = [
  'experiment.resource_name',
  'experiment.experiment_id',
  'experiment.status',
  'metrics.impressions',
  'metrics.impressions_point_estimate',
  'metrics.impressions_margin_of_error',
  'metrics.impressions_p_value',
  'metrics.control_impressions',
  'metrics.clicks',
  'metrics.clicks_point_estimate',
  'metrics.clicks_margin_of_error',
  'metrics.clicks_p_value',
  'metrics.control_clicks',
  'metrics.cost_micros',
  'metrics.cost_micros_change_point_estimate',
  'metrics.cost_micros_margin_of_error',
  'metrics.cost_micros_p_value',
  'metrics.control_cost_micros',
  'metrics.conversions',
  'metrics.conversions_absolute_change_point_estimate',
  'metrics.conversions_absolute_change_margin_of_error',
  'metrics.conversions_absolute_change_p_value',
  'metrics.control_conversions',
  'metrics.conversions_value',
  'metrics.conversion_value_change_point_estimate',
  'metrics.conversion_value_margin_of_error',
  'metrics.conversion_value_p_value',
  'metrics.control_conversion_value',
].join(', ');

const EXPERIMENT_RESOURCE_RE = /^customers\/(\d+)\/experiments\/(\d+)$/;
const CAMPAIGN_RESOURCE_RE = /^customers\/(\d+)\/campaigns\/(\d+)$/;

function parseExperimentResourceName(resourceName: string) {
  const match = EXPERIMENT_RESOURCE_RE.exec(resourceName);
  if (!match) throw new Error('Invalid experiment resource name format');
  return { customerId: match[1], experimentId: match[2] };
}

function parseConfiguredCustomerId(customerId: unknown): string {
  if (typeof customerId !== 'string') throw new Error('customerId da configuração possui formato inválido.');
  const raw = customerId.trim();
  if (/^\d{10}$/.test(raw)) return raw;
  if (/^\d{3}-\d{3}-\d{4}$/.test(raw)) return raw.replace(/-/g, '');
  throw new Error('customerId da configuração possui formato inválido.');
}

// Query builder puro (sem rede) — testável direto, mesmo padrão de `queryExperimentArms`.
export function buildExperimentReportQuery(experimentResourceName: string): string {
  parseExperimentResourceName(experimentResourceName);
  return `
    SELECT ${REPORT_FIELDS}
    FROM experiment
    WHERE experiment.resource_name = '${experimentResourceName}'
  `;
}

interface RawExperimentReportRow {
  experiment?: { resourceName?: string; experimentId?: string; status?: string };
  metrics?: Record<string, unknown>;
}

function parseStrictNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return null;
    if (!/^-?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(trimmed)) return null;
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

interface ParsedMetric {
  value: number;
  valid: boolean;
}

function parseCounter(value: unknown): ParsedMetric {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value >= 0 && value <= 2_147_483_647
      ? { value, valid: true }
      : { value: 0, valid: false };
  }
  if (typeof value === 'string' && /^\d+$/.test(value)) {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed <= 2_147_483_647
      ? { value: parsed, valid: true }
      : { value: 0, valid: false };
  }
  return { value: 0, valid: false };
}

function parseNonNegativeMetric(value: unknown): ParsedMetric {
  const parsed = parseStrictNumber(value);
  return parsed !== null && parsed >= 0
    ? { value: parsed, valid: true }
    : { value: 0, valid: false };
}

function stat(value: unknown, isPValue = false, isMargin = false): number | null {
  const n = parseStrictNumber(value);
  if (n === null) return null;
  if (isPValue && (n < 0 || n > 1)) return null;
  if (isMargin && n < 0) return null;
  return n;
}

function extractExperimentIdFromResourceName(resourceName: string): string {
  return resourceName.split('/').pop() ?? resourceName;
}

function validateTargetClicks(targetClicks: unknown): asserts targetClicks is number {
  if (typeof targetClicks !== 'number' || !Number.isFinite(targetClicks) || !Number.isInteger(targetClicks) || targetClicks < 1) {
    throw new Error('targetClicks inválido');
  }
}

// Corte determinístico: sem p-value real da API, nunca inventamos significância. Amostra abaixo
// do alvo (Tarefa 5, `targetClicks`) sempre vira UNDERPOWERED, mesmo que a API já tenha
// devolvido algum p-value pontual — evita declarar resultado cedo demais (plano, seção 1.2).
function decideOutcome(
  sampleSize: number,
  targetClicks: number,
  conversionsPValue: number | null,
  conversionsPointEstimate: number | null,
  conversionsMarginOfError: number | null
): { feasibility: ExperimentReport['feasibility']; hasSignificantResult: boolean; summary: string } {
  validateTargetClicks(targetClicks);
  
  if (conversionsPValue === null || conversionsPointEstimate === null || conversionsMarginOfError === null) {
    return {
      feasibility: 'UNDERPOWERED',
      hasSignificantResult: false,
      summary: 'Estatísticas ausentes ou inválidas. Resultado inconclusivo.',
    };
  }

  if (sampleSize < targetClicks) {
    return {
      feasibility: 'UNDERPOWERED',
      hasSignificantResult: false,
      summary: `Amostra insuficiente: ${sampleSize} cliques acumulados (controle+tratamento), abaixo do alvo de ${targetClicks}. Resultado inconclusivo — aguardando mais dados.`,
    };
  }

  if (conversionsPValue < 0.05) {
    const lowerBound = conversionsPointEstimate - conversionsMarginOfError;
    const upperBound = conversionsPointEstimate + conversionsMarginOfError;
    
    if (lowerBound > 0) {
      return {
        feasibility: 'VIABLE',
        hasSignificantResult: true,
        summary: `Diferença estatisticamente significativa em conversões (p=${conversionsPValue.toFixed(4)}), tratamento acima do controle.`,
      };
    }
    if (upperBound < 0) {
      return {
        feasibility: 'VIABLE',
        hasSignificantResult: true,
        summary: `Diferença estatisticamente significativa em conversões (p=${conversionsPValue.toFixed(4)}), tratamento abaixo do controle.`,
      };
    }
    return {
      feasibility: 'UNDERPOWERED',
      hasSignificantResult: false,
      summary: 'Intervalo de confiança cruza zero. Resultado inconclusivo.',
    };
  }
  return {
    feasibility: 'VIABLE',
    hasSignificantResult: false,
    summary: `Amostra suficiente (${sampleSize} cliques), mas diferença em conversões não é estatisticamente significativa (p=${conversionsPValue.toFixed(4)}).`,
  };
}

// Parsing puro de uma linha do recurso `experiment` (sem rede) — testável direto.
export function parseExperimentReportRow(
  row: RawExperimentReportRow,
  targetClicks: number,
  expectedResourceName?: string
): ExperimentReport {
  validateTargetClicks(targetClicks);
  const m = row.metrics ?? {};
  const remoteStatusCandidate = row.experiment?.status;
  const statusRaw = typeof remoteStatusCandidate === 'string' && remoteStatusCandidate.trim().length > 0
    ? remoteStatusCandidate.trim()
    : 'UNSPECIFIED';
  const mapped = mapGoogleExperimentRemoteStatus(statusRaw);

  const treatmentValues = {
    impressions: parseCounter(m.impressions),
    clicks: parseCounter(m.clicks),
    costMicros: parseNonNegativeMetric(m.costMicros),
    conversions: parseNonNegativeMetric(m.conversions),
    conversionValue: parseNonNegativeMetric(m.conversionsValue),
  };
  const controlValues = {
    impressions: parseCounter(m.controlImpressions),
    clicks: parseCounter(m.controlClicks),
    costMicros: parseNonNegativeMetric(m.controlCostMicros),
    conversions: parseNonNegativeMetric(m.controlConversions),
    conversionValue: parseNonNegativeMetric(m.controlConversionValue),
  };
  const treatment: ExperimentMetricPoint = {
    impressions: treatmentValues.impressions.value,
    clicks: treatmentValues.clicks.value,
    costMicros: treatmentValues.costMicros.value,
    conversions: treatmentValues.conversions.value,
    conversionValue: treatmentValues.conversionValue.value,
  };
  const control: ExperimentMetricPoint = {
    impressions: controlValues.impressions.value,
    clicks: controlValues.clicks.value,
    costMicros: controlValues.costMicros.value,
    conversions: controlValues.conversions.value,
    conversionValue: controlValues.conversionValue.value,
  };
  const cumulativeMetricsValid = [
    ...Object.values(treatmentValues),
    ...Object.values(controlValues),
  ].every((parsed) => parsed.valid);

  const statistics: ExperimentStatistics = {
    impressions: {
      pointEstimate: stat(m.impressionsPointEstimate),
      marginOfError: stat(m.impressionsMarginOfError, false, true),
      pValue: stat(m.impressionsPValue, true),
    },
    clicks: {
      pointEstimate: stat(m.clicksPointEstimate),
      marginOfError: stat(m.clicksMarginOfError, false, true),
      pValue: stat(m.clicksPValue, true),
    },
    costMicros: {
      pointEstimate: stat(m.costMicrosChangePointEstimate),
      marginOfError: stat(m.costMicrosMarginOfError, false, true),
      pValue: stat(m.costMicrosPValue, true),
    },
    conversions: {
      pointEstimate: stat(m.conversionsAbsoluteChangePointEstimate),
      marginOfError: stat(m.conversionsAbsoluteChangeMarginOfError, false, true),
      pValue: stat(m.conversionsAbsoluteChangePValue, true),
    },
    conversionValue: {
      pointEstimate: stat(m.conversionValueChangePointEstimate),
      marginOfError: stat(m.conversionValueMarginOfError, false, true),
      pValue: stat(m.conversionValuePValue, true),
    },
  };

  const sampleSize = treatment.clicks + control.clicks;
  const outcome = cumulativeMetricsValid
    ? decideOutcome(
      sampleSize,
      targetClicks,
      statistics.conversions.pValue,
      statistics.conversions.pointEstimate,
      statistics.conversions.marginOfError
    )
    : {
      feasibility: 'UNDERPOWERED' as const,
      hasSignificantResult: false,
      summary: 'Métricas cumulativas inválidas ou ausentes. Resultado inconclusivo.',
    };

  const resourceName = row.experiment?.resourceName ?? '';
  const resourceIdentity = resourceName ? parseExperimentResourceName(resourceName) : null;
  const declaredExperimentId = row.experiment?.experimentId;
  if (resourceIdentity && declaredExperimentId && resourceIdentity.experimentId !== declaredExperimentId) {
    throw new Error('Identidade do experimento divergente na resposta.');
  }
  if (expectedResourceName) {
    const expectedIdentity = parseExperimentResourceName(expectedResourceName);
    if (resourceName !== expectedResourceName || (declaredExperimentId && declaredExperimentId !== expectedIdentity.experimentId)) {
      throw new Error('Identidade do experimento divergente na resposta.');
    }
  }
  const experimentId = declaredExperimentId || resourceIdentity?.experimentId || '';
  if (!experimentId) {
    throw new Error('Identidade do experimento ausente na resposta.');
  }

  return {
    experimentId,
    status: mapped.local,
    remoteStatusRaw: mapped.remoteStatusRaw,
    metricsValid: cumulativeMetricsValid,
    control,
    treatment,
    statistics,
    ...outcome,
  };
}

function emptyMetricPoint(): ExperimentMetricPoint {
  return { impressions: 0, clicks: 0, costMicros: 0, conversions: 0, conversionValue: 0 };
}

function emptyStatistics(): ExperimentStatistics {
  const empty = { pointEstimate: null, marginOfError: null, pValue: null };
  return {
    impressions: { ...empty },
    clicks: { ...empty },
    costMicros: { ...empty },
    conversions: { ...empty },
    conversionValue: { ...empty },
  };
}

// Sem linha do recurso `experiment` (SETUP sem tráfego ainda, ou indisponível) e sem fallback de
// campanha — nunca inventa SETUP (A4): status desconhecido força ERROR local, revisão humana.
function buildInconclusiveReport(experimentResourceName: string, reason: string): ExperimentReport {
  return {
    experimentId: extractExperimentIdFromResourceName(experimentResourceName),
    status: mapGoogleExperimentRemoteStatus('UNKNOWN').local,
    remoteStatusRaw: 'UNKNOWN',
    metricsValid: false,
    control: emptyMetricPoint(),
    treatment: emptyMetricPoint(),
    statistics: emptyStatistics(),
    hasSignificantResult: false,
    feasibility: 'UNDERPOWERED',
    summary: reason,
  };
}

const VALIDATED_FALLBACK_ARMS = Symbol('validatedFallbackArms');

export interface ValidatedFallbackArms {
  controlCampaignResourceName: string;
  treatmentCampaignResourceName: string;
  experimentId: string;
  readonly [VALIDATED_FALLBACK_ARMS]: true;
}

export function validateFallbackArms(
  experimentId: string,
  arms: { isControl: boolean; servedCampaignResourceName?: string | null; experimentId: string }[]
): ValidatedFallbackArms {
  if (arms.length !== 2) throw new Error('É necessário exatamente 2 braços para o fallback.');
  const control = arms.find(a => a.isControl);
  const treatment = arms.find(a => !a.isControl);
  if (!control || !treatment) throw new Error('Braços de controle e tratamento devem estar presentes e bem definidos.');
  if (control.experimentId !== experimentId || treatment.experimentId !== experimentId) {
    throw new Error('Braços não pertencem ao experimento informado.');
  }
  if (!control.servedCampaignResourceName || !treatment.servedCampaignResourceName) {
    throw new Error('Braços devem ter campanhas servidas configuradas.');
  }
  if (control.servedCampaignResourceName === treatment.servedCampaignResourceName) {
    throw new Error('Campanhas de controle e tratamento devem ser distintas.');
  }
  return {
    controlCampaignResourceName: control.servedCampaignResourceName,
    treatmentCampaignResourceName: treatment.servedCampaignResourceName,
    experimentId,
    [VALIDATED_FALLBACK_ARMS]: true,
  };
}

// Campos padrão já usados em outros pontos do código (lib/google-ads.ts) pra métricas de
// campanha — não são específicos de Experiments, não precisam da mesma verificação da Tarefa 9.
async function fetchCampaignMetricPoint(
  token: string,
  config: GoogleAdsCredentials,
  campaignResourceName: string
): Promise<{ point: ExperimentMetricPoint; valid: boolean }> {
  if (!/^customers\/\d+\/campaigns\/\d+$/.test(campaignResourceName)) {
    throw new Error('Invalid campaign resource name format');
  }

  const query = `
    SELECT metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions, metrics.conversions_value
    FROM campaign
    WHERE campaign.resource_name = '${campaignResourceName}'
  `;
  const data = await googleAdsRequest(token, config, 'googleAds:search', { body: { query } });
  const m = data?.results?.[0]?.metrics ?? {};
  const parsed = {
    impressions: parseCounter(m.impressions),
    clicks: parseCounter(m.clicks),
    costMicros: parseNonNegativeMetric(m.costMicros),
    conversions: parseNonNegativeMetric(m.conversions),
    conversionValue: parseNonNegativeMetric(m.conversionsValue),
  };
  return {
    point: {
      impressions: parsed.impressions.value,
      clicks: parsed.clicks.value,
      costMicros: parsed.costMicros.value,
      conversions: parsed.conversions.value,
      conversionValue: parsed.conversionValue.value,
    },
    valid: Object.values(parsed).every((value) => value.valid),
  };
}

// Fallback/diagnóstico (plano, seção 1 correção #5): só métricas cruas por campanha, nunca
// uplift/p-value — não fingimos significância sem o cálculo real da API. Usado quando o recurso
// `experiment` ainda não tem linha (ex.: SETUP sem tráfego) mas o chamador já conhece as
// campanhas de controle/tratamento (Tarefa 10, via `GoogleAdsExperimentArm` persistido).
async function buildFallbackReport(
  token: string,
  config: GoogleAdsCredentials,
  experimentResourceName: string,
  fallback: ValidatedFallbackArms,
  targetClicks: number
): Promise<ExperimentReport> {
  if (fallback[VALIDATED_FALLBACK_ARMS] !== true) {
    throw new Error('Fallback arms não validados.');
  }
  const experimentIdentity = parseExperimentResourceName(experimentResourceName);
  const controlMatch = CAMPAIGN_RESOURCE_RE.exec(fallback.controlCampaignResourceName);
  const treatmentMatch = CAMPAIGN_RESOURCE_RE.exec(fallback.treatmentCampaignResourceName);
  if (!controlMatch || !treatmentMatch || controlMatch[1] !== experimentIdentity.customerId || treatmentMatch[1] !== experimentIdentity.customerId) {
    throw new Error('Campanhas de fallback não pertencem ao customer do experimento.');
  }
  const [controlResult, treatmentResult] = await Promise.all([
    fetchCampaignMetricPoint(token, config, fallback.controlCampaignResourceName),
    fetchCampaignMetricPoint(token, config, fallback.treatmentCampaignResourceName),
  ]);
  const control = controlResult.point;
  const treatment = treatmentResult.point;
  const metricsValid = controlResult.valid && treatmentResult.valid;
  const sampleSize = control.clicks + treatment.clicks;
  return {
    experimentId: extractExperimentIdFromResourceName(experimentResourceName),
    status: mapGoogleExperimentRemoteStatus('UNKNOWN').local,
    remoteStatusRaw: 'UNKNOWN',
    metricsValid,
    control,
    treatment,
    statistics: emptyStatistics(),
    hasSignificantResult: false,
    feasibility: 'UNDERPOWERED',
    summary: `Fallback de diagnóstico: recurso 'experiment' sem linha; métricas lidas direto das campanhas (sem uplift/p-value). Amostra: ${sampleSize} cliques.`,
  };
}

function buildMockRawRow(experimentResourceName: string): RawExperimentReportRow {
  return {
    experiment: {
      resourceName: experimentResourceName,
      experimentId: extractExperimentIdFromResourceName(experimentResourceName),
      status: 'ENABLED',
    },
    metrics: {
      impressions: 1000,
      impressionsPointEstimate: 0,
      impressionsMarginOfError: 0,
      impressionsPValue: null,
      controlImpressions: 1000,
      clicks: 60,
      clicksPointEstimate: 10,
      clicksMarginOfError: 5,
      clicksPValue: 0.03,
      controlClicks: 50,
      costMicros: 27_000_000,
      costMicrosChangePointEstimate: 2_000_000,
      costMicrosMarginOfError: 1_000_000,
      costMicrosPValue: 0.2,
      controlCostMicros: 25_000_000,
      conversions: 7,
      conversionsAbsoluteChangePointEstimate: 2,
      conversionsAbsoluteChangeMarginOfError: 1.5,
      conversionsAbsoluteChangePValue: null,
      controlConversions: 5,
      conversionsValue: 700,
      conversionValueChangePointEstimate: 200,
      conversionValueMarginOfError: 150,
      conversionValuePValue: 0.06,
      controlConversionValue: 500,
    },
  };
}

const MAX_REPORT_PAGES = 5;

export interface FetchExperimentReportOptions {
  targetClicks: number;
  fallbackCampaigns?: ValidatedFallbackArms;
}

// Recurso `experiment` sempre representa o snapshot cumulativo — não segmentamos por
// `segments.date` (isso multiplicaria linhas em fatias diárias, exigindo agregação extra que o
// MVP não precisa). Paginação mantida por contrato genérico do endpoint de search (mesma
// defesa de `listExperimentAsyncErrors`, Tarefa 8), mesmo esperando normalmente 0 ou 1 linha.
export async function fetchExperimentReport(
  token: string,
  config: GoogleAdsCredentials,
  experimentResourceName: string,
  options: FetchExperimentReportOptions
): Promise<ExperimentReport> {
  validateTargetClicks(options.targetClicks);
  const requestedIdentity = parseExperimentResourceName(experimentResourceName);
  const configuredCustomerId = parseConfiguredCustomerId(config.customerId);
  if (configuredCustomerId !== requestedIdentity.customerId) {
    throw new Error('Experiment resource name não pertence ao customer da configuração.');
  }
  if (isMockMode(config)) {
    return parseExperimentReportRow(buildMockRawRow(experimentResourceName), options.targetClicks, experimentResourceName);
  }

  const query = buildExperimentReportQuery(experimentResourceName);
  const rows: RawExperimentReportRow[] = [];
  let pageToken: string | undefined;
  let pages = 0;
  do {
    const data = await googleAdsRequest(token, config, 'googleAds:search', {
      body: pageToken ? { query, pageToken } : { query },
    });
    rows.push(...((data?.results ?? []) as RawExperimentReportRow[]));
    pageToken = data?.nextPageToken;
    pages += 1;
  } while (pageToken && rows.length === 0 && pages < MAX_REPORT_PAGES);

  if (rows.length === 0) {
    if (options.fallbackCampaigns) {
      return buildFallbackReport(token, config, experimentResourceName, options.fallbackCampaigns, options.targetClicks);
    }
    return buildInconclusiveReport(
      experimentResourceName,
      'Recurso `experiment` não retornou linhas (sem tráfego ainda ou fora de SETUP/RUNNING) e nenhum fallback de campanha foi fornecido.'
    );
  }

  return parseExperimentReportRow(rows[0], options.targetClicks, experimentResourceName);
}

export interface MetricSnapshotUpsertInput {
  experimentId: string; // FK local (GoogleAdsExperiment.id) — NÃO é o experimentId do Google.
  snapshotDate: Date;
  controlImpressions: number;
  controlClicks: number;
  controlCostMicros: number;
  controlConversions: number;
  controlConversionValue: number;
  treatmentImpressions: number;
  treatmentClicks: number;
  treatmentCostMicros: number;
  treatmentConversions: number;
  treatmentConversionValue: number;
  statistics: ExperimentStatistics;
  sourcePayload: unknown;
}

// Mapper puro pro shape de `GoogleAdsExperimentMetricSnapshot` (prisma/schema.prisma) — não
// chama Prisma. A persistência real ocorre via função upsertMetricSnapshot logo abaixo.
export function buildMetricSnapshotUpsertInput(
  dbExperimentId: string,
  snapshotDate: Date,
  report: ExperimentReport,
  sourcePayload: unknown = null
): MetricSnapshotUpsertInput {
  if (report.metricsValid !== true) {
    throw new Error('Relatório contém métricas cumulativas inválidas; snapshot não persistido.');
  }
  return {
    experimentId: dbExperimentId,
    snapshotDate,
    controlImpressions: report.control.impressions,
    controlClicks: report.control.clicks,
    controlCostMicros: report.control.costMicros,
    controlConversions: report.control.conversions,
    controlConversionValue: report.control.conversionValue,
    treatmentImpressions: report.treatment.impressions,
    treatmentClicks: report.treatment.clicks,
    treatmentCostMicros: report.treatment.costMicros,
    treatmentConversions: report.treatment.conversions,
    treatmentConversionValue: report.treatment.conversionValue,
    statistics: report.statistics,
    sourcePayload,
  };
}

export function sanitizeSourcePayload(raw: unknown): Record<string, unknown> {
  if (typeof raw !== 'object' || raw === null) return {};
  const safe: Record<string, unknown> = {};
  const data = raw as Record<string, unknown>;

  const checkStr = (val: unknown, limit = 255) => {
    if (typeof val === 'string' && val.length <= limit) return val;
    return undefined;
  };

  if (data.experiment && typeof data.experiment === 'object' && !Array.isArray(data.experiment)) {
    const exp = data.experiment as Record<string, unknown>;
    safe.experiment = {
      resourceName: checkStr(exp.resourceName),
      experimentId: checkStr(exp.experimentId, 50),
      status: checkStr(exp.status, 50),
    };
  }

  if (data.metrics && typeof data.metrics === 'object' && !Array.isArray(data.metrics)) {
    const safeMetrics: Record<string, unknown> = {};
    const rawMetrics = data.metrics as Record<string, unknown>;
    const allowlist = new Set([
      'impressions', 'impressions_point_estimate', 'impressionsPointEstimate', 'impressions_margin_of_error', 'impressionsMarginOfError', 'impressions_p_value', 'impressionsPValue',
      'control_impressions', 'controlImpressions', 'clicks', 'clicks_point_estimate', 'clicksPointEstimate', 'clicks_margin_of_error', 'clicksMarginOfError', 'clicks_p_value', 'clicksPValue',
      'control_clicks', 'controlClicks', 'cost_micros', 'costMicros', 'cost_micros_change_point_estimate', 'costMicrosChangePointEstimate', 'cost_micros_margin_of_error', 'costMicrosMarginOfError',
      'cost_micros_p_value', 'costMicrosPValue', 'control_cost_micros', 'controlCostMicros', 'conversions', 'conversions_absolute_change_point_estimate', 'conversionsAbsoluteChangePointEstimate',
      'conversions_absolute_change_margin_of_error', 'conversionsAbsoluteChangeMarginOfError', 'conversions_absolute_change_p_value', 'conversionsAbsoluteChangePValue', 'control_conversions', 'controlConversions',
      'conversions_value', 'conversionsValue', 'conversion_value_change_point_estimate', 'conversionValueChangePointEstimate', 'conversion_value_margin_of_error', 'conversionValueMarginOfError',
      'conversion_value_p_value', 'conversionValuePValue', 'control_conversion_value', 'controlConversionValue'
    ]);

    for (const key of Object.keys(rawMetrics)) {
      if (allowlist.has(key)) {
        const val = rawMetrics[key];
        if (typeof val === 'number' && Number.isFinite(val)) {
          safeMetrics[key] = val;
        } else if (typeof val === 'string' && val.length <= 100) {
          if (/^-?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(val.trim())) {
            safeMetrics[key] = val;
          }
        }
      }
    }
    safe.metrics = safeMetrics;
  }

  const str = JSON.stringify(safe);
  if (str.length > 5000) return { error: 'Payload exceeds limit' };
  return safe;
}

export async function upsertMetricSnapshot(
  prisma: Pick<PrismaClient, 'googleAdsExperimentMetricSnapshot'>,
  input: MetricSnapshotUpsertInput
) {
  const date = new Date(input.snapshotDate);
  if (!Number.isFinite(date.getTime())) throw new Error('snapshotDate inválido');
  const snapshotDate = new Date(0);
  snapshotDate.setUTCFullYear(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  snapshotDate.setUTCHours(0, 0, 0, 0);

  const data = {
    experimentId: input.experimentId,
    snapshotDate,
    controlImpressions: input.controlImpressions,
    controlClicks: input.controlClicks,
    controlCostMicros: input.controlCostMicros,
    controlConversions: input.controlConversions,
    controlConversionValue: input.controlConversionValue,
    treatmentImpressions: input.treatmentImpressions,
    treatmentClicks: input.treatmentClicks,
    treatmentCostMicros: input.treatmentCostMicros,
    treatmentConversions: input.treatmentConversions,
    treatmentConversionValue: input.treatmentConversionValue,
    statistics: input.statistics as any,
    sourcePayload: sanitizeSourcePayload(input.sourcePayload) as any,
  };

  return prisma.googleAdsExperimentMetricSnapshot.upsert({
    where: {
      experimentId_snapshotDate: {
        experimentId: input.experimentId,
        snapshotDate,
      },
    },
    create: data,
    update: data,
  });
}
