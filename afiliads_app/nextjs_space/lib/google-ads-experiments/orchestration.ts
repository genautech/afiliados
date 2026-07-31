import { prisma } from '../prisma';
import { checkGoogleAdsReadiness } from '../google-ads/readiness';
import { authorizeMutation, type AuthorizationContext } from '../google-ads/route-mutation-authorization';
import { getGoogleAdsConfig } from '../google-ads';
import { getAccessToken, isMockMode, googleAdsRequest } from '../google-ads/client';
import { assertMutationAllowed } from '../google-ads/mutation-guard';
import { createExperiment, createExperimentArms, applyFinalUrlVariation, assertActionAllowedFromStatus, scheduleExperiment, endExperiment, promoteExperiment, graduateExperiment, pollExperimentOperation, listExperimentAsyncErrors } from '../google-ads/experiments';
import { findAdGroupAdsInCampaign } from '../google-ads/ads';
import { fetchExperimentReport, buildMetricSnapshotUpsertInput, upsertMetricSnapshot, validateFallbackArms } from '../google-ads/experiment-reporting';
import { SetupExperimentPayloadSchema, ScheduleExperimentRoutePayloadSchema, ExperimentActionRoutePayloadSchema, type SetupExperimentPayload } from './schemas';
import { redactSensitive } from '../google-ads/errors';
import { createHash } from 'node:crypto';

export interface SetupExperimentInput {
  userId: string;
  payload: unknown;
  deps?: {
    findCampaign?: (id: string, uid: string) => Promise<any>;
    findPresell?: (id: string, uid: string) => Promise<any>;
    checkReadiness?: typeof checkGoogleAdsReadiness;
    readinessDeps?: any;
    getAdsConfig?: typeof getGoogleAdsConfig;
    getAccessToken?: typeof getAccessToken;
    token?: string;
    isMock?: boolean;
    assertMutationAllowed?: typeof assertMutationAllowed;
    createExperiment?: typeof createExperiment;
    createExperimentArms?: typeof createExperimentArms;
    applyFinalUrlVariation?: typeof applyFinalUrlVariation;
    pollExperimentOperation?: typeof pollExperimentOperation;
    listExperimentAsyncErrors?: typeof listExperimentAsyncErrors;
    fetchExperimentReport?: typeof fetchExperimentReport;
    upsertMetricSnapshot?: typeof upsertMetricSnapshot;
    // Retorna null quando a busca é bem-sucedida mas comprovadamente não encontra o recurso
    // (NOT_FOUND autoritativo); lança/rejeita quando a resposta é ambígua/inconclusiva (UNKNOWN).
    reconcileExperiment?: (expName: string) => Promise<{ googleExperimentId: string; resourceName: string } | null>;
    reconcileArms?: (experimentResourceName: string) => Promise<any[] | null>;
    prisma?: any;
  };
}

function safeISO(val: any): string | null {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString();
  try {
    return new Date(val).toISOString();
  } catch {
    return null;
  }
}

function hashPresellHtml(html: unknown): string | null {
  return typeof html === 'string'
    ? createHash('sha256').update(html, 'utf8').digest('hex')
    : null;
}

export function toExperimentDTO(exp: any) {
  const config = asConfigObject(exp.variationConfig);
  const proof = asConfigObject(config?.proof);
  const updatedAt = safeISO(exp.updatedAt);
  const scheduleRevision = updatedAt && typeof proof?.presellContentSha256 === 'string'
    ? `${updatedAt}:${proof.presellContentSha256}`
    : null;
  return {
    id: exp.id,
    userId: exp.userId,
    campaignId: exp.campaignId,
    googleExperimentId: exp.googleExperimentId ?? null,
    resourceName: exp.resourceName ?? null,
    name: exp.name,
    type: exp.type,
    status: exp.status,
    syncEnabled: exp.syncEnabled,
    trafficAllocationType: exp.trafficAllocationType ?? null,
    startDate: safeISO(exp.startDate),
    endDate: safeISO(exp.endDate),
    variationType: exp.variationType,
    variationConfig: exp.variationConfig ?? null,
    mutationRevisions: { schedule: scheduleRevision },
    budgetRecommendation: exp.budgetRecommendation ?? null,
    decisionPolicy: exp.decisionPolicy ?? null,
    lastSyncedAt: safeISO(exp.lastSyncedAt),
    lastMetricsAt: safeISO(exp.lastMetricsAt),
    lastError: exp.lastError ? redactSensitive(String(exp.lastError)) : null,
    createdAt: safeISO(exp.createdAt) || new Date().toISOString(),
    updatedAt: safeISO(exp.updatedAt) || new Date().toISOString(),
    arms: (exp.arms || []).map((arm: any) => ({
      id: arm.id,
      experimentId: arm.experimentId,
      name: arm.name,
      isControl: arm.isControl,
      trafficSplit: arm.trafficSplit,
      googleArmId: arm.googleArmId ?? null,
      resourceName: arm.resourceName ?? null,
      inDesignCampaignResourceName: arm.inDesignCampaignResourceName ?? null,
      servedCampaignResourceName: arm.servedCampaignResourceName ?? null,
      googleCampaignId: arm.googleCampaignId ?? null,
      localPresellId: arm.localPresellId ?? null,
      finalUrl: arm.finalUrl ?? null,
      createdAt: safeISO(arm.createdAt) || new Date().toISOString(),
      updatedAt: safeISO(arm.updatedAt) || new Date().toISOString(),
    })),
  };
}

export function toExperimentDetailDTO(exp: any) {
  const dto = toExperimentDTO(exp);
  return {
    ...dto,
    operations: (exp.operations || []).map((op: any) => ({
      id: op.id,
      experimentId: op.experimentId,
      operationType: op.operationType,
      operationName: op.operationName,
      status: op.status,
      errorCode: op.errorCode ?? null,
      errorMessage: op.errorMessage ? redactSensitive(String(op.errorMessage)) : null,
      errors: op.errors
        ? (Array.isArray(op.errors)
            ? op.errors.map((e: any) => redactSensitive(typeof e === 'string' ? e : JSON.stringify(e)))
            : redactSensitive(typeof op.errors === 'string' ? op.errors : JSON.stringify(op.errors)))
        : null,
      startedAt: safeISO(op.startedAt) || new Date().toISOString(),
      completedAt: safeISO(op.completedAt),
    })),
    metricSnapshots: (exp.metricSnapshots || []).map((s: any) => ({
      id: s.id,
      experimentId: s.experimentId,
      snapshotDate: safeISO(s.snapshotDate) || new Date().toISOString(),
      controlImpressions: s.controlImpressions,
      controlClicks: s.controlClicks,
      controlCostMicros: s.controlCostMicros,
      controlConversions: s.controlConversions,
      controlConversionValue: s.controlConversionValue,
      treatmentImpressions: s.treatmentImpressions,
      treatmentClicks: s.treatmentClicks,
      treatmentCostMicros: s.treatmentCostMicros,
      treatmentConversions: s.treatmentConversions,
      treatmentConversionValue: s.treatmentConversionValue,
      statistics: s.statistics ?? null,
      createdAt: safeISO(s.createdAt) || new Date().toISOString(),
      updatedAt: safeISO(s.updatedAt) || new Date().toISOString(),
    })),
  };
}

// P1-A (recuperação Tarefa 10B): resultado de reconciliação sempre discriminado — nunca
// boolean/null ambíguo. FOUND/NOT_FOUND são autoritativos (seguro decidir com base neles);
// UNKNOWN cobre erro, timeout, resposta inválida ou vazia não autoritativa — quem chama decide
// se é seguro prosseguir (só em primeira tentativa comprovadamente inédita) ou se deve falhar
// fechado (retry após estado remoto ambíguo).
type ReconcileResult<T> =
  | { kind: 'FOUND'; value: T }
  | { kind: 'NOT_FOUND' }
  | { kind: 'UNKNOWN'; reason: string };

async function reconcileRemoteExperimentByName(
  token: string,
  config: any,
  expName: string,
  deps?: any
): Promise<ReconcileResult<{ googleExperimentId: string; resourceName: string }>> {
  if (deps?.reconcileExperiment) {
    try {
      const r = await deps.reconcileExperiment(expName);
      if (r === null) return { kind: 'NOT_FOUND' };
      if (r && typeof r === 'object' && r.resourceName) {
        return { kind: 'FOUND', value: { googleExperimentId: r.googleExperimentId ?? '', resourceName: r.resourceName } };
      }
      return { kind: 'UNKNOWN', reason: 'resposta de reconciliação do experimento em formato inesperado' };
    } catch (err: any) {
      return { kind: 'UNKNOWN', reason: redactSensitive(err?.message || 'erro na reconciliação do experimento') };
    }
  }

  if (isMockMode(config)) {
    // Mock nunca chama rede de verdade — nenhuma ambiguidade possível, sempre NOT_FOUND
    // determinístico (nada foi criado remotamente ainda nesta simulação).
    return { kind: 'NOT_FOUND' };
  }

  try {
    const query = `
      SELECT experiment.resource_name, experiment.experiment_id, experiment.name
      FROM experiment
      WHERE experiment.name = '${expName.replace(/'/g, "\\'")}'
    `;
    const data = await googleAdsRequest(token, config, 'googleAds:search', { body: { query } });
    if (!data || !Array.isArray(data.results)) {
      return { kind: 'UNKNOWN', reason: 'resposta de busca de experimento em formato inesperado' };
    }
    const row = data.results[0]?.experiment;
    if (!row) return { kind: 'NOT_FOUND' };
    if (!row.resourceName) return { kind: 'UNKNOWN', reason: 'linha de experimento remota sem resourceName' };
    const googleExperimentId = row.experimentId || row.resourceName.split('/').pop() || '';
    return { kind: 'FOUND', value: { googleExperimentId, resourceName: row.resourceName } };
  } catch (err: any) {
    return { kind: 'UNKNOWN', reason: redactSensitive(err?.message || 'erro ao consultar experimento remoto') };
  }
}

interface ValidatedReconciledArm {
  name: string;
  isControl: boolean;
  trafficSplit: number;
  resourceName: string;
  inDesignCampaignResourceName: string | null;
  servedCampaignResourceName: string | null;
}

