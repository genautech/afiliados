export const dynamic = 'force-dynamic';
export const maxDuration = 300;
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { callAgent } from '@/lib/llm';
import { prisma } from '@/lib/prisma';

const HUNTER_PROMPT = `Você é o Product Hunter, agente caçador de produtos de afiliados especializado em ClickBank.
Analise o produto informado com base no seu conhecimento do marketplace ClickBank, verticais nutra/saúde/MMO/sobrevivência e na regra do 3× (comissão média deve cobrir ao menos 3× o CPA estimado de teste).
Responda APENAS JSON válido:
{
  "vertical": "vertical do produto",
  "gravity_estimado": 0,
  "avg_payout_usd": 0,
  "commission_pct": "ex: 75%",
  "rebill": true,
  "score": 0,
  "risk_level": "baixo|medio|alto",
  "summary": "resumo em 2-3 frases: o que é, para quem, por que (não) promover",
  "tags": ["5 a 10 tags do produto/nicho/ângulo"],
  "funil": "descrição curta do funil do vendor (VSL, upsells, quiz...)"
}
Score 0-100 pondera: payout, conversão esperada, momentum, competição e risco de compliance. Se não conhecer o produto, estime pela vertical e diga isso no summary.`;

const SEO_PROMPT = `Você é o SEO & Keyword Architect para afiliados ClickBank com Google Ads.
Dado o produto e seu contexto, gere o mapa de keywords em camadas (Search intent):
- camada_A: fundo de funil / comercial (nome do produto, comprar, review) — 5 itens
- camada_B: comparação/alternativa — 5 itens
- camada_C: problema/dor — 6 itens
- camada_D: informacional amplo — 4 itens
Cada item: { "kw": "...", "score": 0-100, "cpc_estimado_usd": 0.0, "intencao": "..." }.
Score prioriza (volume estimado × CVR esperada × comissão) ÷ CPC. Considere geo US/EN por padrão para ClickBank, mencione PT-BR quando fizer sentido.
Responda APENAS JSON:
{ "melhor_keyword": { "kw": "...", "camada": "A|B|C|D", "justificativa": "1 frase" },
  "camada_A": [...], "camada_B": [...], "camada_C": [...], "camada_D": [...],
  "negativas": ["12+ termos"] }`;

const COMPLIANCE_PROMPT = `Você é o Compliance Sentinel, auditor de políticas Google Ads para afiliados ClickBank.
Dado o produto, vertical e keywords, aponte riscos de: claims de saúde/renda, trademark bidding, verticais restritas (health in personalized ads), necessidade de bridge page, cloaking.
Também defina a estratégia recomendada.
Responda APENAS JSON:
{ "risco_geral": "baixo|medio|alto",
  "alertas": [{ "nivel": "info|atencao|critico", "texto": "..." }],
  "presell": { "tipo": "review|advertorial|quiz|vsl-bridge", "motivo": "1 frase", "elementos": ["4-6 elementos obrigatórios da página"] },
  "tipo_venda": { "funil": "bridge|direct|search-intent|youtube", "motivo": "1 frase" },
  "campanha": { "naming": "CB_<VERT>_<GEO>_<CANAL>_<FUNIL>_v1 preenchido", "tipo": "Search|PMax|Demand Gen", "lances": "estratégia de lances inicial", "cpc_max_usd": 0.0, "cpc_scale_usd": 0.0 },
  "break_even": { "comissao_liquida_usd": 0.0, "cvr_estimada_pct": 0.0, "epc_breakeven_usd": 0.0 } }`;

