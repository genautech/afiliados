import fs from 'fs';
import path from 'path';
import { prisma } from './prisma';
import { callAgent } from './llm';

export interface PresellContent {
  categoria: string;
  headline: string;
  subheadline: string;
  autor: string;
  leitura_min: number;
  abertura: string;
  secao1_titulo: string;
  secao1_texto: string;
  secao2_titulo: string;
  secao2_texto: string;
  beneficios: string[];
  prova: string;
  cta_texto: string;
  cta_reforco: string;
  secao3_titulo: string;
  secao3_texto: string;
  faq: { pergunta: string; resposta: string }[];
  cta_final: string;
  titulo_pagina: string;
  meta_descricao: string;
  nome_site: string;
}

const BUILDER_PROMPT = `Você é o Presell Builder do AfiliAds: redator de páginas de pré-venda (bridge pages) para afiliados ClickBank que precisam ser APROVADAS pelo Google Ads.

Regras invioláveis (valem para QUALQUER produto/nicho):
- Conteúdo editorial genuíno (review honesto/advertorial informativo), NUNCA "doorway page".
- Zero claims absolutos ou de diagnóstico/cura/garantia de resultado ("cura", "elimina", "garantido", "perca X kg em Y dias", "livre-se de"). Reescreva SEMPRE para linguagem condicional e focada em benefício/experiência (ex.: "pode apoiar", "ajuda a promover conforto", "contribui para o bem-estar") — nunca prometa o resultado, descreva o suporte que o produto oferece.
- Para nichos sensíveis (saúde, corpo, finanças, relacionamentos, fases da vida como menopausa/envelhecimento): trate o tema com empatia, dignidade e respeito. Sem linguagem explícita, constrangedora ou de mau gosto. Foque em qualidade de vida, confiança e bem-estar do leitor.
- Inclua contras reais na seção de pontos fortes/fracos.
- Prova social apenas verificável (garantia oficial, nº de avaliações públicas).
- CTA visível, direto e persuasivo, mas sem promessa de resultado (ex.: "Descubra Como Funciona", "Veja a Análise Completa").
- Se o contexto abaixo trouxer riscos de compliance específicos do produto (seção "RISCOS DE COMPLIANCE A EVITAR"), reescreva o conteúdo especificamente para não incorrer em NENHUM deles.
- Idioma conforme solicitado (en para US/UK/AU, pt-BR para Brasil).
- Tipos de página curtos (pogo, vsl) só exibem headline/subheadline/abertura/prova/cta — capriche
  nesses campos especificamente, mesmo respondendo o JSON completo abaixo.
Responda APENAS JSON válido com exatamente estas chaves:
{"categoria","headline","subheadline","autor","leitura_min","abertura","secao1_titulo","secao1_texto","secao2_titulo","secao2_texto","beneficios":["3-5 itens"],"prova","cta_texto","cta_reforco","secao3_titulo","secao3_texto","faq":[{"pergunta","resposta"},{"pergunta","resposta"},{"pergunta","resposta"}],"cta_final","titulo_pagina","meta_descricao","nome_site"}
"autor" = nome editorial plausível sem sobrenome famoso; "nome_site" = nome de site editorial genérico do nicho (sem trademark do produto).`;

const HEALTH_NICHE_RE = /health|sa[uú]de|nutra|beauty|beleza|wellness|bem-estar|supplement|suplemento|weight loss|emagrec|menopaus|urin[aá]r|incontin/i;

function detectHealthNiche(vertical?: string | null, tags?: unknown, extra?: string): boolean {
  const tagsStr = Array.isArray(tags) ? tags.join(' ') : '';
  return HEALTH_NICHE_RE.test(`${vertical ?? ''} ${tagsStr} ${extra ?? ''}`);
}

const DISCLAIMER_SAUDE_HTML = '<br>Este produto não se destina a diagnosticar, tratar, curar ou prevenir qualquer doença.<br>Sempre consulte um profissional de saúde antes de iniciar qualquer novo suplemento ou programa de bem-estar.';

