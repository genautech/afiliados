import { prisma } from '@/lib/prisma';
import { getGoogleAdsConfig, isMockMode, mutateGoogleCampaign, fetchGoogleCampaignStatus } from '@/lib/google-ads';
import { assertMutationAllowed } from './mutation-guard';
import { PENDING_PAUSE } from '@/lib/campaign-status';

/**
 * Grava a pendência sem mascarar o erro original: decisão auditável + status intermediário.
 * `updateMany` com filtro de status evita rebaixar uma campanha que já está pausada/arquivada.
 */
async function registrarPendenciaDePausa(
  userId: string,
  campaignId: string,
  target: 'KILL' | 'PAUSADO',
  googleCampaignId: string,
  motivo: string,
) {
  try {
    await prisma.campaignDecision.create({
      data: {
        userId,
        campaignId,
        decision: 'AUTO_PAUSE_FAILED',
        rationale: JSON.stringify({ target, googleCampaignId, error: motivo }),
      },
    });
    await prisma.campaign.updateMany({
      where: { id: campaignId, userId, status: { notIn: [target, PENDING_PAUSE, 'ARQUIVADA', 'CONCLUIDA'] } },
      data: { status: PENDING_PAUSE },
    });
  } catch (persistError) {
    console.error('[loop-pause] falha ao registrar pendência de pausa:', persistError);
  }
}

export async function confirmLoopPause(userId: string, campaign: { id: string; googleCampaignId: string | null; loopEnabled: boolean; metaCampaignId?: string | null }, target: 'KILL' | 'PAUSADO') {
  if (!campaign.loopEnabled) throw new Error('Pausa automática exige loop habilitado; decisão permanece como recomendação');
  if (!campaign.googleCampaignId || !/^\d+$/.test(campaign.googleCampaignId)) throw new Error('Pausa sem ID Google Ads confirmado; reconciliação manual necessária');
  if (campaign.metaCampaignId) throw new Error('Pausa multicanal exige reconciliação Meta; estado local não foi confirmado');
  const config = await getGoogleAdsConfig(userId);
  if (!config || isMockMode(config)) throw new Error('Pausa real exige integração Google Ads real');
  const googleCampaignId = campaign.googleCampaignId;
  const rationale = JSON.stringify({ target, googleCampaignId });
  await prisma.campaignDecision.create({ data: { userId, campaignId: campaign.id, decision: 'AUTO_PAUSE_PENDING', rationale } });

  // A01: a partir daqui existe intenção registrada. Qualquer falha vira pendência explícita
  // (AUTO_PAUSE_FAILED + PENDING_PAUSE) em vez de sumir num status local otimista.
  try {
    let status = await fetchGoogleCampaignStatus(userId, googleCampaignId);
    if (status !== 'PAUSED' && status !== 'REMOVED') {
      const permission = assertMutationAllowed({ operation: 'mutateGoogleCampaign.status', customerId: config.customerId, isMock: false, confirmed: campaign.loopEnabled });
      if (!permission.allowed) throw new Error(`Pausa bloqueada: ${permission.reason}`);
      const result = await mutateGoogleCampaign(userId, googleCampaignId, { status: 'PAUSED' }, { status: permission.capability });
      if (!result.success) throw new Error('Google Ads não confirmou o pedido de pausa');
      status = await fetchGoogleCampaignStatus(userId, googleCampaignId);
    }
    if (status !== 'PAUSED' && status !== 'REMOVED') throw new Error('Pausa enviada mas ainda não confirmada remotamente');
  } catch (error) {
    const motivo = error instanceof Error ? error.message : 'Falha ao confirmar pausa no Google Ads';
    await registrarPendenciaDePausa(userId, campaign.id, target, googleCampaignId, motivo);
    throw error;
  }

  await prisma.$transaction(async tx => {
    await tx.campaign.update({ where: { id: campaign.id, userId }, data: { status: target, lastLoopRunAt: new Date() } });
    await tx.campaignDecision.create({ data: { userId, campaignId: campaign.id, decision: 'AUTO_PAUSE_CONFIRMED', rationale } });
  });
}
