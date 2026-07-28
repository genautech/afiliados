import { callAgent, type AgentCallResult } from './llm';

export interface AgentSequenceStepDef {
  agent: string;
  systemPrompt: string;
  buildUserPrompt: (ctx: { baseContext: string; previous: AgentSequenceStepResult[] }) => string;
  json?: boolean;
  validate?: (data: any, text: string) => string | null;
}

export interface AgentSequenceStepResult {
  agent: string;
  data: any;
  text: string;
  tokens: number;
  error: string | null;
}

export interface AgentSequenceResult {
  steps: AgentSequenceStepResult[];
  totalTokens: number;
}

// Generaliza o padrão já usado em loop-engine.ts (rodar agentes em sequência dentro de uma
// campanha) mas propagando de verdade o resultado de uma etapa pro prompt da próxima — cada
// `buildUserPrompt` recebe os resultados já produzidos. Uma etapa que falha não derruba as
// seguintes (mesmo comportamento de isolamento por try/catch que o loop-engine já tinha por
// agente), só fica registrada com `error` preenchido pro caller decidir o que fazer.
export async function runAgentSequence(
  userId: string,
  baseContext: string,
  steps: AgentSequenceStepDef[],
): Promise<AgentSequenceResult> {
  const results: AgentSequenceStepResult[] = [];
  let totalTokens = 0;

  for (const step of steps) {
    try {
      const userPrompt = step.buildUserPrompt({ baseContext, previous: results });
      const res: AgentCallResult = await callAgent(userId, {
        agent: step.agent,
        systemPrompt: step.systemPrompt,
        userPrompt,
        json: step.json,
        validate: step.validate,
      });
      totalTokens += res.usage.totalTokens;
      results.push({ agent: step.agent, data: res.data, text: res.text, tokens: res.usage.totalTokens, error: null });
    } catch (e: any) {
      results.push({ agent: step.agent, data: null, text: '', tokens: 0, error: e?.message ?? String(e) });
    }
  }

  return { steps: results, totalTokens };
}
