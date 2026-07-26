import * as cheerio from 'cheerio';

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
export async function fetchPageContent(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Failed to fetch page content from ${url}: ${response.statusText}`);
      return null;
    }
    return await response.text();
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
 * @param characteristics As características da página de vendas.
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
