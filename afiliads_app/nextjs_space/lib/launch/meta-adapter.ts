// Canal Meta Ads do Painel de Lançamento.
//
// Paridade com o Google: mesmo contrato, mesmo guard default-deny, criação
// sempre PAUSED, compensação por pausa. A diferença honesta é que o caminho
// LIVE do Meta ainda não foi executado contra a API real (não há credencial
// conectada), então ele nasce fechado pelo guard e o painel roda em MOCK.

import { prisma } from '@/lib/prisma';
import { getMetaAdsCredentials, isMetaMockMode } from '@/lib/meta-ads/config';
import { assertMetaMutationAllowed } from '@/lib/meta-ads/mutation-guard';
import { createMetaAd, createMetaAdSet, createMetaCampaign, pauseMetaObject } from '@/lib/meta-ads/client';
import { generateRsaCopy } from '@/lib/rsa';
import {
  ChannelAdapter, ChannelCompensation, ChannelContext, ChannelCreateResult,
  ChannelLaunchError, ChannelPreflight,
} from './types';

/** O catálogo usa UK; a Marketing API exige ISO 3166-1 alpha-2. */
function toIsoCountry(geo: string): string {
  const g = (geo || '').trim().toUpperCase();
  if (g === 'UK') return 'GB';
  return g;
}

async function loadCampaign(ctx: ChannelContext) {
  const campaign = await prisma.campaign.findFirst({
    where: { id: ctx.campaignId, userId: ctx.userId },
    include: { keywords: true },
  });
  if (!campaign) throw new ChannelLaunchError('Campanha não encontrada', 'NOT_FOUND');
  return campaign;
}

async function preflight(ctx: ChannelContext): Promise<ChannelPreflight> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const campaign = await prisma.campaign.findFirst({ where: { id: ctx.campaignId, userId: ctx.userId } });
  if (!campaign) return { ready: false, mode: 'MOCK', errors: ['Campanha não encontrada'], warnings };

  const finalUrl = campaign.presellUrl || campaign.offerUrl || '';
  if (!finalUrl) errors.push('Sem URL de destino: preencha a presell ou a página da oferta.');
  else {
    try {
      const parsed = new URL(finalUrl);
      if (parsed.protocol !== 'https:') errors.push(`URL de destino precisa ser HTTPS (recebido: ${parsed.protocol}//).`);
    } catch { errors.push(`URL de destino inválida: ${finalUrl}`); }
  }
  if (!campaign.budgetDaily || campaign.budgetDaily <= 0) errors.push('Orçamento diário não definido.');
  if (!campaign.geo) errors.push('Geo não definido.');

  const check = await getMetaAdsCredentials(ctx.userId);
  const mock = ctx.forceMock || isMetaMockMode(check);
  if (mock) {
    warnings.push(
      check.credentials === null
        ? `Meta em modo simulado: falta ${check.missing.join(', ')} em /configuracoes.`
        : 'Meta em modo simulado por META_MOCK_MODE=true.',
    );
  } else {
    if (!check.credentials?.pixelId) errors.push('Sem pixel_id: o ad set não teria evento de conversão para otimizar.');
    if (!check.credentials?.pageId) errors.push('Sem page_id: o anúncio não teria página publicadora.');
    const guard = assertMetaMutationAllowed({
      operation: 'createMetaCampaign',
      adAccountId: check.credentials!.adAccountId,
      isMock: false,
      confirmed: true,
    });
    if (!guard.allowed) errors.push(`Mutação bloqueada pelo guard: ${guard.reason}`);
  }

  return { ready: errors.length === 0, mode: mock ? 'MOCK' : 'LIVE', errors, warnings };
}

