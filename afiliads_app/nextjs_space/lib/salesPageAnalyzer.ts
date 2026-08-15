import * as cheerio from 'cheerio';
import { lookup } from 'dns/promises';
import { request as httpsRequest } from 'https';
import { isIP, type LookupFunction } from 'net';

type ResolvedAddress = { address: string; family: 4 | 6 };
type AddressLookup = (
  hostname: string,
  options: { all: true; verbatim: true },
) => Promise<Array<{ address: string; family: number }>>;
type PageResponse = {
  ok: boolean;
  status: number;
  statusText: string;
  headers: Headers;
  body?: AsyncIterable<Uint8Array>;
  cancel: () => Promise<void> | void;
};
type FetchPageDependencies = {
  lookup: AddressLookup;
  request: (url: URL, pinnedAddress: ResolvedAddress) => Promise<PageResponse>;
};

function isPrivateAddress(address: string): boolean {
  const normalized = address.toLowerCase().replace(/^\[|\]$/g, '');
  const family = isIP(normalized);
  if (family === 4) {
    const [a, b] = normalized.split('.').map(Number);
    return a === 0
      || a === 10
      || (a === 100 && b >= 64 && b <= 127)
      || a === 127
      || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && (b === 0 || b === 168))
      || (a === 198 && (b === 18 || b === 19))
      || a >= 224;
  }
  if (family === 6) {
    if (normalized.startsWith('::ffff:')) {
      const tail = normalized.slice('::ffff:'.length);
      if (tail.includes('.')) return isPrivateAddress(tail);
      const [high, low] = tail.split(':').map((part) => Number.parseInt(part, 16));
      if (Number.isInteger(high) && Number.isInteger(low)) {
        return isPrivateAddress([
          high >> 8,
          high & 0xff,
          low >> 8,
          low & 0xff,
        ].join('.'));
      }
    }
    return normalized === '::'
      || normalized === '::1'
      || normalized.startsWith('fc')
      || normalized.startsWith('fd')
      || /^fe[89ab]/.test(normalized)
      || /^fe[c-f]/.test(normalized)
      || normalized.startsWith('ff');
  }
  return false;
}

function parseSafeSalesPageUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    if (url.hostname.toLowerCase() === 'localhost' || isPrivateAddress(url.hostname)) return null;
    return url;
  } catch {
    return null;
  }
}

async function resolvePublicAddresses(url: URL, lookupFn: AddressLookup): Promise<ResolvedAddress[]> {
  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  const literalFamily = isIP(hostname);
  if (literalFamily) {
    return isPrivateAddress(hostname) ? [] : [{ address: hostname, family: literalFamily as 4 | 6 }];
  }
  const addresses = await lookupFn(hostname, { all: true, verbatim: true });
  if (addresses.length === 0 || addresses.some(({ address }) => isPrivateAddress(address))) return [];
  return addresses.map(({ address, family }) => ({ address, family: family as 4 | 6 }));
}

const MAX_PAGE_BYTES = 2_000_000;

async function requestPinnedPage(url: URL, pinnedAddress: ResolvedAddress): Promise<PageResponse> {
  return await new Promise((resolve, reject) => {
    const pinnedLookup: LookupFunction = (_hostname, _options, callback) => {
      callback(null, [pinnedAddress]);
    };
    const request = httpsRequest(url, {
      method: 'GET',
      lookup: pinnedLookup,
      timeout: 10_000,
    }, (response) => {
      const headers = new Headers();
      for (const [name, value] of Object.entries(response.headers)) {
        if (Array.isArray(value)) value.forEach((item) => headers.append(name, item));
        else if (value !== undefined) headers.set(name, String(value));
      }
      const status = response.statusCode ?? 0;
      resolve({
        ok: status >= 200 && status < 300,
        status,
        statusText: response.statusMessage ?? '',
        headers,
        body: response,
        cancel: () => { response.destroy(); },
      });
    });
    request.once('timeout', () => request.destroy(new Error('Timeout ao buscar página de vendas')));
    request.once('error', reject);
    request.end();
  });
}

async function readLimitedResponseBody(response: PageResponse): Promise<string | null> {
  const declaredLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_PAGE_BYTES) return null;

  if (!response.body) return '';

  const decoder = new TextDecoder();
  const chunks: string[] = [];
  let totalBytes = 0;
  for await (const value of response.body) {
    totalBytes += value.byteLength;
    if (totalBytes > MAX_PAGE_BYTES) {
      await response.cancel();
      return null;
    }
    chunks.push(decoder.decode(value, { stream: true }));
  }
  chunks.push(decoder.decode());
  return chunks.join('');
}

