import { choice } from '@typesafe-ai/sdk';
import { askSystemOne } from './typesafe';

// Causa de falha de agente, para o painel "Problemas detectados" de /agentes.
//
// A cadeia de includes() que existia em app/api/agent-runs/route.ts classificava por substring
// ('429', '401', 'insufficient_quota') e, quando nada casava, usava os primeiros 120 caracteres do
// erro COMO a causa. Isso quebra o agrupamento: cada mensagem de erro ligeiramente diferente vira
// um problema distinto na lista, então 40 falhas do mesmo provedor aparecem como 40 linhas de 1×
// em vez de uma de 40×. Mensagem de provedor não tem formato estável — é exatamente o caso de
// classificar por significado.
//
// O texto mostrado ao usuário vem de CAUSE_LABEL, em código: a apresentação é nossa, o julgamento
// só escolhe qual das causas fechadas se aplica.

export const ERROR_CAUSES = [
  'sem_credito',
  'rate_limit',
  'chave_invalida',
  'validacao_de_output',
  'timeout_ou_rede',
  'modelo_ou_payload_invalido',
  'outro',
] as const;

export type ErrorCause = (typeof ERROR_CAUSES)[number];

export const CAUSE_LABEL: Record<ErrorCause, string> = {
  sem_credito: 'Provedor sem crédito',
  rate_limit: 'Rate limit do provedor',
  chave_invalida: 'Chave de API inválida/ausente',
  validacao_de_output: 'Validação de output',
  timeout_ou_rede: 'Timeout ou falha de rede',
  modelo_ou_payload_invalido: 'Modelo ou payload inválido',
  outro: 'Outra falha',
};

/** Classificação determinística — a cadeia que já existia, agora testável e usada como fallback
 * quando não há julgamento disponível. Devolve null quando nada casa, em vez de virar a própria
 * mensagem de erro. */
export function classifyErrorCauseHeuristic(raw: string): ErrorCause | null {
  if (raw.includes('insufficient_quota') || raw.includes('no remaining credits')) return 'sem_credito';
  if (raw.includes('validação') || raw.includes('valida')) return 'validacao_de_output';
  if (raw.includes('429')) return 'rate_limit';
  if (raw.includes('401') || raw.includes('API Key')) return 'chave_invalida';
  return null;
}

export function errorCauseQuestions(mensagens: string[]) {
  const questions: Record<string, ReturnType<typeof choice>> = {};
  mensagens.forEach((mensagem, index) => {
    questions[`causa_${index}`] = choice(
      {
        mensagem_de_erro: mensagem,
        question: 'Qual a causa da falha descrita em `mensagem_de_erro`?',
        focus: 'Classifique a causa raiz, não o texto literal da mensagem.',
      },
      {
        sem_credito: {
          what: 'A conta do provedor está sem crédito, saldo ou cota paga',
          not_for: 'Limite de requisições por minuto, que é rate limit',
          examples: ['insufficient_quota', 'You exceeded your current quota', 'no remaining credits', 'HTTP 402'],
        },
        rate_limit: {
          what: 'Requisições demais em pouco tempo; é para tentar de novo depois',
          examples: ['HTTP 429', 'Too Many Requests', 'rate limit exceeded, retry in 20s'],
        },
        chave_invalida: {
          what: 'Credencial ausente, errada, expirada ou sem permissão',
          examples: ['HTTP 401', 'invalid api key', 'authentication_error', 'HTTP 403 forbidden'],
        },
        validacao_de_output: {
          what: 'A chamada respondeu, mas o conteúdo não passou na validação do app (JSON inválido, campo faltando, limite de caracteres)',
          examples: ['Resposta não é JSON válido', 'JSON sem os arrays titles/descriptions', '3 título(s) com mais de 30 caracteres'],
        },
        timeout_ou_rede: {
          what: 'A chamada não completou por tempo ou transporte',
          examples: ['ETIMEDOUT', 'socket hang up', 'fetch failed', 'The operation was aborted'],
        },
        modelo_ou_payload_invalido: {
          what: 'O provedor rejeitou o pedido: id de modelo que não existe, parâmetro inválido, contexto estourado',
          examples: ['is not a valid model ID', 'HTTP 400 invalid_request_error', 'maximum context length exceeded'],
        },
        outro: {
          what: 'Não dá para enquadrar em nenhuma das causas acima',
          examples: ['erro desconhecido', 'Internal Server Error sem detalhe'],
        },
      },
    );
  });
  return questions;
}

/**
 * Resolve a causa de cada mensagem distinta. Julgamento manda; sem julgamento, cai na heurística;
 * sem os dois, 'outro'. As mensagens são deduplicadas antes de perguntar — 100 falhas do mesmo
 * provedor normalmente são 2 ou 3 textos diferentes, então é uma request pequena.
 */
export async function resolveErrorCauses(mensagens: string[]): Promise<Map<string, ErrorCause>> {
  const distintas = Array.from(new Set(mensagens.map((m) => String(m ?? '').trim()).filter(Boolean)));
  const out = new Map<string, ErrorCause>();
  if (distintas.length === 0) return out;

  // Limite defensivo: se por algum motivo houver muitas mensagens distintas, julga as mais comuns
  // e o resto fica com a heurística.
  const paraJulgar = distintas.slice(0, 25);
  const res = await askSystemOne({ contexto: 'Falhas de chamadas de LLM registradas pelo AfiliAds' }, errorCauseQuestions(paraJulgar), {
    label: 'resolveErrorCauses',
    timeoutMs: 12000,
  });

  const answers = (res?.answers ?? {}) as Record<string, { choice?: string; confidence?: number }>;
  distintas.forEach((mensagem) => {
    const index = paraJulgar.indexOf(mensagem);
    const a = index >= 0 ? answers[`causa_${index}`] : undefined;
    const julgada =
      a?.choice && (ERROR_CAUSES as readonly string[]).includes(a.choice) && (a.confidence ?? 0) >= 0.6
        ? (a.choice as ErrorCause)
        : null;
    out.set(mensagem, julgada ?? classifyErrorCauseHeuristic(mensagem) ?? 'outro');
  });
  return out;
}
