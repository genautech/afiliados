import { normalizeTrackingId } from './tracking-id';

// Validação de conteúdo da UTM. Até aqui só existia checagem de PRESENÇA: complianceVerifier
// marcava o item como ok se `utmCampaign || utmString` tivesse qualquer coisa, e patch-schema só
// limitava o tamanho da string. Ou seja, uma UTM com macro errada, sem utm_source, ou com
// utm_campaign apontando para outra campanha passava como válida.
//
// Nada aqui é julgamento: estrutura de query string e nome de macro do Google Ads são regras
// fechadas e verificáveis. Julgamento só entra onde o significado importa.

/** Parâmetros ValueTrack do Google Ads. A macro é trocada pelo Google na hora do clique; nome
 * errado não dá erro — vai para a URL como texto literal e o relatório fica sem o dado.
 * Fonte: https://support.google.com/google-ads/answer/6305348 */
const VALUETRACK_PARAMS = new Set([
  'keyword', 'matchtype', 'network', 'device', 'devicemodel', 'creative', 'placement',
  'target', 'targetid', 'adposition', 'campaignid', 'adgroupid', 'feeditemid', 'extensionid',
  'loc_interest_ms', 'loc_physical_ms', 'lpurl', 'lpurl+2', 'lpurl+3', 'unescapedlpurl',
  'escapedlpurl', 'escapedlpurl+2', 'escapedlpurl+3', 'random', 'ifmobile', 'ifnotmobile',
  'ifsearch', 'ifcontent', 'merchant_id', 'product_channel', 'product_id', 'product_country',
  'product_language', 'product_partition_id', 'store_code', 'gclid', 'sourceid',
]);

const OBRIGATORIOS = ['utm_source', 'utm_medium', 'utm_campaign'] as const;

export type UtmValidation = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

function extrairMacros(texto: string): string[] {
  return Array.from(texto.matchAll(/\{([^}]*)\}/g)).map((m) => m[1]);
}

/**
 * Valida a string de UTM da campanha.
 *
 * `utmCampaign` é comparado com o valor de `utm_campaign` dentro da string porque os dois
 * alimentam a mesma atribuição: lib/clickbank.ts casa a venda pela forma canônica do
 * `utmCampaign` da campanha (ver lib/tracking-id.ts). Se a string de UTM disser outra coisa, o
 * relatório do Google Ads e a receita do ClickBank falam de campanhas diferentes.
 */
export function validateUtmString(
  utmString: string | null | undefined,
  contexto: { utmCampaign?: string | null } = {},
): UtmValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const raw = String(utmString ?? '').trim();

  if (!raw) {
    return { valid: false, errors: ['UTM não configurada.'], warnings };
  }

  if (!raw.startsWith('?') && !raw.startsWith('&')) {
    errors.push('A UTM deve começar com "?" (ou "&" se for concatenada a uma URL que já tem query string).');
  }

  if (/\s/.test(raw)) {
    errors.push('A UTM tem espaço em branco — use %20 ou _ no lugar, senão o Google trunca a URL.');
  }

  // Macro precisa ser resolvida antes de parsear: URLSearchParams engoliria {keyword} como valor.
  const macrosInvalidas = extrairMacros(raw)
    // ValueTrack aceita modificador depois de ":" — {keyword:default}, {ifmobile:mobile}.
    .map((macro) => macro.split(':')[0].trim())
    .filter((nome) => nome && !VALUETRACK_PARAMS.has(nome.toLowerCase()));
  for (const nome of macrosInvalidas) {
    errors.push(`"{${nome}}" não é um parâmetro ValueTrack do Google Ads — vai para a URL como texto literal e o relatório fica sem esse dado.`);
  }

  const params = new URLSearchParams(raw.replace(/^[?&]/, ''));

  const vistos = new Map<string, number>();
  for (const [chave] of params) vistos.set(chave, (vistos.get(chave) ?? 0) + 1);
  for (const [chave, n] of vistos) {
    if (n > 1) errors.push(`O parâmetro "${chave}" aparece ${n} vezes na UTM — o Google usa só um e o resultado é imprevisível.`);
  }

  for (const obrigatorio of OBRIGATORIOS) {
    const valor = params.get(obrigatorio);
    if (!valor || !valor.trim()) errors.push(`Falta "${obrigatorio}" na UTM.`);
  }

  const utmCampaignNaString = params.get('utm_campaign');
  const utmCampaignDaCampanha = contexto.utmCampaign;
  if (utmCampaignNaString && utmCampaignDaCampanha) {
    // Compara na forma canônica: é ela que decide a atribuição da venda.
    if (normalizeTrackingId(utmCampaignNaString) !== normalizeTrackingId(utmCampaignDaCampanha)) {
      errors.push(
        `utm_campaign da UTM ("${utmCampaignNaString}") é diferente do campo utmCampaign da campanha ("${utmCampaignDaCampanha}") — ` +
        'o relatório do Google Ads e a receita da rede de afiliados vão parar em campanhas diferentes.',
      );
    }
  }

  // gclid é anexado pelo Google (auto-tagging). Valor fixo na UTM sobrescreve o real.
  const gclid = params.get('gclid');
  if (gclid && !gclid.includes('{')) {
    errors.push('A UTM tem um gclid com valor fixo. O Google anexa o gclid real no clique; um valor fixo quebra a medição de conversão.');
  }

  const medium = params.get('utm_medium');
  if (medium && !['cpc', 'ppc', 'paid', 'paidsearch'].includes(medium.toLowerCase()) && !medium.includes('{')) {
    warnings.push(`utm_medium="${medium}" não é um valor de tráfego pago reconhecido (esperado cpc/ppc/paid). O GA4 pode classificar a sessão como outro canal.`);
  }

  if (!params.get('utm_term') && !params.get('utm_content')) {
    warnings.push('Sem utm_term nem utm_content: você não vai conseguir separar desempenho por keyword ou por criativo no GA4.');
  }

  return { valid: errors.length === 0, errors, warnings };
}