// P1-C: valida as invariantes de negócio antes de aceitar braços reconciliados como prova —
// nunca persiste estado fabricado/parcial/ambíguo.
function validateReconciledArms(
  rows: any[],
  expectedTrafficSplitTreatment: number,
  expectedControlCampaignResourceName: string
): ValidatedReconciledArm[] | null {
  if (!Array.isArray(rows) || rows.length !== 2) return null;

  const controls = rows.filter((r) => r?.isControl === true);
  const treatments = rows.filter((r) => r?.isControl === false);
  if (controls.length !== 1 || treatments.length !== 1) return null;

  const c = controls[0];
  const t = treatments[0];

  if (!c.resourceName || !t.resourceName) return null;
  if (typeof c.trafficSplit !== 'number' || typeof t.trafficSplit !== 'number') return null;
  if (!Number.isInteger(c.trafficSplit) || !Number.isInteger(t.trafficSplit)) return null;
  if (c.trafficSplit + t.trafficSplit !== 100) return null;
  if (t.trafficSplit !== expectedTrafficSplitTreatment) return null;
  if (c.servedCampaignResourceName !== expectedControlCampaignResourceName) return null;
  if (!t.inDesignCampaignResourceName) return null;

  return [
    {
      name: c.name ?? 'control',
      isControl: true,
      trafficSplit: c.trafficSplit,
      resourceName: c.resourceName,
      inDesignCampaignResourceName: c.inDesignCampaignResourceName ?? null,
      servedCampaignResourceName: c.servedCampaignResourceName ?? null,
    },
    {
      name: t.name ?? 'treatment',
      isControl: false,
      trafficSplit: t.trafficSplit,
      resourceName: t.resourceName,
      inDesignCampaignResourceName: t.inDesignCampaignResourceName ?? null,
      servedCampaignResourceName: t.servedCampaignResourceName ?? null,
    },
  ];
}

async function reconcileRemoteArms(
  token: string,
  config: any,
  experimentResourceName: string,
  expectedTrafficSplitTreatment: number,
  expectedControlCampaignResourceName: string,
  deps?: any
): Promise<ReconcileResult<ValidatedReconciledArm[]>> {
  let rawRows: any[] | null | undefined;

  if (deps?.reconcileArms) {
    try {
      rawRows = await deps.reconcileArms(experimentResourceName);
    } catch (err: any) {
      return { kind: 'UNKNOWN', reason: redactSensitive(err?.message || 'erro na reconciliação de braços') };
    }
  } else if (isMockMode(config)) {
    return { kind: 'NOT_FOUND' };
  } else {
    try {
      // Campos confirmados no query builder v25 (mesmo conjunto já aprovado em
      // lib/google-ads/experiments.ts#queryExperimentArms, A3). `traffic_split` e a campanha
      // servida do controle NÃO são campos confirmados offline nesta sessão — em vez de
      // inventar um nome de campo GAQL não verificado (proibido pelo handoff de recuperação),
      // esses dois valores são derivados da intenção local já autorizada (nosso próprio fluxo é
      // o único mutador possível dos braços desta reserva), não de um campo remoto não provado.
      const query = `
        SELECT experiment_arm.resource_name, experiment_arm.experiment, experiment_arm.control,
          experiment_arm.in_design_campaigns
        FROM experiment_arm
        WHERE experiment_arm.experiment = '${experimentResourceName.replace(/'/g, "\\'")}'
      `;
      const data = await googleAdsRequest(token, config, 'googleAds:search', { body: { query } });
      if (!data || !Array.isArray(data.results)) {
        return { kind: 'UNKNOWN', reason: 'resposta de busca de braços em formato inesperado' };
      }

      const linkedRows = data.results.filter((r: any) => r?.experimentArm?.experiment === experimentResourceName);
      if (linkedRows.length === 0) return { kind: 'NOT_FOUND' };

      const controlRows = linkedRows.filter((r: any) => Boolean(r?.experimentArm?.control));
      const treatmentRows = linkedRows.filter((r: any) => !r?.experimentArm?.control);
      if (controlRows.length !== 1 || treatmentRows.length !== 1) {
        return {
          kind: 'UNKNOWN',
          reason: `esperado 1 braço de controle e 1 de tratamento vinculados ao experimento, encontrado ${controlRows.length}/${treatmentRows.length}`,
        };
      }

      const controlResourceName: string | undefined = controlRows[0]?.experimentArm?.resourceName;
      const treatmentResourceName: string | undefined = treatmentRows[0]?.experimentArm?.resourceName;
      const treatmentInDesign: string | null = treatmentRows[0]?.experimentArm?.inDesignCampaigns?.[0] ?? null;

      if (!controlResourceName || !treatmentResourceName) {
        return { kind: 'UNKNOWN', reason: 'braço remoto sem resourceName' };
      }
      if (!treatmentInDesign) {
        return { kind: 'UNKNOWN', reason: 'braço de tratamento sem in-design campaign associada' };
      }

      rawRows = [
        {
          name: 'control',
          isControl: true,
          trafficSplit: 100 - expectedTrafficSplitTreatment,
          resourceName: controlResourceName,
          inDesignCampaignResourceName: null,
          servedCampaignResourceName: expectedControlCampaignResourceName,
        },
        {
          name: 'treatment',
          isControl: false,
          trafficSplit: expectedTrafficSplitTreatment,
          resourceName: treatmentResourceName,
          inDesignCampaignResourceName: treatmentInDesign,
          servedCampaignResourceName: null,
        },
      ];
    } catch (err: any) {
      return { kind: 'UNKNOWN', reason: redactSensitive(err?.message || 'erro ao consultar braços remotos') };
    }
  }

  if (rawRows === null) return { kind: 'NOT_FOUND' };
  if (rawRows === undefined) return { kind: 'UNKNOWN', reason: 'reconciliação de braços não retornou dados' };
  if (!Array.isArray(rawRows) || rawRows.length === 0) return { kind: 'NOT_FOUND' };

  const validated = validateReconciledArms(rawRows, expectedTrafficSplitTreatment, expectedControlCampaignResourceName);
  if (!validated) {
    return { kind: 'UNKNOWN', reason: 'braços remotos reconciliados não passaram na validação de invariantes (contagem, splits, vínculo ou in-design campaign)' };
  }
  return { kind: 'FOUND', value: validated };
}

// P1-B: payload canônico da reserva — persistido ANTES de qualquer rede, comparado
// simetricamente em toda retomada/recuperação de P2002. `name` default é determinístico (só
// depende de campaignId + idempotencyKey), então o canônico é estável entre chamadas com a
// mesma key mesmo quando o cliente omite `name`.
interface CanonicalSetupPayload {
  campaignId: string;
  presellId: string;
  treatmentFinalUrl: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  trafficSplitTreatment: number;
}

function deriveDeterministicExperimentName(campaignId: string, idempotencyKey: string): string {
  const suffix = idempotencyKey.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12) || 'exp123';
  return `EXP-${campaignId.substring(0, 5)}-${suffix}`;
}

function canonicalizeSetupPayload(validated: SetupExperimentPayload, idempotencyKey: string): CanonicalSetupPayload {
  return {
    campaignId: validated.campaignId,
    presellId: validated.presellId,
    treatmentFinalUrl: validated.treatmentFinalUrl,
    name: validated.name || deriveDeterministicExperimentName(validated.campaignId, idempotencyKey),
    startDate: validated.startDate ? validated.startDate.slice(0, 10) : null,
    endDate: validated.endDate ? validated.endDate.slice(0, 10) : null,
    trafficSplitTreatment: validated.trafficSplitTreatment ?? 50,
  };
}

const CANONICAL_FIELDS: (keyof CanonicalSetupPayload)[] = [
  'campaignId',
  'presellId',
  'treatmentFinalUrl',
  'name',
  'startDate',
  'endDate',
  'trafficSplitTreatment',
];

function findCanonicalMismatch(stored: CanonicalSetupPayload, incoming: CanonicalSetupPayload): string | null {
  for (const field of CANONICAL_FIELDS) {
    if (stored[field] !== incoming[field]) return field;
  }
  return null;
}

function asConfigObject(val: any): Record<string, any> | null {
  return typeof val === 'object' && val !== null ? val : null;
}

// P1-2 (recuperação Tarefa 10B): registros criados antes do payload canônico existir
// (c9ac033/772cadb) não têm `variationConfig.setupPayload`. Nunca inferir silenciosamente —
// só é seguro adotar o payload recebido quando não há nenhuma prova de que algo já foi
// verificado remotamente (nada a proteger ainda); havendo prova, ela precisa ser derivada de
// dados locais confiáveis e comparada, com fail-closed se a prova for insuficiente.
interface LegacyProofShape {
  verified?: boolean;
  finalUrl?: string;
  presellId?: string;
  trafficSplitTreatment?: number;
}

function extractLegacyProof(cfg: Record<string, any> | null): LegacyProofShape | null {
  if (!cfg) return null;
  if (cfg.proof && typeof cfg.proof === 'object') return cfg.proof;
  // 772cadb: a prova podia estar direto na raiz de variationConfig, sem wrapper `.proof`.
  if (typeof cfg.verified !== 'undefined' || typeof cfg.finalUrl !== 'undefined') return cfg;
  return null;
}

function deriveLegacyCanonical(existing: { campaignId: string; name: string; startDate?: any; endDate?: any; arms?: any[] }, cfg: Record<string, any> | null): CanonicalSetupPayload | null {
  const campaignId = existing.campaignId;
  const name = existing.name;
  if (!campaignId || !name) return null;

  const startDate = existing.startDate ? safeISO(existing.startDate)?.slice(0, 10) ?? null : null;
  const endDate = existing.endDate ? safeISO(existing.endDate)?.slice(0, 10) ?? null : null;

  const arms = Array.isArray(existing.arms) ? existing.arms : [];
  const treatmentArm = arms.find((a: any) => a?.isControl === false);
  const proof = extractLegacyProof(cfg);

  const presellId: string | null = treatmentArm?.localPresellId ?? proof?.presellId ?? null;
  const treatmentFinalUrl: string | null = treatmentArm?.finalUrl ?? proof?.finalUrl ?? null;
  const rawSplit = typeof treatmentArm?.trafficSplit === 'number' ? treatmentArm.trafficSplit : proof?.trafficSplitTreatment;
  const trafficSplitTreatment = typeof rawSplit === 'number' ? rawSplit : null;

  if (!presellId || !treatmentFinalUrl || trafficSplitTreatment === null) return null;

  return { campaignId, presellId, treatmentFinalUrl, name, startDate, endDate, trafficSplitTreatment };
}

