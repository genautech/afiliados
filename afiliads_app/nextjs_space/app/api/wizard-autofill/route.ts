export const dynamic = 'force-dynamic';
export const maxDuration = 120;
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { callAgent } from '@/lib/llm';
import { PLATFORMS, VERTICALS, GEOS, CHANNELS, CVR_DEFAULTS } from '@/lib/wizard-data';
import { FUNNELS, SYSTEM_PROMPT, buildSchemaHint, pickKeywordsFromResearch } from '@/lib/wizard-autofill';
import { deriveCampaignStrategy } from '@/lib/campaign-strategy';
import { getMarketIntelReferencia } from '@/lib/marketIntel';

const TEST_DURATIONS = ['48h', '72h', '5', '7'];

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

    // Se só campaignId veio, busca o produto vinculado (se houver) pra alimentar o motor de estratégia também.
    const productForStrategy = product ?? (campaign?.productResearchId
      ? await prisma.productResearch.findFirst({ where: { id: campaign.productResearchId, userId } })
      : null);

    const { selected: preselectedKeywords, negatives } = pickKeywordsFromResearch(product?.keywords, product?.chosenKeyword);

    // Motor determinístico (não-LLM): normaliza a recomendação já feita pelo pipeline de
    // pesquisa (SEO Architect, Affiliate Page Analyst, Compliance Sentinel) em uma restrição
    // autoritativa — igual comissão real, isso vence estimativa do agente, não é só contexto.
    const derivedStrategy = productForStrategy ? await deriveCampaignStrategy(userId, productForStrategy, preselectedKeywords) : null;

    const marketIntel = productForStrategy
      ? await getMarketIntelReferencia(userId, productForStrategy.vertical ?? '', productForStrategy.id).catch(() => '')
      : '';

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
      estrategia_derivada: derivedStrategy ? {
        aviso: 'Estes valores vêm de regras determinísticas sobre o dossiê do produto (camada de keyword dominante + gate de canal do vendor) — são RESTRIÇÃO, não sugestão. Nunca escolha um channel presente em canais_bloqueados. Siga funil_recomendado e o guia_de_budget salvo se compliance.alertas críticos do produto indicarem outra coisa mais segura.',
        estagio_de_funil: derivedStrategy.funnelStage,
        camada_de_keyword_dominante: derivedStrategy.dominantLayer,
        canal_recomendado: derivedStrategy.recommendedChannel,
        canais_bloqueados: derivedStrategy.blockedChannels,
        motivo_bloqueio: derivedStrategy.channelBlockReason,
        funil_recomendado: derivedStrategy.recommendedFunnel,
        tipo_de_bridge_recomendado: derivedStrategy.recommendedBridgeType,
        guia_de_budget: derivedStrategy.budgetGuidance,
      } : null,
      sinais_de_mercado: marketIntel || null,
    };

    // Números fora do razoável (alucinação do LLM ou parsing ruim) disparam uma retentativa
    // automática (mecanismo já existente em callAgent/lib/llm.ts) em vez de virar Number(x)||
    // fallback silencioso — os limites abaixo são os mesmos já declarados em texto no
    // SYSTEM_PROMPT (lib/wizard-autofill.ts), só que agora impostos de verdade.
    const validate = (data: any) => {
      if (!data) return 'JSON inválido';
      if (!PLATFORMS.includes(data.platform)) return `platform inválido: ${data.platform}`;
      if (!VERTICALS.includes(data.vertical)) return `vertical inválido: ${data.vertical}`;
      if (!GEOS.includes(data.geo)) return `geo inválido: ${data.geo}`;
      if (!CHANNELS.includes(data.channel)) return `channel inválido: ${data.channel}`;
      if (!FUNNELS.includes(data.funnel)) return `funnel inválido: ${data.funnel}`;
      if (derivedStrategy?.blockedChannels.includes(data.channel)) {
        return `channel "${data.channel}" está bloqueado para este produto (${derivedStrategy.channelBlockReason}) — escolha outro canal.`;
      }
      const refundPct = Number(data.refundPct);
      if (data.refundPct !== undefined && (!Number.isFinite(refundPct) || refundPct < 0 || refundPct > 100)) {
        return `refundPct fora da faixa 0-100: ${data.refundPct}`;
      }
      const cvr = Number(data.cvrExpected);
      if (data.cvrExpected !== undefined && (!Number.isFinite(cvr) || cvr < 0 || cvr > 100)) {
        return `cvrExpected fora da faixa 0-100: ${data.cvrExpected}`;
      }
      const budgetTest = Number(data.budgetTest);
      if (data.budgetTest !== undefined && (!Number.isFinite(budgetTest) || budgetTest < 10 || budgetTest > 1000)) {
        return `budgetTest fora da faixa razoável ($10-$1000): ${data.budgetTest}`;
      }
      const budgetScale = Number(data.budgetScale);
      if (data.budgetScale !== undefined && (!Number.isFinite(budgetScale) || budgetScale < 0 || budgetScale > 5000)) {
        return `budgetScale fora da faixa razoável ($0-$5000/dia): ${data.budgetScale}`;
      }
      const aov = Number(data.aov);
      if (data.aov !== undefined && (!Number.isFinite(aov) || aov < 0)) {
        return `aov não pode ser negativo: ${data.aov}`;
      }
      if (!TEST_DURATIONS.includes(data.testDuration)) {
        return `testDuration inválido (esperado ${TEST_DURATIONS.join('|')}): ${data.testDuration}`;
      }
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
      keywords: preselectedKeywords,
      negatives,
      summary: data.summary || '',
      rationale: data.rationale || {},
      strategy: derivedStrategy,
      usage: agentResult.usage,
      provider: agentResult.provider,
      model: agentResult.model,
    });
  } catch (err: any) {
    console.error('wizard-autofill handler error:', err);
    return NextResponse.json({ error: 'Erro interno ao gerar sugestões' }, { status: 500 });
  }
}
