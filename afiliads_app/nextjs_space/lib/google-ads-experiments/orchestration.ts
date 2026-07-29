import { prisma } from '../prisma';
import { checkGoogleAdsReadiness } from '../google-ads/readiness';
import { authorizeMutation } from '../google-ads/route-mutation-authorization';
import { getGoogleAdsConfig } from '../google-ads';
import { assertMutationAllowed } from '../google-ads/mutation-guard';
import { createExperiment, createExperimentArms, applyFinalUrlVariation } from '../google-ads/experiments';
import { fetchExperimentReport, buildMetricSnapshotUpsertInput, upsertMetricSnapshot } from '../google-ads/experiment-reporting';
import { pollExperimentOperation, listExperimentAsyncErrors } from '../google-ads/experiments';
import { mapGoogleExperimentRemoteStatus } from './types';

export interface SetupExperimentInput {
  userId: string;
  payload: any;
  deps?: any;
}

export async function setupExperiment({ userId, payload, deps }: SetupExperimentInput) {
  const findCampaign = deps?.findCampaign ?? ((id: string, uid: string) => prisma.campaign.findFirst({ where: { id, userId: uid } }));
  const findPresell = deps?.findPresell ?? ((id: string, uid: string) => prisma.presell.findFirst({ where: { id, userId: uid } }));
  
  if (!payload || typeof payload !== 'object') {
    throw { status: 400, message: 'Payload inválido' };
  }

  // 1. auth/ownership/schema
  const authPayload = payload.authorization;
  if (!authPayload) {
    throw { status: 400, message: 'Falta objeto authorization no payload' };
  }

  const campaignId = payload.campaignId;
  const presellId = payload.presellId;
  const treatmentFinalUrl = payload.treatmentFinalUrl;
  
  if (!campaignId || !presellId || !treatmentFinalUrl) {
    throw { status: 400, message: 'campaignId, presellId e treatmentFinalUrl são obrigatórios' };
  }

  const campaign = await findCampaign(campaignId, userId);
  if (!campaign) throw { status: 404, message: 'Campanha não encontrada' };
  
  const presell = await findPresell(presellId, userId);
  if (!presell) throw { status: 404, message: 'Presell não encontrada' };
  if (presell.campaignId !== campaignId) throw { status: 400, message: 'Presell não pertence à campanha' };
  
  if (!campaign.googleCampaignId) throw { status: 422, message: 'googleCampaignId não persistido' };

  // 2. readiness PREPARE
  const readinessDeps = deps?.readinessDeps;
  const checkReadiness = deps?.checkReadiness ?? checkGoogleAdsReadiness;
  const readiness = await checkReadiness(campaignId, userId, 'PREPARE', readinessDeps);
  if (!readiness.ready) throw { status: 422, message: readiness.errors?.[0] || 'Readiness falhou' };

  // 3. autorização explícita + idempotência
  const authContext = authorizeMutation(
    authPayload, 
    'SETUP_EXPERIMENT', 
    campaign.id, 
    String(campaign.updatedAt.getTime()), 
    userId, 
    campaign.userId
  );

  // 4. reserva local
  let experiment = await prisma.googleAdsExperiment.findUnique({
    where: { userId_idempotencyKey: { userId, idempotencyKey: authContext.idempotencyKey } },
    include: { arms: true }
  });

  if (experiment) {
    // Mesma key, verifica payload canônico
    if (experiment.campaignId !== campaignId) throw { status: 409, message: 'Conflito de idempotência: campaignId divergente' };
    if (experiment.status !== 'SETUP') {
      return { success: true, experiment, warnings: readiness.warnings };
    }
  } else {
    // Cria rascunho
    experiment = await prisma.googleAdsExperiment.create({
      data: {
        userId,
        campaignId,
        idempotencyKey: authContext.idempotencyKey,
        name: payload.name || `EXP-${campaignId.substring(0, 5)}-${authContext.idempotencyKey.substring(0, 6)}`,
        status: 'SETUP',
        type: 'SEARCH_CUSTOM',
        variationType: 'PRESELL_URL',
        startDate: payload.startDate ? new Date(payload.startDate) : null,
        endDate: payload.endDate ? new Date(payload.endDate) : null,
        trafficAllocationType: 'SEARCH_CUSTOM',
      },
      include: { arms: true }
    });
  }

  // Se já tem arms e variation verificada
  const arms = experiment.arms || [];
  const treatmentArm = arms.find(a => !a.isControl);
  if (treatmentArm && treatmentArm.finalUrl === treatmentFinalUrl) {
    // verified
    return { success: true, experiment, warnings: readiness.warnings, mock: deps?.isMock };
  }

  // 5. obter config/token somente depois dos gates
  const getAdsConfig = deps?.getAdsConfig ?? getGoogleAdsConfig;
  const config = await getAdsConfig(userId);
  if (!config) throw { status: 400, message: 'Google Ads config não encontrada' };
  
  const token = 'token-from-db-or-session'; // in actual implementation token is fetched securely or mocked
  const isMock = deps?.isMock ?? false;

  const callAssertMutationAllowed = deps?.assertMutationAllowed ?? assertMutationAllowed;
  const cap1 = callAssertMutationAllowed({ operation: 'createExperiment', customerId: config.customerId, isMock, confirmed: true });
  const cap2 = callAssertMutationAllowed({ operation: 'createExperimentArms', customerId: config.customerId, isMock, confirmed: true });
  const cap3 = callAssertMutationAllowed({ operation: 'updateAdFinalUrls', customerId: config.customerId, isMock, confirmed: true });

  if (!cap1.allowed || !cap2.allowed || !cap3.allowed) throw { status: 502, message: 'Mutação bloqueada' };

  try {
    let googleExperimentId = experiment.googleExperimentId;
    let resourceName = experiment.resourceName;

    // 6. criar/reconciliar Experiment em SETUP
    if (!resourceName) {
      const callCreateExperiment = deps?.createExperiment ?? createExperiment;
      const expRes = await callCreateExperiment(token, config, {
        customerId: config.customerId,
        campaignId: campaign.googleCampaignId,
        name: experiment.name,
        suffix: authContext.idempotencyKey.substring(0, 6),
      }, (cap1 as any).capability);
      
      googleExperimentId = expRes.googleExperimentId;
      resourceName = expRes.resourceName;
      
      experiment = await prisma.googleAdsExperiment.update({
        where: { id: experiment.id },
        data: { googleExperimentId, resourceName },
        include: { arms: true }
      });
    }

    // 7. criar os dois braços na mesma mutate
    let armsRes = experiment.arms;
    if (armsRes.length === 0) {
      const callCreateExperimentArms = deps?.createExperimentArms ?? createExperimentArms;
      const createArmsRes = await callCreateExperimentArms(token, config, {
        experimentResourceName: resourceName!,
        experimentId: googleExperimentId!,
        control: { name: 'control', googleCampaignId: campaign.googleCampaignId, finalUrl: readiness.data!.finalUrl },
        treatment: { name: 'treatment', presellId, finalUrl: treatmentFinalUrl },
        trafficSplitTreatment: payload.trafficSplitTreatment || 50,
        trafficSplitControl: 100 - (payload.trafficSplitTreatment || 50)
      }, (cap2 as any).capability);

      for (const a of createArmsRes) {
        await prisma.googleAdsExperimentArm.create({
          data: {
            experimentId: experiment.id,
            name: a.name,
            isControl: a.isControl,
            trafficSplit: a.trafficSplit,
            resourceName: a.resourceName,
            inDesignCampaignResourceName: a.inDesignCampaignResourceName,
            servedCampaignResourceName: a.servedCampaignResourceName,
            googleCampaignId: a.isControl ? campaign.googleCampaignId : null,
            localPresellId: a.isControl ? null : presellId,
            finalUrl: a.isControl ? readiness.data!.finalUrl : treatmentFinalUrl,
          }
        });
      }
      
      experiment = await prisma.googleAdsExperiment.findUniqueOrThrow({ where: { id: experiment.id }, include: { arms: true } });
      armsRes = experiment.arms;
    }

    // 8 & 9. derivar tratamento por control=false e aplicar final URL
    const tArm = armsRes.find(a => !a.isControl);
    if (!tArm || !tArm.inDesignCampaignResourceName) throw { status: 502, message: 'Treatment arm incompleto' };

    const callApplyFinalUrlVariation = deps?.applyFinalUrlVariation ?? applyFinalUrlVariation;
    const applyRes = await callApplyFinalUrlVariation(token, config, resourceName!, treatmentFinalUrl, (cap3 as any).capability);

    // 10 & 11. reler/verificar e persistir
    if (applyRes.verified || applyRes.alreadyApplied) {
      return { success: true, mock: isMock, experiment, warnings: readiness.warnings, logs: ['Variação aplicada com sucesso'] };
    } else {
      await prisma.googleAdsExperiment.update({ where: { id: experiment.id }, data: { lastError: 'Falha na verificação de finalUrls' } });
      throw { status: 502, message: 'Falha na verificação de finalUrls após mutate' };
    }
  } catch (e: any) {
    await prisma.googleAdsExperiment.update({ where: { id: experiment.id }, data: { lastError: e.message || 'Erro externo' } });
    throw { status: 502, message: e.message || 'Erro de API externa sanitizada' };
  }
}

