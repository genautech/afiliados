import { z } from 'zod';

// Nível de risco de claims identificado pelo Compliance Sentinel.
export const ClaimRiskLevel = z.enum(['LOW', 'MEDIUM', 'HIGH']);
export type ClaimRiskLevel = z.infer<typeof ClaimRiskLevel>;

// Tipo de produto/estratégia usado pelo ad-scout-oracle.
export const ProductTypeEnum = z.enum(['AFFILIATE', 'PROPRIETARY_LOW_TICKET', 'MENTORSHIP']);
export type ProductTypeEnum = z.infer<typeof ProductTypeEnum>;

// Concorrente mapeado durante a pesquisa de mercado.
export const CompetitorItemSchema = z.object({
  name: z.string().min(1, 'O nome do concorrente é obrigatório.'),
  url: z.string().url('A URL do concorrente deve ser um link válido.'),
  price: z.number().finite().nonnegative('O preço deve ser um valor numérico positivo.'),
  angle: z.string().min(1, 'O ângulo de vendas/headline do concorrente é obrigatório.'),
  // Tempo no ar do anúncio, em dias. Opcional: nem toda fonte expõe a data de início,
  // e um anúncio recém-detectado entra sem histórico.
  activeDays: z.number().int().nonnegative('O tempo no ar deve ser um número inteiro de dias.').optional(),
}).strict();
export type CompetitorItem = z.infer<typeof CompetitorItemSchema>;

// Claim analisada para o kill switch de compliance.
export const AnalyzedClaimItemSchema = z.object({
  claim: z.string().min(1, 'A declaração/termo da claim é obrigatória.'),
  sourceCompetitor: z.string().min(1, 'A fonte da claim (concorrente ou URL) é obrigatória.'),
  riskLevel: ClaimRiskLevel,
  justification: z.string().min(1, 'A justificativa de classificação do risco é obrigatória.'),
}).strict();
export type AnalyzedClaimItem = z.infer<typeof AnalyzedClaimItemSchema>;

// Retorno completo e estrito do contrato do ad-scout-oracle.
export const AdScoutOracleOutputSchema = z.object({
  query: z.string().min(1, 'A palavra-chave de pesquisa é obrigatória.'),
  productType: ProductTypeEnum,
  adCount: z.number().int().nonnegative('A contagem de anúncios deve ser um número inteiro.'),
  avgPrice: z.number().finite().nonnegative('O preço médio de mercado deve ser um valor positivo.'),
  competitors: z.array(CompetitorItemSchema).default([]),
  audiencePain: z.array(z.string()).min(1, 'O agente precisa capturar ao menos uma dor real da audiência.'),
  anglesSuggested: z.array(z.string()).min(1, 'O agente precisa sugerir ao menos um ângulo de copy.'),
  analyzedClaims: z.array(AnalyzedClaimItemSchema).default([]),
}).strict();
export type AdScoutOracleOutput = z.infer<typeof AdScoutOracleOutputSchema>;

// Payload de entrada da rota do wizard.
export const MarketResearchRequestSchema = z.object({
  query: z.string().min(2, 'Palavra-chave curta demais para pesquisa.'),
  productResearchId: z.string().optional(),
  campaignId: z.string().optional(),
  productType: ProductTypeEnum,
}).strict();
export type MarketResearchRequest = z.infer<typeof MarketResearchRequestSchema>;