// Retorna o payload canônico a persistir (migração) ou `null` quando nada precisa ser
// escrito (já batia com o que estava salvo). Lança 409 fail-closed quando há divergência
// comprovada ou quando um registro com prova de verificação não tem dados suficientes pra
// derivar o canônico com segurança.
function resolveCanonicalPayloadOrThrow(
  existing: { campaignId: string; name: string; startDate?: any; endDate?: any; arms?: any[]; variationConfig: any },
  incomingCanonical: CanonicalSetupPayload
): CanonicalSetupPayload | null {
  if (existing.campaignId !== incomingCanonical.campaignId) {
    throw { status: 409, message: 'Conflito de idempotência: campaignId divergente' };
  }

  const cfg = asConfigObject(existing.variationConfig);
  const stored: CanonicalSetupPayload | null = cfg?.setupPayload ?? null;

  if (stored) {
    const mismatch = findCanonicalMismatch(stored, incomingCanonical);
    if (mismatch) {
      throw { status: 409, message: `Conflito de idempotência: ${mismatch} divergente` };
    }
    return null;
  }

  const legacy = deriveLegacyCanonical(existing, cfg);
  if (!legacy) {
    throw { status: 409, message: 'Conflito de idempotência: registro legado sem dados suficientes para validar o payload' };
  }
  const mismatch = findCanonicalMismatch(legacy, incomingCanonical);
  if (mismatch) {
    throw { status: 409, message: `Conflito de idempotência: ${mismatch} divergente (registro legado)` };
  }
  return legacy;
}

// P1-1 (recuperação Tarefa 10B): saga durável por etapa, persistida em variationConfig.saga —
// sobrevive entre invocações (ao contrário de `isFreshReservation`, que é só memória local).
// PENDING = nunca tentado; IN_FLIGHT = mutate em andamento/sem checkpoint de sucesso;
// COMPLETE = checkpoint local confirma sucesso; UNKNOWN = mutate lançou ou o checkpoint de
// sucesso falhou — retry nunca pode tratar isso como "nunca tentado".
type SagaStepState = 'PENDING' | 'IN_FLIGHT' | 'COMPLETE' | 'UNKNOWN';
type SagaStep = 'experiment' | 'arms' | 'variation' | 'schedule' | 'promote' | 'end' | 'graduate';

function getSagaState(cfg: Record<string, any> | null, step: SagaStep): SagaStepState | undefined {
  return cfg?.saga?.[step];
}

// Claim/lease local via CAS: só uma request ganha porque o `updateMany` só casa a linha
// quando `updatedAt` ainda é exatamente o valor lido por esta chamada — qualquer escrita
// concorrente (inclusive de outra request) já muda `updatedAt` e derruba o match (count 0).
// Perdeu o claim -> recarrega o estado real e deixa quem chamou decidir (nunca muta).
async function claimSagaStep(
  prismaClient: any,
  experiment: any,
  step: SagaStep,
  extraConfigPatch: Record<string, any> = {}
): Promise<{ claimed: boolean; experiment: any }> {
  const currentConfig = asConfigObject(experiment.variationConfig) ?? {};
  const currentSaga = currentConfig.saga ?? {};
  const nextConfig = {
    ...currentConfig,
    ...extraConfigPatch,
    saga: { ...currentSaga, [step]: 'IN_FLIGHT' as SagaStepState },
  };

  const result = await prismaClient.googleAdsExperiment.updateMany({
    where: { id: experiment.id, updatedAt: experiment.updatedAt },
    data: { variationConfig: nextConfig },
  });

  if (!result || result.count !== 1) {
    const fresh = await prismaClient.googleAdsExperiment.findUniqueOrThrow({
      where: { id: experiment.id },
      include: { arms: { orderBy: { isControl: 'desc' } } },
    });
    return { claimed: false, experiment: fresh };
  }

  return {
    claimed: true,
    experiment: { ...experiment, variationConfig: nextConfig },
  };
}

