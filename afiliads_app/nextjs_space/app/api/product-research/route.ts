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
  "funil": "descrição curta do funil do vendor (VSL, upsells, quiz...)",
  "affiliate_page_url_guess": "melhor chute da URL real da página de afiliados/JV do vendor (ex.: https://dominio.com/affiliates ou https://dominio.com/help/affiliates.php) — sem isso o Compliance Sentinel não consegue confirmar restrições de canal",
  "vendor_sales_page_url_guess": "melhor chute da URL da página de vendas principal do vendor (a landing page que o comprador vê, ex.: https://dominio.com/) — usada como referência de headline/prova/ângulo real pro Presell Builder"
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
Se a vertical for sensível (saúde, corpo, finanças, relacionamentos, fases da vida), gere de 3 a 8 pares de substituição de linguagem: frases/claims que NÃO podem aparecer na presell (diagnóstico, cura, garantia de resultado, termos médicos/explícitos) e a reescrita segura equivalente focada em benefício/experiência condicional. Se a vertical não for sensível, retorne "regras_reescrita": [].

REGRA CRÍTICA: alguns vendors de nutra/saúde de ticket alto no ClickBank restringem tráfego pago do Google nas próprias regras de afiliados, e há DOIS tipos de restrição bem diferentes que NUNCA podem ser confundidos:
(a) Bloqueio do canal inteiro — cláusula tipo "does not allow any traffic from Google unless it is Display or YouTube": aí sim "google_search_permitido" é false.
(b) Restrição de brand bidding — cláusula tipo "proibido fazer bid ou usar o termo '<NOME DO PRODUTO>' em anúncios/keywords": isso NÃO bloqueia o canal, Google Search continua permitido normalmente com keywords genéricas/de categoria; só o nome da marca não pode aparecer em keyword ou copy. Nesse caso "google_search_permitido" é true, "brand_bidding_permitido" é false, e o nome do produto entra em "termos_proibidos".
Caso real corrigido (não repetir o erro): a FemiCore foi mal registrada como bloqueio total de Search quando na verdade sua cláusula 10a só proíbe usar/dar bid no termo "FemiCore" — o canal Search é permitido. Leia a cláusula com atenção: se ela cita o nome do produto/marca dentro da frase de restrição, é caso (b), não (a).
Se o texto real da página de afiliados do vendor foi fornecido abaixo (marcado "TEXTO REAL DA PÁGINA DE AFILIADOS"), baseie "google_search_permitido" E "brand_bidding_permitido" NELE, citando a frase exata como fonte. Se NÃO foi fornecido (fetch falhou), responda "google_search_permitido": "nao_verificado" e gere um alerta nível "critico" mandando o usuário confirmar manualmente na página de afiliados/advertising rules do vendor antes de gastar em Search — nunca responda true/false sem fonte real.

Se o texto real da página de vendas do vendor foi fornecido abaixo (marcado "TEXTO REAL DA PÁGINA DE VENDAS DO VENDOR"), extraia dela "elementos_presell_referencia": headline real, ângulo/promessa principal, prova social real (números, garantia, depoimentos citados) — dados verificáveis que o Presell Builder vai usar como referência de estrutura/ângulo (nunca copiar texto literal, é só referência). Se não foi fornecida, retorne "elementos_presell_referencia" como array vazio.

