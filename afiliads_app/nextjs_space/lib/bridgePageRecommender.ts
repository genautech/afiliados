import { ProductResearch, Campaign } from '@prisma/client';
import { SalesPageType } from '@/lib/salesPageAnalyzer';

export enum BridgePageType {
  POGO = 'POGO',
  ADVERTORIAL = 'ADVERTORIAL',
  QUIZ_FUNNEL = 'QUIZ_FUNNEL',
  LEAD_GEN_PAGE = 'LEAD_GEN_PAGE',
  OTHER = 'OTHER',
}

export type BridgePageRecommendation = {
  recommendedType: BridgePageType;
  reasoning: string;
  confidenceScore: number;
};

/**
 * Recomenda o tipo de Bridge Page ideal com base em dados da campanha, produto e análise da página de vendas.
 * @param product O objeto ProductResearch.
 * @param salesPageType O tipo de Sales Page detectado.
 * @param campaign O objeto Campaign (opcional).
 * @returns Uma recomendação de Bridge Page.
 */
export function recommendBridgePage(
  product: ProductResearch,
  salesPageType: SalesPageType,
  campaign?: Campaign, // Opcional
): BridgePageRecommendation {
  let recommendedType: BridgePageType = BridgePageType.OTHER;
  let reasoning: string = 'Nenhuma recomendação específica encontrada. Usando tipo genérico.';
  let confidenceScore: number = 0.5;

  // Regra 1: Pogo Page para VSLs ou Sales Pages com grande "pitch"
  if (salesPageType === SalesPageType.VSL) {
    recommendedType = BridgePageType.POGO;
    reasoning = 'A página de vendas é um VSL (Video Sales Letter). Uma Pogo Page é ideal para aquecer o tráfego rapidamente e direcioná-lo para a VSL, aproveitando o pitch principal na página final.';
    confidenceScore = 0.9;
  }
  // Regra 2: Quiz Funnel para nichos personalizados
  else if (salesPageType === SalesPageType.QUIZ || product.vertical?.toLowerCase().includes('saúde') || product.vertical?.toLowerCase().includes('fitness') || product.vertical?.toLowerCase().includes('pets')) {
    recommendedType = BridgePageType.QUIZ_FUNNEL;
    reasoning = 'A página de vendas é um Quiz Funnel ou o nicho do produto (' + product.vertical + ') sugere uma abordagem personalizada. Um Quiz Funnel permite segmentar e aquecer o lead com base em suas respostas, aumentando a relevância da oferta.';
    confidenceScore = 0.85;
  }
  // Regra 3: Lead Gen Page se o produto ou estratégia visa captura de leads
  // Removida a verificação de product.strategy por complixidade do tipo Json?
  else if (salesPageType === SalesPageType.LEAD_GEN) {
    recommendedType = BridgePageType.LEAD_GEN_PAGE;
    reasoning = 'A página de vendas é uma página de captura de leads ou a estratégia do produto foca em gerar leads. Uma Lead Gen Page oferece um valor gratuito em troca do contato, permitindo follow-up e construção de lista.';
    confidenceScore = 0.8;
  }
  // Regra 4: Advertorial para produtos que precisam de mais contexto/credibilidade
  else if (salesPageType === SalesPageType.DIRECT && (product.avgConversionRate && product.avgConversionRate < 0.02)) { // Exemplo: se direct e baixa conversão esperada
    recommendedType = BridgePageType.ADVERTORIAL;
    reasoning = 'A página de vendas é direta e o produto pode se beneficiar de mais contexto e construção de credibilidade. Um Advertorial pode pré-vender o produto de forma nativa e informativa, preparando o lead para a oferta principal.'; // Texto corrigido
    confidenceScore = 0.75;
  }
  // Regra 5: Fallback para OTHER se não houver outra correspondência e a SalesPage for DIRECT
  else if (salesPageType === SalesPageType.DIRECT) {
    recommendedType = BridgePageType.OTHER; // Corrigido para OTHER
    reasoning = 'A página de vendas é direta, mas nenhuma outra estratégia de bridge page foi identificada como ideal. Recomendando uma abordagem genérica (OTHER).';
    confidenceScore = 0.6;
  }

  // Ajustar o raciocínio e a confiança com base em dados históricos e benchmarking, se fornecidos.
  // Esta parte é um placeholder, seria mais complexa na implementação real.
  // if (historicalData) { /* Ajustar score */ }
  // if (benchmarkingData) { /* Ajustar score */ }

  return {
    recommendedType,
    reasoning,
    confidenceScore,
  };
}