export async function setupExperiment({ userId, payload, deps }: SetupExperimentInput) {
  // 1. Schema Validation (Strict)
  const parseResult = SetupExperimentPayloadSchema.safeParse(payload);
  if (!parseResult.success) {
    const errorMsg = parseResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
    throw { status: 400, message: redactSensitive(`Payload inválido: ${errorMsg}`) };
  }
  const validated = parseResult.data;

  // 2. Ownership & Resource Lookup ({ id, userId })
  const prismaClient = deps?.prisma ?? prisma;
  const findCampaign = deps?.findCampaign ?? ((id: string, uid: string) => prismaClient.campaign.findFirst({ where: { id, userId: uid } }));
  const findPresell = deps?.findPresell ?? ((id: string, uid: string) => prismaClient.presell.findFirst({ where: { id, userId: uid } }));

  const campaign = await findCampaign(validated.campaignId, userId);
  if (!campaign) {
    throw { status: 404, message: 'Campanha não encontrada' };
  }

  const presell = await findPresell(validated.presellId, userId);
  if (!presell) {
    throw { status: 404, message: 'Presell não encontrada' };
  }

  if (presell.campaignId !== campaign.id) {
    throw { status: 400, message: 'Presell não pertence à campanha informada' };
  }
  const presellContentSha256 = hashPresellHtml(presell.html);
  if (!presellContentSha256) {
    throw { status: 422, message: 'Conteúdo HTML da presell indisponível para aprovação imutável' };
  }

  if (!campaign.googleCampaignId) {
    throw { status: 422, message: 'googleCampaignId não persistido na campanha de controle' };
  }

  // 3. Readiness check (PREPARE)
  const checkReadiness = deps?.checkReadiness ?? checkGoogleAdsReadiness;
  const readiness = await checkReadiness(campaign.id, userId, 'PREPARE', deps?.readinessDeps);
  if (!readiness.ready) {
    throw { status: 422, message: redactSensitive(readiness.errors?.[0] || 'Readiness falhou') };
  }

  // 4. Mutation Authorization Check
  let authContext: AuthorizationContext;
  try {
    authContext = authorizeMutation(
      validated.authorization,
      'SETUP_EXPERIMENT',
      campaign.id,
      String(campaign.updatedAt.getTime()),
      userId,
      campaign.userId
    );
  } catch (err: any) {
    throw { status: 400, message: redactSensitive(err.message || 'Falha de autorização da mutação') };
  }

  const incomingCanonical = canonicalizeSetupPayload(validated, authContext.idempotencyKey);

  // 5. Short DB Step: Local Reservation & Canonical Payload Idempotency Check
  let experiment = await prismaClient.googleAdsExperiment.findUnique({
    where: { userId_idempotencyKey: { userId, idempotencyKey: authContext.idempotencyKey } },
    include: { arms: { orderBy: { isControl: 'desc' } } },
  });

  // Distingue primeira tentativa (nunca houve mutate remota pra esta reserva) de retry (a
  // reserva local já existia antes desta chamada, então um mutate remoto pode já ter sido
  // tentado por uma invocação anterior) — usado pelos checkpoints A/B pra decidir se um
  // resultado UNKNOWN de reconciliação é seguro ignorar ou exige falha fechada (P1-A).
  let isFreshReservation = false;

  // P1-2: aplica a mesma validação canônica completa (com migração/derivação legada) tanto no
  // caminho normal quanto na recuperação de P2002 — nunca persiste setupPayload derivado sem
  // ter comparado contra o que já estava provado remotamente.
  async function migrateCanonicalPayloadIfNeeded(existing: any) {
    const toPersist = resolveCanonicalPayloadOrThrow(existing, incomingCanonical);
    if (!toPersist) return existing;
    const nextConfig = { ...(asConfigObject(existing.variationConfig) ?? {}), setupPayload: toPersist };
    return prismaClient.googleAdsExperiment.update({
      where: { id: existing.id },
      data: { variationConfig: nextConfig },
      include: { arms: { orderBy: { isControl: 'desc' } } },
    });
  }

  if (experiment) {
    experiment = await migrateCanonicalPayloadIfNeeded(experiment);
  } else {
    try {
      experiment = await prismaClient.googleAdsExperiment.create({
        data: {
          userId,
          campaignId: campaign.id,
          idempotencyKey: authContext.idempotencyKey,
          name: incomingCanonical.name,
          status: 'SETUP',
          type: 'SEARCH_CUSTOM',
          variationType: 'PRESELL_URL',
          startDate: incomingCanonical.startDate ? new Date(incomingCanonical.startDate) : null,
          endDate: incomingCanonical.endDate ? new Date(incomingCanonical.endDate) : null,
          trafficAllocationType: 'SEARCH_CUSTOM',
          variationConfig: {
            setupPayload: incomingCanonical,
            saga: { experiment: 'PENDING', arms: 'PENDING', variation: 'PENDING' },
          },
        },
        include: { arms: { orderBy: { isControl: 'desc' } } },
      });
      isFreshReservation = true;
    } catch (createErr: any) {
      // Race condition handling (P2002)
      if (createErr?.code === 'P2002' || String(createErr).includes('P2002')) {
        experiment = await prismaClient.googleAdsExperiment.findUniqueOrThrow({
          where: { userId_idempotencyKey: { userId, idempotencyKey: authContext.idempotencyKey } },
          include: { arms: { orderBy: { isControl: 'desc' } } },
        });
        isFreshReservation = false;
        experiment = await migrateCanonicalPayloadIfNeeded(experiment);
      } else {
        throw createErr;
      }
    }
  }

  // 6. Fast return: MUST check explicit proof persisted em variationConfig.proof (never infer
  // só de finalUrl & lastError).
  const arms = experiment.arms || [];
  const treatmentArm = arms.find((a: any) => !a.isControl);
  const varConfig = (typeof experiment.variationConfig === 'object' && experiment.variationConfig !== null) ? (experiment.variationConfig as any) : null;
  const persistedProof = varConfig?.proof ?? null;

  if (
    experiment.resourceName &&
    arms.length === 2 &&
    treatmentArm &&
    persistedProof?.verified === true &&
    persistedProof?.finalUrl === validated.treatmentFinalUrl &&
    treatmentArm.finalUrl === validated.treatmentFinalUrl &&
    treatmentArm.localPresellId === validated.presellId &&
    !experiment.lastError
  ) {
    return {
      success: true,
      mock: deps?.isMock ?? false,
      experiment: toExperimentDTO(experiment),
      warnings: readiness.warnings,
    };
  }

  // 7. Obtain Google Ads Config & Access Token (ONLY after all gates passed)
  const getAdsConfig = deps?.getAdsConfig ?? getGoogleAdsConfig;
  const config = await getAdsConfig(userId);
  if (!config) {
    throw { status: 400, message: 'Configuração do Google Ads não encontrada para este usuário' };
  }

  const isMock = deps?.isMock ?? (config && config.developerToken ? isMockMode(config) : true);
  const fetchToken = deps?.getAccessToken ?? getAccessToken;
  const token = deps?.token ?? (isMock ? 'mock_access_token_123' : await fetchToken(config));

  // P1-E: capability emitida só na etapa exata que será executada, nunca antecipada pras 3 de
  // uma vez — nunca exigir capability de etapa já concluída nem emitir pra etapa que não vai
  // rodar nesta chamada.
  const callAssertMutationAllowed = deps?.assertMutationAllowed ?? assertMutationAllowed;
  const customerId: string = config.customerId;
  function requireCapability(operation: string, label: string) {
    const cap = callAssertMutationAllowed({ operation, customerId, isMock, confirmed: true });
    if (!cap.allowed) {
      throw { status: 502, message: redactSensitive(`Mutação bloqueada (${label}): ${cap.reason}`) };
    }
    const capability = (cap as any).capability;
    if (!capability || capability.operation !== operation) {
      throw { status: 502, message: `Mutação bloqueada (${label}): capability ausente ou divergente` };
    }
    return capability;
  }

  // 8. Pipeline Step-by-Step Execution with Resumption & Timeout Reconciliation Checkpoints

  // Checkpoint Step A: Remote Experiment Resource Creation (reconciliação fail-closed, P1-A)
  let resourceName = experiment.resourceName;
  let googleExperimentId = experiment.googleExperimentId;
  let experimentFreshlyCreatedThisCall = false;

  if (!resourceName) {
    const sagaCfgBeforeA = asConfigObject(experiment.variationConfig);
    const sagaExperimentState = getSagaState(sagaCfgBeforeA, 'experiment');
    // Etapa durável já teve mutate tentada (IN_FLIGHT/UNKNOWN) em invocação anterior — mesmo
    // reconciliação NOT_FOUND não é mais autoritativa o suficiente pra criar de novo (P1-1).
    const experimentAttemptedBefore = sagaExperimentState === 'IN_FLIGHT' || sagaExperimentState === 'UNKNOWN' || sagaExperimentState === 'COMPLETE';

    const reconciled = await reconcileRemoteExperimentByName(token, config, experiment.name, deps);

    if (reconciled.kind === 'FOUND') {
      googleExperimentId = reconciled.value.googleExperimentId;
      resourceName = reconciled.value.resourceName;
      experiment = await prismaClient.googleAdsExperiment.update({
        where: { id: experiment.id },
        data: {
          googleExperimentId,
          resourceName,
          lastError: null,
          variationConfig: { ...sagaCfgBeforeA, saga: { ...(sagaCfgBeforeA?.saga ?? {}), experiment: 'COMPLETE' } },
        },
        include: { arms: { orderBy: { isControl: 'desc' } } },
      });
    } else if (experimentAttemptedBefore || (reconciled.kind === 'UNKNOWN' && !isFreshReservation)) {
      // Retry após resultado remoto ambíguo (ou após tentativa anterior durável): não sabemos
      // se uma mutate anterior já criou o experimento — falhar fechado sem segunda mutate.
      const sanitizedMsg = redactSensitive(
        reconciled.kind === 'UNKNOWN'
          ? `Reconciliação do experimento remoto inconclusiva: ${reconciled.reason}`
          : 'Reconciliação do experimento remoto inconclusiva: sem confirmação após tentativa anterior'
      );
      await prismaClient.googleAdsExperiment.update({
        where: { id: experiment.id },
        data: { lastError: sanitizedMsg },
      }).catch(() => {});
      throw { status: 502, message: sanitizedMsg };
    } else {
      // NOT_FOUND (autoritativo) OU UNKNOWN em primeira tentativa comprovadamente inédita
      // (nenhuma mutate anterior pode ter acontecido pra esta reserva — seguro criar). Antes de
      // mutar, adquire claim exclusivo (CAS) pra garantir que no máximo uma request concorrente
      // chega a chamar createExperiment (P1-1).
      const remoteCreateInput = sagaCfgBeforeA?.remoteCreateInput ?? {
        // P1-3: calculado uma única vez por reserva — persistido no claim abaixo, nunca
        // recalculado numa tentativa posterior (senão retries recalculariam start/end diferentes).
        startDate: validated.startDate || new Date().toISOString().split('T')[0],
        endDate: validated.endDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      };

      const claim = await claimSagaStep(prismaClient, experiment, 'experiment', { remoteCreateInput });
      experiment = claim.experiment;

      if (!claim.claimed) {
        if (experiment.resourceName) {
          // Outra request ganhou o claim e já persistiu o resourceName — segue com o resultado
          // dela em vez de falhar à toa.
          resourceName = experiment.resourceName;
          googleExperimentId = experiment.googleExperimentId;
        } else {
          const sanitizedMsg = redactSensitive('Não foi possível adquirir exclusividade para criar o experimento remoto (concorrência)');
          await prismaClient.googleAdsExperiment.update({
            where: { id: experiment.id },
            data: { lastError: sanitizedMsg },
          }).catch(() => {});
          throw { status: 502, message: sanitizedMsg };
        }
      } else {
        try {
          const callCreateExperiment = deps?.createExperiment ?? createExperiment;
          const capability = requireCapability('createExperiment', 'createExperiment');
          const suffix = authContext.idempotencyKey.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12);
          const expRes = await callCreateExperiment(
            token,
            config,
            {
              name: experiment.name,
              suffix,
              mockIdentitySeed: authContext.idempotencyKey,
              type: 'SEARCH_CUSTOM',
              startDate: remoteCreateInput.startDate,
              endDate: remoteCreateInput.endDate,
            },
            capability
          );
          googleExperimentId = expRes.googleExperimentId;
          resourceName = expRes.resourceName;
          experimentFreshlyCreatedThisCall = true;

          const claimedConfig = asConfigObject(experiment.variationConfig) ?? {};
          experiment = await prismaClient.googleAdsExperiment.update({
            where: { id: experiment.id },
            data: {
              googleExperimentId,
              resourceName,
              lastError: null,
              variationConfig: { ...claimedConfig, saga: { ...(claimedConfig.saga ?? {}), experiment: 'COMPLETE' } },
            },
            include: { arms: { orderBy: { isControl: 'desc' } } },
          });
        } catch (err: any) {
          // Mutate lançou (ou o checkpoint pós-sucesso falhou) — nunca volta pra PENDING; fica
          // UNKNOWN pra que um retry seja obrigado a reconciliar (ou falhar fechado) em vez de
          // remutar (P1-1).
          const sanitizedMsg = redactSensitive(err.message || 'Erro na criação remota do experimento');
          const claimedConfig = asConfigObject(experiment.variationConfig) ?? {};
          await prismaClient.googleAdsExperiment.update({
            where: { id: experiment.id },
            data: {
              lastError: sanitizedMsg,
              variationConfig: { ...claimedConfig, saga: { ...(claimedConfig.saga ?? {}), experiment: 'UNKNOWN' } },
            },
          }).catch(() => {});
          throw { status: 502, message: sanitizedMsg };
        }
      }
    }
  }

  // Checkpoint Step B: Remote Arms Creation (reconciliação validada fail-closed, P1-A/P1-C)
  let armsRes = experiment.arms || [];
  if (armsRes.length === 0) {
    const splitTreatment = validated.trafficSplitTreatment || 50;
    const expectedControlCampaignResourceName = `customers/${config.customerId}/campaigns/${campaign.googleCampaignId}`;
    // Se o experimento acabou de ser criado NESTA chamada, braços remotos não podem existir
    // ainda — seguro pular reconciliação e criar direto (mesma lógica de primeira-tentativa do
    // checkpoint A, aplicada aos braços).
    // Se o experimento acabou de ser criado NESTA chamada, braços remotos não podem existir
    // ainda — seguro pular reconciliação (mas não o claim de concorrência abaixo).
    const armsCheckpointIsFresh = experimentFreshlyCreatedThisCall;
    let createdArms: ValidatedReconciledArm[] | null = null;

    const sagaCfgBeforeB = asConfigObject(experiment.variationConfig);
    const sagaArmsState = getSagaState(sagaCfgBeforeB, 'arms');
    const armsAttemptedBefore = sagaArmsState === 'IN_FLIGHT' || sagaArmsState === 'UNKNOWN' || sagaArmsState === 'COMPLETE';

    if (!armsCheckpointIsFresh) {
      const reconciledArms = await reconcileRemoteArms(
        token,
        config,
        resourceName!,
        splitTreatment,
        expectedControlCampaignResourceName,
        deps
      );

      if (reconciledArms.kind === 'FOUND') {
        createdArms = reconciledArms.value;
      } else if (armsAttemptedBefore || reconciledArms.kind === 'UNKNOWN') {
        // P1-1: etapa durável já teve mutate tentada antes — NOT_FOUND deixa de ser autoritativo
        // suficiente sozinho, igual ao checkpoint A.
        const sanitizedMsg = redactSensitive(
          reconciledArms.kind === 'UNKNOWN'
            ? `Reconciliação dos braços remotos inconclusiva: ${reconciledArms.reason}`
            : 'Reconciliação dos braços remotos inconclusiva: sem confirmação após tentativa anterior'
        );
        await prismaClient.googleAdsExperiment.update({
          where: { id: experiment.id },
          data: { lastError: sanitizedMsg },
        }).catch(() => {});
        throw { status: 502, message: sanitizedMsg };
      }
      // NOT_FOUND (e nunca tentado antes) cai para criação abaixo.
    }

    if (!createdArms) {
      // P1-1: claim exclusivo antes de mutar — no máximo uma request concorrente chega a
      // chamar createExperimentArms pra este experimento.
      const claim = await claimSagaStep(prismaClient, experiment, 'arms');
      experiment = claim.experiment;
      armsRes = experiment.arms || [];

      if (!claim.claimed) {
        if (armsRes.length !== 2) {
          const sanitizedMsg = redactSensitive('Não foi possível adquirir exclusividade para criar os braços remotos (concorrência)');
          await prismaClient.googleAdsExperiment.update({
            where: { id: experiment.id },
            data: { lastError: sanitizedMsg },
          }).catch(() => {});
          throw { status: 502, message: sanitizedMsg };
        }
        // Outra request ganhou o claim e já persistiu os 2 braços localmente — segue com eles.
      } else {
        try {
          const callCreateExperimentArms = deps?.createExperimentArms ?? createExperimentArms;
          const capability = requireCapability('createExperimentArms', 'createExperimentArms');

          const rawArms = await callCreateExperimentArms(
            token,
            config,
            {
              experimentResourceName: resourceName!,
              arms: [
                {
                  name: 'control',
                  isControl: true,
                  trafficSplit: 100 - splitTreatment,
                  campaignResourceName: expectedControlCampaignResourceName,
                },
                {
                  name: 'treatment',
                  isControl: false,
                  trafficSplit: splitTreatment,
                },
              ],
            },
            capability
          );

          // P1-4: mesmo validador de invariantes da reconciliação aplicado ao retorno remoto
          // fresco — nunca aceita resultado fabricado/parcial como prova pra persistir.
          const validatedArms = validateReconciledArms(rawArms, splitTreatment, expectedControlCampaignResourceName);
          if (!validatedArms) {
            throw new Error('Retorno de createExperimentArms não passou na validação de invariantes (contagem, splits, vínculo ou in-design campaign)');
          }
          createdArms = validatedArms;

          const claimedConfig = asConfigObject(experiment.variationConfig) ?? {};
          experiment = await prismaClient.googleAdsExperiment.update({
            where: { id: experiment.id },
            data: {
              lastError: null,
              variationConfig: { ...claimedConfig, saga: { ...(claimedConfig.saga ?? {}), arms: 'COMPLETE' } },
            },
            include: { arms: { orderBy: { isControl: 'desc' } } },
          });
        } catch (err: any) {
          const sanitizedMsg = redactSensitive(err.message || 'Erro na criação dos braços do experimento');
          const claimedConfig = asConfigObject(experiment.variationConfig) ?? {};
          await prismaClient.googleAdsExperiment.update({
            where: { id: experiment.id },
            data: {
              lastError: sanitizedMsg,
              variationConfig: { ...claimedConfig, saga: { ...(claimedConfig.saga ?? {}), arms: 'UNKNOWN' } },
            },
          }).catch(() => {});
          throw { status: 502, message: sanitizedMsg };
        }
      }
    }

    if (createdArms && createdArms.length > 0) {
      const controlFinalUrl = readiness.data?.finalUrl || 'https://example.com';
      const armsData = createdArms.map((arm) => ({
        experimentId: experiment.id,
        name: arm.name,
        isControl: arm.isControl,
        trafficSplit: arm.trafficSplit,
        resourceName: arm.resourceName,
        inDesignCampaignResourceName: arm.inDesignCampaignResourceName,
        servedCampaignResourceName: arm.servedCampaignResourceName,
        googleCampaignId: arm.isControl ? campaign.googleCampaignId : null,
        localPresellId: arm.isControl ? null : validated.presellId,
        finalUrl: arm.isControl ? controlFinalUrl : validated.treatmentFinalUrl,
      }));

      const persistedArmsConfig = asConfigObject(experiment.variationConfig) ?? {};
      experiment = await prismaClient.googleAdsExperiment.update({
        where: { id: experiment.id },
        data: {
          variationConfig: {
            ...persistedArmsConfig,
            saga: { ...(persistedArmsConfig.saga ?? {}), arms: 'COMPLETE' },
          },
        },
        include: { arms: { orderBy: { isControl: 'desc' } } },
      });

      // P1-4: insert local atômico — createMany é uma única instrução SQL; nunca deixa só um
      // dos dois braços persistido (ao contrário do loop de `create` anterior).
      const insertResult = await prismaClient.googleAdsExperimentArm.createMany({ data: armsData });
      if (!insertResult || insertResult.count !== armsData.length) {
        const sanitizedMsg = redactSensitive('Persistência local dos braços retornou contagem inconsistente — zero estado parcial aceito');
        await prismaClient.googleAdsExperiment.update({
          where: { id: experiment.id },
          data: { lastError: sanitizedMsg },
        }).catch(() => {});
        throw { status: 502, message: sanitizedMsg };
      }

      experiment = await prismaClient.googleAdsExperiment.findUniqueOrThrow({
        where: { id: experiment.id },
        include: { arms: { orderBy: { isControl: 'desc' } } },
      });
      armsRes = experiment.arms;
    }
  }

  // Checkpoint Step C: Treatment Variation Application & Verification (persisting explicit proof)
  const tArm = armsRes.find((a: any) => !a.isControl);
  if (!tArm || !tArm.inDesignCampaignResourceName) {
    throw { status: 502, message: 'Braço de tratamento incompleto no experimento' };
  }

  const variationConfigBeforeClaim = asConfigObject(experiment.variationConfig) ?? {};
  const variationState = getSagaState(variationConfigBeforeClaim, 'variation');
  if (variationState === 'IN_FLIGHT' || variationState === 'UNKNOWN' || variationState === 'COMPLETE') {
    const msg = 'Variação remota já foi tentada sem prova local conclusiva; revisão manual necessária';
    await prismaClient.googleAdsExperiment.update({
      where: { id: experiment.id },
      data: { lastError: msg },
    }).catch(() => {});
    throw { status: 502, message: msg };
  }

  const variationClaim = await claimSagaStep(prismaClient, experiment, 'variation');
  experiment = variationClaim.experiment;
  if (!variationClaim.claimed) {
    const freshConfig = asConfigObject(experiment.variationConfig);
    const freshProof = freshConfig?.proof;
    const freshTreatment = (experiment.arms || []).find((a: any) => !a.isControl);
    if (
      freshProof?.verified === true &&
      freshProof.finalUrl === validated.treatmentFinalUrl &&
      freshTreatment?.finalUrl === validated.treatmentFinalUrl
    ) {
      return {
        success: true,
        mock: isMock,
        experiment: toExperimentDTO(experiment),
        warnings: readiness.warnings,
      };
    }
    throw { status: 502, message: 'Não foi possível adquirir exclusividade para aplicar a variação remota' };
  }

  try {
    const callApplyFinalUrlVariation = deps?.applyFinalUrlVariation ?? applyFinalUrlVariation;
    const capability = requireCapability('updateAdFinalUrls', 'updateAdFinalUrls');
    const applyRes = await callApplyFinalUrlVariation(
      token,
      config,
      resourceName!,
      validated.treatmentFinalUrl,
      capability
    );

    if (applyRes.verified || applyRes.alreadyApplied) {
      const currentConfig = asConfigObject(experiment.variationConfig) ?? {};
      const setupPayloadToPersist = currentConfig.setupPayload ?? incomingCanonical;

      const variationProof = {
        verified: true,
        verifiedAt: new Date().toISOString(),
        finalUrl: validated.treatmentFinalUrl,
        presellId: validated.presellId,
        presellContentSha256,
        trafficSplitTreatment: validated.trafficSplitTreatment || 50,
        adsModifiedCount: applyRes.adsModified?.length ?? 1,
      };

      await prismaClient.googleAdsExperimentArm.update({
        where: { id: tArm.id },
        data: { finalUrl: validated.treatmentFinalUrl },
      });

      experiment = await prismaClient.googleAdsExperiment.update({
        where: { id: experiment.id },
        data: {
          lastError: null,
          variationConfig: {
            ...currentConfig,
            setupPayload: setupPayloadToPersist,
            proof: variationProof,
            saga: { ...(currentConfig.saga ?? {}), variation: 'COMPLETE' },
          },
        },
        include: { arms: { orderBy: { isControl: 'desc' } } },
      });

      return {
        success: true,
        mock: isMock,
        experiment: toExperimentDTO(experiment),
        warnings: readiness.warnings,
        logs: ['Variação de pré-sell aplicada e verificada com sucesso'],
      };
    }

    throw new Error(redactSensitive(applyRes.warnings?.[0] || 'Falha na verificação de finalUrls após mutação'));
  } catch (err: any) {
    const sanitizedMsg = redactSensitive(err.message || 'Erro ao aplicar variação no tratamento');
    const failedConfig = asConfigObject(experiment.variationConfig) ?? {};
    await prismaClient.googleAdsExperiment.update({
      where: { id: experiment.id },
      data: {
        lastError: sanitizedMsg,
        variationConfig: {
          ...failedConfig,
          saga: { ...(failedConfig.saga ?? {}), variation: 'UNKNOWN' },
        },
      },
    }).catch(() => {});
    throw { status: 502, message: sanitizedMsg };
  }
}

