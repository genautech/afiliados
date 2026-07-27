import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { BridgePageType } from '@/lib/bridgePageRecommender';
import { generatePresell } from '@/lib/presell';
import { callAgent } from '@/lib/llm';

// Quiz Funnel / Lead Gen Page ainda não têm template HTML dedicado (só Pogo/Advertorial/VSL
// existem em lib/presell.ts) — aqui geramos o roteiro/copy real via LLM como entrega parcial
// honesta, sem fingir publicar uma página que não existe.
const QUIZ_LEAD_PROMPT = `Você é o Bridge Page Builder do AfiliAds, especialista em estruturas de quiz funnel e lead gen page para afiliados ClickBank que precisam ser aprovados pelo Google Ads.

Regras invioláveis:
- Zero claims de diagnóstico/cura/garantia de resultado. Linguagem condicional, focada em benefício/experiência.
- Para QUIZ_FUNNEL: gere 4-6 perguntas de segmentação genuínas (não manipulativas), cada uma com 2-4 opções, terminando numa "página de resultado" que conecta a resposta predominante à oferta de forma editorial.
- Para LEAD_GEN_PAGE: gere um lead magnet real (não vazio) relacionado ao produto, headline, 3 bullets de benefício do magnet, e copy do formulário — o valor do magnet tem que justificar sozinho o e-mail, independente da conversão da oferta principal.
- Sempre inclua a divulgação de afiliado.

Responda APENAS JSON:
{ "tipo": "QUIZ_FUNNEL|LEAD_GEN_PAGE",
  "titulo_pagina": "...",
  "headline": "...",
  "subheadline": "...",
  "perguntas": [{ "pergunta": "...", "opcoes": ["...", "..."] }],
  "pagina_resultado": { "headline": "...", "texto": "...", "cta_texto": "..." },
  "lead_magnet": { "titulo": "...", "beneficios": ["...", "...", "..."], "cta_form_texto": "..." }
}
Preencha "perguntas"+"pagina_resultado" para QUIZ_FUNNEL, ou "lead_magnet" para LEAD_GEN_PAGE — deixe o outro bloco como array/objeto vazio.`;

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const userId = (session.user as any)?.id as string;

    const { bridgePageType, context, productId, campaignId } = await req.json();
    if (!bridgePageType || !context || !productId) {
      return NextResponse.json({ error: 'bridgePageType, context, and productId are required' }, { status: 400 });
    }

    const product = await prisma.productResearch.findFirst({ where: { id: productId, userId } });
    if (!product) return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });

    let trackingId: string | undefined;
    let channel: string | undefined;
    if (campaignId) {
      const campaign = await prisma.campaign.findFirst({ where: { id: campaignId, userId } });
      trackingId = campaign?.utmCampaign ?? undefined;
      channel = campaign?.channel ?? undefined;
    }

    if (bridgePageType === BridgePageType.POGO || bridgePageType === BridgePageType.ADVERTORIAL) {
      if (!product.hopLink) {
        return NextResponse.json({ error: `Produto "${product.name}" não tem hopLink cadastrado — cadastre antes de gerar a bridge page.` }, { status: 422 });
      }
      const pageType = bridgePageType === BridgePageType.POGO ? 'pogo' : 'advertorial';
      const { presell, usage, provider, model } = await generatePresell(userId, {
        productName: product.name,
        hopLink: product.hopLink,
        productId: product.id,
        pageType,
        context,
        trackingId,
        channel,
        campaignId: campaignId ?? undefined,
        publicar: false,
      });
      return NextResponse.json({
        success: true,
        message: `Presell "${pageType}" gerada como rascunho — revise o preview antes de publicar.`,
        dispatchedAgent: 'presell-builder',
        presellId: presell.id,
        presellUrl: `/p/${presell.slug}`,
        usage, provider, model,
      }, { status: 200 });
    }

    if (bridgePageType === BridgePageType.INTERSTITIAL) {
      if (!product.hopLink) {
        return NextResponse.json({ error: `Produto "${product.name}" não tem hopLink cadastrado — cadastre antes de gerar a bridge page.` }, { status: 422 });
      }
      // generatePresell já bloqueia por código se channel for SEARCH/PMAX (INTERSTITIAL_BLOCKED_CHANNELS
      // em lib/presell.ts) — recommendBridgePage() também só chega em INTERSTITIAL com canal seguro,
      // mas o gate real fica no gerador, não na recomendação.
      const { presell, usage, provider, model } = await generatePresell(userId, {
        productName: product.name,
        hopLink: product.hopLink,
        productId: product.id,
        pageType: 'interstitial',
        context,
        trackingId,
        channel,
        campaignId: campaignId ?? undefined,
        salesPageUrl: product.vendorPageUrl ?? undefined,
        publicar: false,
      });
      return NextResponse.json({
        success: true,
        message: 'Presell "interstitial" gerada como rascunho — revise o preview antes de publicar.',
        dispatchedAgent: 'presell-builder',
        presellId: presell.id,
        presellUrl: `/p/${presell.slug}`,
        usage, provider, model,
      }, { status: 200 });
    }

    if (bridgePageType === BridgePageType.QUIZ_FUNNEL || bridgePageType === BridgePageType.LEAD_GEN_PAGE) {
      const res = await callAgent(userId, {
        agent: 'bridge-page-builder',
        systemPrompt: QUIZ_LEAD_PROMPT,
        userPrompt: `Produto: ${product.name} | Vertical: ${product.vertical} | Resumo: ${product.summary}\nTipo pedido: ${bridgePageType}\nContexto/recomendação: ${context}\nJSON puro.`,
      });
      if (!res.data) return NextResponse.json({ error: 'Bridge Page Builder retornou conteúdo inválido' }, { status: 502 });
      return NextResponse.json({
        success: true,
        message: `Roteiro de ${bridgePageType} gerado — este tipo ainda não tem template HTML publicável no AfiliAds, então o resultado é o copy/estrutura para montagem manual (ex.: no FlowPages).`,
        dispatchedAgent: 'bridge-page-builder',
        draft: res.data,
        usage: res.usage, provider: res.provider, model: res.model,
      }, { status: 200 });
    }

    return NextResponse.json({ error: `bridgePageType "${bridgePageType}" não suportado` }, { status: 422 });
  } catch (error: any) {
    console.error('Error orchestrating agent task:', error);
    return NextResponse.json({ error: error?.message ?? 'Internal Server Error' }, { status: 500 });
  }
}
