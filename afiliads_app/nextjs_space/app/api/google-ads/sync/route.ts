export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { fetchGoogleCampaign, mutateGoogleCampaign } from '@/lib/google-ads';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    const userId = (session.user as any)?.id;
    const body = await request.json();
    const { campaignId, direction = 'pull', updates } = body ?? {};

    if (!campaignId) {
      return NextResponse.json({ error: 'campaignId é obrigatório' }, { status: 400 });
    }

    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, userId },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 });
    }

    if (direction === 'pull') {
      // 1. PULL: Buscar do Google Ads e atualizar banco local
      const gadsName = campaign.googleCampaignName || campaign.name;
      const gadsData = await fetchGoogleCampaign(userId, gadsName);

      if (!gadsData) {
        return NextResponse.json({
          error: `Campanha "${gadsName}" não encontrada no Google Ads. Verifique o nome configurado.`,
        }, { status: 404 });
      }

      // Mapear status do Google Ads para a terminologia do AfiliAds
      // ENABLED -> Se estava pausada localmente, muda para EM_TESTE. Caso contrário, mantém o status atual (SCALE, etc.)
      // PAUSED -> PAUSADO e desativa o loop automático
      let localStatus = campaign.status;
      let loopEnabled = campaign.loopEnabled;

      if (gadsData.status === 'PAUSED') {
        localStatus = 'PAUSADO';
        loopEnabled = false;
      } else if (gadsData.status === 'ENABLED' && campaign.status === 'PAUSADO') {
        localStatus = 'EM_TESTE';
      }

      // Atualizar local
      const updatedCampaign = await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          googleCampaignName: gadsData.name,
          budgetDaily: gadsData.budgetDaily,
          bidStrategy: gadsData.bidStrategy,
          status: localStatus,
          loopEnabled: loopEnabled,
        },
      });

      // Gravar um log diário ou nota no banco
      await prisma.campaignDecision.create({
        data: {
          campaignId,
          userId,
          decision: 'SYNC_PULL',
          rationale: `Sincronização realizada (PULL). Dados obtidos do Google Ads: Status=${gadsData.status}, Orçamento=$${gadsData.budgetDaily.toFixed(2)}, Lance=${gadsData.bidStrategy}.`,
        },
      });

      return NextResponse.json({
        success: true,
        campaign: updatedCampaign,
        message: 'Dados importados do Google Ads com sucesso.',
      });
    } else if (direction === 'push') {
      // 2. PUSH: Enviar atualizações locais para o Google Ads
      // Precisamos identificar o ID da campanha no Google Ads.
      // Caso não tenhamos, tentamos primeiro buscar para obter o ID
      let gadsId = campaign.googleCampaignName; // Ou algum campo que identifique o ID.
      // Se não for puramente numérico, vamos fazer um Pull rápido para achar o ID no Google Ads.
      if (!gadsId || isNaN(Number(gadsId))) {
        const gadsData = await fetchGoogleCampaign(userId, campaign.googleCampaignName || campaign.name);
        if (gadsData?.googleCampaignId) {
          gadsId = gadsData.googleCampaignId;
        }
      }

      if (!gadsId || isNaN(Number(gadsId))) {
        return NextResponse.json({
          error: 'Não foi possível encontrar o ID correspondente da campanha no Google Ads. Execute um Pull primeiro.',
        }, { status: 400 });
      }

      const pushUpdates: { status?: 'ENABLED' | 'PAUSED'; budgetDaily?: number } = {};
      
      if (updates?.status === 'PAUSADO' || updates?.status === 'KILL') {
        pushUpdates.status = 'PAUSED';
      } else if (updates?.status === 'EM_TESTE' || updates?.status === 'SCALE' || updates?.status === 'ATIVO') {
        pushUpdates.status = 'ENABLED';
      }

      if (updates?.budgetDaily !== undefined && !isNaN(Number(updates.budgetDaily))) {
        pushUpdates.budgetDaily = Number(updates.budgetDaily);
      }

      if (Object.keys(pushUpdates).length === 0) {
        return NextResponse.json({ error: 'Nenhuma alteração válida para enviar.' }, { status: 400 });
      }

      const res = await mutateGoogleCampaign(userId, gadsId, pushUpdates);

      // Atualiza local se enviou com sucesso
      const updatedCampaign = await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          status: updates.status || campaign.status,
          budgetDaily: updates.budgetDaily !== undefined ? Number(updates.budgetDaily) : campaign.budgetDaily,
          loopEnabled: updates.status === 'PAUSADO' ? false : campaign.loopEnabled,
        },
      });

      // Gravar nota de decisão
      await prisma.campaignDecision.create({
        data: {
          campaignId,
          userId,
          decision: 'SYNC_PUSH',
          rationale: `Sincronização realizada (PUSH). ${res.log}.`,
        },
      });

      return NextResponse.json({
        success: true,
        campaign: updatedCampaign,
        message: `Sincronização enviada ao Google Ads: ${res.log}.`,
      });
    }

    return NextResponse.json({ error: 'Direção de sincronização inválida.' }, { status: 400 });
  } catch (err: any) {
    console.error('Google Ads Sync error:', err);
    return NextResponse.json({ error: err?.message || 'Erro interno na sincronização.' }, { status: 500 });
  }
}