export async function getExperimentDetail(id: string, userId: string, deps?: any) {
  const prismaClient = deps?.prisma ?? prisma;

  // Point 4: Lookup Prisma owned por { id, userId }
  const exp = await prismaClient.googleAdsExperiment.findFirst({
    where: { id, userId },
    include: {
      arms: { orderBy: { isControl: 'desc' } },
      operations: { orderBy: { startedAt: 'desc' }, take: 1 },
      metricSnapshots: { orderBy: { snapshotDate: 'desc' }, take: 1 },
    },
  });

  if (!exp) {
    throw { status: 404, message: 'Experimento não encontrado' };
  }

  return toExperimentDetailDTO(exp);
}

interface ScheduleLifecycleInput {
  id: string;
  userId: string;
  payload: unknown;
  deps?: {
    prisma?: any;
    checkReadiness?: typeof checkGoogleAdsReadiness;
    readinessDeps?: any;
    getAdsConfig?: typeof getGoogleAdsConfig;
    getAccessToken?: typeof getAccessToken;
    token?: string;
    isMock?: boolean;
    findPresell?: (id: string, uid: string) => Promise<any>;
    assertMutationAllowed?: typeof assertMutationAllowed;
    scheduleExperiment?: typeof scheduleExperiment;
    verifyTreatmentFinalUrl?: (
      token: string,
      config: any,
      campaignResourceName: string,
      expectedFinalUrl: string
    ) => Promise<boolean>;
  };
}

function defaultReadinessDependencies(prismaClient: any, userId: string) {
  return {
    findCampaign: (id: string, uid: string) => prismaClient.campaign.findFirst({ where: { id, userId: uid }, include: { keywords: true } }),
    findChecklists: (campaignId: string) => prismaClient.campaignChecklist.findMany({ where: { campaignId, step: { not: 9 } } }),
    getAdsConfig: (uid: string) => getGoogleAdsConfig(uid),
    findProduct: (id: string) => prismaClient.productResearch.findFirst({ where: { id, userId } }),
  };
}

function assertExperimentResourceForCustomer(resourceName: unknown, customerId: string): asserts resourceName is string {
  const match = typeof resourceName === 'string' ? /^customers\/(\d+)\/experiments\/(\d+)$/.exec(resourceName) : null;
  if (!match || match[1] !== customerId) {
    throw { status: 422, message: 'Identidade remota do experimento inválida ou divergente do customer' };
  }
}

