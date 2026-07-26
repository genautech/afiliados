export const dynamic = 'force-dynamic';
export const maxDuration = 120;
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { callAgent } from '@/lib/llm';
import { PLATFORMS, VERTICALS, GEOS, CHANNELS, CVR_DEFAULTS } from '@/lib/wizard-data';
import { FUNNELS, SYSTEM_PROMPT, buildSchemaHint, pickKeywordsFromResearch } from '@/lib/wizard-autofill';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const userId = (session.user as any)?.id;

    const body = await request.json();
    const productResearchId: string | undefined = body?.productResearchId;
    const campaignId: string | undefined = body?.campaignId;
    if (!productResearchId && !campaignId) {
      return NextResponse.json({ error: 'productResearchId ou campaignId é obrigatório' }, { status: 400 });
    }

    const [product, campaign] = await Promise.all([
      productResearchId ? prisma.productResearch.findFirst({ where: { id: productResearchId, userId } }) : Promise.resolve(null),
      campaignId ? prisma.campaign.findFirst({ where: { id: campaignId, userId } }) : Promise.resolve(null),
    ]);

    if (productResearchId && !product) return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
    if (campaignId && !campaign) return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 });

    const dossie = {
      produto_pesquisado: product ? {
        nome: product.name,
        rede: product.network,
        vertical: product.vertical,
        gravity: product.gravity,
        payout_medio_usd: product.avgPayout,
        comissao_pct: product.commissionPct,
        rebill: product.rebill,
        score: product.score,
        risco: product.riskLevel,
        resumo: product.summary,
        melhor_keyword: product.chosenKeyword,
        estrategia: product.strategy,
        compliance: product.compliance,
        assets_do_vendor: product.assetsUrl ? { pasta: product.assetsUrl, ...((product.affiliateInsights as any)?.assets ?? {}) } : null,
      } : null,
      campanha_em_andamento: campaign ? {
        nome_atual: campaign.name,
        plataforma_atual: campaign.platform,
        vertical_atual: campaign.vertical,
        geo_atual: campaign.geo,
        canal_atual: campaign.channel,
        funil_atual: campaign.funnel,
        comissao_atual: campaign.commission,
        refund_atual: campaign.refundPct,
        aov_atual: campaign.aov,
        cvr_atual: campaign.cvrExpected,
        budget_atual: campaign.budgetTest,
        budget_scale_atual: campaign.budgetScale || null,
      } : null,
    };

    const validate = (data: any) => {
      if (!data) return 'JSON inválido';
      if (!PLATFORMS.includes(data.platform)) return `platform inválido: ${data.platform}`;
      if (!VERTICALS.includes(data.vertical)) return `vertical inválido: ${data.vertical}`;
      if (!GEOS.includes(data.geo)) return `geo inválido: ${data.geo}`;
      if (!CHANNELS.includes(data.channel)) return `channel inválido: ${data.channel}`;
      if (!FUNNELS.includes(data.funnel)) return `funnel inválido: ${data.funnel}`;
      return null;
    };

    const userPrompt = `Dossiê disponível:
${JSON.stringify(dossie, null, 2)}

${buildSchemaHint()}`;

    let agentResult;
    try {
      agentResult = await callAgent(userId, {
        agent: 'campaign-strategist',
        systemPrompt: SYSTEM_PROMPT,
        userPrompt,
        validate,
      });
    } catch (llmErr: any) {
      console.error('wizard-autofill LLM error:', llmErr);
      return NextResponse.json({ error: 'Não foi possível gerar as sugestões — verifique as chaves de API de IA em Configurações.' }, { status: 502 });
    }

    const data = agentResult.data;
    if (!data) return NextResponse.json({ error: 'O agente não retornou um JSON válido.' }, { status: 502 });

    // Dados reais conhecidos do dossiê sempre vencem estimativa do agente.
    const commission = typeof product?.avgPayout === 'number' ? product.avgPayout : Number(data.commission) || 0;
    const cvrExpected = Number(data.cvrExpected) || CVR_DEFAULTS[data.vertical] || 1.0;
    const { selected: keywords, negatives } = pickKeywordsFromResearch(product?.keywords, product?.chosenKeyword);

    return NextResponse.json({
      name: data.name,
      platform: data.platform,
      vertical: data.vertical,
      geo: data.geo,
      channel: data.channel,
      funnel: data.funnel,
      commission,
      refundPct: Number(data.refundPct) || 0,
      aov: Number(data.aov) || commission,
      cvrExpected,
      budgetTest: Number(data.budgetTest) || 50,
      testDuration: data.testDuration || '72h',
      budgetScale: Number(data.budgetScale) || 0,
      offerUrl: product?.hopLink || undefined,
      keywords,
      negatives,
      summary: data.summary || '',
      rationale: data.rationale || {},
      usage: agentResult.usage,
      provider: agentResult.provider,
      model: agentResult.model,
    });
  } catch (err: any) {
    console.error('wizard-autofill handler error:', err);
    return NextResponse.json({ error: 'Erro interno ao gerar sugestões' }, { status: 500 });
  }
}
