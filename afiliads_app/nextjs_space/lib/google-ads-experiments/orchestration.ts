import { prisma } from '../prisma';
import { checkGoogleAdsReadiness } from '../google-ads/readiness';
import { authorizeMutation, type AuthorizationContext } from '../google-ads/route-mutation-authorization';
import { getGoogleAdsConfig } from '../google-ads';
import { getAccessToken, isMockMode, googleAdsRequest } from '../google-ads/client';
import { assertMutationAllowed } from '../google-ads/mutation-guard';
import { createExperiment, createExperimentArms, applyFinalUrlVariation, pollExperimentOperation, listExperimentAsyncErrors } from '../google-ads/experiments';
import { fetchExperimentReport, buildMetricSnapshotUpsertInput, upsertMetricSnapshot } from '../google-ads/experiment-reporting';
import { mapGoogleExperimentRemoteStatus } from './types';
import { SetupExperimentPayloadSchema, type SetupExperimentPayload } from './schemas';
import { redactSensitive } from '../google-ads/errors';

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

export function toExperimentDTO(exp: any) {
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
type SagaStep = 'experiment' | 'arms' | 'variation';

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

  try {
    // P1-D: uma operação assíncrona FAILED é estado terminal fail-closed — reporting coletado
    // depois disso é só diagnóstico, nunca pode limpar/reescrever esse erro final.
    let operationJustFailed = false;
    let operationFailureMessage: string | null = null;

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

        operationJustFailed = true;
        operationFailureMessage = firstErrorMsg;

        await prismaClient.googleAdsExperiment.update({
          where: { id: exp.id },
          data: { lastError: firstErrorMsg, status: 'ERROR' },
        });
      }
    }

    const callFetchExperimentReport = deps?.fetchExperimentReport ?? fetchExperimentReport;
    const reportRes = await callFetchExperimentReport(token, config, exp.resourceName, { targetClicks: 100 });

    const mappedRemoteStatus = mapGoogleExperimentRemoteStatus(reportRes.status);
    let targetLocalStatus = mappedRemoteStatus.local;
    let isErrorState = false;

    if (reportRes.status === 'UNKNOWN' || reportRes.status === 'UNSPECIFIED' || targetLocalStatus === 'ERROR') {
      targetLocalStatus = 'ERROR';
      isErrorState = true;
    }

    let lastErrorMsg: string | null = isErrorState ? redactSensitive(`Status remoto desconhecido (${reportRes.status})`) : null;
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
      lastRemoteStatusRaw: reportRes.status,
      lastSyncedAt: now.toISOString(),
    };

    // P1-D: se uma operação pendente acabou de falhar nesta chamada, o status/erro final ficam
    // travados em ERROR/operationFailureMessage — reporting não pode sobrescrever com RUNNING
    // nem limpar lastError.
    if (operationJustFailed) {
      targetLocalStatus = 'ERROR';
      lastErrorMsg = operationFailureMessage;
    }

    const changed = exp.status !== targetLocalStatus;

    await prismaClient.googleAdsExperiment.update({
      where: { id },
      data: {
        status: targetLocalStatus,
        lastSyncedAt: now,
        lastError: lastErrorMsg,
        decisionPolicy: updatedDecisionPolicy,
      },
    });

    const warnings: string[] = [];
    if (isErrorState) warnings.push(`Status remoto não mapeado: ${reportRes.status}`);
    if (operationJustFailed) warnings.push('Operação assíncrona pendente falhou — status travado em ERROR');

    return {
      success: true,
      experimentId: id,
      status: targetLocalStatus,
      remoteStatusRaw: reportRes.status,
      lastSyncedAt: now.toISOString(),
      changed,
      warnings,
    };
  } catch (err: any) {
    const sanitizedMsg = redactSensitive(err.message || 'Erro ao sincronizar experimento com Google Ads');
    await prismaClient.googleAdsExperiment.update({
      where: { id },
      data: { lastError: sanitizedMsg },
    }).catch(() => {});
    throw { status: 502, message: sanitizedMsg };
  }
}