export async function POST(request: NextRequest) {
  let userId: string | null = null;
  const mcpToken = request.headers.get('x-afiliads-token');
  if (mcpToken && process.env.AFILIADS_MCP_TOKEN && mcpToken === process.env.AFILIADS_MCP_TOKEN) {
    const email = process.env.AFILIADS_MCP_USER_EMAIL;
    const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
    userId = user?.id ?? null;
  } else {
    const session = await getServerSession(authOptions);
    if (session?.user) userId = (session.user as any)?.id;
  }
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }
  const uid: string = userId;
  const body = await request.json();
  const productName: string = (body?.productName ?? '').trim();
  const network: string = body?.network ?? 'clickbank';
  if (!productName) {
    return new Response(JSON.stringify({ error: 'Nome do produto é obrigatório' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: any) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      try {
        const existing = await prisma.productResearch.findUnique({
          where: { userId_name: { userId: uid, name: productName } },
        });

        const netLower = network.toLowerCase();
        const netTitle = netLower === 'clickbank' ? 'ClickBank' : netLower === 'buygoods' ? 'BuyGoods' : netLower === 'maxweb' ? 'MaxWeb' : network;
        const netPrefix = netLower === 'buygoods' ? 'BG' : netLower === 'maxweb' ? 'MW' : 'CB';

        const dynamicHunterPrompt = HUNTER_PROMPT.replace(/ClickBank/g, netTitle);
        const dynamicSeoPrompt = SEO_PROMPT.replace(/ClickBank/g, netTitle);
        const dynamicCompliancePrompt = COMPLIANCE_PROMPT
          .replace(/ClickBank/g, netTitle)
          .replace(/CB_</g, `${netPrefix}_<`);

        send({ status: 'step', agent: 'hunter', state: 'running' });
        const hunterCtx = existing?.summary ? `Dados já conhecidos: ${JSON.stringify({ vertical: existing.vertical, gravity: existing.gravity, avgPayout: existing.avgPayout, summary: existing.summary })}` : '';
        const hunterRes = await callAgent(uid, {
          agent: 'product-hunter',
          systemPrompt: dynamicHunterPrompt,
          userPrompt: `Produto: ${productName} (rede: ${netTitle}). ${hunterCtx}\nJSON puro.`,
        });
        const hunter = hunterRes.data;
        if (!hunter) throw new Error('Product Hunter retornou resposta inválida');
        send({ status: 'step', agent: 'hunter', state: 'done', data: hunter, usage: hunterRes.usage });

        send({ status: 'step', agent: 'seo', state: 'running' });
        const seoRes = await callAgent(uid, {
          agent: 'seo-architect',
          systemPrompt: dynamicSeoPrompt,
          userPrompt: `Produto: ${productName} | Vertical: ${hunter?.vertical} | Resumo: ${hunter?.summary} | Tags: ${(hunter?.tags ?? []).join(', ')}\nJSON puro.`,
        });
        const seo = seoRes.data;
        if (!seo) throw new Error('SEO Architect retornou resposta inválida');
        send({ status: 'step', agent: 'seo', state: 'done', usage: seoRes.usage });

        send({ status: 'step', agent: 'compliance', state: 'running' });
        const compRes = await callAgent(uid, {
          agent: 'compliance-sentinel',
          systemPrompt: dynamicCompliancePrompt,
          userPrompt: `Produto: ${productName} | Vertical: ${hunter?.vertical} | Payout médio: $${hunter?.avg_payout_usd} | Melhor keyword: ${seo?.melhor_keyword?.kw} | Keywords A: ${(seo?.camada_A ?? []).map((k: any) => k?.kw).join(', ')}\nJSON puro.`,
        });
        const comp = compRes.data;
        if (!comp) throw new Error('Compliance Sentinel retornou resposta inválida');
        send({ status: 'step', agent: 'compliance', state: 'done', usage: compRes.usage });

        const record = await prisma.productResearch.upsert({
          where: { userId_name: { userId: uid, name: productName } },
          update: {
            network,
            vertical: hunter?.vertical ?? '',
            gravity: existing?.gravity ?? (typeof hunter?.gravity_estimado === 'number' ? hunter.gravity_estimado : null),
            avgPayout: existing?.avgPayout ?? (typeof hunter?.avg_payout_usd === 'number' ? hunter.avg_payout_usd : null),
            commissionPct: hunter?.commission_pct ?? '',
            rebill: !!hunter?.rebill,
            score: typeof hunter?.score === 'number' ? Math.round(hunter.score) : 0,
            riskLevel: comp?.risco_geral ?? hunter?.risk_level ?? 'medio',
            summary: hunter?.summary ?? '',
            tags: hunter?.tags ?? [],
            keywords: seo,
            strategy: { presell: comp?.presell, tipo_venda: comp?.tipo_venda, campanha: comp?.campanha, break_even: comp?.break_even, funil_vendor: hunter?.funil },
            compliance: { risco_geral: comp?.risco_geral, alertas: comp?.alertas ?? [] },
            status: 'analisado',
            chosenKeyword: seo?.melhor_keyword?.kw ?? '',
          },
          create: {
            userId: uid,
            name: productName,
            network,
            vertical: hunter?.vertical ?? '',
            gravity: typeof hunter?.gravity_estimado === 'number' ? hunter.gravity_estimado : null,
            avgPayout: typeof hunter?.avg_payout_usd === 'number' ? hunter.avg_payout_usd : null,
            commissionPct: hunter?.commission_pct ?? '',
            rebill: !!hunter?.rebill,
            score: typeof hunter?.score === 'number' ? Math.round(hunter.score) : 0,
            riskLevel: comp?.risco_geral ?? hunter?.risk_level ?? 'medio',
            summary: hunter?.summary ?? '',
            tags: hunter?.tags ?? [],
            keywords: seo,
            strategy: { presell: comp?.presell, tipo_venda: comp?.tipo_venda, campanha: comp?.campanha, break_even: comp?.break_even, funil_vendor: hunter?.funil },
            compliance: { risco_geral: comp?.risco_geral, alertas: comp?.alertas ?? [] },
            status: 'analisado',
            chosenKeyword: seo?.melhor_keyword?.kw ?? '',
          },
        });

        send({ status: 'completed', product: record });
      } catch (err: any) {
        console.error('product-research pipeline error:', err);
        send({ status: 'error', error: err?.message ?? 'Erro na análise' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
  });
}
