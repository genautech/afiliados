export class LlmBudgetExceededError extends Error {}
export const PROMPT_ACCOUNTING_OVERHEAD_TOKENS = 64;

export type LlmBudgetReservation = {
  id: string;
  maxOutputTokens: number;
  reservedTokens: number;
};

export type AgentRunClient = {
  $transaction: <T>(
    callback: (tx: {
      agentRun: {
        aggregate: (args: unknown) => Promise<{ _sum: { totalTokens: number | null } }>;
        create: (args: { data: Record<string, unknown>; select: { id: true } }) => Promise<{ id: string }>;
      };
    }) => Promise<T>,
    options: { isolationLevel: 'Serializable' },
  ) => Promise<T>;
  agentRun: {
    update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<unknown>;
  };
};

function isSerializationConflict(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2034';
}

export async function reserveLlmBudget(
  client: AgentRunClient,
  input: {
    userId: string;
    agent: string;
    provider: string;
    model: string;
    keySource: string;
    monthlyBudget: number;
    promptBytes: number;
    requestedOutputTokens: number;
    now?: Date;
  },
): Promise<LlmBudgetReservation | null> {
  if (input.monthlyBudget <= 0) return null;
  const monthStart = new Date(input.now ?? new Date());
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const promptReserve = Math.max(1, input.promptBytes) + PROMPT_ACCOUNTING_OVERHEAD_TOKENS;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await client.$transaction(async (tx) => {
        const aggregate = await tx.agentRun.aggregate({
          where: {
            userId: input.userId,
            provider: input.provider,
            createdAt: { gte: monthStart },
            totalTokens: { gt: 0 },
          },
          _sum: { totalTokens: true },
        });
        const used = aggregate._sum.totalTokens ?? 0;
        const remaining = input.monthlyBudget - used;
        const maxOutputTokens = Math.min(input.requestedOutputTokens, remaining - promptReserve);
        if (maxOutputTokens < 1) throw new LlmBudgetExceededError(`Orçamento mensal esgotado para ${input.provider}`);
        const reservedTokens = promptReserve + maxOutputTokens;
        const row = await tx.agentRun.create({
          data: {
            userId: input.userId,
            agent: input.agent,
            provider: input.provider,
            model: input.model,
            promptTokens: promptReserve,
            completionTokens: maxOutputTokens,
            totalTokens: reservedTokens,
            costUsd: 0,
            keySource: input.keySource,
            durationMs: 0,
            success: false,
            error: 'BUDGET_RESERVATION',
          },
          select: { id: true },
        });
        return { id: row.id, maxOutputTokens, reservedTokens };
      }, { isolationLevel: 'Serializable' });
    } catch (error) {
      if (isSerializationConflict(error) && attempt < 2) continue;
      throw error;
    }
  }
  throw new LlmBudgetExceededError(`Não foi possível reservar orçamento para ${input.provider}`);
}

export async function reconcileLlmBudget(
  client: AgentRunClient,
  reservation: LlmBudgetReservation,
  data: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    costUsd: number;
    durationMs: number;
    success: boolean;
    error?: string | null;
  },
): Promise<void> {
  if (!reservation.id) return; // bypass de reserva (budget 0): nada foi persistido
  const promptTokens = data.promptTokens;
  const completionTokens = data.completionTokens;
  const promptValid = typeof promptTokens === 'number' && Number.isInteger(promptTokens) && promptTokens >= 0;
  const completionValid = typeof completionTokens === 'number' && Number.isInteger(completionTokens) && completionTokens >= 0;
  const totalValid = typeof data.totalTokens === 'number' && Number.isInteger(data.totalTokens) && data.totalTokens >= 0;
  const componentSum = (promptTokens ?? 0) + (completionTokens ?? 0);
  const componentsCoherent = promptValid && completionValid && (componentSum === data.totalTokens);
  const hasMeasuredUsage = promptValid
    && completionValid
    && totalValid
    && componentsCoherent
    && ((promptTokens ?? 0) > 0 || (completionTokens ?? 0) > 0 || (data.totalTokens ?? 0) > 0);
  await client.agentRun.update({
    where: { id: reservation.id },
    data: {
      promptTokens: data.promptTokens,
      completionTokens: data.completionTokens,
      totalTokens: data.totalTokens,
      costUsd: data.costUsd,
      durationMs: data.durationMs,
      success: data.success,
      error: data.error?.slice(0, 2000) ?? (hasMeasuredUsage ? null : 'USAGE_UNAVAILABLE'),
    },
  });

}
