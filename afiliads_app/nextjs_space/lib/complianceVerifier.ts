import { prisma } from './prisma';
import type { Campaign, Keyword } from '@prisma/client';
import {
  ANTISTRIKE_ITEMS, BRIDGE_CHECKLIST, GOOGLE_ADS_CHECKLIST,
  TRACKING_CHECKLIST_MAXWEB, TRACKING_CHECKLIST_CB, GOLIVE_CHECKLIST,
} from './wizard-data';

export interface CheckResult {
  passed: boolean;
  note?: string;
}

// Bilíngue de propósito (corrigido 2026-07-27): generatePresell() em lib/presell.ts gera em
// inglês por padrão pra campanhas geo!=BR (pickLocale()) — regex só em português deixava
// disclaimer/FAQ/"resultados variam"/claims banidos SEMPRE como "não encontrado" em qualquer
// presell em inglês, mesmo com o texto certo lá. Achado testando o próprio fix do Passo 4
// (ver hermes/knowledge/insights/2026-07-27-wizard-orquestracao-checklists.md).
const AFFILIATE_DISCLOSURE_RE = /participa de programas de afiliados|pode receber comiss[ãa]o|affiliate disclosure|participates in affiliate|earn(s)? (a )?commission/i;
const PRIVACY_LINK_RE = /politica-de-privacidade|privacy-policy/i;
// Termos SEMPRE problema, sem exceção — não têm uso legítimo dentro de um disclaimer negado
// ("perca 10kg" ou "livre-se de X" não aparecem em frases de isenção de responsabilidade).
const BANNED_CLAIM_RE = /perca \d+\s?kg|livre-se de|lose \d+\s?(lbs?|kg|pounds)/i;
// 'cura'/'cure'/'elimina'/'eliminate'/'garantido'/'guaranteed' ficam de fora do grupo acima de
// propósito — ver findBannedClaim() abaixo: todos esses termos aparecem o tempo todo dentro do
// disclaimer de saúde OBRIGATÓRIO e correto (“not intended to diagnose, treat, cure, or
// prevent any disease” / variações geradas pela IA como “not intended to ... or cure any
// condition”), então precisam de checagem por contexto de negação, não um regex direto que
// reprovaria o disclaimer certo junto com o claim errado. Achado em produção 2026-07-27: a
// tentativa anterior de resolver isso com uma allowlist de frase exata (SAFE_DISCLAIMER_
// BOILERPLATE) quebrou na primeira variação de texto gerada pela IA — a checagem de negação
// genérica cobre qualquer variação de fraseado, não só uma frase fixa.
const NEGATED_CLAIM_TERMS_RE = /garantido|guaranteed|\bcura\b|\bcure[sd]?\b|\belimina\b|\beliminate[sd]?\b/gi;
const NEGATION_WORDS_RE = /\b(não|nao|nem|never|sem|no|not)\b[^.!?]{0,40}$/i;
const FAQ_RE = /perguntas frequentes|frequently asked questions/i;
const RESULTADOS_VARIAM_RE = /resultados individuais podem variar|individual results may vary/i;
const GA4_TAG_RE = /gtag\(\s*'config'\s*,\s*'G-/i;

// Termo achado (pra reportar no note) ou null se limpo. Dois grupos de checagem:
// 1) BANNED_CLAIM_RE — termos que são SEMPRE problema, sem exceção.
// 2) NEGATED_CLAIM_TERMS_RE — termos que só são claim proibido quando NÃO estão numa frase de
//    negação ("resultados não são garantidos"/"not intended to ... cure ..." são o disclaimer
//    certo; "resultado garantido"/"vai curar" são o claim errado) — olha os ~40 caracteres
//    antes do termo procurando uma palavra de negação antes de reprovar.
function findBannedClaim(html: string): string | null {
  const clean = html;
  const direct = BANNED_CLAIM_RE.exec(clean);
  if (direct) return direct[0];

  NEGATED_CLAIM_TERMS_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = NEGATED_CLAIM_TERMS_RE.exec(clean))) {
    const before = clean.slice(Math.max(0, m.index - 40), m.index);
    if (!NEGATION_WORDS_RE.test(before)) return m[0];
  }
  return null;
}

