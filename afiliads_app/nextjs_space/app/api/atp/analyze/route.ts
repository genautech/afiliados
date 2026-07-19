export const dynamic = 'force-dynamic';
export const maxDuration = 120;
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { atpFetch, atpErrorResponse } from '@/lib/atp';
import { callLLM } from '@/lib/llm';

type Row = {
  keyword: string;
  volume: number | null;
  cpc: number | null;
  intent: string | null;
  sentiment: string | null;
  source: string | null;
};

const KEYWORD_FIELDS = ['keyword', 'text', 'suggestion', 'phrase', 'term'];
const VOLUME_FIELDS = ['volume', 'search_volume', 'monthly_volume', 'monthly_search_volume'];
const CPC_FIELDS = ['cpc', 'cost_per_click', 'cost'];

function toNum(v: any): number | null {
  const n = typeof v === 'string' ? parseFloat(v.replace(/[^0-9.]/g, '')) : v;
  return typeof n === 'number' && isFinite(n) ? n : null;
}

// O payload do report varia por provider — extrai defensivamente qualquer objeto com campo de keyword
function extractRows(node: any, out: Map<string, Row>, context: string | null) {
  if (Array.isArray(node)) {
    for (const item of node) extractRows(item, out, context);
    return;
  }
  if (!node || typeof node !== 'object') return;

  const kwField = KEYWORD_FIELDS.find((f) => typeof node[f] === 'string' && node[f].trim());
  if (kwField) {
    const kw = String(node[kwField]).trim().toLowerCase();
    const volField = VOLUME_FIELDS.find((f) => toNum(node[f]) !== null);
    const cpcField = CPC_FIELDS.find((f) => toNum(node[f]) !== null);
    const row: Row = {
      keyword: kw,
      volume: volField ? toNum(node[volField]) : null,
      cpc: cpcField ? toNum(node[cpcField]) : null,
      intent: typeof node.intent === 'string' ? node.intent.toLowerCase() : null,
      sentiment: typeof node.sentiment === 'string' ? node.sentiment.toLowerCase() : null,
      source: typeof node.source_name === 'string' ? node.source_name : (typeof node.source === 'string' ? node.source : context),
    };
    const prev = out.get(kw);
    if (!prev || (row.volume ?? -1) > (prev.volume ?? -1)) out.set(kw, row);
  }
  for (const [k, v] of Object.entries(node)) {
    if (v && typeof v === 'object') extractRows(v, out, kwField ? context : k);
  }
}

function inferIntent(kw: string): string {
  const trans = ['comprar', 'preco', 'preço', 'desconto', 'cupom', 'buy', 'price', 'discount', 'coupon', 'deal', 'oficial', 'official', 'order'];
  const comp = ['review', 'funciona', 'e bom', 'vale a pena', 'melhor', 'best', ' vs ', 'legit', 'worth', 'alternative', 'opiniao', 'results', 'scam'];
  const info = ['como ', 'o que e', 'how to', 'what is', 'dicas', 'tips', 'guide', 'gratis', 'free', 'for beginners', 'why ', 'when '];
  if (trans.some((t) => kw.includes(t))) return 'transactional';
  if (comp.some((t) => kw.includes(t))) return 'commercial';
  if (info.some((t) => kw.includes(t))) return 'informational';
  return 'commercial';
}

const INTENT_WEIGHT: Record<string, number> = {
  transactional: 3.0,
  commercial: 2.2,
  comparativa: 2.2,
  navigational: 1.2,
  informational: 0.6,
};