export async function getExperimentDetail(id: string, userId: string) {
  const exp = await prisma.googleAdsExperiment.findUnique({
    where: { id },
    include: { arms: { orderBy: { isControl: 'desc' } }, operations: { orderBy: { startedAt: 'desc' }, take: 1 }, metricSnapshots: { orderBy: { snapshotDate: 'desc' }, take: 1 } }
  });
  if (!exp) throw { status: 404, message: 'Experimento não encontrado' };
  if (exp.userId !== userId) throw { status: 404, message: 'Não encontrado' };

  // Exclude sourcePayload and sensitive fields from result
  const mappedSnapshots = exp.metricSnapshots.map(s => {
    const { sourcePayload, ...rest } = s as any;
    return rest;
  });

  return {
    ...exp,
    metricSnapshots: mappedSnapshots,
  };
}

export async function syncExperiment(id: string, userId: string, deps?: any) {
  const exp = await prisma.googleAdsExperiment.findUnique({ where: { id }, include: { arms: true } });
  if (!exp) throw { status: 404, message: 'Experimento não encontrado' };
  if (exp.userId !== userId) throw { status: 404, message: 'Não encontrado' };
  if (!exp.resourceName) throw { status: 422, message: 'Experimento não tem resourceName' };

  const getAdsConfig = deps?.getAdsConfig ?? getGoogleAdsConfig;
  const config = await getAdsConfig(userId);
  if (!config) throw { status: 400, message: 'Google Ads config' };
  
  const token = 'token-from-db'; // mocked or real

  try {
    const callFetchExperimentReport = deps?.fetchExperimentReport ?? fetchExperimentReport;
    const reportRes = await callFetchExperimentReport(token, config, exp.resourceName, { targetClicks: 100 });
    const upsertInput = buildMetricSnapshotUpsertInput(id, new Date(), reportRes, null);
    
    // Persist snapshot
    if (upsertInput) {
      const callUpsertMetricSnapshot = deps?.upsertMetricSnapshot ?? upsertMetricSnapshot;
      await callUpsertMetricSnapshot(prisma as any, upsertInput);
    }
    
    // check status change
    let changed = false;
    if (exp.status !== reportRes.status) {
      await prisma.googleAdsExperiment.update({ where: { id }, data: { status: reportRes.status, lastSyncedAt: new Date() } });
      changed = true;
    } else {
      await prisma.googleAdsExperiment.update({ where: { id }, data: { lastSyncedAt: new Date() } });
    }

    return { success: true, experimentId: id, status: reportRes.status, lastSyncedAt: new Date().toISOString(), changed, warnings: [] };
  } catch (e: any) {
    await prisma.googleAdsExperiment.update({ where: { id }, data: { lastError: e.message } });
    throw { status: 502, message: e.message || 'Erro no sync com Google Ads' };
  }
}
