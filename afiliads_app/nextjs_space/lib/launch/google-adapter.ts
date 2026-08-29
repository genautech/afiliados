// Canal Google Ads do Painel de Lançamento.
//
// Este arquivo é a ÚNICA implementação do caminho de criação no Google. A rota
// /api/google-ads/create delega para cá, e o orquestrador multicanal também —
// assim readiness, guard de mutação, checagem de brand bidding e persistência
// nunca divergem entre os dois pontos de entrada.

import { prisma } from '@/lib/prisma';
import { createGoogleCampaign, getGoogleAdsConfig, isMockMode, mutateGoogleCampaign } from '@/lib/google-ads';
import { generateRsaCopy } from '@/lib/rsa';
import { checkGoogleAdsReadiness } from '@/lib/google-ads/readiness';
import { assertMutationAllowed } from '@/lib/google-ads/mutation-guard';
import {
  ChannelAdapter, ChannelCompensation, ChannelContext, ChannelCreateResult,
  ChannelLaunchError, ChannelPreflight,
} from './types';

function readinessDeps() {
  return {
    findCampaign: async (id: string, uid: string) =>
      prisma.campaign.findFirst({ where: { id, userId: uid }, include: { keywords: true } }),
    findChecklists: async (cid: string) =>
      prisma.campaignChecklist.findMany({ where: { campaignId: cid, step: { not: 9 } } }),
    getAdsConfig: async (uid: string) => getGoogleAdsConfig(uid),
    findProduct: async (pid: string) => prisma.productResearch.findUnique({ where: { id: pid } }),
  };
}

async function preflight(ctx: ChannelContext): Promise<ChannelPreflight> {
  const config = await getGoogleAdsConfig(ctx.userId);
  if (!config) {
    return {
      ready: false, mode: 'MOCK', warnings: [],
      errors: ['Configuração do Google Ads não encontrada. Conecte a conta em /configuracoes.'],
    };
  }
  const mode = ctx.forceMock || isMockMode(config) ? 'MOCK' : 'LIVE';

  const readiness = await checkGoogleAdsReadiness(ctx.campaignId, ctx.userId, 'PREPARE', readinessDeps());
  if (!readiness.ready) {
    return { ready: false, mode, errors: readiness.errors, warnings: readiness.warnings ?? [] };
  }

  // O guard é consultado no preflight para o operador ver o bloqueio ANTES de
  // apertar o botão, não depois de metade do lançamento ter acontecido.
  const mutation = assertMutationAllowed({
    operation: 'createGoogleCampaign',
    customerId: config.customerId,
    isMock: mode === 'MOCK',
    confirmed: true,
  });
  if (!mutation.allowed) {
    return { ready: false, mode, errors: [`Mutação bloqueada pelo guard: ${mutation.reason}`], warnings: readiness.warnings ?? [] };
  }

  return { ready: true, mode, errors: [], warnings: readiness.warnings ?? [] };
}