function esc(s: string): string {
  return String(s ?? '');
}

export function slugify(name: string): string {
  return name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48);
}

const TEMPLATE_FILE_BY_TYPE: Record<string, string> = {
  advertorial: 'presell-template.html',
  pogo: 'presell-template-pogo.html',
  vsl: 'presell-template-vsl.html',
};

// Gate de retenção (pop-up "pressione e segure"): mesma experiência pra qualquer visitante
// (não distingue bot/humano — não é cloaking), só adiciona um passo de interação real antes
// de revelar o conteúdo. Baseado no formato "Press and Hold" descrito no insight
// hermes/knowledge/insights/2026-07-26-tipos-de-presell-e-popup-gate.md.
function popupGateHtml(): string {
  return `<div id="pg-overlay" style="position:fixed;inset:0;z-index:9999;background:rgba(20,20,25,.92);display:flex;align-items:center;justify-content:center;flex-direction:column;text-align:center;padding:24px;font-family:Arial,sans-serif">
  <div style="color:#fff;font-size:16px;margin-bottom:22px;max-width:320px">Toque e segure o botão por 2 segundos para continuar</div>
  <button id="pg-btn" style="position:relative;width:110px;height:110px;border-radius:50%;background:#1f3864;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center">
    <svg width="110" height="110" style="position:absolute;top:0;left:0;transform:rotate(-90deg)">
      <circle cx="55" cy="55" r="48" fill="none" stroke="rgba(255,255,255,.15)" stroke-width="6"/>
      <circle id="pg-ring" cx="55" cy="55" r="48" fill="none" stroke="#e07b39" stroke-width="6" stroke-dasharray="301.6" stroke-dashoffset="301.6" stroke-linecap="round"/>
    </svg>
    <span style="color:#fff;font-size:13px;font-weight:bold;pointer-events:none">SEGURE</span>
  </button>
</div>
<script>
(function(){
  var overlay = document.getElementById('pg-overlay');
  var btn = document.getElementById('pg-btn');
  var ring = document.getElementById('pg-ring');
  var DURATION = 2200, CIRC = 301.6;
  var raf = null, start = null;
  function frame(ts){
    if (!start) start = ts;
    var pct = Math.min(1, (ts - start) / DURATION);
    ring.setAttribute('stroke-dashoffset', String(CIRC * (1 - pct)));
    if (pct >= 1) { finish(); return; }
    raf = requestAnimationFrame(frame);
  }
  function begin(){ if (raf) return; start = null; raf = requestAnimationFrame(frame); }
  function cancel(){ if (raf) cancelAnimationFrame(raf); raf = null; start = null; ring.setAttribute('stroke-dashoffset', String(CIRC)); }
  function finish(){
    cancel();
    overlay.style.transition = 'opacity .35s';
    overlay.style.opacity = '0';
    setTimeout(function(){ overlay.remove(); }, 350);
  }
  btn.addEventListener('pointerdown', begin);
  btn.addEventListener('pointerup', cancel);
  btn.addEventListener('pointerleave', cancel);
  btn.addEventListener('pointercancel', cancel);
  btn.addEventListener('keydown', function(e){ if (e.key === 'Enter' || e.key === ' ') begin(); });
  btn.addEventListener('keyup', function(e){ if (e.key === 'Enter' || e.key === ' ') cancel(); });
})();
</script>`;
}

function renderVideoEmbed(videoUrl: string): string {
  const yt = videoUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/i);
  if (yt) return `<iframe src="https://www.youtube.com/embed/${yt[1]}" title="video" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
  const vimeo = videoUrl.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (vimeo) return `<iframe src="https://player.vimeo.com/video/${vimeo[1]}" title="video" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
  return `<video controls playsinline src="${esc(videoUrl)}"></video>`;
}

