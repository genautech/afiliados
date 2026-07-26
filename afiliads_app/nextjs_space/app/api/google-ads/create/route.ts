export const dynamic = 'force-dynamic';
export const maxDuration = 90;
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createGoogleCampaign, getGoogleAdsConfig } from '@/lib/google-ads';
import { generateRsaCopy } from '@/lib/rsa';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const userId = (session.user as any)?.id;

    const body = await request.json();
    const campaignId: string | undefined = body?.campaignId;
    if (!campaignId) return NextResponse.json({ error: 'campaignId é obrigatório' }, { status: 400 });

    const campaign = await prisma.campaign.findFirst({ where: { id: campaignId, userId }, include: { keywords: true } });
    if (!campaign) return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 });

    const finalUrl = campaign.presellUrl || campaign.offerUrl || '';
    if (!finalUrl) {
      return NextResponse.json({ error: 'Configure a URL da pré-sell ou da oferta (Wizard, passo 4) antes de criar a campanha no Google Ads.' }, { status: 422 });
    }

    const config = await getGoogleAdsConfig(userId);
    if (!config) {
      return NextResponse.json({ error: 'Credenciais do Google Ads não configuradas. Vá em Configurações → Google Ads e cadastre customer_id, developer_token, client_id, client_secret e refresh_token.' }, { status: 422 });
    }

    const selectedKeywords = (campaign.keywords ?? []).filter(k => k.isSelected);
    if (selectedKeywords.length === 0) {
      return NextResponse.json({ error: 'Selecione ao menos uma keyword no Wizard (passo 5) antes de criar a campanha no Google Ads.' }, { status: 422 });
    }

    let headlines: string[] | undefined = body?.headlines;
    let descriptions: string[] | undefined = body?.descriptions;
    if (!headlines?.length || !descriptions?.length) {
      const mainKeyword = selectedKeywords[0].keyword;
      const rsa = await generateRsaCopy(userId, { keyword: mainKeyword, vertical: campaign.vertical });
      headlines = rsa.titles;
      descriptions = rsa.descriptions;
      if (!headlines?.length || !descriptions?.length) {
        return NextResponse.json({ error: 'Não foi possível gerar os anúncios (RSA) automaticamente. Gere manualmente em /rsa e reenvie titles/descriptions.' }, { status: 502 });
      }
    }

    const campaignName = campaign.campaignNameGenerated || campaign.name;
    const budgetDaily = campaign.budgetDaily > 0 ? campaign.budgetDaily : Math.max(10, (campaign.budgetTest || 50) / 3);

    const result = await createGoogleCampaign(userId, {
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
    });

    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        googleCampaignId: result.googleCampaignId,
        googleAdGroupId: result.googleAdGroupId,
        googleCampaignName: campaignName,
        budgetDaily,
      },
    });

    await prisma.campaignDecision.create({
      data: {
        campaignId,
        userId,
        decision: result.mock ? 'GADS_CREATE_MOCK' : 'GADS_CREATE',
        rationale: result.logs.join(' | '),
      },
    });

    return NextResponse.json({
      success: true,
      mock: result.mock,
      googleCampaignId: result.googleCampaignId,
      googleAdGroupId: result.googleAdGroupId,
      logs: result.logs,
    });
  } catch (err: any) {
    console.error('Google Ads create error:', err);
    return NextResponse.json({ error: err?.message ?? 'Erro ao criar campanha no Google Ads' }, { status: 500 });
  }
}
