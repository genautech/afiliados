// Normalização do tracking ID (TID) do hoplink — fonte única.
//
// O ClickBank só aceita a-z / 0-9 / _ no TID, até 100 caracteres: hífen quebra o tracking. Por
// isso lib/presell.ts sempre normalizou o valor antes de anexar ?tid= ao hoplink.
//
// O problema é que o outro lado não normalizava. lib/clickbank.ts casava a venda com a campanha
// por `c.utmCampaign.toLowerCase()` e `c.name.toLowerCase()` crus, então qualquer campanha com
// espaço, hífen ou acento no nome nunca casava com o TID que ela mesma tinha enviado:
//
//   nome "Alpilean US - Search v1"  →  tid "alpilean_us___search_v1"
//   chave procurada pelo sync       →  "alpilean us - search v1"
//
// Venda ia para unmatchedTids, o DailyLog da campanha ficava com revenue 0, e o loop de
// auto-correção (que decide SCALE/KILL por EPC) enxergava uma campanha gastando sem retorno.
// Campanha que vendia podia levar KILL por causa de um hífen.
//
// Regra: quem gera o TID e quem procura a campanha passam pela MESMA função.

export const TRACKING_ID_MAX = 100;

/** Forma canônica de um TID: minúsculas, só a-z/0-9/_, até 100 caracteres. */
export function normalizeTrackingId(raw: string | null | undefined): string {
  return String(raw ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .slice(0, TRACKING_ID_MAX);
}

/**
 * Índice de campanhas por TID normalizado, para casar o que volta da rede de afiliados.
 *
 * `utmCampaign` tem precedência sobre `name`: é o campo criado para tracking e gerado num formato
 * seguro, enquanto `name` é texto livre que o usuário renomeia quando quiser. Antes era o
 * contrário (name era indexado depois e sobrescrevia), o que fazia uma renomeação de campanha
 * mudar em silêncio qual campanha recebia a venda.
 */
export function indexCampaignsByTrackingId<T extends { name: string; utmCampaign?: string | null }>(
  campaigns: T[],
): Map<string, T> {
  const byTid = new Map<string, T>();
  for (const campaign of campaigns) {
    const nome = normalizeTrackingId(campaign.name);
    if (nome) byTid.set(nome, campaign);
  }
  for (const campaign of campaigns) {
    const utm = normalizeTrackingId(campaign.utmCampaign);
    if (utm) byTid.set(utm, campaign);
  }
  return byTid;
}
