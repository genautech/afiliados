// Tipos e constantes de pageType usados tanto no cliente quanto no servidor.
// Mantidos em arquivo separado (sem dependências de Node/fs/dns) para evitar que
// componentes client-side puxem módulos server-only via lib/campaign-strategy.ts.

export const PRESELL_PAGE_TYPES = [
  'advertorial',
  'pogo',
  'vsl',
  'interstitial',
  'authority',
  // authority_v2 = authority com foto lifestyle real (ver renderPresellHtml em lib/presell.ts).
  // Estava só em VALID_PAGE_TYPES/TEMPLATE_FILE_BY_TYPE e fora daqui, então todo consumidor que
  // valida por esta lista o rejeitava em silêncio — inclusive o override de aprendizado em
  // lib/campaign-strategy.ts, que descartava um authority_v2 com lucro real.
  'authority_v2',
  'tsl',
  'cookie_popup',
  'review',
] as const;

export type PresellPageType = (typeof PRESELL_PAGE_TYPES)[number];
