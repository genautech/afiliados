// Tipos e constantes de pageType usados tanto no cliente quanto no servidor.
// Mantidos em arquivo separado (sem dependências de Node/fs/dns) para evitar que
// componentes client-side puxem módulos server-only via lib/campaign-strategy.ts.

export const PRESELL_PAGE_TYPES = [
  'advertorial',
  'pogo',
  'vsl',
  'interstitial',
  'authority',
  'tsl',
  'cookie_popup',
  'review',
] as const;

export type PresellPageType = (typeof PRESELL_PAGE_TYPES)[number];