export function renderPresellHtml(c: PresellContent, opts: { productName: string; hopLink: string; googleAdsId?: string; isHealthNiche?: boolean; pageType?: string; popupGate?: boolean; videoUrl?: string; imagemProdutoUrl?: string }): string {
  const pageType = opts.pageType && TEMPLATE_FILE_BY_TYPE[opts.pageType] ? opts.pageType : 'advertorial';
  const templatePath = path.join(process.cwd(), 'lib', TEMPLATE_FILE_BY_TYPE[pageType]);
  let t = fs.readFileSync(templatePath, 'utf8');

  const now = new Date();
  const dataFmt = now.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  t = t.replace(/\{\{TITULO_DA_PAGINA\}\}/g, esc(c.titulo_pagina));
  t = t.replace(/\{\{META_DESCRICAO\}\}/g, esc(c.meta_descricao));
  t = t.replace(/\{\{NOME_DO_SITE\}\}/g, esc(c.nome_site));
  t = t.replace(/\{\{ANO\}\}/g, String(now.getFullYear()));
  t = t.replace(/\{\{AUTOR\}\}/g, esc(c.autor));
  t = t.replace(/\{\{DATA\}\}/g, dataFmt);
  t = t.replace(/\{\{X\}\}/g, String(c.leitura_min ?? 4));

  t = t.replace('{{CATEGORIA — ex.: REVIEW HONESTO}}', esc(c.categoria));
  t = t.replace('{{HEADLINE — a promessa editorial, sem promessa de resultado}}', esc(c.headline));
  t = t.replace('{{SUBHEADLINE — expande a headline com o benefício de LER o artigo}}', esc(c.subheadline));
  t = t.replace('{{ABERTURA — a dor/situação do leitor em 2–3 frases, na linguagem dele. Mostre que você entende o problema ANTES de falar de solução.}}', esc(c.abertura));
  t = t.replace('{{SEÇÃO 1 — O problema real / por que as soluções comuns falham}}', esc(c.secao1_titulo));
  t = t.replace('{{Conteúdo original genuíno. Esta seção é o que separa a página de uma "bridge page" reprovável: ensine algo de verdade.}}', esc(c.secao1_texto));
  t = t.replace('{{SEÇÃO 2 — O que é {{PRODUTO}} e como funciona}}', esc(c.secao2_titulo));
  t = t.replace('{{Descrição honesta: o que entrega, para quem é, para quem NÃO é.}}', esc(c.secao2_texto));

  const [b1, b2, b3, ...rest] = c.beneficios ?? [];
  t = t.replace('{{Entregável/benefício 1}}', esc(b1 ?? ''));
  t = t.replace('{{Entregável/benefício 2}}', esc(b2 ?? ''));
  t = t.replace('{{Entregável/benefício 3}}', esc([b3, ...rest].filter(Boolean).join(' · ') || ''));

  t = t.replace('{{PROVA REAL — número de alunos/avaliação/garantia oficial da oferta. Somente dados verificáveis da página do produtor.}}', esc(c.prova));
  t = t.replace('{{TEXTO DO CTA — ex.: Conhecer o {{PRODUTO}} Agora}}', esc(c.cta_texto));
  t = t.replace('{{Reforço sob o botão — ex.: Garantia incondicional de 7 dias}}', esc(c.cta_reforco));
  t = t.replace('{{SEÇÃO 3 — Pontos fortes e pontos fracos}}', esc(c.secao3_titulo));
  t = t.replace('{{Review honesto inclui contras reais. Isso aumenta conversão E aprova na revisão do Google.}}', esc(c.secao3_texto));

  const faq = c.faq ?? [];
  t = t.replace('{{Pergunta 1?}}', esc(faq[0]?.pergunta ?? ''));
  t = t.replace('{{Resposta.}}', esc(faq[0]?.resposta ?? ''));
  t = t.replace('{{Pergunta 2?}}', esc(faq[1]?.pergunta ?? ''));
  // segundo "{{Resposta.}}" remanescente
  t = t.replace('{{Resposta.}}', esc(faq[1]?.resposta ?? ''));
  t = t.replace('{{CTA FINAL}}', esc(c.cta_final));

  t = t.replace(/LINK_DE_AFILIADO_AQUI/g, esc(opts.hopLink));
  if (opts.googleAdsId) t = t.replace(/GOOGLE_ADS_ID/g, esc(opts.googleAdsId));
  t = t.replace('{{DISCLAIMER_SAUDE}}', opts.isHealthNiche ? DISCLAIMER_SAUDE_HTML : '');
  t = t.replace('{{POPUP_GATE}}', opts.popupGate ? popupGateHtml() : '');
  if (pageType === 'vsl') t = t.replace('{{VIDEO_EMBED}}', renderVideoEmbed(opts.videoUrl ?? ''));
  t = t.replace('{{IMAGEM_PRODUTO}}', opts.imagemProdutoUrl
    ? `<img class="produto-img" src="${esc(opts.imagemProdutoUrl)}" alt="${esc(opts.productName)}" loading="lazy">`
    : '');

  return t;
}