async function create(ctx: ChannelContext): Promise<ChannelCreateResult> {
  const campaign = await prisma.campaign.findFirst({
    where: { id: ctx.campaignId, userId: ctx.userId },
    include: { keywords: true },
  });
  if (!campaign) throw new ChannelLaunchError('Campanha não encontrada', 'NOT_FOUND');

  // Um ID remoto persistido significa que a fronteira de criação já foi
  // cruzada. Retry e cliente velho nunca podem criar uma segunda campanha.
  if (campaign.googleCampaignId) {
    return {
      externalIds: {
        campaignId: campaign.googleCampaignId,
        ...(campaign.googleAdGroupId ? { adGroupId: campaign.googleAdGroupId } : {}),
      },
      mode: campaign.googleCampaignId.startsWith('MOCK-') ? 'MOCK' : 'LIVE',
      alreadyExisted: true,
      logs: [`Campanha já existia no Google Ads (${campaign.googleCampaignId}); nada foi criado.`],
    };
  }

  const config = await getGoogleAdsConfig(ctx.userId);
  if (!config) throw new ChannelLaunchError('Configuração do Google Ads não encontrada', 'NO_CONFIG');
  const mock = ctx.forceMock || isMockMode(config);

  const mutation = assertMutationAllowed({
    operation: 'createGoogleCampaign',
    customerId: config.customerId,
    isMock: mock,
    confirmed: ctx.confirmed,
  });
  if (!mutation.allowed) throw new ChannelLaunchError(`Mutação bloqueada pelo guard: ${mutation.reason}`, 'GUARD_DENIED');

  const readiness = await checkGoogleAdsReadiness(ctx.campaignId, ctx.userId, 'PREPARE', readinessDeps());
  if (!readiness.ready || !readiness.data) {
    throw new ChannelLaunchError(readiness.errors[0] ?? 'Campanha não está pronta para lançar', 'NOT_READY');
  }
  const { finalUrl, forbiddenTerms, selectedKeywords, campaignName, budgetDaily } = readiness.data;

  let headlines = ctx.overrides?.headlines;
  let descriptions = ctx.overrides?.descriptions;
  if (!headlines?.length || !descriptions?.length) {
    const rsa = await generateRsaCopy(ctx.userId, {
      campaignId: ctx.campaignId,
      keyword: selectedKeywords[0].keyword,
      vertical: campaign.vertical,
      forbiddenTerms,
    });
    headlines = rsa.titles;
    descriptions = rsa.descriptions;
  }
  if (!headlines?.length || !descriptions?.length) {
    throw new ChannelLaunchError('Não foi possível gerar os anúncios (RSA). Gere em /rsa e reenvie.', 'NO_COPY');
  }

  if (forbiddenTerms.length) {
    const bad = [...headlines, ...descriptions].filter(s =>
      forbiddenTerms.some(t => s.toLowerCase().includes(t.toLowerCase())));
    if (bad.length) {
      throw new ChannelLaunchError(
        `Brand bidding proibido pelo vendor: o copy usa termo proibido (${forbiddenTerms.join('/')}). Trechos: ${bad.join(' | ')}.`,
        'FORBIDDEN_TERM',
      );
    }
  }

  const result = await createGoogleCampaign(ctx.userId, {
    name: campaignName,
    budgetDaily,
    geo: campaign.geo,
    finalUrl,
    keywords: selectedKeywords.map(k => ({
      text: k.keyword,
      matchType: (k.matchType || 'phrase').toUpperCase() as 'EXACT' | 'PHRASE' | 'BROAD',
    })),
    headlines,
    descriptions,
    forceMock: ctx.forceMock,
  }, mutation.capability);

  if (!result.success || !result.googleCampaignId) {
    throw new ChannelLaunchError(
      `Google Ads não devolveu ID de campanha. Logs: ${result.logs.join(' | ')}`,
      'NO_REMOTE_ID',
    );
  }

  await prisma.campaign.update({
    where: { id: ctx.campaignId },
    data: {
      googleCampaignId: result.googleCampaignId,
      googleAdGroupId: result.googleAdGroupId,
      googleCampaignName: campaignName,
      budgetDaily,
    },
  });

  await prisma.campaignDecision.create({
    data: {
      campaignId: ctx.campaignId,
      userId: ctx.userId,
      decision: result.mock ? 'GADS_CREATE_MOCK' : 'GADS_CREATE',
      rationale: result.logs.join(' | '),
    },
  });

  return {
    externalIds: {
      campaignId: result.googleCampaignId,
      ...(result.googleAdGroupId ? { adGroupId: result.googleAdGroupId } : {}),
    },
    mode: result.mock ? 'MOCK' : 'LIVE',
    logs: [...result.logs, ...(readiness.warnings ?? []).map(w => `Aviso: ${w}`)],
  };
}

// A campanha nasce PAUSED, então compensar aqui é confirmar a pausa —
// não existe "deletar campanha" no caminho suportado, e apagar recurso
// remoto por conta própria seria pior que deixar pausado e visível.
async function compensate(ctx: ChannelContext, externalIds: Record<string, string>): Promise<ChannelCompensation> {
  const remoteId = externalIds?.campaignId;
  if (!remoteId) return { ok: true, logs: ['Nada a compensar: nenhum ID remoto registrado.'] };
  try {
    const r = await mutateGoogleCampaign(ctx.userId, remoteId, { status: 'PAUSED' });
    return { ok: r.success, logs: [r.log] };
  } catch (err: any) {
    return { ok: false, logs: [`Falha ao pausar ${remoteId}: ${err?.message ?? err}`] };
  }
}

export const googleAdsAdapter: ChannelAdapter = {
  channel: 'GOOGLE_ADS',
  label: 'Google Ads',
  preflight,
  create,
  compensate,
};
