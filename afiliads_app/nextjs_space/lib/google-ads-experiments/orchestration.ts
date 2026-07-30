import { prisma } from '../prisma';
import { checkGoogleAdsReadiness } from '../google-ads/readiness';
import { authorizeMutation, type AuthorizationContext } from '../google-ads/route-mutation-authorization';
import { getGoogleAdsConfig } from '../google-ads';
import { getAccessToken, isMockMode, googleAdsRequest } from '../google-ads/client';
import { assertMutationAllowed } from '../google-ads/mutation-guard';
import { createExperiment, createExperimentArms, applyFinalUrlVariation, pollExperimentOperation, listExperimentAsyncErrors } from '../google-ads/experiments';
import { fetchExperimentReport, buildMetricSnapshotUpsertInput, upsertMetricSnapshot } from '../google-ads/experiment-reporting';
import { mapGoogleExperimentRemoteStatus } from './types';
import { SetupExperimentPayloadSchema } from './schemas';
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

async function reconcileRemoteExperimentByName(
  token: string,
  config: any,
  expName: string,
  deps?: any
): Promise<{ googleExperimentId: string; resourceName: string } | null> {
  if (deps?.reconcileExperiment) {
    return deps.reconcileExperiment(expName);
  }
  if (isMockMode(config)) {
    return null;
  }
  try {
    const query = `
      SELECT experiment.resource_name, experiment.experiment_id, experiment.name
      FROM experiment
      WHERE experiment.name = '${expName.replace(/'/g, "\\'")}'
    `;
    const data = await googleAdsRequest(token, config, 'googleAds:search', { body: { query } });
    const row = data?.results?.[0]?.experiment;
    if (row?.resourceName) {
      const googleExperimentId = row.experimentId || row.resourceName.split('/').pop() || '';
      return { googleExperimentId, resourceName: row.resourceName };
    }
  } catch {
    // Return null if search query fails or no result
  }
  return null;
}