function wpSites(): Record<string, { user: string; appPassword: string }> {
  try {
    return JSON.parse(process.env.WP_SITES_JSON ?? '{}');
  } catch {
    return {};
  }
}

export async function publishToWordPress(html: string, opts: { domain: string; title: string; slug: string }) {
  const site = wpSites()[opts.domain];
  if (!site) throw new Error(`Domínio WordPress "${opts.domain}" não configurado em WP_SITES_JSON`);
  const auth = Buffer.from(`${site.user}:${site.appPassword}`).toString('base64');
  const res = await fetch(`https://${opts.domain}/wp-json/wp/v2/pages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` },
    body: JSON.stringify({ title: opts.title, slug: opts.slug, content: html, status: 'publish' }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Erro ao publicar no WordPress (${opts.domain}): ${data?.message ?? res.status}`);
  return data.link as string;
}

export async function generatePresell(userId: string, args: {
  productName: string;
  hopLink: string;
  trackingId?: string;
  angle?: string;
  geo?: string;
  language?: string;
  productId?: string;
  googleAdsId?: string;
  context?: string;
  destino?: 'railway' | 'wordpress';
  dominio?: string;
  pageType?: string;
  popupGate?: boolean;
  videoUrl?: string;
}) {
  const { productName, hopLink } = args;
  const angle = args.angle ?? 'review';
  const geo = args.geo ?? 'US';
  const language = args.language ?? (geo === 'BR' ? 'pt-BR' : 'en');
  const pageType = args.pageType && ['advertorial', 'pogo', 'vsl'].includes(args.pageType) ? args.pageType : 'advertorial';
  const popupGate = !!args.popupGate;
  if (pageType === 'vsl' && !args.videoUrl?.trim()) {
    throw new Error('pageType "vsl" exige videoUrl (link do vídeo do VSL — YouTube, Vimeo ou .mp4 direto)');
  }

  let productCtx = args.context ?? '';
  let isHealthNiche = detectHealthNiche(undefined, undefined, `${angle} ${args.context ?? ''}`);
  let imagemProdutoUrl: string | undefined;
  if (args.productId) {
    const p = await prisma.productResearch.findFirst({ where: { id: args.productId, userId } });
    if (p) {
      isHealthNiche = detectHealthNiche(p.vertical, p.tags, `${angle} ${args.context ?? ''}`);
      productCtx += `\nDossiê: vertical ${p.vertical}; resumo: ${p.summary}; melhor keyword: ${p.chosenKeyword}`;
      const strategy = p.strategy as any;
      if (strategy?.presell?.elementos?.length) {
        productCtx += `\nELEMENTOS OBRIGATÓRIOS DA PRESELL (definidos na análise do produto): ${strategy.presell.elementos.join('; ')}`;
      }
      const alertas = (p.compliance as any)?.alertas as Array<{ nivel: string; texto: string }> | undefined;
      const criticos = alertas?.filter(a => a.nivel === 'critico').map(a => a.texto) ?? [];
      if (criticos.length > 0) {
        productCtx += `\nRISCOS DE COMPLIANCE A EVITAR (críticos, apontados na análise deste produto):\n- ${criticos.join('\n- ')}`;
      }
      const rewriteRules = (p.compliance as any)?.regras_reescrita as Array<{ evitar: string; usar: string }> | undefined;
      if (rewriteRules?.length) {
        productCtx += `\nSUBSTITUIÇÕES OBRIGATÓRIAS DE LINGUAGEM (evitar → usar):\n${rewriteRules.map(r => `- "${r.evitar}" → "${r.usar}"`).join('\n')}`;
      }
      // Assets oficiais do vendor (pasta compartilhada pelo afiliado): usados como contexto de
      // ângulo/público e, quando há foto de produto real, embutidos na presell no lugar de nada.
      const assets = (p.affiliateInsights as any)?.assets as { pastaUrl?: string; estrutura?: string[]; imagemProdutoUrl?: string } | undefined;
      if (assets?.estrutura?.length) {
        productCtx += `\nASSETS OFICIAIS DO VENDOR DISPONÍVEIS (pasta: ${p.assetsUrl ?? assets.pastaUrl}): ${assets.estrutura.join(' | ')}. Use como referência de público/ângulo real do vendor — NÃO copie claims agressivos de banners de rede social, mantenha a linguagem compliance-safe já definida acima.`;
      }
      if (assets?.imagemProdutoUrl) imagemProdutoUrl = assets.imagemProdutoUrl;
    }
  }

  const res = await callAgent(userId, {
    agent: 'presell-builder',
    systemPrompt: BUILDER_PROMPT,
    userPrompt: `Produto: ${productName} (ClickBank). Ângulo: ${angle}. Geo: ${geo}. Idioma: ${language}.${productCtx}\nJSON puro.`,
  });
  const content = res.data as PresellContent | null;
  if (!content?.headline) throw new Error('Presell Builder retornou conteúdo inválido');

  // Hoplink com TID (tracking da campanha) se informado.
  // ClickBank TID: só a-z/0-9/_, até 100 chars — hífen quebra o tracking.
  let finalHop = hopLink;
  if (args.trackingId && !/[?&]tid=/i.test(hopLink)) {
    const tid = args.trackingId.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 100);
    finalHop += (hopLink.includes('?') ? '&' : '?') + 'tid=' + encodeURIComponent(tid);
  }

  const html = renderPresellHtml(content, {
    productName, hopLink: finalHop, googleAdsId: args.googleAdsId, isHealthNiche,
    pageType, popupGate, videoUrl: args.videoUrl, imagemProdutoUrl,
  });

  const baseSlug = slugify(`${productName}-${pageType}`);
  let slug = baseSlug;
  for (let i = 2; await prisma.presell.findUnique({ where: { slug } }); i++) slug = `${baseSlug}-${i}`;

  const destino = args.destino ?? 'railway';
  let publishedUrl = '';
  if (destino === 'wordpress') {
    if (!args.dominio) throw new Error('dominio é obrigatório quando destino=wordpress');
    publishedUrl = await publishToWordPress(html, { domain: args.dominio, title: content.titulo_pagina, slug });
  }

  const presell = await prisma.presell.create({
    data: {
      userId,
      productId: args.productId ?? null,
      slug,
      title: content.titulo_pagina,
      productName,
      hopLink: finalHop,
      trackingId: args.trackingId ?? '',
      angle,
      pageType,
      popupGate,
      videoUrl: args.videoUrl ?? '',
      geo,
      language,
      html,
      content: content as any,
      status: 'publicada',
      googleAdsId: args.googleAdsId ?? '',
      publishTarget: destino,
      wpDomain: destino === 'wordpress' ? args.dominio! : '',
      publishedUrl,
    },
  });
  return { presell, usage: res.usage, provider: res.provider, model: res.model };
}
