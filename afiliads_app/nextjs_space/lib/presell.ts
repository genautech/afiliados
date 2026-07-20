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
Regras invioláveis:
- Conteúdo editorial genuíno (review honesto/advertorial informativo), NUNCA "doorway page".
- Zero claims absolutos de saúde/renda ("cura", "garantido", "perca X kg em Y dias"). Linguagem condicional.
- Inclua contras reais na seção de pontos fortes/fracos.
- Prova social apenas verificável (garantia oficial, nº de avaliações públicas).
- Idioma conforme solicitado (en para US/UK/AU, pt-BR para Brasil).
Responda APENAS JSON válido com exatamente estas chaves:
{"categoria","headline","subheadline","autor","leitura_min","abertura","secao1_titulo","secao1_texto","secao2_titulo","secao2_texto","beneficios":["3-5 itens"],"prova","cta_texto","cta_reforco","secao3_titulo","secao3_texto","faq":[{"pergunta","resposta"},{"pergunta","resposta"},{"pergunta","resposta"}],"cta_final","titulo_pagina","meta_descricao","nome_site"}
"autor" = nome editorial plausível sem sobrenome famoso; "nome_site" = nome de site editorial genérico do nicho (sem trademark do produto).`;

function esc(s: string): string {
  return String(s ?? '');
}

export function slugify(name: string): string {
  return name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48);
}

export function renderPresellHtml(c: PresellContent, opts: { productName: string; hopLink: string; googleAdsId?: string }): string {
  const templatePath = path.join(process.cwd(), 'lib', 'presell-template.html');
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

  return t;
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
}) {
  const { productName, hopLink } = args;
  const angle = args.angle ?? 'review';
  const geo = args.geo ?? 'US';
  const language = args.language ?? (geo === 'BR' ? 'pt-BR' : 'en');

  let productCtx = args.context ?? '';
  if (args.productId) {
    const p = await prisma.productResearch.findFirst({ where: { id: args.productId, userId } });
    if (p) {
      productCtx += `\nDossiê: vertical ${p.vertical}; resumo: ${p.summary}; melhor keyword: ${p.chosenKeyword}; compliance: ${JSON.stringify(p.compliance)}`;
    }
  }

  const res = await callAgent(userId, {
    agent: 'presell-builder',
    systemPrompt: BUILDER_PROMPT,
    userPrompt: `Produto: ${productName} (ClickBank). Ângulo: ${angle}. Geo: ${geo}. Idioma: ${language}.${productCtx}\nJSON puro.`,
  });
  const content = res.data as PresellContent | null;
  if (!content?.headline) throw new Error('Presell Builder retornou conteúdo inválido');

  // Hoplink com TID (tracking da campanha) se informado
  let finalHop = hopLink;
  if (args.trackingId && !/[?&]tid=/i.test(hopLink)) {
    finalHop += (hopLink.includes('?') ? '&' : '?') + 'tid=' + encodeURIComponent(args.trackingId.slice(0, 24));
  }

  const html = renderPresellHtml(content, { productName, hopLink: finalHop, googleAdsId: args.googleAdsId });

  const baseSlug = slugify(`${productName}-${angle}`);
  let slug = baseSlug;
  for (let i = 2; await prisma.presell.findUnique({ where: { slug } }); i++) slug = `${baseSlug}-${i}`;

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
      geo,
      language,
      html,
      content: content as any,
      status: 'publicada',
      googleAdsId: args.googleAdsId ?? '',
    },
  });
  return { presell, usage: res.usage, provider: res.provider, model: res.model };
}
