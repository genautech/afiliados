import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { prisma } from './prisma';
import { callAgent } from './llm';
import { computeEconomics } from './campaign-rules';
import { getMarketIntelReferencia } from './marketIntel';

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
  pros: string[];
  contras: string[];
  faq: { pergunta: string; resposta: string }[];
  cta_final: string;
  titulo_pagina: string;
  meta_descricao: string;
  nome_site: string;
}

// Rota de oferta por segmento, usada só pelo pageType 'interstitial'. O popup de
// segmentação (país/gênero/idade) escolhe a primeira rota cujos critérios batem com a
// resposta do visitante; campos ausentes ou 'ANY' equivalem a "qualquer valor". Sem match
// (ou sem rotas configuradas), a página usa o hopLink/headline padrão da presell.
export interface SegmentRoute {
  label: string;
  geo?: string;
  gender?: 'M' | 'F' | 'O' | 'ANY';
  ageRange?: '18-24' | '25-34' | '35-44' | '45-54' | '55+' | 'ANY';
  hopLink: string;
  headline?: string;
  ctaTexto?: string;
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
- Tipos de página curtos (pogo, vsl, interstitial) só exibem headline/subheadline/abertura/prova/cta —
  capriche nesses campos especificamente, mesmo respondendo o JSON completo abaixo.
- pageType "interstitial": SEM artigo, é um teaser sobre o screenshot real da sales page do vendor.
  Headline/prova/cta devem funcionar soltos, sem depender do resto do texto. Nunca use linguagem que
  simule ser a própria página do vendor (ex.: "clique para continuar carregando") — a divulgação de
  afiliado continua obrigatória. Este tipo é restrito a Native/Display/YouTube/social; NUNCA gerar
  para uma campanha de Google Search (o Compliance Sentinel bloqueia isso no fluxo de geração).

TÉCNICAS DE BRIDGE PAGE (não são decorativas — aplicar sempre):
- Coerência de jornada: headline e ângulo aqui devem ecoar a promessa do anúncio/keyword de origem
  (contexto abaixo) — o leitor não pode sentir que caiu num lugar diferente do que clicou.
- Venda o PRÓXIMO CLIQUE, não o produto inteiro: o objetivo desta página é fazer o leitor querer
  ver a oferta, não fechar a venda aqui. Uma curiosidade/lacuna genuína resolvida só no CTA.
- Uma única ação óbvia: todo o texto empurra pra UM CTA, nunca dilui atenção com múltiplos caminhos.
- "abertura" mostra que você entende a dor do leitor ANTES de mencionar a solução — sem isso a
  página lê como anúncio, não como conteúdo editorial (é o que reprova no Google Ads).
- Pontos fracos reais na seção 3 não são só "compliance" — aumentam conversão porque parecem
  honestos; um review sem nenhum contra soa falso. Gere "pros" (3-4 itens curtos, começando com
  o benefício, ex.: "Ingredientes 100% naturais") e "contras" (2-3 itens reais e específicos, ex.:
  "Resultados variam conforme o organismo" / "Disponível só no site oficial") — formato de lista
  visual pros/contras converte mais que texto corrido porque é honesto E fácil de escanear.
- Idioma do conteúdo TEM que ser exatamente o idioma pedido em "Idioma" no prompt do usuário —
  nunca misture idiomas dentro da mesma página (ex.: título de seção em português numa página en).
Responda APENAS JSON válido com exatamente estas chaves:
{"categoria","headline","subheadline","autor","leitura_min","abertura","secao1_titulo","secao1_texto","secao2_titulo","secao2_texto","beneficios":["3-5 itens"],"prova","cta_texto","cta_reforco","secao3_titulo","secao3_texto","pros":["3-4 itens"],"contras":["2-3 itens"],"faq":[{"pergunta","resposta"},{"pergunta","resposta"},{"pergunta","resposta"}],"cta_final","titulo_pagina","meta_descricao","nome_site"}
"autor" = nome editorial plausível sem sobrenome famoso; "nome_site" = nome de site editorial genérico do nicho (sem trademark do produto).`;

const HEALTH_NICHE_RE = /health|sa[uú]de|nutra|beauty|beleza|wellness|bem-estar|supplement|suplemento|weight loss|emagrec|menopaus|urin[aá]r|incontin/i;

function detectHealthNiche(vertical?: string | null, tags?: unknown, extra?: string): boolean {
  const tagsStr = Array.isArray(tags) ? tags.join(' ') : '';
  return HEALTH_NICHE_RE.test(`${vertical ?? ''} ${tagsStr} ${extra ?? ''}`);
}

function esc(s: string): string {
  return String(s ?? '');
}

/** Idioma da presell vem de `args.language` em generatePresell ('en'|'pt-BR'|...) — tudo que é
 * texto FIXO do template (footer, disclosure, cookie banner, popup gate, FAQ heading, gate de
 * segmentação) precisa seguir esse idioma, não só o conteúdo gerado pelo LLM. Bug real
 * encontrado 2026-07-27: esses textos estavam hardcoded em pt-BR em TODOS os templates,
 * inclusive `<html lang="pt-BR">` fixo — uma presell em inglês (ex.: FemiCore/US) saía com
 * footer, cookie banner e "Perguntas frequentes" em português. */
function isEnglish(language?: string): boolean {
  return !language || !language.toLowerCase().startsWith('pt');
}

interface Locale {
  htmlLang: string;
  dateLocale: string;
  metaLineTemplate: string;
  faqHeading: string;
  prosHeading: string;
  consHeading: string;
  disclosureFull: string;
  disclosureShort: string;
  disclosureInterstitial: string;
  disclaimerSaude: string;
  privacyLabel: string;
  termsLabel: string;
  contactLabel: string;
  rightsReserved: string;
  cookieMsg: string;
  cookieAccept: string;
  cookieReject: string;
  popupHoldMsg: string;
  popupHoldLabel: string;
  segEyebrow: string;
  segLead: string;
  segCountryLabel: string;
  segSelectPlaceholder: string;
  segCountries: [string, string][];
  segGenderLabel: string;
  segGenders: [string, string][];
  segAgeLabel: string;
  segContinue: string;
}

const LOCALE_EN: Locale = {
  htmlLang: 'en',
  dateLocale: 'en-US',
  metaLineTemplate: 'By {{AUTOR}} · Updated {{DATA}} · {{X}} min read',
  faqHeading: 'Frequently Asked Questions',
  prosHeading: 'What we liked',
  consHeading: 'What to consider',
  disclosureFull: 'Affiliate Disclosure: this site participates in affiliate programs and may earn a commission from purchases made through the links, at no extra cost to you. We only recommend what we have independently evaluated.<br>Individual results may vary.',
  disclosureShort: 'Affiliate Disclosure: this site participates in affiliate programs and may earn a commission from purchases made through the links, at no extra cost to you.<br>Individual results may vary.',
  disclosureInterstitial: 'Affiliate Disclosure: this site participates in affiliate programs and may earn a commission from purchases made through the links, at no extra cost to you.',
  disclaimerSaude: '<br>This product is not intended to diagnose, treat, cure, or prevent any disease.<br>Always consult a healthcare professional before starting any new supplement or wellness program.',
  privacyLabel: 'Privacy Policy',
  termsLabel: 'Terms of Use',
  contactLabel: 'Contact',
  rightsReserved: 'All rights reserved.',
  cookieMsg: 'We use cookies to analyze traffic and show more relevant ads.',
  cookieAccept: 'Accept',
  cookieReject: 'Decline',
  popupHoldMsg: 'Tap and hold the button for 2 seconds to continue',
  popupHoldLabel: 'HOLD',
  segEyebrow: 'Before you continue',
  segLead: "Quick question so we can show you the right offer:",
  segCountryLabel: 'Country',
  segSelectPlaceholder: 'Select',
  segCountries: [['US', 'United States'], ['UK', 'United Kingdom'], ['AU', 'Australia'], ['CA', 'Canada'], ['BR', 'Brazil'], ['OUTRO', 'Other']],
  segGenderLabel: 'Gender',
  segGenders: [['F', 'Female'], ['M', 'Male'], ['O', 'Prefer not to say']],
  segAgeLabel: 'Age range',
  segContinue: 'Continue',
};

const LOCALE_PT: Locale = {
  htmlLang: 'pt-BR',
  dateLocale: 'pt-BR',
  metaLineTemplate: 'Por {{AUTOR}} · Atualizado em {{DATA}} · Leitura de {{X}} min',
  faqHeading: 'Perguntas frequentes',
  prosHeading: 'O que gostamos',
  consHeading: 'Pontos de atenção',
  disclosureFull: 'Divulgação: este site participa de programas de afiliados e pode receber comissão por compras feitas pelos links, sem custo adicional para você. Recomendamos apenas o que avaliamos de forma independente.<br>Resultados individuais podem variar.',
  disclosureShort: 'Divulgação: este site participa de programas de afiliados e pode receber comissão por compras feitas pelos links, sem custo adicional para você.<br>Resultados individuais podem variar.',
  disclosureInterstitial: 'Divulgação: este site participa de programas de afiliados e pode receber comissão por compras feitas pelos links, sem custo adicional para você.',
  disclaimerSaude: '<br>Este produto não se destina a diagnosticar, tratar, curar ou prevenir qualquer doença.<br>Sempre consulte um profissional de saúde antes de iniciar qualquer novo suplemento ou programa de bem-estar.',
  privacyLabel: 'Política de Privacidade',
  termsLabel: 'Termos de Uso',
  contactLabel: 'Contato',
  rightsReserved: 'Todos os direitos reservados.',
  cookieMsg: 'Usamos cookies para analisar tráfego e mostrar anúncios mais relevantes.',
  cookieAccept: 'Aceitar',
  cookieReject: 'Recusar',
  popupHoldMsg: 'Toque e segure o botão por 2 segundos para continuar',
  popupHoldLabel: 'SEGURE',
  segEyebrow: 'Antes de continuar',
  segLead: 'Responda rapidinho pra gente te mostrar a oferta certa:',
  segCountryLabel: 'País',
  segSelectPlaceholder: 'Selecione',
  segCountries: [['US', 'Estados Unidos'], ['UK', 'Reino Unido'], ['AU', 'Austrália'], ['CA', 'Canadá'], ['BR', 'Brasil'], ['OUTRO', 'Outro']],
  segGenderLabel: 'Gênero',
  segGenders: [['F', 'Feminino'], ['M', 'Masculino'], ['O', 'Prefiro não dizer']],
  segAgeLabel: 'Faixa etária',
  segContinue: 'Continuar',
};

function pickLocale(language?: string): Locale {
  return isEnglish(language) ? LOCALE_EN : LOCALE_PT;
}

export function slugify(name: string): string {
  return name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48);
}

const TEMPLATE_FILE_BY_TYPE: Record<string, string> = {
  advertorial: 'presell-template.html',
  pogo: 'presell-template-pogo.html',
  vsl: 'presell-template-vsl.html',
  interstitial: 'presell-template-interstitial.html',
};

// Screenshot da sales page real do vendor (usado só pelo pageType 'interstitial'), via
// microlink.io — sem chave de API para uso pontual (geração de presell, não por visitante).
// Falha de captura (página bloqueia bot, timeout, etc.) não derruba a geração: a página cai
// pra um fundo neutro em vez de screenshot.
async function captureSalesPageScreenshot(url: string): Promise<string | undefined> {
  try {
    const api = `https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true&meta=false&viewport.width=1280&viewport.height=1600`;
    const res = await fetch(api, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return undefined;
    const data = await res.json();
    return (data?.data?.screenshot?.url as string | undefined) ?? undefined;
  } catch {
    return undefined;
  }
}

// Gate de retenção (pop-up "pressione e segure"): mesma experiência pra qualquer visitante
// (não distingue bot/humano — não é cloaking), só adiciona um passo de interação real antes
// de revelar o conteúdo. Baseado no formato "Press and Hold" descrito no insight
// hermes/knowledge/insights/2026-07-26-tipos-de-presell-e-popup-gate.md.
function popupGateHtml(locale: Locale): string {
  return `<div id="pg-overlay" style="position:fixed;inset:0;z-index:9999;background:rgba(20,20,25,.92);display:flex;align-items:center;justify-content:center;flex-direction:column;text-align:center;padding:24px;font-family:Arial,sans-serif">
  <div style="color:#fff;font-size:16px;margin-bottom:22px;max-width:320px">${esc(locale.popupHoldMsg)}</div>
  <button id="pg-btn" style="position:relative;width:110px;height:110px;border-radius:50%;background:#1f3864;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center">
    <svg width="110" height="110" style="position:absolute;top:0;left:0;transform:rotate(-90deg)">
      <circle cx="55" cy="55" r="48" fill="none" stroke="rgba(255,255,255,.15)" stroke-width="6"/>
      <circle id="pg-ring" cx="55" cy="55" r="48" fill="none" stroke="#e07b39" stroke-width="6" stroke-dasharray="301.6" stroke-dashoffset="301.6" stroke-linecap="round"/>
    </svg>
    <span style="color:#fff;font-size:13px;font-weight:bold;pointer-events:none">${esc(locale.popupHoldLabel)}</span>
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

// Banner de consentimento de cookies (Google Consent Mode v2). O gtag do Google Ads já seta
// cookie no load — sem isso, GA4/Ads/Meta rodariam sem nenhum aviso ao visitante (achado ao
// vivo nesta sessão). "Aceitar"/"Recusar" persistem em localStorage; recusar mantém o consent
// mode em "denied" (Google ainda registra conversão agregada/modelada, sem cookie individual —
// comportamento padrão do Consent Mode, não é workaround nosso) e não inicializa o Meta Pixel.
function cookieConsentHtml(locale: Locale): string {
  return `<div id="cc-banner" style="position:fixed;left:0;right:0;bottom:0;z-index:9998;background:#0f172a;color:#e2e8f0;padding:14px 18px;font-family:Arial,sans-serif;font-size:13px;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:12px;box-shadow:0 -2px 12px rgba(0,0,0,.25)">
  <span style="max-width:480px">${esc(locale.cookieMsg)} <a href="/politica-de-privacidade" style="color:#e07b39">${esc(locale.privacyLabel)}</a></span>
  <button id="cc-accept" style="background:#e07b39;color:#fff;border:none;padding:8px 18px;border-radius:6px;font-weight:bold;cursor:pointer">${esc(locale.cookieAccept)}</button>
  <button id="cc-reject" style="background:transparent;color:#94a3b8;border:1px solid #334155;padding:8px 18px;border-radius:6px;cursor:pointer">${esc(locale.cookieReject)}</button>
</div>
<script>
(function(){
  var KEY = 'cc_consent';
  var banner = document.getElementById('cc-banner');
  function hide(){ if (banner) banner.remove(); }
  function grant(){
    if (typeof gtag === 'function') gtag('consent', 'update', { ad_storage: 'granted', analytics_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted' });
    if (typeof window.__initMetaPixel === 'function') window.__initMetaPixel();
    if (typeof window.__attachTracking === 'function') window.__attachTracking();
  }
  var saved = localStorage.getItem(KEY);
  if (saved === 'granted') { grant(); hide(); return; }
  if (saved === 'denied') { hide(); return; }
  var accept = document.getElementById('cc-accept');
  var reject = document.getElementById('cc-reject');
  if (accept) accept.addEventListener('click', function(){ localStorage.setItem(KEY, 'granted'); grant(); hide(); });
  if (reject) reject.addEventListener('click', function(){ localStorage.setItem(KEY, 'denied'); hide(); });
})();
</script>`;
}

/** Captura gclid/wbraid/gbraid/fbclid/msclkid/ttclid/utm_* da URL e GRAVA num cookie próprio
 * (afp_track, 1ª parte, 30 dias) — não só repassa na URL como o concorrente FlowPages faz
 * (confirmado pesquisando a central de ajuda deles em 2026-07-27: o script deles só reanexa os
 * parâmetros da querystring atual nos links, sem persistir nada — se o visitante voltar depois
 * sem os parâmetros na URL, a origem se perde). Aqui o cookie sobrevive a essa perda, e os
 * parâmetros ficam disponíveis em document.cookie pra qualquer postback/CRM que precise deles.
 * Só grava com consentimento já concedido (mesmo gate do Consent Mode acima) — cookie de
 * atribuição é não-essencial. Roda de novo a cada clique no CTA (não só no load) porque o
 * visitante pode aceitar cookies só depois de já estar lendo a página. */
/** clickBeaconUrl: endpoint absoluto (não relativo — a presell pode estar hospedada num
 * domínio WordPress externo do afiliado, não no domínio do app) que incrementa
 * `Presell.ctaClicks` a cada clique real no CTA. Sem isso o contador nunca é incrementado —
 * achado na revisão de 2026-07-27: `rankPresellOutcomes()` (aprendizado contínuo) já lia
 * `ctaClicks` pra rankear pageType por canal, mas nada no HTML gerado jamais escrevia nesse
 * campo. `sendBeacon` é fire-and-forget: não bloqueia navegação, não precisa esperar resposta,
 * e funciona cross-origin sem CORS porque é uma requisição "simples" (sem header custom). */
function trackingScriptHtml(clickBeaconUrl?: string): string {
  return `<script>
(function(){
  var COOKIE_NAME = 'afp_track';
  var CLICK_BEACON_URL = ${JSON.stringify(clickBeaconUrl ?? null)};
  var TRACK_KEYS = ['gclid','wbraid','gbraid','fbclid','msclkid','ttclid','sck','utm_source','utm_medium','utm_campaign','utm_term','utm_content'];
  function consentGranted(){ return localStorage.getItem('cc_consent') === 'granted'; }
  function readCookie(name){
    var m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : '';
  }
  function writeCookie(name, value, days){
    var d = new Date(); d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = name + '=' + encodeURIComponent(value) + ';expires=' + d.toUTCString() + ';path=/;SameSite=Lax';
  }
  function paramsFromUrl(){
    var out = {};
    var sp = new URLSearchParams(window.location.search);
    TRACK_KEYS.forEach(function(k){ var v = sp.get(k); if (v) out[k] = v; });
    if (out.gclid && !out.sck) out.sck = out.gclid; // sck: alias aceito por plataformas de tracking BR
    return out;
  }
  function storedParams(){
    try { return JSON.parse(readCookie(COOKIE_NAME) || localStorage.getItem(COOKIE_NAME) || '{}'); } catch (e) { return {}; }
  }
  function mergedParams(){
    return Object.assign({}, storedParams(), paramsFromUrl()); // parâmetro presente na URL atual sempre vence o salvo
  }
  function persist(){
    if (!consentGranted()) return;
    var merged = mergedParams();
    if (!Object.keys(merged).length) return;
    var json = JSON.stringify(merged);
    writeCookie(COOKIE_NAME, json, 30);
    try { localStorage.setItem(COOKIE_NAME, json); } catch (e) {}
  }
  function queryString(obj){
    return Object.keys(obj).map(function(k){ return k + '=' + encodeURIComponent(obj[k]); }).join('&');
  }
  function attachTracking(){
    if (!consentGranted()) return;
    var qs = queryString(mergedParams());
    if (!qs) return;
    document.querySelectorAll('.cta').forEach(function(btn){
      var destino = btn.getAttribute('data-href');
      if (!destino) return;
      var base = destino.split('?')[0];
      var existing = destino.indexOf('?') > -1 ? destino.split('?')[1] : '';
      btn.setAttribute('href', base + '?' + (existing ? existing + '&' + qs : qs));
    });
  }
  persist();
  attachTracking();
  window.__attachTracking = function(){ persist(); attachTracking(); };
  document.querySelectorAll('.cta').forEach(function(btn){
    btn.addEventListener('click', function(){
      persist();
      if (CLICK_BEACON_URL && navigator.sendBeacon) { try { navigator.sendBeacon(CLICK_BEACON_URL); } catch (e) {} }
      if (typeof gtag === 'function') gtag('event', 'conversion', {'send_to': 'GOOGLE_ADS_ID/CONVERSION_LABEL'});
    });
  });
})();
</script>`;
}

function ga4TagHtml(measurementId: string): string {
  return `<script>gtag('config', '${measurementId.replace(/[^\w-]/g, '')}');</script>`;
}

/** GTM (opcional, além de GA4/Meta/Google Ads individuais já suportados) — pedido explícito
 * do usuário após pesquisa da FlowPages (guia em hermes/knowledge/insights/, 2026-07-27):
 * container só decide quais tags disparar dentro dele mesmo, então não tentamos replicar o
 * Consent Mode aqui — quem configura o container é responsável por respeitar consentimento
 * lá dentro (Google recomenda isso via "Consent Overview" do próprio GTM). */
function gtmHeadHtml(containerId: string): string {
  const id = containerId.replace(/[^\w-]/g, '');
  return `<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${id}');</script>`;
}
function gtmBodyHtml(containerId: string): string {
  const id = containerId.replace(/[^\w-]/g, '');
  return `<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${id}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>`;
}

// Meta Pixel não integra com o Consent Mode do Google — por isso o init/track ficam numa função
// exposta (window.__initMetaPixel) e só são chamados pelo banner de consentimento quando o
// visitante aceita, nunca no carregamento da página.
function metaPixelTagHtml(pixelId: string): string {
  const id = pixelId.replace(/[^\d]/g, '');
  return `<script>
window.__initMetaPixel = function(){
  if (window.fbq) return;
  !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
  n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
  document,'script','https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', '${id}');
  fbq('track', 'PageView');
};
</script>`;
}

function renderVideoEmbed(videoUrl: string): string {
  const yt = videoUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/i);
  if (yt) return `<iframe src="https://www.youtube.com/embed/${yt[1]}" title="video" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
  const vimeo = videoUrl.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (vimeo) return `<iframe src="https://player.vimeo.com/video/${vimeo[1]}" title="video" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
  return `<video controls playsinline src="${esc(videoUrl)}"></video>`;
}

