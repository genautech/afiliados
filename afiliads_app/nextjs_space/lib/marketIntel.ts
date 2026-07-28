import { prisma } from './prisma';
import { logLearningToObsidian } from './obsidianSync';

const FIRECRAWL_API = 'https://api.firecrawl.dev/v1';

// Chave própria do servidor do AfiliAds (mesma conta Firecrawl já usada via MCP no Claude Code,
// reaproveitada aqui pro backend rodar sozinho). Sem ela, a Inteligência de Mercado fica
// indisponível (erro claro, não dado inventado).
function firecrawlKey(): string {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) throw new Error('FIRECRAWL_API_KEY não configurada no .env — sem ela a Inteligência de Mercado fica indisponível.');
  return key;
}

// Schema pedido ao PRÓPRIO Firecrawl extrair (LLM do Firecrawl, não gasta token do provedor
// principal do AfiliAds — é isso que torna esse pipeline "de graça" em termos de LLM nosso).
const PAGE_JSON_SCHEMA = {
  type: 'object',
  properties: {
    headline: { type: 'string' },
    hasVideo: { type: 'boolean' },
    hasQuizForm: { type: 'boolean' },
    hasLeadForm: { type: 'boolean' },
    isAdvertorialStyle: { type: 'boolean' },
    pageTypeGuess: { type: 'string', enum: ['VSL', 'QUIZ', 'LEAD_GEN', 'ADVERTORIAL', 'DIRECT', 'OTHER'] },
  },
  required: ['headline', 'pageTypeGuess'],
};

const PAGE_JSON_PROMPT = 'Classifique a estrutura desta página de vendas/bridge page: tem vídeo grande no topo (VSL)? é um quiz de perguntas? é formulário de captura de lead/email? parece um artigo editorial (advertorial)? ou é venda direta de produto? Extraia a headline principal (H1 ou frase de destaque) e um pageTypeGuess.';

interface CompetitorSource {
  url: string;
  title: string;
  pageType: string;
  headline: string;
}

