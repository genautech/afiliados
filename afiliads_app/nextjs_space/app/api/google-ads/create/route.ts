export const dynamic = 'force-dynamic';
export const maxDuration = 90;
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createGoogleCampaign, getGoogleAdsConfig, isMockMode } from '@/lib/google-ads';
import { generateRsaCopy } from '@/lib/rsa';
import { checkGoogleAdsReadiness } from '@/lib/google-ads/readiness';
import { authorizeMutation } from '@/lib/google-ads/route-mutation-authorization';
import { assertMutationAllowed } from '@/lib/google-ads/mutation-guard';
import { assertClaimsAllowed } from '@/lib/launch/orchestrator';
import { deriveCampaignLaunchState } from '@/lib/campaign-launch-state';

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

    const authorization = authorizeMutation(
      body?.authorization,
      'CREATE_CAMPAIGN',
      campaign.id,
      String(campaign.updatedAt.getTime()),
      userId,
      campaign.userId,
    );

    // A persisted remote ID means the create boundary was already crossed.
    // Retries and stale clients must never create a second remote campaign.
    if (campaign.googleCampaignId) {
      return NextResponse.json({
        success: true,
        alreadyExists: true,
        googleCampaignId: campaign.googleCampaignId,
        googleAdGroupId: campaign.googleAdGroupId ?? null,
        launchState: deriveCampaignLaunchState(campaign),
      });
    }

    // Gate de claims (EBOOK-OS). Esta rota é um caminho de mutação real paralelo ao
    // Painel de Lançamento; se ela não checasse o ledger, bastaria criar por aqui para
    // publicar uma claim proibida. Não há bypass.
    try {
      await assertClaimsAllowed(userId, campaignId);
    } catch (gateErr: any) {
      return NextResponse.json({ error: gateErr?.message ?? 'Ledger de claims reprovado' }, { status: 422 });
    }

    const adsConfig = await getGoogleAdsConfig(userId);
    if (!adsConfig) return NextResponse.json({ error: 'Configuração do Google Ads não encontrada' }, { status: 422 });
    const mutation = assertMutationAllowed({
      operation: 'createGoogleCampaign',
      customerId: adsConfig.customerId,
      isMock: isMockMode(adsConfig),
      confirmed: authorization.operation === 'CREATE_CAMPAIGN',
    });
    if (!mutation.allowed) return NextResponse.json({ error: `Mutação bloqueada pelo guard: ${mutation.reason}` }, { status: 502 });

    const deps = {
      findCampaign: async (id: string, uid: string) => prisma.campaign.findFirst({ where: { id, userId: uid }, include: { keywords: true } }),
      findChecklists: async (cid: string) => prisma.campaignChecklist.findMany({ where: { campaignId: cid, step: { not: 9 } } }),
      getAdsConfig: async (uid: string) => getGoogleAdsConfig(uid),
      findProduct: async (pid: string) => prisma.productResearch.findUnique({ where: { id: pid } })
    };

    const readiness = await checkGoogleAdsReadiness(campaignId, userId, 'PREPARE', deps);
    if (!readiness.ready) {
      return NextResponse.json({ error: readiness.errors[0] }, { status: 422 });
    }

    const { data } = readiness;
    if (!data) return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
    const { finalUrl, forbiddenTerms, selectedKeywords, campaignName, budgetDaily } = data;
    const containsForbiddenTerm = (s: string) => forbiddenTerms.some((t) => s.toLowerCase().includes(t.toLowerCase()));

    let headlines: string[] | undefined = body?.headlines;
    let descriptions: string[] | undefined = body?.descriptions;
    if (!headlines?.length || !descriptions?.length) {
      const mainKeyword = selectedKeywords[0].keyword;
      const rsa = await generateRsaCopy(userId, { campaignId, keyword: mainKeyword, vertical: campaign.vertical, forbiddenTerms });
      headlines = rsa.titles;
      descriptions = rsa.descriptions;
      if (!headlines?.length || !descriptions?.length) {
        return NextResponse.json({ error: 'Não foi possível gerar os anúncios (RSA) automaticamente. Gere manualmente em /rsa e reenvie titles/descriptions.' }, { status: 502 });
      }
    }
    if (forbiddenTerms.length) {
      const badCopy = [...headlines, ...descriptions].filter(containsForbiddenTerm);
      if (badCopy.length) {
        return NextResponse.json({
          error: `Brand bidding proibido pelo vendor: o copy gerado usa termo proibido (${forbiddenTerms.join('/')}) — regenere em /rsa ou edite manualmente antes de criar a campanha. Trechos: ${badCopy.join(' | ')}.`,
        }, { status: 422 });
      }
    }

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
    }, mutation.capability);

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
      launchState: 'REMOTE_PAUSED',
      logs: result.logs,
      warnings: readiness.warnings,
    });
  } catch (err: any) {
    console.error('Google Ads create error:', err);
    const status = err?.message?.startsWith('Falha de autorização') ? 400 : 500;
    return NextResponse.json({ error: err?.message ?? 'Erro ao criar campanha no Google Ads' }, { status });
  }
}