export function renderPresellHtml(c: PresellContent, opts: { productName: string; hopLink: string; googleAdsId?: string; conversionLabel?: string; ga4Id?: string; metaPixelId?: string; gtmContainerId?: string; customCode?: string; isHealthNiche?: boolean; pageType?: string; popupGate?: boolean; videoUrl?: string; imagemProdutoUrl?: string; imagemRotuloUrl?: string; salesPageScreenshotUrl?: string; segmentRoutes?: SegmentRoute[]; language?: string; presellId?: string }): string {
  const pageType = opts.pageType && TEMPLATE_FILE_BY_TYPE[opts.pageType] ? opts.pageType : 'advertorial';
  const templatePath = path.join(process.cwd(), 'lib', TEMPLATE_FILE_BY_TYPE[pageType]);
  let t = fs.readFileSync(templatePath, 'utf8');
  const locale = pickLocale(opts.language);

  const now = new Date();
  const dataFmt = now.toLocaleDateString(locale.dateLocale, { day: '2-digit', month: 'long', year: 'numeric' });

  // Textos fixos do template (idioma, footer, disclosure, FAQ heading, meta-linha do autor) —
  // via tokens {{TOKEN}} dedicados no arquivo-fonte (não literal PT casado por string, frágil a
  // qualquer mudança de espaçamento) — trocados ANTES dos replaces de {{AUTOR}}/{{DATA}}/{{X}}
  // genéricos abaixo, já que META_LINE embute esses tokens dentro de si.
  t = t.replace('<html lang="pt-BR">', `<html lang="${locale.htmlLang}">`);
  t = t.replace('{{META_LINE}}', locale.metaLineTemplate);
  t = t.replace('{{FAQ_HEADING}}', esc(locale.faqHeading));
  const disclosureByType: Record<string, string> = {
    advertorial: locale.disclosureFull,
    vsl: locale.disclosureFull,
    pogo: locale.disclosureShort,
    interstitial: locale.disclosureInterstitial,
  };
  t = t.replace('{{DISCLOSURE_TEXT}}', disclosureByType[pageType] ?? locale.disclosureFull);
  t = t.replace(/\{\{PRIVACY_LABEL\}\}/g, esc(locale.privacyLabel));
  t = t.replace(/\{\{TERMS_LABEL\}\}/g, esc(locale.termsLabel));
  t = t.replace(/\{\{CONTACT_LABEL\}\}/g, esc(locale.contactLabel));
  t = t.replace(/\{\{RIGHTS_RESERVED\}\}/g, esc(locale.rightsReserved));
  if (pageType === 'interstitial') {
    t = t.replace('{{SEG_EYEBROW}}', esc(locale.segEyebrow));
    t = t.replace('{{SEG_LEAD}}', esc(locale.segLead));
    t = t.replace('{{SEG_COUNTRY_LABEL}}', esc(locale.segCountryLabel));
    t = t.replace('{{SEG_GENDER_LABEL}}', esc(locale.segGenderLabel));
    t = t.replace('{{SEG_AGE_LABEL}}', esc(locale.segAgeLabel));
    t = t.replace('{{SEG_CONTINUE}}', esc(locale.segContinue));
    const optionTag = ([v, label]: [string, string]) => `<option value="${v}">${esc(label)}</option>`;
    t = t.replace('{{SEG_SELECT_PLACEHOLDER}}', esc(locale.segSelectPlaceholder));
    t = t.replace('{{SEG_COUNTRY_OPTIONS}}', [['', locale.segSelectPlaceholder] as [string, string], ...locale.segCountries].map(optionTag).join('\n      '));
    t = t.replace('{{SEG_GENDER_OPTIONS}}', [['', locale.segSelectPlaceholder] as [string, string], ...locale.segGenders].map(optionTag).join('\n      '));
  }

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
  t = t.replace('{{STICKY_CTA_TEXT}}', esc(c.cta_texto));
  t = t.replace('{{Reforço sob o botão — ex.: Garantia incondicional de 7 dias}}', esc(c.cta_reforco));
  t = t.replace('{{SEÇÃO 3 — Pontos fortes e pontos fracos}}', esc(c.secao3_titulo));
  t = t.replace('{{Review honesto inclui contras reais. Isso aumenta conversão E aprova na revisão do Google.}}', esc(c.secao3_texto));
  t = t.replace('{{PROS_HEADING}}', esc(locale.prosHeading));
  t = t.replace('{{CONS_HEADING}}', esc(locale.consHeading));
  t = t.replace('{{PROS_LIST}}', (c.pros ?? []).map((p) => `<li>${esc(p)}</li>`).join(''));
  t = t.replace('{{CONS_LIST}}', (c.contras ?? []).map((p) => `<li>${esc(p)}</li>`).join(''));

  const faq = c.faq ?? [];
  t = t.replace('{{Pergunta 1?}}', esc(faq[0]?.pergunta ?? ''));
  t = t.replace('{{Resposta.}}', esc(faq[0]?.resposta ?? ''));
  t = t.replace('{{Pergunta 2?}}', esc(faq[1]?.pergunta ?? ''));
  // segundo "{{Resposta.}}" remanescente
  t = t.replace('{{Resposta.}}', esc(faq[1]?.resposta ?? ''));
  t = t.replace('{{CTA FINAL}}', esc(c.cta_final));

  t = t.replace(/LINK_DE_AFILIADO_AQUI/g, esc(opts.hopLink));
  t = t.replace('{{DISCLAIMER_SAUDE}}', opts.isHealthNiche ? locale.disclaimerSaude : '');
  t = t.replace('{{GA4_TAG}}', opts.ga4Id?.trim() ? ga4TagHtml(opts.ga4Id.trim()) : '');
  t = t.replace('{{META_PIXEL_TAG}}', opts.metaPixelId?.trim() ? metaPixelTagHtml(opts.metaPixelId.trim()) : '');
  t = t.replace('{{GTM_HEAD}}', opts.gtmContainerId?.trim() ? gtmHeadHtml(opts.gtmContainerId.trim()) : '');
  t = t.replace('{{GTM_BODY}}', opts.gtmContainerId?.trim() ? gtmBodyHtml(opts.gtmContainerId.trim()) : '');
  // Bloco de código customizado (HTML/CSS/JS livre) — inserido cru, sem esc(): é conteúdo que o
  // próprio usuário escreve pra si mesmo (embed de terceiros, copy extra), não input de visitante.
  t = t.replace('{{CUSTOM_CODE}}', opts.customCode?.trim() ?? '');
  t = t.replace('{{COOKIE_CONSENT}}', cookieConsentHtml(locale));
  t = t.replace('{{POPUP_GATE}}', opts.popupGate ? popupGateHtml(locale) : '');
  const appBaseUrl = process.env.NEXTAUTH_URL || (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : '');
  const clickBeaconUrl = opts.presellId && appBaseUrl ? `${appBaseUrl}/api/presells/click?id=${opts.presellId}` : undefined;
  t = t.replace('{{TRACKING_SCRIPT}}', trackingScriptHtml(clickBeaconUrl));
  if (pageType === 'vsl') t = t.replace('{{VIDEO_EMBED}}', renderVideoEmbed(opts.videoUrl ?? ''));
  if (pageType === 'interstitial') {
    t = t.replace('{{SALES_PAGE_SCREENSHOT_URL}}', esc(opts.salesPageScreenshotUrl ?? ''));
    // < escapado pra JSON embutido em <script> não fechar a tag prematuramente (</script> dentro de string).
    t = t.replace('{{SEGMENT_ROUTES_JSON}}', JSON.stringify(opts.segmentRoutes ?? []).replace(/</g, '\\u003c'));
  }
  t = t.replace('{{IMAGEM_PRODUTO}}', opts.imagemProdutoUrl
    ? `<img class="produto-img" src="${esc(opts.imagemProdutoUrl)}" alt="${esc(opts.productName)}" loading="lazy">`
    : '');
  t = t.replace('{{IMAGEM_ROTULO}}', opts.imagemRotuloUrl
    ? `<img class="produto-img produto-img-sm" src="${esc(opts.imagemRotuloUrl)}" alt="${esc(opts.productName)} label" loading="lazy">`
    : '');

  // GOOGLE_ADS_ID/CONVERSION_LABEL substituídos por último, de propósito: {{TRACKING_SCRIPT}}
  // (injetado acima) também contém esses tokens no próprio JS gerado — se essa troca rodasse
  // antes da injeção, o texto ficaria literal "GOOGLE_ADS_ID/CONVERSION_LABEL" no HTML final.
  if (opts.googleAdsId) t = t.replace(/GOOGLE_ADS_ID/g, esc(opts.googleAdsId));
  if (opts.conversionLabel) t = t.replace(/CONVERSION_LABEL/g, esc(opts.conversionLabel));

  return t;
}

