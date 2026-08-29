import { z } from 'zod';

/**
 * Contratos de saída do LLM no pipeline de conhecimento injetado.
 *
 * Existem porque o input desse pipeline é conteúdo de terceiro não confiável
 * (transcrição de YouTube, página de concorrente raspada). Sem validação em runtime,
 * `interface` do TypeScript não impede nada: o JSON do modelo era persistido cru e
 * só estourava depois, em `insights.dores.map(...)`, com dois LLMs já pagos.
 */

const texto = (max: number) => z.string().trim().min(1).max(max);

export const RefinedInsightsSchema = z.object({
  title: texto(300),
  headline: texto(500),
  dores: z.array(texto(500)).min(1).max(10),
  desejos: z.array(texto(500)).min(1).max(10),
  objecoes: z.array(texto(500)).min(1).max(10),
  angulos: z.array(texto(500)).min(1).max(10),
  frases_chave: z.array(texto(500)).min(1).max(10),
}).strict();

export type RefinedInsights = z.infer<typeof RefinedInsightsSchema>;

const parDePergunta = z.object({
  pergunta: texto(500),
  resposta: texto(3000),
}).strict();

const blocoComoFunciona = z.object({
  titulo: texto(300),
  texto: texto(3000),
}).strict();

const ingrediente = z.object({
  nome: texto(200),
  beneficio: texto(1000),
}).strict();

const pacote = z.object({
  nome: texto(200),
  qtd: texto(100),
  economia: z.string().trim().max(100).optional(),
  badge: z.string().trim().max(100).optional(),
}).strict();

/**
 * Espelha `PresellContent` de lib/presell.ts. Mantido `.strict()` de propósito: chave
 * inventada pelo modelo é sinal de alucinação, não de campo novo — e o template só
 * consome as chaves conhecidas, então o extra viraria dado morto no banco.
 */
export const PresellContentSchema = z.object({
  categoria: texto(200),
  headline: texto(500),
  subheadline: texto(1000),
  autor: texto(200),
  leitura_min: z.number().int().positive().max(120),
  abertura: texto(5000),
  secao1_titulo: texto(300),
  secao1_texto: texto(8000),
  secao2_titulo: texto(300),
  secao2_texto: texto(8000),
  beneficios: z.array(texto(500)).min(1).max(20),
  prova: texto(5000),
  cta_texto: texto(300),
  cta_reforco: texto(500),
  secao3_titulo: texto(300),
  secao3_texto: texto(8000),
  pros: z.array(texto(500)).min(1).max(20),
  contras: z.array(texto(500)).min(1).max(20),
  faq: z.array(parDePergunta).min(1).max(20),
  cta_final: texto(500),
  titulo_pagina: texto(300),
  meta_descricao: texto(500),
  nome_site: texto(200),
  como_funciona: z.array(blocoComoFunciona).max(12).optional(),
  temas_feedback: z.array(texto(300)).max(20).optional(),
  cientifico_titulo: z.string().trim().max(300).optional(),
  cientifico_texto: z.string().trim().max(8000).optional(),
  ingredientes: z.array(ingrediente).max(30).optional(),
  pacotes: z.array(pacote).max(12).optional(),
  certificacoes: z.array(texto(200)).max(20).optional(),
  aviso_autenticidade: z.string().trim().max(1000).optional(),
}).strict();

export const PresellProposalSchema = z.object({
  explanation: texto(5000),
  proposedContent: PresellContentSchema,
}).strict();

export type PresellProposalPayload = z.infer<typeof PresellProposalSchema>;

/** Formata o erro do Zod para o retry de auto-correção do runner de LLM. */
export function zodIssuesToMessage(error: z.ZodError): string {
  return error.errors
    .map((issue) => `${issue.path.join('.') || '(raiz)'}: ${issue.message}`)
    .join('; ')
    .slice(0, 1000);
}
