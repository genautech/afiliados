import { PLATFORMS } from './wizard-data';

export type AffiliatePlatform = (typeof PLATFORMS)[number] | 'Digistore24' | 'Outro' | null;

export type HopLinkValidation = {
  valid: boolean;
  status: 'valid' | 'warning' | 'invalid';
  platform: AffiliatePlatform;
  message: string;
  isHopLink: boolean;
  isFinalPage: boolean;
};

// Domínios/parâmetros que indicam que a URL É um link de afiliado (HopLink/Smartlink).
const HOP_LINK_PATTERNS: Record<string, { domains?: RegExp; params?: RegExp; path?: RegExp }> = {
  ClickBank: {
    domains: /hop\.clickbank\.net|\.hop\.clickbank\.net/i,
    path: /\/\?/i, // hoplinks criptografados geralmente têm query string ou path criptografado
  },
  BuyGoods: {
    domains: /buygoods\.com|bygoods\.com/i,
    params: /\?(?:affid|afid|aff)=/i,
  },
  MaxWeb: {
    domains: /clkmg\.com|clksmile\.com|smartlink\.|trk\.maxweb\.com/i,
    params: /\?(?:affid|clickid|subid|s1)=/i,
  },
  Digistore24: {
    domains: /digistore24\.com|get\.digistore24\.com/i,
    params: /\?(?:aff_id|affid|src|sck)=/i,
  },
  Hotmart: {
    domains: /hotmart\.com|pay\.hotmart\.com/i,
    params: /\?(?:sck|src|aff|checkout|off)=/i,
  },
  Eduzz: {
    domains: /eduzz\.com|pay\.eduzz\.com/i,
    params: /\?(?:sck|src|aff|utm)=/i,
  },
  Monetizze: {
    domains: /monetizze\.com|pay\.monetizze\.com/i,
    params: /\?(?:sck|src|aff|utm)=/i,
  },
};

// Palavras/parâmetros que indicam que a URL é a PÁGINA FINAL do produtor, não o HopLink.
const FINAL_PAGE_PATTERNS = [
  /\/order\/?/i,
  /\/checkout\/?/i,
  /\/buy\/?/i,
  /\/cart\/?/i,
  /\/purchase\/?/i,
  /\?submit=1/i,
  /\?add-to-cart/i,
  /\?product=/i,
  /shop\.ify\.com/i,
];

// Domínios conhecidos de plataformas de checkout/venda final (não são HopLinks).
const CHECKOUT_DOMAINS = /clickfunnels\.com|kajabi\.com|gohighlevel\.com|hotmart\.club|pay\.hotmart\.com|pay\.eduzz\.com|pay\.monetizze\.com/i;

export function detectAffiliatePlatform(url: string): AffiliatePlatform {
  if (!url || !/^https?:\/\//.test(url)) return null;

  // Primeira passada: domínios específicos (mais precisos que parâmetros genéricos).
  for (const [platform, patterns] of Object.entries(HOP_LINK_PATTERNS)) {
    if (patterns.domains && patterns.domains.test(url)) return platform as AffiliatePlatform;
  }

  // Segunda passada: parâmetros de afiliado (mais genéricos, podem colidir entre plataformas).
  for (const [platform, patterns] of Object.entries(HOP_LINK_PATTERNS)) {
    if (patterns.params && patterns.params.test(url)) return platform as AffiliatePlatform;
  }

  return 'Outro';
}

export function validateAffiliateLink(
  url: string,
  expectedPlatform?: AffiliatePlatform,
): HopLinkValidation {
  if (!url || !/^https?:\/\//.test(url)) {
    return {
      valid: false,
      status: 'invalid',
      platform: null,
      message: 'Cole uma URL válida começando com http:// ou https://',
      isHopLink: false,
      isFinalPage: false,
    };
  }

  const detected = detectAffiliatePlatform(url);
  const platform = expectedPlatform && expectedPlatform !== 'Outro' ? expectedPlatform : detected;

  // Verifica se a URL é uma página final/checkout (não HopLink).
  const looksLikeFinalPage =
    FINAL_PAGE_PATTERNS.some((re) => re.test(url)) ||
    CHECKOUT_DOMAINS.test(url) ||
    (platform === 'ClickBank' && !/hop\.clickbank\.net/i.test(url) && /clickbank\.net/i.test(url));

  if (looksLikeFinalPage) {
    return {
      valid: false,
      status: 'warning',
      platform,
      message:
        'Essa URL parece ser da página final/checkout do produtor, não do seu link de afiliado. Seu HopLink normalmente vem do botão "Promote" / "Get affiliate link" da plataforma. Se usar essa URL, você não receberá comissão.',
      isHopLink: false,
      isFinalPage: true,
    };
  }

  const isHopLink = Object.values(HOP_LINK_PATTERNS).some(
    (p) => (p.domains && p.domains.test(url)) || (p.params && p.params.test(url)),
  );

  if (!isHopLink) {
    // URL limpa de domínio próprio — é válida como URL final do anúncio, mas não como HopLink.
    return {
      valid: true,
      status: 'valid',
      platform: 'Outro',
      message: 'URL limpa detectada. Use esta como URL final do anúncio; o HopLink deve estar no botão CTA da sua página.',
      isHopLink: false,
      isFinalPage: false,
    };
  }

  const platformMismatch =
    expectedPlatform && expectedPlatform !== 'Outro' && detected && detected !== expectedPlatform && detected !== 'Outro';

  return {
    valid: !platformMismatch,
    status: platformMismatch ? 'warning' : 'valid',
    platform,
    message: platformMismatch
      ? `Detectamos link de ${detected}, mas a plataforma selecionada é ${expectedPlatform}. Verifique se está usando o HopLink correto.`
      : `HopLink/Smartlink de ${platform ?? 'afiliado'} detectado. Certifique-se de que este é o link do botão "Promote" da plataforma.`,
    isHopLink: true,
    isFinalPage: false,
  };
}

export function validateFinalUrlVsHopLink(
  finalUrl: string,
  hopLink: string,
): { ok: boolean; message: string } {
  if (!finalUrl || !hopLink) return { ok: true, message: '' };
  const hop = validateAffiliateLink(hopLink);
  if (!hop.isHopLink) {
    return {
      ok: false,
      message: 'O campo "Link de Afiliado / Oferta" não parece ser um HopLink. A URL final do anúncio deve ser do seu domínio próprio; o HopLink fica no CTA da página.',
    };
  }
  if (finalUrl === hopLink) {
    return {
      ok: false,
      message: 'A URL final do anúncio não pode ser o HopLink criptografado. O Google Ads rejeita links de afiliado direto. Use seu domínio próprio na URL final e deixe o HopLink no CTA.',
    };
  }
  return { ok: true, message: '' };
}