function wpSites(): Record<string, { user: string; appPassword: string }> {
  try {
    return JSON.parse(process.env.WP_SITES_JSON ?? '{}');
  } catch {
    return {};
  }
}

async function wpAuthHeader(domain: string): Promise<{ auth: string }> {
  const site = wpSites()[domain];
  if (!site) throw new Error(`Domínio WordPress "${domain}" não configurado em WP_SITES_JSON`);
  return { auth: Buffer.from(`${site.user}:${site.appPassword}`).toString('base64') };
}

async function wpPageExists(domain: string, auth: string, slug: string): Promise<boolean> {
  const res = await fetch(`https://${domain}/wp-json/wp/v2/pages?slug=${encodeURIComponent(slug)}&status=publish,draft`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  if (!res.ok) return false;
  const data = await res.json().catch(() => []);
  return Array.isArray(data) && data.length > 0;
}

async function wpCreatePage(domain: string, auth: string, opts: { title: string; slug: string; content: string }): Promise<void> {
  const res = await fetch(`https://${domain}/wp-json/wp/v2/pages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` },
    body: JSON.stringify({ title: opts.title, slug: opts.slug, content: opts.content, status: 'publish' }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(`Erro ao criar página "${opts.slug}" no WordPress (${domain}): ${data?.message ?? res.status}`);
  }
}

// Mesmo texto real usado nas páginas do próprio AfiliAds (app/politica-de-privacidade,
// app/termos, app/contato) — não é um stub vazio, é o conteúdo de compliance de verdade.
const WP_COMPLIANCE_PAGES: Array<{ slug: string; title: string; content: string }> = [
  {
    slug: 'politica-de-privacidade',
    title: 'Política de Privacidade',
    content: `<h1>Política de Privacidade</h1>
<p>Este site é uma página de conteúdo e divulgação (advertorial) que participa de programas de marketing de afiliados. Podemos receber comissão por compras feitas através de links presentes nesta página, sem custo adicional para você.</p>
<h2>Dados coletados</h2>
<p>Coletamos dados de navegação de forma anônima (como páginas visitadas e origem do tráfego) através de ferramentas de analytics (Google Analytics / Google Ads) para medir o desempenho do conteúdo. Não coletamos dados pessoais sensíveis nesta página. Se você prosseguir para o site do produto anunciado, a política de privacidade daquele site próprio se aplica aos dados que ele coletar.</p>
<h2>Cookies</h2>
<p>Usamos cookies de terceiros (Google Ads, Google Analytics 4 e, quando aplicável, Meta Pixel) para mensurar cliques, conversões e comportamento de navegação dos nossos anúncios. Ao visitar esta página, um banner permite que você aceite ou recuse esses cookies — enquanto não aceitos, as ferramentas de anúncio/analytics operam em modo restrito (sem armazenamento individual de cookie, conforme o Google Consent Mode) e o Meta Pixel não é carregado. Você pode alterar sua escolha a qualquer momento limpando os dados do site nas configurações do seu navegador.</p>
<h2>Contato</h2>
<p>Dúvidas sobre esta política podem ser enviadas para <a href="mailto:genaujunior@gmail.com">genaujunior@gmail.com</a>.</p>`,
  },
  {
    slug: 'termos',
    title: 'Termos de Uso',
    content: `<h1>Termos de Uso</h1>
<p>Ao acessar este site, você concorda com os termos abaixo. Este é um conteúdo editorial independente com finalidade informativa e promocional, que pode conter links de afiliado.</p>
<h2>Divulgação de afiliado</h2>
<p>Este site participa de programas de marketing de afiliados. Podemos ganhar comissão sobre compras realizadas através dos links aqui presentes, sem custo adicional para o comprador. As opiniões e avaliações expressas são baseadas em pesquisa independente.</p>
<h2>Isenção de responsabilidade</h2>
<p>O conteúdo desta página é fornecido apenas para fins informativos e não substitui orientação médica, financeira ou profissional. Resultados individuais podem variar. Consulte um profissional qualificado antes de tomar decisões relacionadas à sua saúde.</p>
<h2>Propriedade</h2>
<p>Marcas, produtos e imagens de terceiros mencionados pertencem aos seus respectivos proprietários e são citados apenas para fins informativos/comparativos.</p>
<h2>Contato</h2>
<p>Dúvidas sobre estes termos podem ser enviadas para <a href="mailto:genaujunior@gmail.com">genaujunior@gmail.com</a>.</p>`,
  },
  {
    slug: 'contato',
    title: 'Contato',
    content: `<h1>Contato</h1>
<p>Para dúvidas, solicitações ou questões relacionadas ao conteúdo desta página, entre em contato:</p>
<p><a href="mailto:genaujunior@gmail.com">genaujunior@gmail.com</a></p>`,
  },
];

// Roda antes de publicar a presell em si — sem isso, os links de rodapé (Política de
// Privacidade/Termos/Contato) que TODA presell gera apontam pra páginas que nunca existiram
// no domínio WordPress de destino (404), um risco real de compliance pro Google Ads (exige
// privacy policy funcional numa bridge page). Idempotente: só cria o que ainda não existe.
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function ensureWordPressCompliancePages(domain: string): Promise<void> {
  const { auth } = await wpAuthHeader(domain);
  for (const page of WP_COMPLIANCE_PAGES) {
    try {
      const exists = await wpPageExists(domain, auth, page.slug);
      if (!exists) await wpCreatePage(domain, auth, page);
    } catch (e: any) {
      // Não bloqueia a publicação da presell por causa de uma página de compliance —
      // fica logado pra investigar, mas o afiliado não perde a publicação principal.
      console.error(`[wp-compliance-pages] falha ao garantir "${page.slug}" em ${domain}:`, e?.message);
    }
    // Hosts como Hostinger rate-limitam POSTs em sequência muito rápida (confirmado ao vivo:
    // 2 de 3 chamadas de volta a volta falharam com "fetch failed") — um respiro evita isso.
    await sleep(1500);
  }
}

export async function publishToWordPress(html: string, opts: { domain: string; title: string; slug: string }) {
  const { auth } = await wpAuthHeader(opts.domain);
  await ensureWordPressCompliancePages(opts.domain);
  const res = await fetch(`https://${opts.domain}/wp-json/wp/v2/pages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` },
    body: JSON.stringify({ title: opts.title, slug: opts.slug, content: html, status: 'publish' }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Erro ao publicar no WordPress (${opts.domain}): ${data?.message ?? res.status}`);
  return data.link as string;
}

// Publicação via FTP — pra domínios com hospedagem estática (não WordPress), como
// orangepeelmorning.com na Hostinger. A API pública da Hostinger só expõe upload de arquivo
// pra contas Agency Hosting (confirmado consultando developers.hostinger.com/api-python-sdk
// em 2026-07-27); hospedagem regular/pessoal só disponibiliza FTP/SFTP mesmo — por isso este
// caminho usa credenciais de FTP (FTP_SITES_JSON), não uma "API key" da Hostinger.
function ftpSites(): Record<string, { host: string; port?: number; user: string; password: string; rootDir?: string; secure?: boolean }> {
  try {
    return JSON.parse(process.env.FTP_SITES_JSON ?? '{}');
  } catch {
    return {};
  }
}

function wrapStaticPage(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}

async function ftpUploadFile(site: { host: string; port?: number; user: string; password: string; rootDir?: string; secure?: boolean }, remoteDir: string, filename: string, content: string): Promise<void> {
  const { Client } = await import('basic-ftp');
  const { Readable } = await import('stream');
  const client = new Client();
  client.ftp.verbose = false;
  try {
    await client.access({ host: site.host, port: site.port ?? 21, user: site.user, password: site.password, secure: site.secure ?? false });
    const rootDir = (site.rootDir || 'public_html').replace(/^\/|\/$/g, '');
    await client.ensureDir(`${rootDir}/${remoteDir}`);
    await client.uploadFrom(Readable.from(Buffer.from(content, 'utf-8')), filename);
  } finally {
    client.close();
  }
}

// Idempotente por natureza (upload sempre sobrescreve o mesmo caminho) — diferente da versão
// WordPress, não precisa checar existência antes.
export async function ensureFtpCompliancePages(domain: string): Promise<void> {
  const site = ftpSites()[domain];
  if (!site) throw new Error(`Domínio FTP "${domain}" não configurado em FTP_SITES_JSON`);
  for (const page of WP_COMPLIANCE_PAGES) {
    try {
      await ftpUploadFile(site, page.slug, 'index.html', wrapStaticPage(page.title, page.content));
    } catch (e: any) {
      console.error(`[ftp-compliance-pages] falha ao enviar "${page.slug}" pra ${domain}:`, e?.message);
    }
    await sleep(1500);
  }
}

export async function publishToFtp(html: string, opts: { domain: string; slug: string }): Promise<string> {
  const site = ftpSites()[opts.domain];
  if (!site) throw new Error(`Domínio FTP "${opts.domain}" não configurado em FTP_SITES_JSON`);
  await ensureFtpCompliancePages(opts.domain);
  await ftpUploadFile(site, opts.slug, 'index.html', html);
  return `https://${opts.domain}/${opts.slug}/`;
}

// Referência de performance real das presells anteriores do usuário: nunca copia texto, só
// aponta qual pageType converteu melhor (CTA clicks / views) pra usar como referência estrutural.
// Mínimo de views por agrupamento evita conclusão precipitada com amostra pequena.
export async function getPresellReferencia(userId: string, vertical?: string | null): Promise<string> {
  const MIN_VIEWS = 20;
  const presells = await prisma.presell.findMany({
    where: { userId, views: { gte: MIN_VIEWS } },
    select: { pageType: true, views: true, ctaClicks: true, productId: true },
  });
  if (presells.length === 0) return '';

  const productIds = Array.from(new Set(presells.map(p => p.productId).filter(Boolean))) as string[];
  const researches = productIds.length
    ? await prisma.productResearch.findMany({ where: { id: { in: productIds } }, select: { id: true, vertical: true } })
    : [];
  const verticalById = new Map(researches.map(r => [r.id, r.vertical]));

  const verticalNorm = (vertical ?? '').trim().toLowerCase();
  const sameVertical = verticalNorm
    ? presells.filter(p => p.productId && (verticalById.get(p.productId) ?? '').toLowerCase() === verticalNorm)
    : [];
  const pool = sameVertical.length >= 3 ? sameVertical : presells;

  const byType = new Map<string, { views: number; clicks: number; count: number }>();
  for (const p of pool) {
    const cur = byType.get(p.pageType) ?? { views: 0, clicks: 0, count: 0 };
    cur.views += p.views;
    cur.clicks += p.ctaClicks;
    cur.count += 1;
    byType.set(p.pageType, cur);
  }
  const ranked = Array.from(byType.entries())
    .map(([pageType, s]) => ({ pageType, ctr: s.views > 0 ? s.clicks / s.views : 0, views: s.views, count: s.count }))
    .filter(r => r.views >= MIN_VIEWS)
    .sort((a, b) => b.ctr - a.ctr);
  if (ranked.length === 0) return '';

  const best = ranked[0];
  const lines = ranked.map(r => `${r.pageType}: ${(r.ctr * 100).toFixed(1)}% de CTR no CTA (${r.views} views em ${r.count} presell${r.count > 1 ? 's' : ''})`);
  const scopeLabel = sameVertical.length >= 3 ? `nas suas presells da vertical "${vertical}"` : 'no histórico geral de presells (dado insuficiente ainda na vertical específica)';
  return `REFERÊNCIA DE PERFORMANCE REAL (${scopeLabel}): ${lines.join(' | ')}. "${best.pageType}" teve a melhor conversão até agora — use como referência de estrutura/ângulo, NUNCA copie texto literal de outra presell (risco de conteúdo duplicado).`;
}

export interface PresellOutcomeRanking {
  pageType: string;
  profit: number;
  roiPct: number;
  conversions: number;
  campaigns: number;
}

// Ranking estruturado de RESULTADO REAL (receita/lucro) por pageType, ligando
// Presell.campaignId -> Campaign -> DailyLog (mesma economia usada pelo loop de campanha em
// lib/campaign-rules.ts). Usado tanto pelo prompt do Presell Builder (getPresellOutcomeReferencia,
// formatado em texto) quanto pelo motor determinístico (lib/campaign-strategy.ts, que pode usar
// o "best" pra sobrepor a recomendação estática — nunca o gate de canal do interstitial, que é
// sempre a autoridade final). Mínimo de conversões evita conclusão precipitada com amostra pequena.
export async function rankPresellOutcomes(userId: string, vertical?: string | null, channel?: string | null): Promise<{ ranked: PresellOutcomeRanking[]; scopeLabel: string }> {
  const MIN_CONVERSIONS = 3;
  const presells = await prisma.presell.findMany({
    where: { userId, campaignId: { not: null } },
    select: {
      pageType: true,
      campaign: {
        select: {
          id: true, vertical: true, channel: true,
          commissionNet: true, epcBreakeven: true, cpcMax: true, budgetTest: true, offerUrl: true,
          dailyLogs: { select: { spend: true, revenue: true, clicks: true, hops: true, conversions: true, logDate: true } },
        },
      },
    },
  });
  const withCampaign = presells.filter((p): p is typeof p & { campaign: NonNullable<typeof p.campaign> } => !!p.campaign);
  if (withCampaign.length === 0) return { ranked: [], scopeLabel: '' };

  const verticalNorm = (vertical ?? '').trim().toLowerCase();
  const channelNorm = (channel ?? '').trim().toUpperCase();

  const sameVerticalChannel = verticalNorm && channelNorm
    ? withCampaign.filter(p => (p.campaign.vertical ?? '').toLowerCase() === verticalNorm && (p.campaign.channel ?? '').toUpperCase() === channelNorm)
    : [];
  const sameVertical = verticalNorm
    ? withCampaign.filter(p => (p.campaign.vertical ?? '').toLowerCase() === verticalNorm)
    : [];

  let pool = withCampaign;
  let scopeLabel = 'no histórico geral de campanhas (dado insuficiente ainda na vertical/canal específicos)';
  if (sameVerticalChannel.length >= 3) {
    pool = sameVerticalChannel;
    scopeLabel = `nas suas campanhas da vertical "${vertical}" no canal ${channel}`;
  } else if (sameVertical.length >= 3) {
    pool = sameVertical;
    scopeLabel = `nas suas campanhas da vertical "${vertical}" (todos os canais)`;
  }

  const byType = new Map<string, { profit: number; spend: number; conversions: number; campaignIds: Set<string> }>();
  for (const p of pool) {
    const c = p.campaign;
    const econ = computeEconomics(
      { commissionNet: c.commissionNet, epcBreakeven: c.epcBreakeven, cpcMax: c.cpcMax, budgetTest: c.budgetTest, offerUrl: c.offerUrl },
      c.dailyLogs,
    );
    const cur = byType.get(p.pageType) ?? { profit: 0, spend: 0, conversions: 0, campaignIds: new Set<string>() };
    cur.profit += econ.profit;
    cur.spend += econ.spend;
    cur.conversions += econ.conversions;
    cur.campaignIds.add(c.id);
    byType.set(p.pageType, cur);
  }

  const ranked = Array.from(byType.entries())
    .map(([pageType, s]) => ({
      pageType,
      profit: s.profit,
      roiPct: s.spend > 0 ? (s.profit / s.spend) * 100 : 0,
      conversions: s.conversions,
      campaigns: s.campaignIds.size,
    }))
    .filter(r => r.conversions >= MIN_CONVERSIONS)
    .sort((a, b) => b.profit - a.profit);

  return { ranked, scopeLabel };
}

// Formata rankPresellOutcomes() em texto pro prompt do Presell Builder — nunca copia texto,
// só aponta qual pageType lucrou mais de verdade (complementa getPresellReferencia, que mede
// só CTR/clique no CTA).
export async function getPresellOutcomeReferencia(userId: string, vertical?: string | null, channel?: string | null): Promise<string> {
  const { ranked, scopeLabel } = await rankPresellOutcomes(userId, vertical, channel);
  if (ranked.length === 0) return '';
  const best = ranked[0];
  const lines = ranked.map(r => `${r.pageType}: lucro real $${r.profit.toFixed(2)} (ROI ${r.roiPct.toFixed(0)}%, ${r.conversions} conversões em ${r.campaigns} campanha${r.campaigns > 1 ? 's' : ''})`);
  return `REFERÊNCIA DE RESULTADO REAL — receita/lucro (${scopeLabel}): ${lines.join(' | ')}. "${best.pageType}" teve o melhor lucro real até agora — isso é sobre VENDA de verdade, não só clique no CTA; use como referência de estrutura/ângulo, NUNCA copie texto literal de outra presell.`;
}

// Canais do Google Ads (lib/wizard-data.ts CHANNELS) em que o pageType 'interstitial' é
// seguro: YOUTUBE e DEMAND_GEN cobrem o equivalente do app a Native/Display/YouTube/social.
// SEARCH é bloqueado sempre; PMAX também, porque Performance Max inclui inventário de Search.
const INTERSTITIAL_BLOCKED_CHANNELS = new Set(['SEARCH', 'PMAX']);

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
  publicar?: boolean;
  variantGroupId?: string;
  channel?: string;
  salesPageUrl?: string;
  segmentRoutes?: SegmentRoute[];
  campaignId?: string;
  customCode?: string;
}) {
  const { productName, hopLink } = args;
  const angle = args.angle ?? 'review';
  const geo = args.geo ?? 'US';
  const language = args.language ?? (geo === 'BR' ? 'pt-BR' : 'en');
  const pageType = args.pageType && ['advertorial', 'pogo', 'vsl', 'interstitial'].includes(args.pageType) ? args.pageType : 'advertorial';
  const popupGate = !!args.popupGate;
  if (pageType === 'vsl' && !args.videoUrl?.trim()) {
    throw new Error('pageType "vsl" exige videoUrl (link do vídeo do VSL — YouTube, Vimeo ou .mp4 direto)');
  }
  if (pageType === 'interstitial' && args.channel && INTERSTITIAL_BLOCKED_CHANNELS.has(args.channel)) {
    throw new Error(`pageType "interstitial" não é permitido no canal ${args.channel} (só Native/Display/YouTube/social — no Google Ads: YOUTUBE ou DEMAND_GEN). Página com screenshot+popup de segmentação reprova revisão de Search.`);
  }

  let productCtx = args.context ?? '';
  let isHealthNiche = detectHealthNiche(undefined, undefined, `${angle} ${args.context ?? ''}`);
  let imagemProdutoUrl: string | undefined;
  let imagemRotuloUrl: string | undefined;
  let vendorPageUrlFromProduct: string | undefined;
  if (args.productId) {
    const p = await prisma.productResearch.findFirst({ where: { id: args.productId, userId } });
    if (p) {
      isHealthNiche = detectHealthNiche(p.vertical, p.tags, `${angle} ${args.context ?? ''}`);
      vendorPageUrlFromProduct = p.vendorPageUrl ?? undefined;
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
      const assets = (p.affiliateInsights as any)?.assets as { pastaUrl?: string; estrutura?: string[]; imagemProdutoUrl?: string; imagemRotuloUrl?: string } | undefined;
      if (assets?.estrutura?.length) {
        productCtx += `\nASSETS OFICIAIS DO VENDOR DISPONÍVEIS (pasta: ${p.assetsUrl ?? assets.pastaUrl}): ${assets.estrutura.join(' | ')}. Use como referência de público/ângulo real do vendor — NÃO copie claims agressivos de banners de rede social, mantenha a linguagem compliance-safe já definida acima.`;
      }
      if (assets?.imagemProdutoUrl) imagemProdutoUrl = assets.imagemProdutoUrl;
      if (assets?.imagemRotuloUrl) imagemRotuloUrl = assets.imagemRotuloUrl;

      // Elementos reais extraídos da página de vendas do vendor (Task 3 do pipeline de pesquisa)
      // — headline/ângulo/prova social verdadeiros, só como referência, nunca cópia literal.
      const vendorRef = (p.affiliateInsights as any)?.vendorPageInsights?.elementosPresellReferencia as Array<{ tipo: string; texto: string }> | undefined;
      if (vendorRef?.length) {
        productCtx += `\nELEMENTOS REAIS DA PÁGINA DE VENDAS DO VENDOR (referência de ângulo/prova, NÃO copiar literalmente):\n${vendorRef.map(e => `- [${e.tipo}] ${e.texto}`).join('\n')}`;
      }

      const presellRef = await getPresellReferencia(userId, p.vertical);
      if (presellRef) productCtx += `\n${presellRef}`;

      const outcomeRef = await getPresellOutcomeReferencia(userId, p.vertical, args.channel);
      if (outcomeRef) productCtx += `\n${outcomeRef}`;

      const marketRef = await getMarketIntelReferencia(userId, p.vertical ?? '', args.productId).catch(() => '');
      if (marketRef) productCtx += `\n${marketRef}`;
    }
  }

  let salesPageScreenshotUrl: string | undefined;
  if (pageType === 'interstitial') {
    const salesPageUrl = args.salesPageUrl?.trim() || vendorPageUrlFromProduct;
    if (!salesPageUrl) {
      throw new Error('pageType "interstitial" exige salesPageUrl (ou vendorPageUrl cadastrado no produto) — é a página que vira o screenshot de fundo.');
    }
    salesPageScreenshotUrl = await captureSalesPageScreenshot(salesPageUrl);
  }

  const trackingIntegrations = await prisma.integration.findMany({
    where: { userId, serviceName: 'tracking', fieldName: { in: ['ga4_measurement_id', 'meta_pixel_id', 'google_ads_conversion_id', 'google_ads_conversion_label', 'gtm_container_id'] } },
  });
  const ga4Id = trackingIntegrations.find(i => i.fieldName === 'ga4_measurement_id')?.fieldValue;
  const metaPixelId = trackingIntegrations.find(i => i.fieldName === 'meta_pixel_id')?.fieldValue;
  const gtmContainerId = trackingIntegrations.find(i => i.fieldName === 'gtm_container_id')?.fieldValue;
  // googleAdsId explícito (ex.: vindo de uma Campaign específica) vence o cadastro geral do
  // usuário em Integrations — mas sem nenhum dos dois, o placeholder GOOGLE_ADS_ID/CONVERSION_LABEL
  // fica literal no HTML (silencioso antes; hoje pelo menos há um lugar pra cadastrar o valor real).
  const googleAdsId = args.googleAdsId || trackingIntegrations.find(i => i.fieldName === 'google_ads_conversion_id')?.fieldValue;
  const conversionLabel = trackingIntegrations.find(i => i.fieldName === 'google_ads_conversion_label')?.fieldValue;

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

  // Id gerado ANTES do HTML de propósito: o beacon de clique (ctaClicks) precisa saber o id
  // da presell embutido no próprio HTML gerado, mas o registro só é criado no banco depois
  // (create() abaixo usa esse mesmo id explicitamente em vez de deixar o Prisma gerar um novo).
  const presellId = randomUUID();
  const html = renderPresellHtml(content, {
    productName, hopLink: finalHop, googleAdsId, conversionLabel, ga4Id, metaPixelId, isHealthNiche,
    gtmContainerId, customCode: args.customCode,
    pageType, popupGate, videoUrl: args.videoUrl, imagemProdutoUrl, imagemRotuloUrl,
    salesPageScreenshotUrl, segmentRoutes: args.segmentRoutes, language, presellId,
  });

  const baseSlug = slugify(`${productName}-${pageType}-${angle}`);
  let slug = baseSlug;
  for (let i = 2; await prisma.presell.findUnique({ where: { slug } }); i++) slug = `${baseSlug}-${i}`;

  const publicar = args.publicar !== false;
  const destino = args.destino ?? 'railway';
  let publishedUrl = '';
  if (publicar && destino === 'wordpress') {
    if (!args.dominio) throw new Error('dominio é obrigatório quando destino=wordpress');
    publishedUrl = await publishToWordPress(html, { domain: args.dominio, title: content.titulo_pagina, slug });
  }

  const presell = await prisma.presell.create({
    data: {
      id: presellId,
      userId,
      productId: args.productId ?? null,
      campaignId: args.campaignId ?? null,
      slug,
      title: content.titulo_pagina,
      productName,
      hopLink: finalHop,
      trackingId: args.trackingId ?? '',
      angle,
      pageType,
      popupGate,
      videoUrl: args.videoUrl ?? '',
      customCode: args.customCode ?? '',
      variantGroupId: args.variantGroupId ?? null,
      geo,
      language,
      html,
      content: (pageType === 'interstitial' && args.segmentRoutes?.length
        ? { ...content, segmentRoutes: args.segmentRoutes }
        : content) as any,
      status: publicar ? 'publicada' : 'rascunho',
      googleAdsId: args.googleAdsId ?? '',
      publishTarget: destino,
      wpDomain: publicar && destino === 'wordpress' ? args.dominio! : '',
      publishedUrl,
    },
  });
  return { presell, usage: res.usage, provider: res.provider, model: res.model };
}
