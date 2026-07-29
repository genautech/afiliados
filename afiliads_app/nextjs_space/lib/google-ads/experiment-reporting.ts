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

// Query builder puro (sem rede) — testável direto, mesmo padrão de `queryExperimentArms`.
export function buildExperimentReportQuery(experimentResourceName: string): string {
  return `
    SELECT ${REPORT_FIELDS}
    FROM experiment
    WHERE experiment.resource_name = '${experimentResourceName.replace(/'/g, "\\'")}'
  `;
}

interface RawExperimentReportRow {
  experiment?: { resourceName?: string; experimentId?: string; status?: string };
  metrics?: Record<string, unknown>;
}

function num(value: unknown): number {
  return Number(value ?? 0);
}

function stat(value: unknown): number | null {
  return value === undefined || value === null ? null : Number(value);
}

function extractExperimentIdFromResourceName(resourceName: string): string {
  return resourceName.split('/').pop() ?? resourceName;
}

// Corte determinístico: sem p-value real da API, nunca inventamos significância. Amostra abaixo
// do alvo (Tarefa 5, `targetClicks`) sempre vira UNDERPOWERED, mesmo que a API já tenha
// devolvido algum p-value pontual — evita declarar resultado cedo demais (plano, seção 1.2).
function decideOutcome(
  sampleSize: number,
  targetClicks: number,
  conversionsPValue: number | null,
  conversionsPointEstimate: number | null
): { feasibility: ExperimentReport['feasibility']; hasSignificantResult: boolean; summary: string } {
  if (sampleSize < targetClicks) {
    return {
      feasibility: 'UNDERPOWERED',
      hasSignificantResult: false,
      summary: `Amostra insuficiente: ${sampleSize} cliques acumulados (controle+tratamento), abaixo do alvo de ${targetClicks}. Resultado inconclusivo — aguardando mais dados.`,
    };
  }
  if (conversionsPValue === null) {
    return {
      feasibility: 'UNDERPOWERED',
      hasSignificantResult: false,
      summary: 'A API ainda não retornou p-value de conversões para este experimento. Resultado inconclusivo.',
    };
  }
  if (conversionsPValue < 0.05) {
    const direction =
      conversionsPointEstimate !== null && conversionsPointEstimate > 0
        ? 'tratamento acima do controle'
        : 'tratamento abaixo do controle';
    return {
      feasibility: 'VIABLE',
      hasSignificantResult: true,
      summary: `Diferença estatisticamente significativa em conversões (p=${conversionsPValue.toFixed(4)}), ${direction}.`,
    };
  }
  return {
    feasibility: 'VIABLE',
    hasSignificantResult: false,
    summary: `Amostra suficiente (${sampleSize} cliques), mas diferença em conversões não é estatisticamente significativa (p=${conversionsPValue.toFixed(4)}).`,
  };
}