// Prefere o HTML real da presell vinculada via Presell.campaignId (garantido por construção
// pra presells geradas pelo AfiliAds — ver renderPresellHtml em lib/presell.ts). Sem vínculo,
// faz fetch real da presellUrl (pode ser um domínio externo do usuário).
async function getPresellHtml(campaign: Campaign): Promise<string | null> {
  const linked = await prisma.presell.findFirst({ where: { campaignId: campaign.id }, orderBy: { createdAt: 'desc' } });
  if (linked?.html) return linked.html;
  if (!campaign.presellUrl) return null;
  try {
    const res = await fetch(campaign.presellUrl, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function checkSsl(url: string | null | undefined): Promise<CheckResult> {
  if (!url) return { passed: false, note: 'Nenhuma URL configurada' };
  if (!url.startsWith('https://')) return { passed: false, note: 'URL não é HTTPS' };
  try {
    const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(8000) });
    return res.ok ? { passed: true } : { passed: false, note: `HTTP ${res.status} ao acessar a URL` };
  } catch (e: any) {
    return { passed: false, note: `Falha ao conectar via HTTPS: ${e?.message ?? 'erro desconhecido'}` };
  }
}

function checkHtml(html: string | null, re: RegExp, missingNote: string): CheckResult {
  if (!html) return { passed: false, note: 'Sem HTML da presell disponível pra analisar (vincule uma presell ou confirme a URL)' };
  return re.test(html) ? { passed: true } : { passed: false, note: missingNote };
}

// Anti-strike (Passo 3 do wizard) roda ANTES de existir qualquer presell (Passo 4) — por
// isso não tem mais nenhum item 'auto' dependente de HTML aqui (corrigido 2026-07-27, ver
// lib/wizard-data.ts). Fica só como placeholder pra manter a assinatura estável; todos os
// itens de ANTISTRIKE_ITEMS hoje são self_attested, então upsertAutoResults() não escreve
// nada a partir daqui (filtra verificationType !== 'auto').
export async function verifyAntistrikeItems(_campaign: Campaign): Promise<Record<string, CheckResult>> {
  return {};
}

export async function verifyBridgeChecklist(campaign: Campaign): Promise<Record<string, CheckResult>> {
  const html = await getPresellHtml(campaign);
  return {
    disclaimer: checkHtml(html, AFFILIATE_DISCLOSURE_RE, 'Disclosure de afiliado não encontrada no HTML'),
    ssl: await checkSsl(campaign.presellUrl),
    sem_claims: (() => {
      if (!html) return { passed: false, note: 'Sem HTML da presell disponível pra analisar' };
      const found = findBannedClaim(html);
      return found ? { passed: false, note: `Termo de claim proibido encontrado no HTML ("${found}")` } : { passed: true };
    })(),
    privacy_policy: checkHtml(html, PRIVACY_LINK_RE, 'Link de política de privacidade não encontrado no HTML'),
    faq: checkHtml(html, FAQ_RE, 'Seção de FAQ não encontrada no HTML'),
    resultados_variam: checkHtml(html, RESULTADOS_VARIAM_RE, '"Resultados individuais podem variar" não encontrado no HTML'),
    ga4_configurado: checkHtml(html, GA4_TAG_RE, 'Tag do GA4 (gtag config G-...) não encontrada no HTML'),
  };
}

export async function verifyGoogleAdsChecklist(campaign: Campaign): Promise<Record<string, CheckResult>> {
  return {
    budget_diario: campaign.budgetDaily > 0
      ? { passed: true }
      : { passed: false, note: 'budgetDaily ainda não sincronizado/definido (sincronize com o Google Ads)' },
    lance_manual: (campaign.bidStrategy ?? '').toUpperCase().includes('MANUAL') && campaign.cpcMax > 0
      ? { passed: true }
      : { passed: false, note: 'bidStrategy sincronizado não é Manual CPC, ou cpcMax não está definido' },
    utms: (campaign.utmCampaign || campaign.utmString)
      ? { passed: true }
      : { passed: false, note: 'Nenhuma UTM configurada' },
  };
}

function checkTrackingCommon(campaign: Campaign): Record<string, CheckResult> {
  return {
    postback_url: campaign.postbackUrl && /\{?click_?id\}?/i.test(campaign.postbackUrl)
      ? { passed: true }
      : { passed: false, note: 'postbackUrl vazio ou sem token de clickid ({clickid}/{click_id})' },
    clickid_token: campaign.clickidToken ? { passed: true } : { passed: false, note: 'clickidToken não configurado' },
  };
}

export async function verifyTrackingMaxweb(campaign: Campaign): Promise<Record<string, CheckResult>> {
  const html = await getPresellHtml(campaign);
  return {
    ...checkTrackingCommon(campaign),
    ga4_evento: checkHtml(html, GA4_TAG_RE, 'Tag do GA4 não encontrada no HTML da presell'),
  };
}

export async function verifyTrackingCb(campaign: Campaign): Promise<Record<string, CheckResult>> {
  const html = await getPresellHtml(campaign);
  return {
    ga4_evento: checkHtml(html, GA4_TAG_RE, 'Tag do GA4 não encontrada no HTML da presell'),
  };
}

// Agregado de "pronto pra ir ao ar" — cruza dados reais do Campaign + Keyword + Presell + os
// checklists já verificados (auto e self_attested) em vez de ser mais uma autoatestação solta.
export async function verifyGoLiveChecklist(
  campaign: Campaign,
  ctx: { selectedKeywordsCount: number; otherChecklistsCriticalUnchecked: number }
): Promise<Record<string, CheckResult>> {
  const linkedPresell = await prisma.presell.findFirst({ where: { campaignId: campaign.id }, orderBy: { createdAt: 'desc' } });
  return {
    oferta_ok: campaign.offerUrl ? { passed: true } : { passed: false, note: 'offerUrl não preenchida' },
    breakeven_ok: campaign.epcBreakeven > 0 && campaign.cpcMax > 0
      ? { passed: true }
      : { passed: false, note: 'epcBreakeven ou cpcMax não calculados' },
    compliance_ok: ctx.otherChecklistsCriticalUnchecked === 0
      ? { passed: true }
      : { passed: false, note: `${ctx.otherChecklistsCriticalUnchecked} item(ns) crítico(s) pendente(s) nos outros checklists` },
    bridge_ok: linkedPresell?.status === 'publicada'
      ? { passed: true }
      : { passed: false, note: linkedPresell ? `Presell vinculada está em status "${linkedPresell.status}", não "publicada"` : 'Nenhuma presell vinculada a esta campanha ainda' },
    keywords_ok: ctx.selectedKeywordsCount > 0
      ? { passed: true }
      : { passed: false, note: 'Nenhuma keyword selecionada' },
    google_ads_ok: campaign.googleCampaignId
      ? { passed: true }
      : { passed: false, note: 'Campanha ainda não criada no Google Ads' },
    tracking_ok: (campaign.postbackUrl && campaign.clickidToken)
      ? { passed: true }
      : { passed: false, note: 'postbackUrl/clickidToken não configurados' },
    budget_ok: campaign.budgetTest > 0 && !!campaign.testDuration
      ? { passed: true }
      : { passed: false, note: 'budgetTest ou testDuration não definidos' },
  };
}

const STEP_ANTISTRIKE = 3;
const STEP_BRIDGE = 4;
const STEP_GOOGLE_ADS = 7;
const STEP_TRACKING = 8;
const STEP_GOLIVE = 9;

async function upsertAutoResults(campaignId: string, step: number, defs: Array<{ key: string; label: string; critical: boolean; verificationType: string }>, results: Record<string, CheckResult>) {
  const rows = [];
  for (const def of defs) {
    if (def.verificationType !== 'auto') continue;
    const result = results[def.key];
    if (!result) continue;
    const row = await prisma.campaignChecklist.upsert({
      where: { campaignId_step_itemKey: { campaignId, step, itemKey: def.key } },
      update: { isChecked: result.passed, note: result.note ?? null, checkedAt: result.passed ? new Date() : null, verificationType: 'auto', isCritical: def.critical, itemLabel: def.label },
      create: {
        campaignId, step, itemKey: def.key, itemLabel: def.label, isCritical: def.critical,
        isChecked: result.passed, note: result.note ?? null, checkedAt: result.passed ? new Date() : null, verificationType: 'auto',
      },
    });
    rows.push(row);
  }
  return rows;
}

// Extraído de app/api/campaigns/[id]/checklists/verify/route.ts pra ser reaproveitado pelo
// endpoint de "Corrigir com agente" (app/api/campaigns/[id]/checklists/fix/route.ts) — depois
// de aplicar uma correção de campo, precisa re-rodar a MESMA verificação completa (GOLIVE
// depende do resultado agregado dos outros checklists) pra saber se o item específico passou.
export async function runFullChecklistVerify(campaign: Campaign & { keywords: Keyword[] }) {
  const campaignId = campaign.id;
  const trackingDefs = campaign.platform === 'MaxWeb' ? TRACKING_CHECKLIST_MAXWEB : TRACKING_CHECKLIST_CB;
  const trackingResults = campaign.platform === 'MaxWeb' ? await verifyTrackingMaxweb(campaign) : await verifyTrackingCb(campaign);

  const [antistrikeResults, bridgeResults, googleAdsResults] = await Promise.all([
    verifyAntistrikeItems(campaign),
    verifyBridgeChecklist(campaign),
    verifyGoogleAdsChecklist(campaign),
  ]);

  const allRows: any[] = [];
  allRows.push(...await upsertAutoResults(campaignId, STEP_ANTISTRIKE, ANTISTRIKE_ITEMS as any, antistrikeResults));
  allRows.push(...await upsertAutoResults(campaignId, STEP_BRIDGE, BRIDGE_CHECKLIST as any, bridgeResults));
  allRows.push(...await upsertAutoResults(campaignId, STEP_GOOGLE_ADS, GOOGLE_ADS_CHECKLIST as any, googleAdsResults));
  allRows.push(...await upsertAutoResults(campaignId, STEP_TRACKING, trackingDefs as any, trackingResults));

  const priorChecklists = await prisma.campaignChecklist.findMany({ where: { campaignId, step: { in: [STEP_ANTISTRIKE, STEP_BRIDGE, STEP_GOOGLE_ADS, STEP_TRACKING] } } });
  const otherChecklistsCriticalUnchecked = priorChecklists.filter((c) => c.isCritical && !c.isChecked).length;
  const selectedKeywordsCount = (campaign.keywords ?? []).filter((k) => k.isSelected).length;

  const goLiveResults = await verifyGoLiveChecklist(campaign, { selectedKeywordsCount, otherChecklistsCriticalUnchecked });
  allRows.push(...await upsertAutoResults(campaignId, STEP_GOLIVE, GOLIVE_CHECKLIST as any, goLiveResults));

  return allRows;
}

// Fase 3 — base de conhecimento reutilizável: cada correção aplicada via "Corrigir com
// agente" (app/api/campaigns/[id]/checklists/fix/route.ts) grava uma linha em
// ChecklistLearning; esta função lê essas lições de volta pra injetar no dossiê de
// wizard-autofill e nos prompts de product-research de PRÓXIMAS campanhas na mesma
// vertical/canal — o objetivo do pedido original é a correção "aprendida" evitar o mesmo erro
// de novo, não só consertar a campanha atual.
export async function getChecklistLearningReferencia(
  userId: string, vertical?: string | null, channel?: string | null, platform?: string | null
): Promise<string> {
  const rows = await prisma.checklistLearning.findMany({
    where: {
      userId,
      appliesGlobally: true,
      OR: [
        { vertical: vertical || undefined, channel: channel || undefined },
        { vertical: vertical || undefined, channel: null },
        { platform: platform || undefined },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 8,
  });
  if (!rows.length) return '';

  const lines = rows.map((r) => `- [${r.itemKey}] Problema: ${r.problem} → Correção aplicada: ${r.correction}`);
  return `LIÇÕES APRENDIDAS (correções já aplicadas em campanhas anteriores desta vertical/canal — evite repetir os mesmos problemas de compliance/checklist):\n${lines.join('\n')}`;
}