async function reconcileRemoteArms(
  token: string,
  config: any,
  experimentResourceName: string,
  deps?: any
): Promise<any[] | null> {
  if (deps?.reconcileArms) {
    return deps.reconcileArms(experimentResourceName);
  }
  if (isMockMode(config)) {
    return null;
  }
  try {
    const query = `
      SELECT experiment_arm.resource_name, experiment_arm.experiment, experiment_arm.control, experiment_arm.in_design_campaigns
      FROM experiment_arm
      WHERE experiment_arm.experiment = '${experimentResourceName.replace(/'/g, "\\'")}'
    `;
    const data = await googleAdsRequest(token, config, 'googleAds:search', { body: { query } });
    const rows = data?.results || [];
    if (rows.length > 0) {
      return rows.map((r: any) => ({
        name: r.experimentArm?.control ? 'control' : 'treatment',
        isControl: Boolean(r.experimentArm?.control),
        trafficSplit: 50,
        resourceName: r.experimentArm?.resourceName,
        inDesignCampaignResourceName: r.experimentArm?.inDesignCampaigns?.[0] ?? null,
        servedCampaignResourceName: r.experimentArm?.control ? r.experimentArm?.campaigns?.[0] ?? null : null,
      }));
    }
  } catch {
    // Return null if search query fails
  }
  return null;
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

  // 5. Short DB Step: Local Reservation & Canonical Payload Idempotency Check
  let experiment = await prismaClient.googleAdsExperiment.findUnique({
    where: { userId_idempotencyKey: { userId, idempotencyKey: authContext.idempotencyKey } },
    include: { arms: { orderBy: { isControl: 'desc' } } },
  });

  if (experiment) {
    // Canonical payload comparison: campaignId, name, startDate, endDate, presellId, treatmentFinalUrl, trafficSplit
    if (experiment.campaignId !== validated.campaignId) {
      throw { status: 409, message: 'Conflito de idempotência: campaignId divergente' };
    }
    if (validated.name && experiment.name !== validated.name) {
      throw { status: 409, message: 'Conflito de idempotência: name divergente' };
    }
    if (validated.startDate && experiment.startDate && safeISO(experiment.startDate)?.slice(0, 10) !== validated.startDate.slice(0, 10)) {
      throw { status: 409, message: 'Conflito de idempotência: startDate divergente' };
    }
    if (validated.endDate && experiment.endDate && safeISO(experiment.endDate)?.slice(0, 10) !== validated.endDate.slice(0, 10)) {
      throw { status: 409, message: 'Conflito de idempotência: endDate divergente' };
    }

    const treatmentArm = experiment.arms.find((a: any) => !a.isControl);
    if (treatmentArm) {
      if (treatmentArm.localPresellId && treatmentArm.localPresellId !== validated.presellId) {
        throw { status: 409, message: 'Conflito de idempotência: presellId divergente' };
      }
      if (treatmentArm.trafficSplit && treatmentArm.trafficSplit !== (validated.trafficSplitTreatment || 50)) {
        throw { status: 409, message: 'Conflito de idempotência: trafficSplitTreatment divergente' };
      }
    }

    const varConfigCheck = (typeof experiment.variationConfig === 'object' && experiment.variationConfig !== null) ? (experiment.variationConfig as any) : null;
    if (varConfigCheck) {
      if (varConfigCheck.finalUrl && varConfigCheck.finalUrl !== validated.treatmentFinalUrl) {
        throw { status: 409, message: 'Conflito de idempotência: treatmentFinalUrl divergente' };
      }
      if (varConfigCheck.presellId && varConfigCheck.presellId !== validated.presellId) {
        throw { status: 409, message: 'Conflito de idempotência: presellId divergente' };
      }
    }
  } else {
    // Create new local reservation draft
    const suffix = authContext.idempotencyKey.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12) || 'exp123';
    const expName = validated.name || `EXP-${campaign.id.substring(0, 5)}-${suffix}`;

    try {
      experiment = await prismaClient.googleAdsExperiment.create({
        data: {
          userId,
          campaignId: campaign.id,
          idempotencyKey: authContext.idempotencyKey,
          name: expName,
          status: 'SETUP',
          type: 'SEARCH_CUSTOM',
          variationType: 'PRESELL_URL',
          startDate: validated.startDate ? new Date(validated.startDate) : null,
          endDate: validated.endDate ? new Date(validated.endDate) : null,
          trafficAllocationType: 'SEARCH_CUSTOM',
        },
        include: { arms: { orderBy: { isControl: 'desc' } } },
      });
    } catch (createErr: any) {
      // Race condition handling (P2002)
      if (createErr?.code === 'P2002' || String(createErr).includes('P2002')) {
        experiment = await prismaClient.googleAdsExperiment.findUniqueOrThrow({
          where: { userId_idempotencyKey: { userId, idempotencyKey: authContext.idempotencyKey } },
          include: { arms: { orderBy: { isControl: 'desc' } } },
        });
        if (experiment.campaignId !== validated.campaignId) {
          throw { status: 409, message: 'Conflito de idempotência: campaignId divergente' };
        }
      } else {
        throw createErr;
      }
    }
  }

  // 6. Fast return: MUST check explicit variationConfig proof (never infer only from finalUrl & lastError)
  const arms = experiment.arms || [];
  const treatmentArm = arms.find((a: any) => !a.isControl);
  const varConfig = (typeof experiment.variationConfig === 'object' && experiment.variationConfig !== null) ? (experiment.variationConfig as any) : null;

  if (
    experiment.resourceName &&
    arms.length === 2 &&
    treatmentArm &&
    varConfig?.verified === true &&
    varConfig?.finalUrl === validated.treatmentFinalUrl &&
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

  // 8. Mutation Guard Capability Check
  const callAssertMutationAllowed = deps?.assertMutationAllowed ?? assertMutationAllowed;
  const cap1 = callAssertMutationAllowed({ operation: 'createExperiment', customerId: config.customerId, isMock, confirmed: true });
  const cap2 = callAssertMutationAllowed({ operation: 'createExperimentArms', customerId: config.customerId, isMock, confirmed: true });
  const cap3 = callAssertMutationAllowed({ operation: 'updateAdFinalUrls', customerId: config.customerId, isMock, confirmed: true });

  if (!cap1.allowed) throw { status: 502, message: redactSensitive(`Mutação bloqueada (createExperiment): ${cap1.reason}`) };
  if (!cap2.allowed) throw { status: 502, message: redactSensitive(`Mutação bloqueada (createExperimentArms): ${cap2.reason}`) };
  if (!cap3.allowed) throw { status: 502, message: redactSensitive(`Mutação bloqueada (updateAdFinalUrls): ${cap3.reason}`) };

  // 9. Pipeline Step-by-Step Execution with Resumption & Timeout Reconciliation Checkpoints

  // Checkpoint Step A: Remote Experiment Resource Creation (with ambiguous timeout reconciliation)
  let resourceName = experiment.resourceName;
  let googleExperimentId = experiment.googleExperimentId;

  if (!resourceName) {
    // Try reconciling first before calling create
    const reconciled = await reconcileRemoteExperimentByName(token, config, experiment.name, deps);
    if (reconciled) {
      googleExperimentId = reconciled.googleExperimentId;
      resourceName = reconciled.resourceName;
      experiment = await prismaClient.googleAdsExperiment.update({
        where: { id: experiment.id },
        data: { googleExperimentId, resourceName, lastError: null },
        include: { arms: { orderBy: { isControl: 'desc' } } },
      });
    } else {
      try {
        const callCreateExperiment = deps?.createExperiment ?? createExperiment;
        const suffix = authContext.idempotencyKey.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12);
        const expRes = await callCreateExperiment(
          token,
          config,
          {
            name: experiment.name,
            suffix,
            type: 'SEARCH_CUSTOM',
            startDate: validated.startDate || new Date().toISOString().split('T')[0],
            endDate: validated.endDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
          },
          cap1.capability
        );
        googleExperimentId = expRes.googleExperimentId;
        resourceName = expRes.resourceName;

        experiment = await prismaClient.googleAdsExperiment.update({
          where: { id: experiment.id },
          data: { googleExperimentId, resourceName, lastError: null },
          include: { arms: { orderBy: { isControl: 'desc' } } },
        });
      } catch (err: any) {
        const sanitizedMsg = redactSensitive(err.message || 'Erro na criação remota do experimento');
        await prismaClient.googleAdsExperiment.update({
          where: { id: experiment.id },
          data: { lastError: sanitizedMsg },
        }).catch(() => {});
        throw { status: 502, message: sanitizedMsg };
      }
    }
  }

  // Checkpoint Step B: Remote Arms Creation (with ambiguous timeout reconciliation)
  let armsRes = experiment.arms || [];
  if (armsRes.length === 0) {
    let createdArms = await reconcileRemoteArms(token, config, resourceName!, deps);

    if (!createdArms) {
      try {
        const callCreateExperimentArms = deps?.createExperimentArms ?? createExperimentArms;
        const controlFinalUrl = readiness.data?.finalUrl || 'https://example.com';
        const splitTreatment = validated.trafficSplitTreatment || 50;

        createdArms = await callCreateExperimentArms(
          token,
          config,
          {
            experimentResourceName: resourceName!,
            arms: [
              {
                name: 'control',
                isControl: true,
                trafficSplit: 100 - splitTreatment,
                campaignResourceName: `customers/${config.customerId}/campaigns/${campaign.googleCampaignId}`,
              },
              {
                name: 'treatment',
                isControl: false,
                trafficSplit: splitTreatment,
              },
            ],
          },
          cap2.capability
        );
      } catch (err: any) {
        const sanitizedMsg = redactSensitive(err.message || 'Erro na criação dos braços do experimento');
        await prismaClient.googleAdsExperiment.update({
          where: { id: experiment.id },
          data: { lastError: sanitizedMsg },
        }).catch(() => {});
        throw { status: 502, message: sanitizedMsg };
      }
    }

    if (createdArms && createdArms.length > 0) {
      const controlFinalUrl = readiness.data?.finalUrl || 'https://example.com';
      for (const arm of createdArms) {
        await prismaClient.googleAdsExperimentArm.create({
          data: {
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
          },
        });
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

  try {
    const callApplyFinalUrlVariation = deps?.applyFinalUrlVariation ?? applyFinalUrlVariation;
    const applyRes = await callApplyFinalUrlVariation(
      token,
      config,
      resourceName!,
      validated.treatmentFinalUrl,
      cap3.capability
    );

    if (applyRes.verified || applyRes.alreadyApplied) {
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
          variationConfig: variationProof,
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
    } else {
      const msg = redactSensitive(applyRes.warnings?.[0] || 'Falha na verificação de finalUrls após mutação');
      await prismaClient.googleAdsExperiment.update({
        where: { id: experiment.id },
        data: { lastError: msg },
      });
      throw { status: 502, message: msg };
    }
  } catch (err: any) {
    const sanitizedMsg = redactSensitive(err.message || 'Erro ao aplicar variação no tratamento');
    await prismaClient.googleAdsExperiment.update({
      where: { id: experiment.id },
      data: { lastError: sanitizedMsg },
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

    // Point 6: Snapshot idempotente com bucket UTC meia-noite
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

    return {
      success: true,
      experimentId: id,
      status: targetLocalStatus,
      remoteStatusRaw: reportRes.status,
      lastSyncedAt: now.toISOString(),
      changed,
      warnings: isErrorState ? [`Status remoto não mapeado: ${reportRes.status}`] : [],
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