export type SalesPageCharacteristics = {
  hasVideo: boolean;
  hasQuizForm: boolean;
  hasLeadGenForm: boolean;
  isAdvertorialLike: boolean;
  hasDirectPitch: boolean;
  // Adicione outras características conforme necessário
};

export enum SalesPageType {
  VSL = 'VSL',
  DIRECT = 'DIRECT',
  QUIZ = 'QUIZ',
  LEAD_GEN = 'LEAD_GEN',
  OTHER = 'OTHER',
}

/**
 * Busca o conteúdo HTML de uma URL.
 * @param url A URL da página de vendas.
 * @returns O conteúdo HTML da página.
 */
export async function fetchPageContent(
  url: string,
  dependencies: Partial<FetchPageDependencies> = {},
): Promise<string | null> {
  try {
    const lookupFn: AddressLookup = dependencies.lookup
      ?? ((hostname, options) => lookup(hostname, options));
    const requestPage = dependencies.request ?? requestPinnedPage;
    let currentUrl = new URL(url);
    for (let redirects = 0; redirects <= 5; redirects += 1) {
      const safeUrl = parseSafeSalesPageUrl(currentUrl.toString());
      if (!safeUrl) return null;
      const addresses = await resolvePublicAddresses(safeUrl, lookupFn);
      if (addresses.length === 0) return null;

      const response = await requestPage(safeUrl, addresses[0]);
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        await response.cancel();
        if (!location || redirects === 5) return null;
        currentUrl = new URL(location, safeUrl);
        continue;
      }
      if (!response.ok) {
        console.error(`Failed to fetch page content from ${url}: ${response.statusText}`);
        return null;
      }
      return await readLimitedResponseBody(response);
    }
    return null;
  } catch (error) {
    console.error(`Error fetching page content from ${url}:`, error);
    return null;
  }
}

/**
 * Analisa o DOM de uma página HTML para extrair características-chave.
 * @param html O conteúdo HTML da página.
 * @returns Um objeto com as características da página.
 */
export function analyzeDom(html: string): SalesPageCharacteristics {
  const $ = cheerio.load(html);

  const characteristics: SalesPageCharacteristics = {
    hasVideo: $('video').length > 0 || $('iframe[src*="youtube.com"], iframe[src*="vimeo.com"]').length > 0,
    hasQuizForm: $('form').filter((_, el) => { // Corrigido 'any' implícito
      return $(el).find('input[type="radio"], input[type="checkbox"], select').length > 0;
    }).length > 0,
    hasLeadGenForm: $('form').filter((_, el) => { // Corrigido 'any' implícito
      const formText = $(el).text().toLowerCase();
      return ($(el).find('input[type="email"]').length > 0 || formText.includes('email') || formText.includes('receba agora'));
    }).length > 0,
    isAdvertorialLike: $('.blog-post, .article, [class*="content-section"]').length > 0 && $('h1, h2, h3').length > 3,
    hasDirectPitch: $('button:contains("Compre Agora"), button:contains("Acesse o Produto"), a:contains("Comprar"), a:contains("Acessar")').length > 0, // Simplificado, pode ser mais sofisticado
  };

  return characteristics;
}

/**
 * Classifica o tipo de página de vendas com base nas características extraídas.
 * @param characteristics As características extraídas da página.
 * @returns O tipo de SalesPageType.
 */
export function classifySalesPage(characteristics: SalesPageCharacteristics): SalesPageType {
  if (characteristics.hasQuizForm) {
    return SalesPageType.QUIZ;
  }
  if (characteristics.hasVideo) {
    // Pode ser VSL, mas precisa de mais contexto para ser definitivo.
    // Por enquanto, se tem vídeo e não é quiz, assume VSL.
    return SalesPageType.VSL;
  }
  if (characteristics.hasLeadGenForm) {
    return SalesPageType.LEAD_GEN;
  }
  if (characteristics.isAdvertorialLike) {
    return SalesPageType.OTHER; // Se a sales page parece um advertorial, classificar como OTHER ou DIRECT, não ADVERTORIAL (que é tipo de bridge page)
  }
  if (characteristics.hasDirectPitch) {
    return SalesPageType.DIRECT;
  }
  return SalesPageType.OTHER;
}