// Parsing puro de uma linha do recurso `experiment` (sem rede) — testável direto.
export function parseExperimentReportRow(row: RawExperimentReportRow, targetClicks: number): ExperimentReport {
  const m = row.metrics ?? {};
  const mapped = mapGoogleExperimentRemoteStatus(row.experiment?.status ?? 'UNSPECIFIED');

  const treatment: ExperimentMetricPoint = {
    impressions: num(m.impressions),
    clicks: num(m.clicks),
    costMicros: num(m.costMicros),
    conversions: num(m.conversions),
    conversionValue: num(m.conversionsValue),
  };
  const control: ExperimentMetricPoint = {
    impressions: num(m.controlImpressions),
    clicks: num(m.controlClicks),
    costMicros: num(m.controlCostMicros),
    conversions: num(m.controlConversions),
    conversionValue: num(m.controlConversionValue),
  };

  const statistics: ExperimentStatistics = {
    impressions: {
      pointEstimate: stat(m.impressionsPointEstimate),
      marginOfError: stat(m.impressionsMarginOfError),
      pValue: stat(m.impressionsPValue),
    },
    clicks: {
      pointEstimate: stat(m.clicksPointEstimate),
      marginOfError: stat(m.clicksMarginOfError),
      pValue: stat(m.clicksPValue),
    },
    costMicros: {
      pointEstimate: stat(m.costMicrosChangePointEstimate),
      marginOfError: stat(m.costMicrosMarginOfError),
      pValue: stat(m.costMicrosPValue),
    },
    conversions: {
      pointEstimate: stat(m.conversionsAbsoluteChangePointEstimate),
      marginOfError: stat(m.conversionsAbsoluteChangeMarginOfError),
      pValue: stat(m.conversionsAbsoluteChangePValue),
    },
    conversionValue: {
      pointEstimate: stat(m.conversionValueChangePointEstimate),
      marginOfError: stat(m.conversionValueMarginOfError),
      pValue: stat(m.conversionValuePValue),
    },
  };

  const sampleSize = treatment.clicks + control.clicks;
  const outcome = decideOutcome(
    sampleSize,
    targetClicks,
    statistics.conversions.pValue,
    statistics.conversions.pointEstimate
  );

  return {
    experimentId: row.experiment?.experimentId ?? extractExperimentIdFromResourceName(row.experiment?.resourceName ?? ''),
    status: mapped.local,
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
    control: emptyMetricPoint(),
    treatment: emptyMetricPoint(),
    statistics: emptyStatistics(),
    hasSignificantResult: false,
    feasibility: 'UNDERPOWERED',
    summary: reason,
  };
}

export interface FallbackCampaignPair {
  controlCampaignResourceName: string;
  treatmentCampaignResourceName: string;
}

// Campos padrão já usados em outros pontos do código (lib/google-ads.ts) pra métricas de
// campanha — não são específicos de Experiments, não precisam da mesma verificação da Tarefa 9.
async function fetchCampaignMetricPoint(
  token: string,
  config: GoogleAdsCredentials,
  campaignResourceName: string
): Promise<ExperimentMetricPoint> {
  const query = `
    SELECT metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions, metrics.conversions_value
    FROM campaign
    WHERE campaign.resource_name = '${campaignResourceName.replace(/'/g, "\\'")}'
  `;
  const data = await googleAdsRequest(token, config, 'googleAds:search', { body: { query } });
  const m = data?.results?.[0]?.metrics ?? {};
  return {
    impressions: num(m.impressions),
    clicks: num(m.clicks),
    costMicros: num(m.costMicros),
    conversions: num(m.conversions),
    conversionValue: num(m.conversionsValue),
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
  fallback: FallbackCampaignPair,
  targetClicks: number
): Promise<ExperimentReport> {
  const [control, treatment] = await Promise.all([
    fetchCampaignMetricPoint(token, config, fallback.controlCampaignResourceName),
    fetchCampaignMetricPoint(token, config, fallback.treatmentCampaignResourceName),
  ]);
  const sampleSize = control.clicks + treatment.clicks;
  return {
    experimentId: extractExperimentIdFromResourceName(experimentResourceName),
    status: mapGoogleExperimentRemoteStatus('UNKNOWN').local,
    control,
    treatment,
    statistics: emptyStatistics(),
    hasSignificantResult: false,
    feasibility: sampleSize < targetClicks ? 'UNDERPOWERED' : 'VIABLE',
    summary: `Fallback de diagnóstico: recurso \`experiment\` sem linha; métricas lidas direto das campanhas (sem uplift/p-value). Amostra: ${sampleSize} cliques.`,
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
      conversionsAbsoluteChangePValue: 0.04,
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
  fallbackCampaigns?: FallbackCampaignPair;
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
  if (isMockMode(config)) {
    return parseExperimentReportRow(buildMockRawRow(experimentResourceName), options.targetClicks);
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

  return parseExperimentReportRow(rows[0], options.targetClicks);
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
// chama Prisma, não persiste nada. O upsert de verdade fica pra Tarefa 10, com
// `@@unique([experimentId, snapshotDate])` garantindo idempotência por dia.
export function buildMetricSnapshotUpsertInput(
  dbExperimentId: string,
  snapshotDate: Date,
  report: ExperimentReport,
  sourcePayload: unknown = null
): MetricSnapshotUpsertInput {
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