function assertOperationResourceForCustomer(operationName: unknown, customerId: string): asserts operationName is string {
  const match = typeof operationName === 'string'
    ? /^customers\/(\d+)\/operations\/([A-Za-z0-9._~-]+)$/.exec(operationName)
    : null;
  if (!match || match[1] !== customerId) {
    throw new Error('Operation resource name inválido ou divergente do customer');
  }
}

export async function scheduleExperimentLifecycle({ id, userId, payload, deps }: ScheduleLifecycleInput) {
  const parsed = ScheduleExperimentRoutePayloadSchema.safeParse(payload);
  if (!parsed.success) {
    throw { status: 400, message: redactSensitive(`Payload inválido: ${parsed.error.errors[0]?.message || 'schema'}`) };
  }

  const prismaClient = deps?.prisma ?? prisma;
  let experiment = await prismaClient.googleAdsExperiment.findFirst({
    where: { id, userId },
    include: { arms: { orderBy: { isControl: 'desc' } }, operations: { orderBy: { startedAt: 'desc' } } },
  });
  if (!experiment) throw { status: 404, message: 'Experimento não encontrado' };

  const configBefore = asConfigObject(experiment.variationConfig) ?? {};
  const proof = asConfigObject(configBefore.proof);
  const treatmentArm = (experiment.arms || []).find((arm: any) => !arm.isControl);
  if (
    proof?.verified !== true
    || !treatmentArm
    || typeof treatmentArm.finalUrl !== 'string'
    || proof.finalUrl !== treatmentArm.finalUrl
    || typeof proof.presellId !== 'string'
    || proof.presellId !== treatmentArm.localPresellId
    || typeof proof.presellContentSha256 !== 'string'
    || !/^[a-f0-9]{64}$/.test(proof.presellContentSha256)
  ) {
    throw { status: 422, message: 'Variação de tratamento não possui prova persistida e consistente' };
  }
  const existingLifecycle = asConfigObject(configBefore.lifecycle)?.schedule as any;
  const currentRevision = safeISO(experiment.updatedAt);
  if (!currentRevision) throw { status: 409, message: 'Revisão do experimento indisponível' };
  const currentScheduleRevision = `${currentRevision}:${proof.presellContentSha256}`;
  const authorizationRevision = existingLifecycle?.idempotencyKey === parsed.data.authorization.idempotencyKey && typeof existingLifecycle?.authorizedRevision === 'string'
    ? existingLifecycle.authorizedRevision
    : currentScheduleRevision;
  try {
    authorizeMutation(parsed.data.authorization, 'SCHEDULE_EXPERIMENT', experiment.id, authorizationRevision, userId, experiment.userId);
  } catch (error: any) {
    throw { status: 400, message: redactSensitive(error?.message || 'Falha de autorização') };
  }

  if (existingLifecycle) {
    if (existingLifecycle.idempotencyKey !== parsed.data.authorization.idempotencyKey) throw { status: 409, message: 'Conflito de idempotência no agendamento' };
    if (existingLifecycle.state === 'COMPLETE' && typeof existingLifecycle.operationName === 'string') {
      const operation = (experiment.operations || []).find((item: any) => item.operationName === existingLifecycle.operationName)
        ?? { operationName: existingLifecycle.operationName, status: 'PENDING', operationType: 'SCHEDULE' };
      return { success: true, mock: deps?.isMock ?? false, experiment: toExperimentDTO(experiment), operation, warnings: [] };
    }
    if (existingLifecycle.state === 'IN_FLIGHT' || existingLifecycle.state === 'UNKNOWN') {
      throw { status: 409, message: 'Agendamento anterior possui resultado remoto inconclusivo; sincronize antes de repetir' };
    }
  }

  if (!existingLifecycle && (experiment.operations || []).some((operation: any) => operation.operationType === 'SCHEDULE')) {
    throw { status: 409, message: 'Operação SCHEDULE legada sem envelope de idempotência; sincronização manual obrigatória' };
  }

  if (experiment.status !== 'SETUP') throw { status: 409, message: `Experimento não pode ser agendado a partir de ${experiment.status}` };

  const findPresell = deps?.findPresell
    ?? ((presellId: string, uid: string) => prismaClient.presell.findFirst({ where: { id: presellId, userId: uid } }));
  const currentPresell = await findPresell(proof.presellId, userId);
  const currentContentSha256 = hashPresellHtml(currentPresell?.html);
  if (!currentContentSha256 || currentContentSha256 !== proof.presellContentSha256) {
    throw { status: 409, message: 'Conteúdo da presell diverge da revisão aprovada; nova aprovação obrigatória' };
  }

  const adsConfig = await (deps?.getAdsConfig ?? getGoogleAdsConfig)(userId);
  if (!adsConfig) throw { status: 422, message: 'Configuração do Google Ads não encontrada' };
  const mock = deps?.isMock ?? isMockMode(adsConfig);
  const token = deps?.token ?? (mock ? 'mock_access_token_123' : await (deps?.getAccessToken ?? getAccessToken)(adsConfig));
  assertExperimentResourceForCustomer(experiment.resourceName, adsConfig.customerId);

  const treatmentCampaignResourceName = treatmentArm.inDesignCampaignResourceName;
  const treatmentCampaignMatch = typeof treatmentCampaignResourceName === 'string'
    ? /^customers\/(\d+)\/campaigns\/(\d+)$/.exec(treatmentCampaignResourceName)
    : null;
  if (!treatmentCampaignMatch || treatmentCampaignMatch[1] !== adsConfig.customerId) {
    throw { status: 422, message: 'Identidade da campanha treatment inválida ou divergente do customer' };
  }
  const verifyTreatmentFinalUrl = deps?.verifyTreatmentFinalUrl ?? (async (
    accessToken: string,
    config: any,
    campaignResourceName: string,
    expectedFinalUrl: string
  ) => {
    const ads = await findAdGroupAdsInCampaign(accessToken, config, campaignResourceName);
    return ads.length > 0 && ads.every((ad) =>
      Array.isArray(ad.finalUrls) &&
      ad.finalUrls.length > 0 &&
      ad.finalUrls.every((url) => url === expectedFinalUrl)
    );
  });
  const approvedUrlUnchanged = mock
    ? true
    : await verifyTreatmentFinalUrl(token, adsConfig, treatmentCampaignResourceName, treatmentArm.finalUrl);
  if (!approvedUrlUnchanged) {
    throw { status: 422, message: 'A URL remota da campanha treatment diverge da variação aprovada' };
  }

  const checkReadiness = deps?.checkReadiness ?? checkGoogleAdsReadiness;
  const readinessDeps = {
    ...(deps?.readinessDeps ?? defaultReadinessDependencies(prismaClient, userId)),
    verifyApprovedUrlUnchanged: async () => approvedUrlUnchanged,
  };
  const readiness = await checkReadiness(experiment.campaignId, userId, 'SCHEDULE', readinessDeps);
  if (!readiness.ready) throw { status: 422, message: redactSensitive(readiness.errors?.[0] || 'Readiness de agendamento falhou') };

  const guard = (deps?.assertMutationAllowed ?? assertMutationAllowed)({
    operation: 'scheduleExperiment',
    customerId: adsConfig.customerId,
    resourceName: experiment.resourceName,
    isMock: mock,
    confirmed: true,
  });
  if (!guard.allowed || !(guard as any).capability || (guard as any).capability.operation !== 'scheduleExperiment') {
    throw { status: 502, message: redactSensitive(`Mutação bloqueada (schedule): ${(guard as any).reason || 'capability inválida'}`) };
  }

  const lifecycle = {
    ...(asConfigObject(configBefore.lifecycle) ?? {}),
    schedule: { idempotencyKey: parsed.data.authorization.idempotencyKey, authorizedRevision: authorizationRevision, state: 'IN_FLIGHT' },
  };
  const claim = await claimSagaStep(prismaClient, experiment, 'schedule', { lifecycle });
  if (!claim.claimed) throw { status: 409, message: 'Agendamento já foi reivindicado por outra requisição' };
  experiment = claim.experiment;

  let handle: Awaited<ReturnType<typeof scheduleExperiment>>;
  try {
    handle = await (deps?.scheduleExperiment ?? scheduleExperiment)(token, adsConfig, experiment.resourceName, 'SETUP', (guard as any).capability);
    assertOperationResourceForCustomer(handle.operationName, adsConfig.customerId);
  } catch (error: any) {
    const message = redactSensitive(error?.message || 'Falha externa ao agendar experimento');
    const claimedConfig = asConfigObject(experiment.variationConfig) ?? {};
    const failedConfig = {
      ...claimedConfig,
      lifecycle: { ...(asConfigObject(claimedConfig.lifecycle) ?? {}), schedule: { ...lifecycle.schedule, state: 'UNKNOWN' } },
      saga: { ...(asConfigObject(claimedConfig.saga) ?? {}), schedule: 'UNKNOWN' },
    };
    await prismaClient.googleAdsExperiment.updateMany({
      where: { id: experiment.id, updatedAt: experiment.updatedAt, status: experiment.status },
      data: { variationConfig: failedConfig, lastError: message },
    });
    throw { status: 502, message };
  }

  const claimedConfig = asConfigObject(experiment.variationConfig) ?? {};
  const completedConfig = {
    ...claimedConfig,
    lifecycle: { ...(asConfigObject(claimedConfig.lifecycle) ?? {}), schedule: { ...lifecycle.schedule, state: 'COMPLETE', operationName: handle.operationName } },
    saga: { ...(asConfigObject(claimedConfig.saga) ?? {}), schedule: 'COMPLETE' },
  };
  let persisted: { operation: any; updated: any };
  try {
    persisted = await prismaClient.$transaction(async (tx: any) => {
      const operation = await tx.googleAdsExperimentOperation.create({ data: { experimentId: experiment.id, operationType: 'SCHEDULE', operationName: handle.operationName, status: 'PENDING' } });
      const updateData = { variationConfig: completedConfig, lastError: null };
      const cas = await tx.googleAdsExperiment.updateMany({
        where: { id: experiment.id, updatedAt: experiment.updatedAt, status: experiment.status },
        data: updateData,
      });
      if (cas.count !== 1) throw new Error('SCHEDULE_COMMIT_CAS_CONFLICT');
      return { operation, updated: { ...experiment, ...updateData } };
    });
  } catch (error: any) {
    if (error?.message === 'SCHEDULE_COMMIT_CAS_CONFLICT') {
      throw { status: 409, message: 'SCHEDULE remoto aceito, mas o estado local mudou; sincronização obrigatória' };
    }
    throw error;
  }
  return { success: true, mock, experiment: toExperimentDTO({ ...experiment, ...persisted.updated }), operation: persisted.operation, warnings: readiness.warnings || [] };
}

