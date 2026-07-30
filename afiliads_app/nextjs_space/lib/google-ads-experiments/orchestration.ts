import { prisma } from '../prisma';
import { checkGoogleAdsReadiness } from '../google-ads/readiness';
import { authorizeMutation, type AuthorizationContext } from '../google-ads/route-mutation-authorization';
import { getGoogleAdsConfig } from '../google-ads';
import { getAccessToken, isMockMode } from '../google-ads/client';
import { assertMutationAllowed } from '../google-ads/mutation-guard';
import { createExperiment, createExperimentArms, applyFinalUrlVariation, listExperimentAsyncErrors } from '../google-ads/experiments';
import { fetchExperimentReport, buildMetricSnapshotUpsertInput, upsertMetricSnapshot } from '../google-ads/experiment-reporting';
import { mapGoogleExperimentRemoteStatus } from './types';
import { SetupExperimentPayloadSchema } from './schemas';

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
    lastError: exp.lastError ?? null,
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
      errorMessage: op.errorMessage ?? null,
      errors: op.errors ?? null,
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

export async function setupExperiment({ userId, payload, deps }: SetupExperimentInput) {
  // 1. Schema Validation (Strict)
  const parseResult = SetupExperimentPayloadSchema.safeParse(payload);
  if (!parseResult.success) {
    const errorMsg = parseResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
    throw { status: 400, message: `Payload inválido: ${errorMsg}` };
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
    throw { status: 422, message: readiness.errors?.[0] || 'Readiness falhou' };
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
    throw { status: 400, message: err.message || 'Falha de autorização da mutação' };
  }

  // 5. Short DB Step: Local Reservation & Idempotency Check
  let experiment = await prismaClient.googleAdsExperiment.findUnique({
    where: { userId_idempotencyKey: { userId, idempotencyKey: authContext.idempotencyKey } },
    include: { arms: { orderBy: { isControl: 'desc' } } },
  });

  if (experiment) {
    // Canonical payload consistency check
    if (experiment.campaignId !== validated.campaignId) {
      throw { status: 409, message: 'Conflito de idempotência: campaignId divergente' };
    }
    const treatmentArm = experiment.arms.find((a: any) => !a.isControl);
    if (treatmentArm && treatmentArm.localPresellId) {
      if (treatmentArm.localPresellId !== validated.presellId) {
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

  // 6. Fast return if setup is already fully completed and verified
  const arms = experiment.arms || [];
  const treatmentArm = arms.find((a: any) => !a.isControl);
  if (
    experiment.resourceName &&
    arms.length === 2 &&
    treatmentArm &&
    treatmentArm.finalUrl === validated.treatmentFinalUrl &&
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

  if (!cap1.allowed) throw { status: 502, message: `Mutação bloqueada (createExperiment): ${cap1.reason}` };
  if (!cap2.allowed) throw { status: 502, message: `Mutação bloqueada (createExperimentArms): ${cap2.reason}` };
  if (!cap3.allowed) throw { status: 502, message: `Mutação bloqueada (updateAdFinalUrls): ${cap3.reason}` };

  // 9. Pipeline Step-by-Step Execution with Resumption Checkpoints

  // Checkpoint Step A: Remote Experiment Resource Creation
  let resourceName = experiment.resourceName;
  let googleExperimentId = experiment.googleExperimentId;

  if (!resourceName) {
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
      const sanitizedMsg = err.message || 'Erro na criação remota do experimento';
      await prismaClient.googleAdsExperiment.update({
        where: { id: experiment.id },
        data: { lastError: sanitizedMsg },
      }).catch(() => {});
      throw { status: 502, message: sanitizedMsg };
    }
  }

  // Checkpoint Step B: Remote Arms Creation (control + treatment in single request)
  let armsRes = experiment.arms || [];
  if (armsRes.length === 0) {
    try {
      const callCreateExperimentArms = deps?.createExperimentArms ?? createExperimentArms;
      const controlFinalUrl = readiness.data?.finalUrl || 'https://example.com';
      const splitTreatment = validated.trafficSplitTreatment || 50;

      const createdArms = await callCreateExperimentArms(
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
    } catch (err: any) {
      const sanitizedMsg = err.message || 'Erro na criação dos braços do experimento';
      await prismaClient.googleAdsExperiment.update({
        where: { id: experiment.id },
        data: { lastError: sanitizedMsg },
      }).catch(() => {});
      throw { status: 502, message: sanitizedMsg };
    }
  }

  // Checkpoint Step C: Treatment Variation Application & Remote Verification
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
      await prismaClient.googleAdsExperimentArm.update({
        where: { id: tArm.id },
        data: { finalUrl: validated.treatmentFinalUrl },
      });
      experiment = await prismaClient.googleAdsExperiment.update({
        where: { id: experiment.id },
        data: { lastError: null },
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
      const msg = applyRes.warnings?.[0] || 'Falha na verificação de finalUrls após mutação';
      await prismaClient.googleAdsExperiment.update({
        where: { id: experiment.id },
        data: { lastError: msg },
      });
      throw { status: 502, message: msg };
    }
  } catch (err: any) {
    const sanitizedMsg = err.message || 'Erro ao aplicar variação no tratamento';
    await prismaClient.googleAdsExperiment.update({
      where: { id: experiment.id },
      data: { lastError: sanitizedMsg },
    }).catch(() => {});
    throw { status: 502, message: sanitizedMsg };
  }
}

export async function getExperimentDetail(id: string, userId: string, deps?: any) {
  const prismaClient = deps?.prisma ?? prisma;
  const exp = await prismaClient.googleAdsExperiment.findUnique({
    where: { id },
    include: {
      arms: { orderBy: { isControl: 'desc' } },
      operations: { orderBy: { startedAt: 'desc' }, take: 1 },
      metricSnapshots: { orderBy: { snapshotDate: 'desc' }, take: 1 },
    },
  });

  if (!exp || exp.userId !== userId) {
    throw { status: 404, message: 'Experimento não encontrado' };
  }

  return toExperimentDetailDTO(exp);
}

export async function syncExperiment(id: string, userId: string, deps?: any) {
  const prismaClient = deps?.prisma ?? prisma;
  const exp = await prismaClient.googleAdsExperiment.findUnique({
    where: { id },
    include: { arms: { orderBy: { isControl: 'desc' } } },
  });

  if (!exp || exp.userId !== userId) {
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
    const callFetchExperimentReport = deps?.fetchExperimentReport ?? fetchExperimentReport;
    const reportRes = await callFetchExperimentReport(token, config, exp.resourceName, { targetClicks: 100 });

    const mappedRemoteStatus = mapGoogleExperimentRemoteStatus(reportRes.status);
    let targetLocalStatus = mappedRemoteStatus.local;
    let isErrorState = false;

    if (reportRes.status === 'UNKNOWN' || reportRes.status === 'UNSPECIFIED' || targetLocalStatus === 'ERROR') {
      targetLocalStatus = 'ERROR';
      isErrorState = true;
    }

    let lastErrorMsg: string | null = isErrorState ? `Status remoto desconhecido (${reportRes.status})` : null;
    if (deps?.listExperimentAsyncErrors || !isMock) {
      const callListErrors = deps?.listExperimentAsyncErrors ?? listExperimentAsyncErrors;
      try {
        const asyncErrorsRes = await callListErrors(token, config, exp.resourceName);
        if (asyncErrorsRes?.errors?.length > 0) {
          lastErrorMsg = asyncErrorsRes.errors[0];
        }
      } catch {
        // Ignored if list error lookup fails
      }
    }

    const now = new Date();
    const utcMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const upsertInput = buildMetricSnapshotUpsertInput(id, utcMidnight, reportRes, null);

    if (upsertInput) {
      const callUpsertMetricSnapshot = deps?.upsertMetricSnapshot ?? upsertMetricSnapshot;
      await callUpsertMetricSnapshot(prismaClient as any, upsertInput);
    }

    const changed = exp.status !== targetLocalStatus;

    await prismaClient.googleAdsExperiment.update({
      where: { id },
      data: {
        status: targetLocalStatus,
        lastSyncedAt: now,
        lastError: lastErrorMsg,
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
    const sanitizedMsg = err.message || 'Erro ao sincronizar experimento com Google Ads';
    await prismaClient.googleAdsExperiment.update({
      where: { id },
      data: { lastError: sanitizedMsg },
    }).catch(() => {});
    throw { status: 502, message: sanitizedMsg };
  }
}
