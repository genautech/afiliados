export const dynamic = 'force-dynamic';
export const maxDuration = 120;
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { atpFetch, atpErrorResponse } from '@/lib/atp';
import { callLLM } from '@/lib/llm';
import { parseAgentJson } from '@/lib/json-validation';
import { judgeKeywords } from '@/lib/strategy-judgments';

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

// Taxonomia canônica de camada (a mesma de lib/strategy-judgments.ts, lib/agents.ts:44 e
// LAYER_TO_STAGE em lib/campaign-strategy.ts): A = fundo/comercial, B = comparação, C = problema,
// D = informacional. O prompt que existia aqui usava A e D invertidos, então keyword comercial
// entrava como camada D e virava estágio TOPO na campanha — 7 dias de teste e canal de vídeo pra
// tráfego de alta intenção. Só vale como fallback: o valor bom vem de judgeKeywords().
function fallbackLayer(intent: string, kw: string): string {
  if (intent === 'transactional') return 'A';
  if (intent === 'commercial') return 'B';
  if (/how to|como |stop |relief|remedy|sintoma|dor /.test(kw)) return 'C';
  if (/what is|o que e|o que é|why |por que/.test(kw)) return 'D';
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

    // Camada A-D e match type por julgamento tipado (lib/strategy-judgments.ts): uma request,
    // duas perguntas fechadas por keyword, todas em paralelo. Antes daqui saía um prompt pedindo
    // JSON com as 40 keywords repetidas de volta, com ```json arrancado na mão e reencontro por
    // string — quando o parse falhava (silencioso) tudo caía no fallbackLayer de regex.
    const judged = await judgeKeywords(
      top.map((r) => r.keyword),
      {
        produto: campaign?.name ?? search.keyword,
        vertical: campaign?.vertical ?? null,
        geo: campaign?.geo ?? search.region,
        cpc_maximo_viavel: cpcTeto || null,
        seed_pesquisada: search.keyword,
      },
    );

    const ranking = top.map((r, index) => {
      const j = judged?.[index];
      return {
        ...r,
        layer: j?.layer.value ?? fallbackLayer(r.intent, r.keyword),
        matchType: j?.matchType.value ?? 'phrase',
        // Confiança do julgamento de camada: a UI pode marcar pra revisão o que ficou baixo em
        // vez de todo mundo aparecer igualmente decidido.
        layerConfidence: j?.layer.confidence ?? null,
        layerSource: j?.layer.usable ? 'julgamento' : 'heuristica',
      };
    });

    // A melhor keyword sai da economia calculada em código (intenção × volume × margem de CPC),
    // que é determinística. O LLM generativo entra só pra escrever o porquê em pt-BR — que é
    // texto, não decisão. Se ele falhar, a rationale determinística assume.
    let llmResult: { best?: { keyword?: string; rationale?: string } } | null = null;
    try {
      const melhor = ranking[0];
      const raw = await callLLM(userId, {
        agent: 'atp-keyword-analyst',
        systemPrompt: 'Você é um estrategista de Google Ads para marketing de afiliados. Responda APENAS com JSON válido, sem markdown.',
        userPrompt: `Campanha: ${campaign?.name ?? search.keyword} (vertical: ${campaign?.vertical ?? 'n/a'}, geo: ${campaign?.geo ?? search.region}, CPC máximo viável: $${cpcTeto || 'desconhecido'}).
A melhor keyword já foi escolhida pela economia da campanha: "${melhor.keyword}" (camada ${melhor.layer}, ${melhor.matchType}, volume ${melhor.volume ?? '?'}, cpc ${melhor.cpc ?? '?'}, score ${melhor.score}).
Retorne JSON: {"best": {"keyword": "${melhor.keyword}", "rationale": "1-2 frases em pt-BR explicando por que essa keyword é a melhor aposta para campanha de afiliado"}}`,
        campaignId: campaign?.id,
        campaignTarget: campaign
          ? { kind: 'campaign', campaignId: campaign.id }
          : { kind: 'non-campaign' },
      });
      llmResult = parseAgentJson(raw.text);
    } catch {
      llmResult = null;
    }

    const best = {
      ...ranking[0],
      rationale: llmResult?.best?.rationale || 'Maior score econômico (intenção × volume × margem de CPC).',
    };

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