interface ExperimentActionLifecycleInput {
  id: string;
  userId: string;
  payload: unknown;
  deps?: {
    prisma?: any;
    getAdsConfig?: typeof getGoogleAdsConfig;
    getAccessToken?: typeof getAccessToken;
    token?: string;
    isMock?: boolean;
    assertMutationAllowed?: typeof assertMutationAllowed;
    endExperiment?: typeof endExperiment;
    promoteExperiment?: typeof promoteExperiment;
    graduateExperiment?: typeof graduateExperiment;
    resolveGraduateBudgetMapping?: (experiment: any) => Promise<{
      experimentCampaignResourceName: string;
      campaignBudgetResourceName: string;
    } | null>;
  };
}

const ACTION_CONTRACT = {
  END: { authorization: 'END_EXPERIMENT', transport: 'endExperiment', saga: 'end', terminalStatus: 'ENDED' },
  PROMOTE: { authorization: 'PROMOTE_EXPERIMENT', transport: 'promoteExperiment', saga: 'promote', terminalStatus: null },
  GRADUATE: { authorization: 'GRADUATE_EXPERIMENT', transport: 'graduateExperiment', saga: 'graduate', terminalStatus: 'GRADUATED' },
} as const;

const LIFECYCLE_REMOTE_PROOF: Record<string, ReadonlySet<string>> = {
  schedule: new Set(['SCHEDULED', 'RUNNING', 'ENDED', 'PROMOTED', 'GRADUATED']),
  promote: new Set(['PROMOTED']),
  end: new Set(['ENDED']),
  graduate: new Set(['GRADUATED']),
};

function reconcileLifecycleFromRemoteStatus(
  variationConfig: unknown,
  remoteLocalStatus: string,
  reconciledAt: Date
): { variationConfig: any; reconciled: string[] } | null {
  const cfg = asConfigObject(variationConfig);
  const lifecycle = asConfigObject(cfg?.lifecycle);
  if (!cfg || !lifecycle) return null;

  const nextLifecycle = { ...lifecycle };
  const nextSaga = { ...(asConfigObject(cfg.saga) ?? {}) };
  const reconciled: string[] = [];
  for (const [step, allowedStatuses] of Object.entries(LIFECYCLE_REMOTE_PROOF)) {
    const envelope = asConfigObject(lifecycle[step]);
    if (
      envelope
      && (envelope.state === 'IN_FLIGHT' || envelope.state === 'UNKNOWN')
      && allowedStatuses.has(remoteLocalStatus)
    ) {
      nextLifecycle[step] = {
        ...envelope,
        state: 'COMPLETE',
        reconciledAt: reconciledAt.toISOString(),
        reconciledFromRemoteStatus: remoteLocalStatus,
      };
      nextSaga[step] = 'COMPLETE';
      reconciled.push(step);
    }
  }
  if (reconciled.length === 0) return null;
  return {
    variationConfig: { ...cfg, lifecycle: nextLifecycle, saga: nextSaga },
    reconciled,
  };
}

export async function runExperimentAction({ id, userId, payload, deps }: ExperimentActionLifecycleInput) {
  const parsed = ExperimentActionRoutePayloadSchema.safeParse(payload);
  if (!parsed.success) throw { status: 400, message: redactSensitive(`Payload inválido: ${parsed.error.errors[0]?.message || 'schema'}`) };
  const { action, authorization } = parsed.data;
  const contract = ACTION_CONTRACT[action];
  const prismaClient = deps?.prisma ?? prisma;
  let experiment = await prismaClient.googleAdsExperiment.findFirst({
    where: { id, userId },
    include: { arms: { orderBy: { isControl: 'desc' } }, operations: { orderBy: { startedAt: 'desc' } } },
  });
  if (!experiment) throw { status: 404, message: 'Experimento não encontrado' };

  const cfg = asConfigObject(experiment.variationConfig) ?? {};
  const lifecycleRoot = asConfigObject(cfg.lifecycle) ?? {};
  const existing = lifecycleRoot[contract.saga] as any;
  const revision = existing?.idempotencyKey === authorization.idempotencyKey && typeof existing?.authorizedRevision === 'string'
    ? existing.authorizedRevision
    : safeISO(experiment.updatedAt);
  if (!revision) throw { status: 409, message: 'Revisão do experimento indisponível' };
  try {
    authorizeMutation(authorization, contract.authorization, experiment.id, revision, userId, experiment.userId);
  } catch (error: any) {
    throw { status: 400, message: redactSensitive(error?.message || 'Falha de autorização') };
  }

  if (existing) {
    if (existing.idempotencyKey !== authorization.idempotencyKey) throw { status: 409, message: `Conflito de idempotência em ${action}` };
    if (existing.state === 'COMPLETE') {
      const operation = existing.operationName
        ? (experiment.operations || []).find((item: any) => item.operationName === existing.operationName)
          ?? { operationName: existing.operationName, status: 'PENDING', operationType: action }
        : undefined;
      return { success: true, mock: deps?.isMock ?? false, experiment: toExperimentDTO(experiment), ...(operation ? { operation } : {}), warnings: [] };
    }
    if (existing.state === 'IN_FLIGHT' || existing.state === 'UNKNOWN') {
      throw { status: 409, message: `${action} anterior possui resultado remoto inconclusivo; sincronize antes de repetir` };
    }
  }

  if (!existing && action === 'PROMOTE' && (experiment.operations || []).some((operation: any) => operation.operationType === 'PROMOTE')) {
    throw { status: 409, message: 'Operação PROMOTE legada sem envelope de idempotência; sincronização manual obrigatória' };
  }

  const pendingLifecycleOperation = (experiment.operations || []).find(
    (operation: any) => operation.status === 'PENDING'
      && (operation.operationType === 'SCHEDULE' || operation.operationType === 'PROMOTE')
  );
  const unresolvedLifecycle = Object.entries(lifecycleRoot).find(([key, value]) => {
    if (key === contract.saga || !value || typeof value !== 'object') return false;
    const state = (value as any).state;
    return state === 'IN_FLIGHT' || state === 'UNKNOWN';
  });
  if (pendingLifecycleOperation || unresolvedLifecycle) {
    throw {
      status: 409,
      message: 'Outra operação lifecycle está pendente ou inconclusiva; sincronização obrigatória antes de nova ação',
    };
  }

  try {
    assertActionAllowedFromStatus(action, experiment.status);
  } catch (error: any) {
    throw { status: 409, message: redactSensitive(error?.message || 'Ação incompatível com o estado atual') };
  }

  let graduateMapping: { experimentCampaignResourceName: string; campaignBudgetResourceName: string } | null = null;
  if (action === 'GRADUATE') {
    if (!deps?.resolveGraduateBudgetMapping) {
      throw { status: 422, message: 'GRADUATE bloqueado: budget mapping server-side não está disponível' };
    }
    graduateMapping = await deps.resolveGraduateBudgetMapping(experiment);
    if (!graduateMapping) throw { status: 422, message: 'GRADUATE bloqueado: budget mapping não pôde ser comprovado' };
  }

  const adsConfig = await (deps?.getAdsConfig ?? getGoogleAdsConfig)(userId);
  if (!adsConfig) throw { status: 422, message: 'Configuração do Google Ads não encontrada' };
  const mock = deps?.isMock ?? isMockMode(adsConfig);
  const token = deps?.token ?? (mock ? 'mock_access_token_123' : await (deps?.getAccessToken ?? getAccessToken)(adsConfig));
  assertExperimentResourceForCustomer(experiment.resourceName, adsConfig.customerId);
  if (graduateMapping) {
    const campaignMatch = /^customers\/(\d+)\/campaigns\/(\d+)$/.exec(graduateMapping.experimentCampaignResourceName);
    const budgetMatch = /^customers\/(\d+)\/campaignBudgets\/(\d+)$/.exec(graduateMapping.campaignBudgetResourceName);
    if (!campaignMatch || !budgetMatch || campaignMatch[1] !== adsConfig.customerId || budgetMatch[1] !== adsConfig.customerId) {
      throw { status: 422, message: 'Budget mapping de GRADUATE possui identidade inválida' };
    }
  }

  const guard = (deps?.assertMutationAllowed ?? assertMutationAllowed)({
    operation: contract.transport,
    customerId: adsConfig.customerId,
    resourceName: experiment.resourceName,
    isMock: mock,
    confirmed: true,
  });
  if (!guard.allowed || !(guard as any).capability || (guard as any).capability.operation !== contract.transport) {
    throw { status: 502, message: redactSensitive(`Mutação bloqueada (${action}): ${(guard as any).reason || 'capability inválida'}`) };
  }

  const lifecycle = {
    ...lifecycleRoot,
    [contract.saga]: { idempotencyKey: authorization.idempotencyKey, authorizedRevision: revision, state: 'IN_FLIGHT', reason: parsed.data.reason },
  };
  const claim = await claimSagaStep(prismaClient, experiment, contract.saga, { lifecycle });
  if (!claim.claimed) throw { status: 409, message: `${action} já foi reivindicada por outra requisição` };
  experiment = claim.experiment;

  let operationName: string | undefined;
  try {
    if (action === 'END') {
      await (deps?.endExperiment ?? endExperiment)(token, adsConfig, experiment.resourceName, experiment.status, (guard as any).capability);
    } else if (action === 'PROMOTE') {
      const handle = await (deps?.promoteExperiment ?? promoteExperiment)(token, adsConfig, experiment.resourceName, experiment.status, (guard as any).capability);
      assertOperationResourceForCustomer(handle.operationName, adsConfig.customerId);
      operationName = handle.operationName;
    } else {
      await (deps?.graduateExperiment ?? graduateExperiment)(
        token,
        adsConfig,
        experiment.resourceName,
        experiment.status,
        graduateMapping!.experimentCampaignResourceName,
        graduateMapping!.campaignBudgetResourceName,
        (guard as any).capability
      );
    }
  } catch (error: any) {
    const message = redactSensitive(error?.message || `Falha externa em ${action}`);
    const claimedCfg = asConfigObject(experiment.variationConfig) ?? {};
    const failedCfg = {
      ...claimedCfg,
      lifecycle: { ...(asConfigObject(claimedCfg.lifecycle) ?? {}), [contract.saga]: { ...lifecycle[contract.saga], state: 'UNKNOWN' } },
      saga: { ...(asConfigObject(claimedCfg.saga) ?? {}), [contract.saga]: 'UNKNOWN' },
    };
    await prismaClient.googleAdsExperiment.updateMany({
      where: { id: experiment.id, updatedAt: experiment.updatedAt, status: experiment.status },
      data: { variationConfig: failedCfg, lastError: message },
    });
    throw { status: 502, message };
  }

  const claimedCfg = asConfigObject(experiment.variationConfig) ?? {};
  const completedCfg = {
    ...claimedCfg,
    lifecycle: { ...(asConfigObject(claimedCfg.lifecycle) ?? {}), [contract.saga]: { ...lifecycle[contract.saga], state: 'COMPLETE', ...(operationName ? { operationName } : {}) } },
    saga: { ...(asConfigObject(claimedCfg.saga) ?? {}), [contract.saga]: 'COMPLETE' },
  };
  const updateData = {
    variationConfig: completedCfg,
    lastError: null,
    ...(contract.terminalStatus ? { status: contract.terminalStatus } : {}),
  };
  let persisted: { operation?: any; updated: any };
  try {
    persisted = await prismaClient.$transaction(async (tx: any) => {
      const operation = operationName
        ? await tx.googleAdsExperimentOperation.create({ data: { experimentId: experiment.id, operationType: 'PROMOTE', operationName, status: 'PENDING' } })
        : undefined;
      const cas = await tx.googleAdsExperiment.updateMany({
        where: { id: experiment.id, updatedAt: experiment.updatedAt, status: experiment.status },
        data: updateData,
      });
      if (cas.count !== 1) throw new Error('LIFECYCLE_COMMIT_CAS_CONFLICT');
      return { operation, updated: { ...experiment, ...updateData } };
    });
  } catch (error: any) {
    if (error?.message === 'LIFECYCLE_COMMIT_CAS_CONFLICT') {
      throw { status: 409, message: `${action} remoto aceito, mas o estado local mudou; sincronização obrigatória` };
    }
    throw error;
  }
  return { success: true, mock, experiment: toExperimentDTO({ ...experiment, ...persisted.updated }), ...(persisted.operation ? { operation: persisted.operation } : {}), warnings: [] };
}