// Busca + extração estruturada em UMA chamada (search com scrapeOptions.formats:['json']) —
// evita um round-trip de scrape por URL e usa o LLM do próprio Firecrawl pra "entender" a
// página, em vez de gastar token do provedor principal do AfiliAds nisso.
async function searchAndClassify(query: string, excludeDomain: string | undefined, limit: number): Promise<CompetitorSource[]> {
  const key = firecrawlKey();
  const fullQuery = excludeDomain ? `${query} -site:${excludeDomain}` : query;
  const res = await fetch(`${FIRECRAWL_API}/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      query: fullQuery,
      limit,
      scrapeOptions: { formats: ['json'], jsonOptions: { schema: PAGE_JSON_SCHEMA, prompt: PAGE_JSON_PROMPT } },
    }),
    signal: AbortSignal.timeout(45000),
  });
  if (!res.ok) throw new Error(`Firecrawl search falhou (HTTP ${res.status})`);
  const data = await res.json();
  const results = Array.isArray(data?.data?.web) ? data.data.web : [];

  const sources: CompetitorSource[] = [];
  for (const r of results) {
    const j = r?.json;
    if (!j?.headline || !j?.pageTypeGuess) continue; // extração falhou/vazia — descarta, não inventa
    sources.push({ url: String(r?.url ?? ''), title: String(r?.title ?? ''), pageType: String(j.pageTypeGuess), headline: String(j.headline).slice(0, 140) });
  }
  return sources;
}

function slugify(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}

// fs/path são importados dinamicamente (não no topo do módulo) de propósito: este arquivo é
// alcançado por instrumentation.ts, que o Next.js tenta empacotar também pro runtime edge além
// do nodejs — import estático de 'fs'/'path' quebra esse build ("Module not found"). Import
// dinâmico só resolve quando a função roda de verdade (sempre nodejs, nunca edge).
//
// Diretório de insights do hermes SÓ existe na máquina local (git do usuário) — no deploy de
// produção (Railway) não tem esse filesystem — em vez de tentar escrever direto (que era no-op
// silencioso lá), sempre enfileira em HermesOutboxEntry (banco compartilhado local/produção).
// Um processo local (scripts/process_hermes_outbox.js, via cron) consome a fila e decide
// append-vs-criação de verdade, porque só ele tem acesso ao filesystem real do hermes/.
// Atualiza recursivamente o insight do hermes pra essa vertical: 1 arquivo persistente por
// vertical, cada rodada ACRESCENTA uma entrada datada (nunca sobrescreve o histórico). Mesma
// disciplina anti-cópia do resto do app — só ângulo/estrutura, nunca texto literal.
async function syncHermesInsight(vertical: string, snapshot: { query: string; pageTypesSeen: Record<string, number>; angles: string[]; sources: CompetitorSource[]; fetchedAt: Date }) {
  const slug = slugify(vertical);
  const dateLabel = snapshot.fetchedAt.toLocaleDateString('pt-BR');
  const typesLine = Object.entries(snapshot.pageTypesSeen).sort((a, b) => b[1] - a[1]).map(([t, n]) => `${t} (${n}x)`).join(', ') || 'nenhuma classificável';
  const anglesLines = snapshot.angles.slice(0, 8).map((a) => `  - "${a}"`).join('\n') || '  - (nenhum ângulo extraído nesta rodada)';
  const sourcesLine = snapshot.sources.map((s) => s.url).join(', ') || '(nenhuma fonte)';

  const entry = `\n### ${dateLabel} — query: \`${snapshot.query}\`\n- Estruturas de página vistas: ${typesLine}\n- Ângulos/headlines encontrados (referência de tom, NUNCA copiar literal):\n${anglesLines}\n- Fontes: ${sourcesLine}\n`;

  const header = `---
id: insight-market-intel-${slug}
title: "Inteligência de mercado — vertical ${vertical}"
source_type: outro
source_path: "coleta automática via lib/marketIntel.ts (Firecrawl), atualizado recursivamente pelo scheduler"
source_url: ""
projects: [afiliados]
tags: [presell, market-intel, ${slug}]
created: ${new Date().toISOString().slice(0, 10)}
status: active
---

# Insight — Inteligência de mercado (vertical: ${vertical})

## Mudança operacional (1 frase)

Log recursivo, atualizado automaticamente pelo scheduler de Inteligência de Mercado
(instrumentation.ts, MARKET_INTEL_SCHEDULER) — cada rodada acrescenta uma entrada abaixo. NUNCA
copiar texto literal dos concorrentes encontrados, só usar como referência estrutural/de ângulo
(mesma disciplina do resto do app — ver elementosPresellReferencia em lib/presell.ts).

## Atualizações
`;

  const indexId = `insight-market-intel-${slug}`;
  const indexRow = `| ${indexId} | Inteligência de mercado — vertical ${vertical} | Firecrawl (automático) | afiliados | ${new Date().toISOString().slice(0, 10)} |\n`;

  await prisma.hermesOutboxEntry.create({
    data: {
      type: 'market-intel-insight',
      targetPath: `hermes/knowledge/insights/market-intel-${slug}.md`,
      payload: { header, entry, indexId, indexRow, indexFile: 'hermes/knowledge/insights/_index.md' },
    },
  });
}

/**
 * Descobre bridge/sales pages de OUTROS afiliados promovendo o mesmo produto, usando a própria
 * extração estruturada do Firecrawl (sem gastar token do provedor principal do AfiliAds) e
 * grava um MarketIntelSnapshot como referência estrutural — nunca como texto pra copiar.
 * Atualiza recursivamente o insight correspondente no hermes (quando rodando localmente).
 * Requer FIRECRAWL_API_KEY própria.
 */
export async function collectMarketIntel(userId: string, opts: {
  productName: string;
  vertical: string;
  productId?: string;
  vendorDomain?: string;
  limit?: number;
}) {
  // intitle: reduz falso-positivo de páginas que só citam o produto de passagem (comentário,
  // notícia) em vez de serem de fato bridge/review pages sobre ele.
  const query = `intitle:"${opts.productName}" (review OR bridge OR presell OR discount)`;
  const sources = await searchAndClassify(query, opts.vendorDomain, opts.limit ?? 5);

  const pageTypesSeen: Record<string, number> = {};
  for (const s of sources) pageTypesSeen[s.pageType] = (pageTypesSeen[s.pageType] ?? 0) + 1;
  const angles = sources.map((s) => s.headline).filter(Boolean);

  const snapshot = await prisma.marketIntelSnapshot.create({
    data: {
      userId,
      productId: opts.productId ?? null,
      vertical: opts.vertical,
      query,
      angles: angles as any,
      pageTypesSeen: pageTypesSeen as any,
      sources: sources as any,
    },
  });

  try {
    await syncHermesInsight(opts.vertical, { query, pageTypesSeen, angles, sources, fetchedAt: snapshot.fetchedAt });
  } catch (e: any) {
    console.error('[market-intel] falha ao sincronizar hermes (não bloqueia a coleta):', e?.message);
  }

  const typesLine = Object.entries(pageTypesSeen).sort((a, b) => b[1] - a[1]).map(([t, n]) => `${t} (${n}x)`).join(', ') || 'nenhuma classificável';
  const anglesLine = angles.slice(0, 5).map((a) => `"${a}"`).join(' | ') || 'nenhum extraído';
  await logLearningToObsidian({
    title: `inteligencia-de-mercado-${opts.vertical}`,
    tags: ['market-intel', 'afiliados/aprendizado-continuo'],
    body: `Coleta automática de inteligência de mercado pra **${opts.productName}** (vertical **${opts.vertical}**), via Firecrawl.

- Query: \`${query}\`
- Estruturas de página vistas nos concorrentes: ${typesLine}
- Ângulos/headlines encontrados (referência de tom, NUNCA copiar literal): ${anglesLine}
- Fontes: ${sources.map((s) => s.url).join(', ') || '(nenhuma)'}

Isso já alimenta \`getMarketIntelReferencia()\` no prompt do Presell Builder e no dossiê do wizard-autofill.`,
  });

  return snapshot;
}

// Referência de mercado formatada pro prompt do Presell Builder — só ângulos/estrutura,
// nunca texto literal de concorrente. Usa o snapshot mais recente da vertical (ou do produto
// específico, se houver) dentro de uma janela razoável (30 dias) antes de considerar "fresco".
export async function getMarketIntelReferencia(userId: string, vertical: string, productId?: string | null): Promise<string> {
  const MAX_AGE_DAYS = 30;
  const cutoff = new Date(Date.now() - MAX_AGE_DAYS * 24 * 3600_000);

  const snapshot = await prisma.marketIntelSnapshot.findFirst({
    where: {
      userId,
      fetchedAt: { gte: cutoff },
      OR: [
        ...(productId ? [{ productId }] : []),
        { vertical },
      ],
    },
    orderBy: { fetchedAt: 'desc' },
  });
  if (!snapshot) return '';

  const pageTypesSeen = (snapshot.pageTypesSeen as Record<string, number>) ?? {};
  const angles = (snapshot.angles as string[]) ?? [];
  if (!angles.length && !Object.keys(pageTypesSeen).length) return '';

  const typesLine = Object.entries(pageTypesSeen)
    .sort((a, b) => b[1] - a[1])
    .map(([t, n]) => `${t} (${n}x)`)
    .join(', ');
  const anglesLine = angles.slice(0, 5).map((a) => `"${a}"`).join(' | ');

  return `SINAIS DE MERCADO — concorrentes reais promovendo produto/vertical semelhante (coletado em ${snapshot.fetchedAt.toLocaleDateString('pt-BR')}): estruturas de página vistas: ${typesLine || 'nenhuma classificável'}. Headlines/ângulos reais encontrados (referência de tom, NUNCA copiar literal): ${anglesLine || 'nenhum extraído'}.`;
}