async function create(ctx: ChannelContext): Promise<ChannelCreateResult> {
  const campaign = await loadCampaign(ctx);

  // Mesma trava do Google: ID remoto persistido = fronteira já cruzada.
  if (campaign.metaCampaignId) {
    return {
      externalIds: {
        campaignId: campaign.metaCampaignId,
        ...(campaign.metaAdSetId ? { adSetId: campaign.metaAdSetId } : {}),
        ...(campaign.metaAdId ? { adId: campaign.metaAdId } : {}),
      },
      mode: campaign.metaCampaignId.startsWith('MOCK-') ? 'MOCK' : 'LIVE',
      alreadyExisted: true,
      logs: [`Campanha já existia no Meta (${campaign.metaCampaignId}); nada foi criado.`],
    };
  }

  const pre = await preflight(ctx);
  if (!pre.ready) throw new ChannelLaunchError(pre.errors[0] ?? 'Meta não está pronto para lançar', 'NOT_READY');

  const name = campaign.googleCampaignName || campaign.name || `Campanha ${campaign.id.slice(0, 6)}`;
  const finalUrl = campaign.presellUrl || campaign.offerUrl || '';
  const logs: string[] = [...pre.warnings.map(w => `Aviso: ${w}`)];

  if (pre.mode === 'MOCK') {
    const stamp = Date.now();
    const ids = {
      campaignId: `MOCK-META-CAMP-${stamp}`,
      adSetId: `MOCK-META-ADSET-${stamp}`,
      adId: `MOCK-META-AD-${stamp}`,
    };
    logs.push(`[Simulação] Campanha "${name}" criada como PAUSED no Meta.`);
    logs.push('[Simulação] Ad set e anúncio criados como PAUSED.');
    await persistIds(ctx, ids, true, logs);
    return { externalIds: ids, mode: 'MOCK', logs };
  }

  const { credentials } = await getMetaAdsCredentials(ctx.userId);
  if (!credentials) throw new ChannelLaunchError('Credenciais do Meta ausentes', 'NO_CONFIG');

  const guard = assertMetaMutationAllowed({
    operation: 'createMetaCampaign',
    adAccountId: credentials.adAccountId,
    isMock: false,
    confirmed: ctx.confirmed,
  });
  if (!guard.allowed) throw new ChannelLaunchError(`Mutação bloqueada pelo guard: ${guard.reason}`, 'GUARD_DENIED');

  let headline = ctx.overrides?.headlines?.[0];
  let description = ctx.overrides?.descriptions?.[0];
  let rsaWarnings: string[] = [];
  if (!headline || !description) {
    const keyword = campaign.keywords?.[0]?.keyword ?? campaign.vertical ?? name;
    const rsa = await generateRsaCopy(ctx.userId, {
      campaignId: ctx.campaignId, keyword, vertical: campaign.vertical, forbiddenTerms: [],
    });
    headline = headline || rsa.titles?.[0];
    description = description || rsa.descriptions?.[0];
    rsaWarnings = rsa.warnings ?? [];
  }
  if (!headline || !description) {
    const motivo = rsaWarnings.length ? ` Motivo: ${rsaWarnings.join(' | ')}` : '';
    throw new ChannelLaunchError(`Sem copy para o anúncio do Meta.${motivo}`, 'NO_COPY');
  }

  // Criação em três passos. Cada ID é persistido assim que existe, para que
  // uma falha no passo seguinte deixe rastro compensável em vez de órfão.
  const ids: Record<string, string> = {};
  try {
    const camp = await createMetaCampaign(credentials, { name });
    ids.campaignId = camp.id;
    logs.push(`Campanha "${name}" criada como PAUSED no Meta (${camp.id}).`);
    await persistIds(ctx, ids, false, logs);

    const adset = await createMetaAdSet(credentials, {
      name: `${name} — ad set`,
      campaignId: camp.id,
      dailyBudgetCents: Math.round((campaign.budgetDaily ?? 0) * 100),
      geo: toIsoCountry(campaign.geo),
      pixelId: credentials.pixelId!,
    });
    ids.adSetId = adset.id;
    logs.push(`Ad set criado como PAUSED (${adset.id}).`);
    await persistIds(ctx, ids, false, logs);

    const ad = await createMetaAd(credentials, {
      name: `${name} — anúncio`,
      adSetId: adset.id,
      pageId: credentials.pageId!,
      finalUrl, headline, description,
    });
    ids.adId = ad.id;
    logs.push(`Anúncio criado como PAUSED (${ad.id}).`);
    await persistIds(ctx, ids, false, logs);
  } catch (err: any) {
    const partial = Object.keys(ids).length
      ? ` Recursos já criados e pausados: ${JSON.stringify(ids)}.`
      : '';
    throw new ChannelLaunchError(`${err?.message ?? err}${partial}`, 'META_API');
  }

  return { externalIds: ids, mode: 'LIVE', logs };
}

async function persistIds(ctx: ChannelContext, ids: Record<string, string>, mock: boolean, logs: string[]) {
  await prisma.campaign.update({
    where: { id: ctx.campaignId },
    data: {
      metaCampaignId: ids.campaignId ?? null,
      metaAdSetId: ids.adSetId ?? null,
      metaAdId: ids.adId ?? null,
    },
  });
  if (ids.adId || mock) {
    await prisma.campaignDecision.create({
      data: {
        campaignId: ctx.campaignId,
        userId: ctx.userId,
        decision: mock ? 'META_CREATE_MOCK' : 'META_CREATE',
        rationale: logs.join(' | '),
      },
    });
  }
}

async function compensate(ctx: ChannelContext, externalIds: Record<string, string>): Promise<ChannelCompensation> {
  const targets = [externalIds?.adId, externalIds?.adSetId, externalIds?.campaignId].filter(Boolean) as string[];
  if (!targets.length) return { ok: true, logs: ['Nada a compensar: nenhum ID remoto registrado.'] };

  if (targets.every(t => t.startsWith('MOCK-'))) {
    return { ok: true, logs: [`[Simulação] ${targets.length} recurso(s) marcados como pausados.`] };
  }

  const { credentials } = await getMetaAdsCredentials(ctx.userId);
  if (!credentials) return { ok: false, logs: ['Sem credencial do Meta para pausar os recursos remotos.'] };

  const guard = assertMetaMutationAllowed({
    operation: 'pauseMetaCampaign',
    adAccountId: credentials.adAccountId,
    isMock: false,
    confirmed: true,
  });
  if (!guard.allowed) return { ok: false, logs: [`Guard bloqueou a compensação: ${guard.reason}`] };

  const logs: string[] = [];
  let ok = true;
  for (const id of targets) {
    try { await pauseMetaObject(credentials, id); logs.push(`Pausado: ${id}`); }
    catch (err: any) { ok = false; logs.push(`Falha ao pausar ${id}: ${err?.message ?? err}`); }
  }
  return { ok, logs };
}

export const metaAdsAdapter: ChannelAdapter = {
  channel: 'META_ADS',
  label: 'Meta Ads',
  preflight,
  create,
  compensate,
};