function fallbackLayer(intent: string, kw: string): string {
  if (intent === 'transactional') return 'D';
  if (intent === 'commercial') return 'C';
  if (/how to|what is|como |o que|why |stop |relief|remedy/.test(kw)) return 'A';
  return 'B';
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const userId = (session.user as any)?.id;
    const body = await request.json();
    const atpSearchId = body?.atpSearchId;
    if (!atpSearchId) return NextResponse.json({ error: 'atpSearchId é obrigatório' }, { status: 422 });

    const search = await prisma.atpSearch.findFirst({ where: { id: atpSearchId, userId } });
    if (!search) return NextResponse.json({ error: 'Busca não encontrada' }, { status: 404 });
    const reportId = search.parentSearchId || search.searchId;
    if (!reportId) return NextResponse.json({ error: 'Busca sem report disponível' }, { status: 422 });

    const campaignId = body?.campaignId || search.campaignId;
    const campaign = campaignId
      ? await prisma.campaign.findFirst({ where: { id: campaignId, userId } })
      : null;

    const report = await atpFetch(userId, `/reports/${reportId}?per_page=250&sort_by=volume&sort_order=desc`);

    const rowsMap = new Map<string, Row>();
    extractRows(report?.data ?? report, rowsMap, null);
    const rows = Array.from(rowsMap.values());
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Nenhuma keyword encontrada no report (busca ainda processando?)' }, { status: 422 });
    }

    // Economia da campanha: CPC teto (breakeven) e alvo com ROAS 2x — regra do 3×
    const cpcTeto = campaign ? (campaign.cpcMax > 0 ? campaign.cpcMax : campaign.epcBreakeven) : 0;
    const cpcAlvo = cpcTeto > 0 ? cpcTeto / 2 : 0;

    const scored = rows.map((r) => {
      const intent = r.intent || inferIntent(r.keyword);
      const weight = INTENT_WEIGHT[intent] ?? 1.5;
      let economics = 1;
      let viable: boolean | null = null;
      if (r.cpc !== null && cpcTeto > 0) {
        viable = r.cpc <= cpcTeto;
        economics = viable ? 0.5 + Math.max(0, 1 - r.cpc / cpcTeto) : 0.15;
      }
      const score = weight * Math.log10((r.volume ?? 0) + 10) * economics;
      return { ...r, intent, viable, score: Math.round(score * 100) / 100 };
    });
    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, 40);

    // Classificação de camadas A-D e match types via LLM do app (não gasta crédito ATP)
    let llmResult: any = null;
    try {
      const systemPrompt = `Você é um estrategista de Google Ads para marketing de afiliados. Classifique keywords nas camadas: A=Problema (dor do público), B=Solução (categoria/produto genérico), C=Comparação (review, best, vs, funciona), D=Comercial (comprar, preço, desconto, marca do produto). Sugira matchType ("exact" para termos de alta intenção e baixo volume, "phrase" para o resto). Responda APENAS com JSON válido, sem markdown.`;
      const userPrompt = `Produto/campanha: ${campaign?.name ?? search.keyword} (vertical: ${campaign?.vertical ?? 'n/a'}, geo: ${campaign?.geo ?? search.region}, CPC máximo viável: $${cpcTeto || 'desconhecido'}).
Seed pesquisada no AnswerThePublic: "${search.keyword}" (${search.language}/${search.region}).

Keywords (com volume, cpc, intent, score econômico):
${top.map((r) => `- "${r.keyword}" vol=${r.volume ?? '?'} cpc=${r.cpc ?? '?'} intent=${r.intent} score=${r.score}${r.viable === false ? ' INVIÁVEL(cpc>teto)' : ''}`).join('\n')}

Retorne JSON: {"best": {"keyword": "...", "layer": "A|B|C|D", "matchType": "exact|phrase", "rationale": "1-2 frases em pt-BR do porquê é a melhor keyword para campanha de afiliado"}, "keywords": [{"keyword": "...", "layer": "A|B|C|D", "matchType": "exact|phrase"}]} para TODAS as keywords listadas.`;
      const raw = await callLLM(userId, { agent: 'atp-keyword-analyst', systemPrompt, userPrompt });
      llmResult = JSON.parse(raw.replace(/```json|```/g, '').trim());
    } catch {
      llmResult = null;
    }

    const layerByKw = new Map<string, { layer: string; matchType: string }>();
    for (const k of llmResult?.keywords ?? []) {
      if (k?.keyword) layerByKw.set(String(k.keyword).toLowerCase(), { layer: k?.layer ?? 'B', matchType: k?.matchType ?? 'phrase' });
    }
    const ranking = top.map((r) => {
      const cls = layerByKw.get(r.keyword);
      return {
        ...r,
        layer: cls?.layer ?? fallbackLayer(r.intent, r.keyword),
        matchType: cls?.matchType ?? 'phrase',
      };
    });

    const best = llmResult?.best?.keyword
      ? { ...llmResult.best, ...(ranking.find((r) => r.keyword === String(llmResult.best.keyword).toLowerCase()) ?? {}) }
      : { ...ranking[0], rationale: 'Maior score econômico (intenção × volume × margem de CPC).' };

    return NextResponse.json({
      campaign: campaign ? { id: campaign.id, name: campaign.name, cpcMax: campaign.cpcMax, epcBreakeven: campaign.epcBreakeven, commissionNet: campaign.commissionNet } : null,
      economics: { cpcTeto, cpcAlvo },
      totalExtracted: rows.length,
      ranking,
      best,
    });
  } catch (err: any) {
    const e = atpErrorResponse(err);
    return NextResponse.json({ error: e.error, details: e.details }, { status: e.status });
  }
}