Responda APENAS JSON:
{ "risco_geral": "baixo|medio|alto",
  "alertas": [{ "nivel": "info|atencao|critico", "texto": "..." }],
  "regras_reescrita": [{ "evitar": "claim ou termo proibido", "usar": "reescrita segura equivalente" }],
  "canais": { "google_search_permitido": true|false|"nao_verificado", "brand_bidding_permitido": true|false|"nao_verificado", "termos_proibidos": ["nome da marca/produto, só quando brand_bidding_permitido for false"], "fonte": "URL + trecho exato que embasa a resposta, ou 'página de afiliados não encontrada'", "canais_permitidos": ["..."], "canais_proibidos": ["... (só canais inteiros, nunca um termo/keyword específico aqui)"] },
  "elementos_presell_referencia": [{ "tipo": "headline|angulo|prova_social", "texto": "..." }],
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

        // Busca a página real de afiliados/advertising rules antes do Compliance Sentinel decidir
        // sobre canais permitidos — nunca deixar o agente "adivinhar" isso de memória (caso FemiCore).
        let affiliatePageText = '';
        let affiliatePageUrlUsed = '';
        const urlGuess = typeof hunter?.affiliate_page_url_guess === 'string' ? hunter.affiliate_page_url_guess.trim() : '';
        if (urlGuess && /^https?:\/\//i.test(urlGuess)) {
          try {
            const pageRes = await fetch(urlGuess, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(10000) });
            if (pageRes.ok) {
              const html = await pageRes.text();
              affiliatePageText = html
                .replace(/<script[\s\S]*?<\/script>/gi, ' ')
                .replace(/<style[\s\S]*?<\/style>/gi, ' ')
                .replace(/<[^>]+>/g, ' ')
                .replace(/\s+/g, ' ')
                .trim()
                .slice(0, 6000);
              affiliatePageUrlUsed = urlGuess;
            }
          } catch (e: any) {
            console.error('Falha ao buscar página de afiliados:', urlGuess, e?.message);
          }
        }

        // Busca também a página de vendas principal do vendor — alimenta elementos_presell_referencia
        // (headline/ângulo/prova social reais) pro Presell Builder usar depois, e não inventar do zero.
        let vendorPageText = '';
        let vendorPageUrlUsed = '';
        const vendorUrlGuess = typeof hunter?.vendor_sales_page_url_guess === 'string' ? hunter.vendor_sales_page_url_guess.trim() : '';
        if (vendorUrlGuess && /^https?:\/\//i.test(vendorUrlGuess)) {
          try {
            const vendorRes = await fetch(vendorUrlGuess, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(10000) });
            if (vendorRes.ok) {
              const vendorHtml = await vendorRes.text();
              vendorPageText = vendorHtml
                .replace(/<script[\s\S]*?<\/script>/gi, ' ')
                .replace(/<style[\s\S]*?<\/style>/gi, ' ')
                .replace(/<[^>]+>/g, ' ')
                .replace(/\s+/g, ' ')
                .trim()
                .slice(0, 6000);
              vendorPageUrlUsed = vendorUrlGuess;
            }
          } catch (e: any) {
            console.error('Falha ao buscar página de vendas do vendor:', vendorUrlGuess, e?.message);
          }
        }

        send({ status: 'step', agent: 'compliance', state: 'running' });
        const compRes = await callAgent(uid, {
          agent: 'compliance-sentinel',
          systemPrompt: dynamicCompliancePrompt,
          userPrompt: `Produto: ${productName} | Vertical: ${hunter?.vertical} | Payout médio: $${hunter?.avg_payout_usd} | Melhor keyword: ${seo?.melhor_keyword?.kw} | Keywords A: ${(seo?.camada_A ?? []).map((k: any) => k?.kw).join(', ')}
${affiliatePageText ? `TEXTO REAL DA PÁGINA DE AFILIADOS (${affiliatePageUrlUsed}):\n"""${affiliatePageText}"""` : `Não foi possível buscar a página de afiliados real (tentativa: ${urlGuess || 'nenhuma URL sugerida pelo Hunter'}). Responda "canais.google_search_permitido": "nao_verificado" e alerte nível crítico.`}
${vendorPageText ? `TEXTO REAL DA PÁGINA DE VENDAS DO VENDOR (${vendorPageUrlUsed}):\n"""${vendorPageText}"""` : `Não foi possível buscar a página de vendas real (tentativa: ${vendorUrlGuess || 'nenhuma URL sugerida pelo Hunter'}). Retorne "elementos_presell_referencia" como array vazio.`}
JSON puro.`,
        });
        const comp = compRes.data;
        if (!comp) throw new Error('Compliance Sentinel retornou resposta inválida');
        send({ status: 'step', agent: 'compliance', state: 'done', usage: compRes.usage });

        // Canais fica em affiliateInsights (mesmo formato usado pelos dossiês pesquisados manualmente)
        // pra alimentar tanto a UI de Busca de Produtos quanto o gerador de presell/wizard.
        const canaisInfo = {
          campaignValidation: {
            googleSearchAllowed: comp?.canais?.google_search_permitido ?? 'nao_verificado',
            brandBiddingAllowed: comp?.canais?.brand_bidding_permitido ?? 'nao_verificado',
            notes: comp?.canais?.fonte ?? 'Página de afiliados não confirmada — verificar manualmente antes de rodar Search.',
          },
          allowedChannels: comp?.canais?.canais_permitidos ?? [],
          forbiddenChannels: comp?.canais?.canais_proibidos ?? [],
          forbiddenTerms: comp?.canais?.termos_proibidos ?? [],
        };
        const affiliatePageUrlFinal = affiliatePageUrlUsed || urlGuess || existing?.affiliatePageUrl || null;
        const vendorPageUrlFinal = vendorPageUrlUsed || vendorUrlGuess || existing?.vendorPageUrl || null;
        const vendorPageInsights = { elementosPresellReferencia: comp?.elementos_presell_referencia ?? [] };

        // Garantido em código, não depende do LLM lembrar. Se não está explicitamente
        // confirmado "true", entra alerta crítico de canal. Brand bidding é um alerta
        // SEPARADO (não bloqueia o canal) — caso FemiCore, corrigido 2026-07-27: o vendor só
        // proíbe usar o termo da marca, o canal Search continua permitido.
        const alertasFinal = [...(comp?.alertas ?? [])];
        if (canaisInfo.campaignValidation.googleSearchAllowed !== true) {
          alertasFinal.unshift({
            nivel: 'critico',
            texto: canaisInfo.campaignValidation.googleSearchAllowed === false
              ? `Google Search/AdWords é PROIBIDO por este vendor. Fonte: ${canaisInfo.campaignValidation.notes}`
              : `Permissão de Google Search NÃO confirmada com a página real de afiliados — não rodar Search antes de verificar manualmente (${affiliatePageUrlFinal ?? 'página de afiliados não encontrada'}).`,
          });
        }
        if (canaisInfo.campaignValidation.brandBiddingAllowed === false) {
          alertasFinal.unshift({
            nivel: 'critico',
            texto: `Brand bidding proibido: não usar/dar bid no(s) termo(s) ${(canaisInfo.forbiddenTerms.length ? canaisInfo.forbiddenTerms : [productName]).join(', ')} em keywords ou copy de anúncio (adicionar como negativa exata). O canal Search em si continua permitido.`,
          });
        }

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
            compliance: { risco_geral: comp?.risco_geral, alertas: alertasFinal, regras_reescrita: comp?.regras_reescrita ?? [] },
            affiliatePageUrl: affiliatePageUrlFinal,
            vendorPageUrl: vendorPageUrlFinal,
            affiliateInsights: { ...(existing?.affiliateInsights as any ?? {}), ...canaisInfo, vendorPageInsights },
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
            compliance: { risco_geral: comp?.risco_geral, alertas: alertasFinal, regras_reescrita: comp?.regras_reescrita ?? [] },
            affiliatePageUrl: affiliatePageUrlFinal,
            vendorPageUrl: vendorPageUrlFinal,
            affiliateInsights: { ...canaisInfo, vendorPageInsights },
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
