import { prisma } from '@/lib/prisma';
import { getGoogleAdsConfig, isMockMode, fetchGoogleCampaignStatus } from '@/lib/google-ads';
import { PENDING_LAUNCH, PENDING_PAUSE, isPendingStatus } from '@/lib/campaign-status';

export interface CampanhaReconciliavel {
  id: string;
  status: string;
  googleCampaignId: string | null;
  metaCampaignId?: string | null;
  loopEnabled?: boolean;
}

export interface ResultadoReconciliacao {
  status: string;
  loopEnabled?: boolean;
  reconciliado: boolean;
  motivo: string;
}

/**
 * A01/A02: fecha o ciclo do estado pendente. Quem escreve PENDING_LAUNCH/PENDING_PAUSE
 * (orquestrador de lançamento, push de sync, pausa do loop) não conseguiu confirmação
 * remota na hora; sem alguém relendo o Google Ads depois, a campanha ficava pendente para
 * sempre e o operador não sabia se estava queimando orçamento.
 *
 * A releitura é somente leitura: nunca reemite mutação. E só resolve o que é inequívoco —
 * PENDING_PAUSE com remoto ENABLED continua pendente de propósito, porque promover para
 * ATIVA apagaria a intenção de pausa que alguém registrou.
 */
export async function reconcileCampaignStatus(
  userId: string,
  campaign: CampanhaReconciliavel,
): Promise<ResultadoReconciliacao> {
  const inalterado = (motivo: string): ResultadoReconciliacao => ({
    status: campaign.status,
    loopEnabled: campaign.loopEnabled,
    reconciliado: false,
    motivo,
  });

  if (!isPendingStatus(campaign.status)) return inalterado('status não é pendente');
  if (campaign.metaCampaignId) return inalterado('campanha Meta: reconciliação manual');
  if (!campaign.googleCampaignId || !/^\d+$/.test(campaign.googleCampaignId)) {
    return inalterado('sem ID Google Ads numérico para reler');
  }

  const config = await getGoogleAdsConfig(userId);
  if (!config || isMockMode(config)) return inalterado('sem integração Google Ads real');

  let remoto: string;
  try {
    remoto = await fetchGoogleCampaignStatus(userId, campaign.googleCampaignId);
  } catch (e: any) {
    return inalterado(`falha ao reler status remoto: ${e?.message ?? e}`);
  }

  let destino: string | null = null;
  let desligaLoop = false;
  if (campaign.status === PENDING_LAUNCH) {
    if (remoto === 'ENABLED') destino = 'ATIVA';
    else if (remoto === 'PAUSED' || remoto === 'REMOVED') destino = 'PAUSADA';
  } else if (campaign.status === PENDING_PAUSE) {
    if (remoto === 'PAUSED' || remoto === 'REMOVED') {
      destino = 'PAUSADA';
      desligaLoop = true;
    }
  }

  if (!destino) return inalterado(`status remoto ${remoto} não resolve ${campaign.status}`);

  // updateMany com o status pendente no where: se outra rota já resolveu a pendência entre a
  // leitura remota e agora, esta escrita não sobrescreve a decisão dela.
  const data: Record<string, unknown> = { status: destino };
  if (desligaLoop) data.loopEnabled = false;
  const escrita = await prisma.campaign.updateMany({
    where: { id: campaign.id, userId, status: campaign.status },
    data,
  });
  if (escrita.count !== 1) return inalterado('pendência já resolvida por outro fluxo');

  await prisma.campaignDecision.create({
    data: {
      userId,
      campaignId: campaign.id,
      decision: 'STATUS_RECONCILED',
      rationale: JSON.stringify({ de: campaign.status, para: destino, remoto }),
    },
  });

  return {
    status: destino,
    loopEnabled: desligaLoop ? false : campaign.loopEnabled,
    reconciliado: true,
    motivo: `remoto ${remoto}`,
  };
}
