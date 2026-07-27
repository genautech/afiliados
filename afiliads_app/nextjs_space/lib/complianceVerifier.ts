import { prisma } from './prisma';
import type { Campaign } from '@prisma/client';

export interface CheckResult {
  passed: boolean;
  note?: string;
}

const AFFILIATE_DISCLOSURE_RE = /participa de programas de afiliados|pode receber comiss[ãa]o/i;
const PRIVACY_LINK_RE = /politica-de-privacidade/i;
const BANNED_CLAIM_RE = /\bcura\b|\belimina\b|garantido|perca \d+\s?kg|livre-se de/i;
const FAQ_RE = /perguntas frequentes/i;
const RESULTADOS_VARIAM_RE = /resultados individuais podem variar/i;
const GA4_TAG_RE = /gtag\(\s*'config'\s*,\s*'G-/i;

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

export async function verifyAntistrikeItems(campaign: Campaign): Promise<Record<string, CheckResult>> {
  const html = await getPresellHtml(campaign);
  return {
    sem_claims: html
      ? (BANNED_CLAIM_RE.test(html) ? { passed: false, note: 'Termo de claim proibido encontrado no HTML (cura/elimina/garantido/etc.)' } : { passed: true })
      : { passed: false, note: 'Sem HTML da presell disponível pra analisar' },
    disclaimer_afiliado: checkHtml(html, AFFILIATE_DISCLOSURE_RE, 'Disclosure de afiliado não encontrada no HTML'),
    privacy_policy: checkHtml(html, PRIVACY_LINK_RE, 'Link de política de privacidade não encontrado no HTML'),
    ga4_configurado: checkHtml(html, GA4_TAG_RE, 'Tag do GA4 (gtag config G-...) não encontrada no HTML'),
    ssl_ativo: await checkSsl(campaign.presellUrl),
  };
}

export async function verifyBridgeChecklist(campaign: Campaign): Promise<Record<string, CheckResult>> {
  const html = await getPresellHtml(campaign);
  return {
    disclaimer: checkHtml(html, AFFILIATE_DISCLOSURE_RE, 'Disclosure de afiliado não encontrada no HTML'),
    ssl: await checkSsl(campaign.presellUrl),
    faq: checkHtml(html, FAQ_RE, 'Seção de FAQ não encontrada no HTML'),
    resultados_variam: checkHtml(html, RESULTADOS_VARIAM_RE, '"Resultados individuais podem variar" não encontrado no HTML'),
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
