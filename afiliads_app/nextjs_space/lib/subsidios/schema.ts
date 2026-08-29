import { z } from 'zod';

// Contrato do catálogo de subsídios em subsidios/catalogo/*.yaml.
// A regra que este schema existe para impor: nenhum número entra no produto sem dizer
// de onde veio. `dado-proprio` obriga amostra; `fonte-externa` obriga URL.

const Confianca = z.enum(['baixa', 'media', 'alta']);

const procedencia = {
  origem: z.enum(['heuristica-interna', 'dado-proprio', 'fonte-externa']),
  confianca: Confianca,
  nota: z.string().optional(),
  amostra: z.string().optional(),
  url: z.string().url().optional(),
  revisar_em: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
};

const exigeLastro = <T extends z.ZodRawShape>(shape: T) =>
  z.object(shape).superRefine((v: any, ctx) => {
    if (v.origem === 'dado-proprio' && !v.amostra) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'origem=dado-proprio exige `amostra` (n de campanhas/conversões medidas)' });
    }
    if (v.origem === 'fonte-externa' && !v.url) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'origem=fonte-externa exige `url` da fonte' });
    }
  });

export const NumeroComProcedencia = exigeLastro({
  valor: z.number().positive(),
  unidade: z.string().min(1),
  ...procedencia,
});

export const ListaComProcedencia = exigeLastro({
  termos: z.array(z.string().min(1)).min(1),
  ...procedencia,
});

export const KeywordsComProcedencia = exigeLastro({
  A: z.array(z.string().min(1)).default([]),
  B: z.array(z.string().min(1)).default([]),
  C: z.array(z.string().min(1)).default([]),
  D: z.array(z.string().min(1)).default([]),
  ...procedencia,
});

export const VerticalSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  label: z.string().min(1),
  cvr_default: NumeroComProcedencia,
  keywords: KeywordsComProcedencia.optional(),
  negativas: ListaComProcedencia,
});

export const CatalogoVerticaisSchema = z.object({
  schema: z.literal(1),
  atualizado_em: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  verticais: z.array(VerticalSchema).min(1),
});

export const CatalogoOperacaoSchema = z.object({
  schema: z.literal(1),
  atualizado_em: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  plataformas: z.array(z.object({
    id: z.string().min(1),
    tipo: z.enum(['marketplace', 'rede-cpa', 'outro']),
    integracao: z.enum(['nativa', 'manual']),
    nota: z.string().optional(),
  })).min(1),
  canais: z.array(z.object({
    id: z.string().regex(/^[A-Z_]+$/),
    label: z.string().min(1),
    quando_usar: z.string().min(1),
  })).min(1),
  geos: z.array(z.object({
    id: z.string().regex(/^[A-Z]{2,6}$/),
    label: z.string().min(1),
  })).min(1),
});

export type CatalogoVerticais = z.infer<typeof CatalogoVerticaisSchema>;
export type CatalogoOperacao = z.infer<typeof CatalogoOperacaoSchema>;
export type Vertical = z.infer<typeof VerticalSchema>;
export type Confianca = z.infer<typeof Confianca>;

// --- Conhecimento exibido ao usuário: glossário, manual e ajuda de campo. ---
// Não carrega procedência numérica porque não é número que entra em conta de
// campanha; é texto explicativo. O contrato aqui garante que nada fique vazio.

export const GlossarioSchema = z.object({
  schema: z.literal(1),
  termos: z.array(z.object({
    termo: z.string().min(1),
    sigla: z.string().nullable().default(null),
    categoria: z.enum(['google-ads', 'afiliados']),
    definicao: z.string().min(10),
    por_que_importa: z.string().min(10),
  })).min(1),
});

export const ManualSchema = z.object({
  schema: z.literal(1),
  secoes: z.array(z.object({
    titulo: z.string().min(1),
    conteudo: z.string().min(20),
  })).min(1),
});

export const AjudaCamposSchema = z.object({
  schema: z.literal(1),
  campos: z.array(z.object({
    campo: z.string().min(1),
    agente: z.string().min(1),
    o_que: z.string().min(10),
    por_que: z.string().min(10),
    como: z.string().min(10),
    ajuda_api_key: z.string().optional(),
  })).min(1),
});

export type Glossario = z.infer<typeof GlossarioSchema>;
export type Manual = z.infer<typeof ManualSchema>;
export type AjudaCampos = z.infer<typeof AjudaCamposSchema>;