export async function syncExperiment(id: string, userId: string, deps?: any) {
  const prismaClient = deps?.prisma ?? prisma;

  // Point 4: Lookup Prisma owned por { id, userId }
  const exp = await prismaClient.googleAdsExperiment.findFirst({
    where: { id, userId },
    include: {
      arms: { orderBy: { isControl: 'desc' } },
      operations: { orderBy: { startedAt: 'desc' }, take: 1 },
    },
  });

  if (!exp) {
    throw { status: 404, message: 'Experimento não encontrado' };
  }

  if (!exp.resourceName) {
    throw { status: 422, message: 'Experimento não possui resourceName remoto' };
  }

  const getAdsConfig = deps?.getAdsConfig ?? getGoogleAdsConfig;
  const config = await getAdsConfig(userId);
  if (!config) {
    throw { status: 400, message: 'Configuração do Google Ads não encontrada para este usuário' };
  }

  const isMock = deps?.isMock ?? (config && config.developerToken ? isMockMode(config) : true);
  const fetchToken = deps?.getAccessToken ?? getAccessToken;
  const token = deps?.token ?? (isMock ? 'mock_access_token_123' : await fetchToken(config));

  const latestOperation = exp.operations?.[0];
  let operationTerminalFailed = latestOperation?.status === 'FAILED';
  let operationFailureMessage: string | null = operationTerminalFailed
    ? redactSensitive(
      latestOperation?.errorMessage
        || latestOperation?.errors?.[0]
        || exp.lastError
        || 'Operação assíncrona falhou'
    )
    : null;

  try {
    // P1-D: uma operação assíncrona FAILED é estado terminal fail-closed — reporting coletado
    // depois disso é só diagnóstico, nunca pode limpar/reescrever esse erro final.

    // Point 6: Carregar operação pendente, usar pollExperimentOperation
    const pendingOp = exp.operations?.find((op: any) => op.status === 'PENDING');
    if (pendingOp) {
      const callPoll = deps?.pollExperimentOperation ?? pollExperimentOperation;
      const pollRes = await callPoll(token, config, pendingOp.operationName);

      if (pollRes.status === 'DONE') {
        await prismaClient.googleAdsExperimentOperation.update({
          where: { id: pendingOp.id },
          data: { status: 'DONE', completedAt: new Date() },
        });
      } else if (pollRes.status === 'FAILED') {
        const callListErrors = deps?.listExperimentAsyncErrors ?? listExperimentAsyncErrors;
        let asyncErrors: string[] = pollRes.errors || [];
        try {
          const listRes = await callListErrors(token, config, exp.resourceName);
          if (listRes?.errors?.length > 0) asyncErrors = listRes.errors;
        } catch {
          // Ignored if list errors fails
        }
        const sanitizedErrors = asyncErrors.map((e) => redactSensitive(e));
        const firstErrorMsg = sanitizedErrors[0] || 'Operação assíncrona falhou';

        await prismaClient.googleAdsExperimentOperation.update({
          where: { id: pendingOp.id },
          data: {
            status: 'FAILED',
            errorMessage: firstErrorMsg,
            errors: sanitizedErrors as any,
            completedAt: new Date(),
          },
        });

        operationTerminalFailed = true;
        operationFailureMessage = firstErrorMsg;

      }
    }

    const callFetchExperimentReport = deps?.fetchExperimentReport ?? fetchExperimentReport;
    const armsReadyForFallback = Array.isArray(exp.arms)
      && exp.arms.length === 2
      && exp.arms.every((arm: any) => Boolean(arm.servedCampaignResourceName));
    const fallbackCampaigns = armsReadyForFallback
      ? validateFallbackArms(exp.id, exp.arms)
      : undefined;
    const reportRes = await callFetchExperimentReport(token, config, exp.resourceName, {
      targetClicks: 100,
      fallbackCampaigns,
    });

    let targetLocalStatus = reportRes.status;
    const remoteStatusRaw = reportRes.remoteStatusRaw;
    let isErrorState = targetLocalStatus === 'ERROR';

    if (isErrorState) {
      targetLocalStatus = 'ERROR';
    }

    let lastErrorMsg: string | null = isErrorState ? redactSensitive(`Status remoto desconhecido (${remoteStatusRaw})`) : null;
    if (isErrorState || !isMock) {
      const callListErrors = deps?.listExperimentAsyncErrors ?? listExperimentAsyncErrors;
      try {
        const asyncErrorsRes = await callListErrors(token, config, exp.resourceName);
        if (asyncErrorsRes?.errors?.length > 0) {
          lastErrorMsg = redactSensitive(asyncErrorsRes.errors[0]);
        }
      } catch {
        // Ignored
      }
    }

    // Point 6: Snapshot idempotente com bucket UTC meia-noite — reporting é sempre coletado como
    // diagnóstico, mesmo quando a operação pendente falhou (não é ele quem decide o status
    // final).
    const now = new Date();
    const utcMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const upsertInput = buildMetricSnapshotUpsertInput(id, utcMidnight, reportRes, null);

    if (upsertInput) {
      const callUpsertMetricSnapshot = deps?.upsertMetricSnapshot ?? upsertMetricSnapshot;
      await callUpsertMetricSnapshot(prismaClient as any, upsertInput);
    }

    // Point 7: Preservar remoteStatusRaw separadamente em decisionPolicy
    const decisionPolicyObj = (typeof exp.decisionPolicy === 'object' && exp.decisionPolicy !== null) ? (exp.decisionPolicy as any) : {};
    const updatedDecisionPolicy = {
      ...decisionPolicyObj,
      lastRemoteStatusRaw: remoteStatusRaw,
      lastSyncedAt: now.toISOString(),
    };

    // P1-D: se uma operação pendente acabou de falhar nesta chamada, o status/erro final ficam
    // travados em ERROR/operationFailureMessage — reporting não pode sobrescrever com RUNNING
    // nem limpar lastError.
    if (operationTerminalFailed) {
      targetLocalStatus = 'ERROR';
      lastErrorMsg = operationFailureMessage;
    }

    const lifecycleReconciliation = operationTerminalFailed
      ? null
      : reconcileLifecycleFromRemoteStatus(exp.variationConfig, targetLocalStatus, now);

    const changed = exp.status !== targetLocalStatus;

    const syncCas = await prismaClient.googleAdsExperiment.updateMany({
      where: { id, updatedAt: exp.updatedAt, status: exp.status },
      data: {
        status: targetLocalStatus,
        lastSyncedAt: now,
        lastError: lastErrorMsg,
        decisionPolicy: updatedDecisionPolicy,
        ...(lifecycleReconciliation ? { variationConfig: lifecycleReconciliation.variationConfig } : {}),
      },
    });

    const warnings: string[] = [];
    if (isErrorState) warnings.push(`Status remoto não mapeado: ${remoteStatusRaw}`);
    if (operationTerminalFailed) warnings.push('Operação assíncrona falhou — status travado em ERROR');
    if (lifecycleReconciliation) {
      warnings.push(`Lifecycle reconciliado por status remoto: ${lifecycleReconciliation.reconciled.join(', ')}`);
    }

    if (syncCas.count !== 1) {
      const fresh = await prismaClient.googleAdsExperiment.findFirst({
        where: { id, userId },
        include: {
          arms: { orderBy: { isControl: 'desc' } },
          operations: { orderBy: { startedAt: 'desc' }, take: 1 },
        },
      });
      if (!fresh) throw { status: 409, message: 'Estado do experimento mudou durante a sincronização' };
      warnings.push('Observação remota obsoleta descartada por concorrência');
      return {
        success: true,
        experimentId: id,
        status: fresh.status,
        remoteStatusRaw,
        lastSyncedAt: safeISO(fresh.lastSyncedAt),
        changed: exp.status !== fresh.status,
        warnings,
      };
    }

    return {
      success: true,
      experimentId: id,
      status: targetLocalStatus,
      remoteStatusRaw,
      lastSyncedAt: now.toISOString(),
      changed,
      warnings,
    };
  } catch (err: any) {
    const sanitizedMsg = redactSensitive(err.message || 'Erro ao sincronizar experimento com Google Ads');
    const persistedError = operationTerminalFailed
      ? (operationFailureMessage || 'Operação assíncrona falhou')
      : sanitizedMsg;
    await prismaClient.googleAdsExperiment.updateMany({
      where: { id, updatedAt: exp.updatedAt, status: exp.status },
      data: { status: 'ERROR', lastError: persistedError },
    }).catch(() => {});
    throw { status: 502, message: sanitizedMsg };
  }
}
