import { TypeSafeClient } from '@typesafe-ai/sdk';
import type { EntryType, Questions, SystemOneResult } from '@typesafe-ai/sdk';

// Camada de julgamento (System One / Jev) — decisões tipadas sobre texto, no lugar de regex e
// listas de palavras. NÃO substitui os agentes generativos (presell/RSA) de lib/llm.ts: aqui
// nada é gerado, só se responde pergunta fechada com probabilidade calibrada.
//
// Regras desta camada:
// - Nunca lança pra dentro do fluxo de campanha: falha de rede/chave devolve null e quem chama
//   segue com o caminho determinístico. Julgamento é sinal, não dependência.
// - Chave só no servidor (TYPESAFE_API_KEY em .env, nunca NEXT_PUBLIC_).
// - Uma request por lote de perguntas: elas rodam em paralelo no serviço e o custo por pergunta
//   extra é marginal — decompor não custa round trip.

let client: TypeSafeClient | null = null;

export function isTypeSafeEnabled(): boolean {
  return !!process.env.TYPESAFE_API_KEY;
}

/** Modo sombra: roda o julgamento junto com a heurística atual só pra comparar, sem decidir
 * nada. Ligado por env pra não somar latência no caminho real antes de medir concordância. */
export function isShadowModeOn(): boolean {
  return isTypeSafeEnabled() && process.env.TYPESAFE_SHADOW === '1';
}

function getClient(): TypeSafeClient {
  if (!client) {
    client = new TypeSafeClient({
      timeout: 8000,
      // 1 retry: o caminho determinístico continua respondendo se o serviço estiver fora, então
      // não vale a pena segurar a request do usuário por mais que isso.
      retry: { maxRetries: 1 },
      logLevel: 'warn',
    });
  }
  return client;
}

export type AskOptions = {
  /** Identifica a chamada no log quando ela falha. */
  label?: string;
  timeoutMs?: number;
};

/** Devolve as respostas ou null — nunca lança. Quem chama trata null como "sem julgamento". */
export async function askSystemOne<const Q extends Questions>(
  state: EntryType,
  questions: Q,
  options: AskOptions = {},
): Promise<SystemOneResult<Q> | null> {
  if (!isTypeSafeEnabled()) return null;
  if (Object.keys(questions).length === 0) return null;
  try {
    return await getClient().systemOne(
      { state, questions },
      options.timeoutMs ? { timeout: options.timeoutMs } : undefined,
    );
  } catch (error: any) {
    console.warn(`[typesafe] ${options.label ?? 'systemOne'} falhou: ${error?.message ?? error}`);
    return null;
  }
}

/** Três caminhos a partir de um noul: sim, não, e a faixa do meio que vai pra revisão humana
 * em vez de virar um booleano inventado. Ver docs.typesafe.ai/confidence. */
export type Verdict = 'sim' | 'nao' | 'incerto';

export function readNoul(probability: number, yes: number, no: number): Verdict {
  if (probability >= yes) return 'sim';
  if (probability <= no) return 'nao';
  return 'incerto';
}

/** Texto visível de uma página, pro estado das perguntas: script/style fora, tags fora, espaço
 * colapsado. Modelo julga o texto que o revisor do Google Ads lê, não o markup. */
export function htmlToText(html: string, maxChars = 12000): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxChars);
}
