export const dynamic = 'force-dynamic';
export const maxDuration = 120;
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { callLLM } from '@/lib/llm';

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const userId = (session.user as any)?.id;

    const product = await prisma.productResearch.findFirst({ where: { id: params.id, userId } });
    if (!product) return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const url = body?.affiliatePageUrl || product.affiliatePageUrl;
    let pageText = body?.pageText ? String(body.pageText) : '';

    if (!pageText) {
      if (!url) return NextResponse.json({ error: 'Informe a URL da página de afiliado do produtor' }, { status: 422 });
      try {
        const res = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
          redirect: 'follow',
          cache: 'no-store',
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        pageText = htmlToText(await res.text());
      } catch (e: any) {
        return NextResponse.json(
          { error: `Não consegui acessar a página (${e?.message}). Cole o texto da página no campo pageText e tente de novo.` },
          { status: 422 }
        );
      }
    }
    pageText = pageText.slice(0, 15000);
    if (pageText.length < 200) {
      return NextResponse.json({ error: 'Página sem conteúdo útil (JS-only?). Cole o texto da página no campo pageText.' }, { status: 422 });
    }

    const systemPrompt = `Você é um analista de compliance e estratégia de marketing de afiliados. Recebe o texto da PÁGINA DE AFILIADO de um produtor (affiliate tools page) e extrai TODAS as informações úteis para validar uma campanha de tráfego pago. Seja literal: só afirme o que está no texto; use null quando a página não disser. Responda APENAS com JSON válido, sem markdown.`;
    const userPrompt = `Produto: ${product.name} (rede: ${product.network})
Texto da página de afiliado:
"""
${pageText}
"""

Retorne JSON exatamente neste formato:
{
  "commission": "comissão informada (ex: 'até 67%') ou null",
  "cpaBonus": "bônus CPA se houver (ex: '$180/venda após 50 vendas') ou null",
  "epcRef": "EPC de referência citado ou null",
  "allowedChannels": ["canais de tráfego permitidos/recomendados"],
  "forbiddenChannels": ["canais explicitamente proibidos"],
  "restrictions": ["cada restrição/proibição do produtor, uma por item"],
  "resources": ["recursos oferecidos: swipes, criativos, landing pages, etc"],
  "contacts": ["contatos de gerente de afiliados/suporte"],
  "hoplinks": ["formatos de hoplink/tracking citados"],
  "tips": ["dicas e orientações do produtor para vender mais"],
  "campaignValidation": {
    "googleSearchAllowed": true|false|null,
    "brandBiddingAllowed": true|false|null,
    "directLinkingAllowed": true|false|null,
    "notes": "resumo em pt-BR do que valida ou inviabiliza uma campanha Google Ads para este produto"
  }
}`;

    const raw = await callLLM(userId, { agent: 'affiliate-page-analyst', systemPrompt, userPrompt });
    let insights: any;
    try {
      insights = JSON.parse(raw.replace(/```json|```/g, '').trim());
    } catch {
      return NextResponse.json({ error: 'A IA não retornou JSON válido. Tente novamente.' }, { status: 502 });
    }

    const updated = await prisma.productResearch.update({
      where: { id: product.id },
      data: {
        affiliatePageUrl: url ?? product.affiliatePageUrl,
        affiliateInsights: insights,
        status: product.status === 'novo' ? 'analisado' : product.status,
      },
    });
    return NextResponse.json({ product: updated, insights });
  } catch (err: any) {
    console.error('Analyze affiliate page error:', err);
    return NextResponse.json({ error: err?.message || 'Erro interno' }, { status: 500 });
  }
}
