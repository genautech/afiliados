import { prisma } from './prisma';
import type { Campaign, Keyword } from '@prisma/client';
import { z } from 'zod';
import { AnalyzedClaimItemSchema, type AnalyzedClaimItem } from './validations/market-research';
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
// Achado em produção 2026-07-27 (2ª ocorrência): "This isn't a cure" não batia — \bnot\b não
// casa contrações ("isn't"/"n't" não contém "not" como token separado). Cobre contrações
// comuns (isn't/aren't/doesn't/don't/won't/can't/wasn't/weren't) além das palavras completas.
const NEGATION_WORDS_RE = /\b(não|nao|nem|never|sem|no|not|isn't|aren't|doesn't|don't|won't|can't|wasn't|weren't)\b[^.!?]{0,40}$/i;
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
  ctx: { selectedKeywordsCount: number; otherChecklistsCriticalUnchecked: number; trackingCriticalUnchecked: number }
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
    // MaxWeb exige postback S2S (postbackUrl + clickidToken); ClickBank rastreia via TID no
    // hoplink e usa o item self_attested "hop_stats" do Step 8 (TRACKING_CHECKLIST_CB) — por
    // isso o critério de "tracking ok" depende da plataforma, não pode ser fixo em postback.
    tracking_ok: campaign.platform === 'MaxWeb'
      ? ((campaign.postbackUrl && campaign.clickidToken)
        ? { passed: true }
        : { passed: false, note: 'postbackUrl/clickidToken não configurados' })
      : (ctx.trackingCriticalUnchecked === 0
        ? { passed: true }
        : { passed: false, note: 'Checklist de tracking do Step 8 (hop stats) tem item crítico pendente' }),
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
  // Limpa itens órfãos: registros de execuções antigas cuja chave saiu da definição atual do
  // passo (ex.: sem_claims/disclaimer_afiliado/privacy_policy migraram do Passo 3 pro 4 em
  // 2026-07-27) ficavam presos como críticos+não-marcados pra sempre, travando compliance_ok
  // sem o usuário conseguir ver ou corrigir — eles nem aparecem mais na UI do passo.
  const validKeys = defs.map((d) => d.key);
  await prisma.campaignChecklist.deleteMany({ where: { campaignId, step, itemKey: { notIn: validKeys } } });
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

  // Sincroniza aprovacoes do Passo 4 (Bridge) para itens correspondentes do Passo 3 (Anti-strike)
  // evitando staleness se o Passo 3 foi avaliado antes do HTML da presell existir.
  if (bridgeResults.disclaimer?.passed) {
    await prisma.campaignChecklist.updateMany({ where: { campaignId, step: STEP_ANTISTRIKE, itemKey: 'disclaimer_afiliado' }, data: { isChecked: true, note: null } });
  }
  if (bridgeResults.privacy_policy?.passed) {
    await prisma.campaignChecklist.updateMany({ where: { campaignId, step: STEP_ANTISTRIKE, itemKey: 'privacy_policy' }, data: { isChecked: true, note: null } });
  }
  if (bridgeResults.sem_claims?.passed) {
    await prisma.campaignChecklist.updateMany({ where: { campaignId, step: STEP_ANTISTRIKE, itemKey: 'sem_claims' }, data: { isChecked: true, note: null } });
  }

  const priorChecklists = await prisma.campaignChecklist.findMany({ where: { campaignId, step: { in: [STEP_ANTISTRIKE, STEP_BRIDGE, STEP_GOOGLE_ADS, STEP_TRACKING] } } });
  const otherChecklistsCriticalUnchecked = priorChecklists.filter((c) => c.isCritical && !c.isChecked).length;
  const trackingCriticalUnchecked = priorChecklists.filter((c) => c.step === STEP_TRACKING && c.isCritical && !c.isChecked).length;
  const selectedKeywordsCount = (campaign.keywords ?? []).filter((k) => k.isSelected).length;

  const goLiveResults = await verifyGoLiveChecklist(campaign, { selectedKeywordsCount, otherChecklistsCriticalUnchecked, trackingCriticalUnchecked });
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

// ---------------------------------------------------------------------------
// Kill switch de compliance (Passo 4 — Pré-sell)
// ---------------------------------------------------------------------------
// O Ad Scout Oracle (Passo 2) coleta as claims reais que os concorrentes usam e o Compliance
// Sentinel classifica cada uma em LOW/MEDIUM/HIGH. Claim HIGH é exatamente o tipo de frase que
// derruba conta no Google Ads — e é também a frase mais tentadora pra IA "se inspirar" quando
// recebe o dossiê de mercado no prompt. enforceCompliance() é a barreira final: roda no texto
// JÁ GERADO e reprova se alguma claim HIGH (ou termo banido conhecido) sobreviveu, forçando
// regeneração com a lista de proibições explícita.

const CLAIM_MATCH_STOPWORDS = new Set([
  'a', 'o', 'as', 'os', 'um', 'uma', 'de', 'da', 'do', 'das', 'dos', 'em', 'no', 'na', 'nos',
  'nas', 'por', 'para', 'pra', 'com', 'sem', 'que', 'e', 'ou', 'se', 'ao', 'aos', 'à', 'as',
  'seu', 'sua', 'seus', 'suas', 'mais', 'menos', 'the', 'a', 'an', 'of', 'in', 'on', 'at',
  'to', 'for', 'with', 'without', 'and', 'or', 'if', 'your', 'you', 'is', 'are', 'be', 'it',
  'this', 'that', 'from', 'by', 'as', 'more', 'less',
]);

export interface ComplianceViolation {
  claim: string;
  sourceCompetitor: string;
  justification: string;
  // Trecho normalizado que casou — claim inteira quando a cópia foi literal, ou o n-grama
  // quando a IA parafraseou só o começo/meio da frase.
  matched: string;
}

export interface EnforceComplianceResult {
  passed: boolean;
  violations: ComplianceViolation[];
  // Termo pego pelo checador genérico de claim banida (independe do dossiê de mercado).
  bannedTerm: string | null;
  // Texto pronto pra ser concatenado no prompt da regeneração.
  guidance: string;
}

function normalizeForClaimMatch(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// N-gramas de 4 palavras com pelo menos 2 termos de conteúdo — evita reprovar por coincidência
// de conectivos ("para o seu corpo") mas ainda pega paráfrase parcial de claim de concorrente.
function significantShingles(normalizedClaim: string): string[] {
  const tokens = normalizedClaim.split(' ').filter(Boolean);
  if (tokens.length < 4) return [];
  const out: string[] = [];
  for (let i = 0; i + 4 <= tokens.length; i++) {
    const window = tokens.slice(i, i + 4);
    const content = window.filter(t => t.length >= 4 && !CLAIM_MATCH_STOPWORDS.has(t));
    if (content.length >= 2) out.push(window.join(' '));
  }
  return out;
}

// Pura de propósito (sem I/O): recebe o texto já gerado e as claims do dossiê e devolve o
// veredito. Só claims HIGH bloqueiam — MEDIUM/LOW ficam a cargo do prompt e da revisão humana.
export function enforceCompliance(generatedCopy: string, claims: AnalyzedClaimItem[]): EnforceComplianceResult {
  const normalizedCopy = normalizeForClaimMatch(generatedCopy);
  const violations: ComplianceViolation[] = [];

  for (const item of claims) {
    if (item.riskLevel !== 'HIGH') continue;
    const normalizedClaim = normalizeForClaimMatch(item.claim);
    if (!normalizedClaim) continue;

    let matched: string | null = null;
    if (normalizedCopy.includes(normalizedClaim)) {
      matched = normalizedClaim;
    } else {
      matched = significantShingles(normalizedClaim).find(s => normalizedCopy.includes(s)) ?? null;
    }
    if (matched) {
      violations.push({
        claim: item.claim,
        sourceCompetitor: item.sourceCompetitor,
        justification: item.justification,
        matched,
      });
    }
  }

  const bannedTerm = findBannedClaim(generatedCopy);
  const passed = violations.length === 0 && !bannedTerm;

  const guidanceLines: string[] = [];
  if (violations.length > 0) {
    guidanceLines.push(
      'BLOQUEIO DE COMPLIANCE — a versão anterior reproduziu claims de risco ALTO mapeadas nos concorrentes. É PROIBIDO usar estas frases, suas traduções, sinônimos diretos ou paráfrases:',
      ...violations.map(v => `- "${v.claim}" (fonte: ${v.sourceCompetitor}) — ${v.justification}`),
    );
  }
  if (bannedTerm) {
    guidanceLines.push(`BLOQUEIO DE COMPLIANCE — termo banido encontrado no texto gerado: "${bannedTerm}". Reescreva sem promessa de resultado, cura ou garantia.`);
  }
  if (guidanceLines.length > 0) {
    guidanceLines.push('Reescreva usando exclusivamente linguagem condicional ("pode ajudar", "entenda como funciona", "resultados individuais variam") e mantenha o disclaimer obrigatório.');
  }

  return { passed, violations, bannedTerm, guidance: guidanceLines.join('\n') };
}

// Claims do dossiê de mercado (Ad Scout Oracle) associadas ao produto ou à campanha. Devolve
// só o que passa no schema — Json solto no banco não é contrato.
export async function getAnalyzedClaims(
  userId: string,
  scope: { productId?: string | null; campaignId?: string | null },
): Promise<AnalyzedClaimItem[]> {
  const or = [
    ...(scope.productId ? [{ productId: scope.productId }] : []),
    ...(scope.campaignId ? [{ campaignId: scope.campaignId }] : []),
  ];
  if (or.length === 0) return [];

  const research = await prisma.marketResearch.findFirst({
    where: { userId, OR: or },
    orderBy: { createdAt: 'desc' },
  });
  if (!research) return [];

  const parsed = z.array(AnalyzedClaimItemSchema).safeParse(research.analyzedClaims);
  return parsed.success ? parsed.data : [];
}
