import { describe, expect, it, vi } from 'vitest';
import { reconcileLlmBudget, reserveLlmBudget } from './llm-budget';

describe('LLM budget reservation', () => {
  it('serializa concorrência e deixa somente uma chamada chegar ao provider', async () => {
    const rows: Array<{ id: string; totalTokens: number }> = [];
    let queue = Promise.resolve();
    const client = {
      $transaction: vi.fn((callback: (tx: any) => Promise<any>) => {
        const run = queue.then(() => callback({
          agentRun: {
            aggregate: vi.fn(async () => ({ _sum: { totalTokens: rows.reduce((sum, row) => sum + row.totalTokens, 0) } })),
            create: vi.fn(async ({ data }: any) => {
              const row = { id: `reservation-${rows.length + 1}`, totalTokens: data.totalTokens };
              rows.push(row);
              return { id: row.id };
            }),
          },
        }));
        queue = run.then(() => undefined, () => undefined);
        return run;
      }),
      agentRun: { update: vi.fn() },
    };
    const providerCall = vi.fn(async () => 'ok');
    const attempt = async () => {
      await reserveLlmBudget(client, {
        userId: 'u1', agent: 'agent', provider: 'openai', model: 'gpt-4o-mini', keySource: 'byok',
        monthlyBudget: 74, promptBytes: 2, requestedOutputTokens: 8,
        now: new Date('2030-01-15T00:00:00.000Z'),
      });
      return providerCall();
    };

    const results = await Promise.allSettled([attempt(), attempt()]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    expect(providerCall).toHaveBeenCalledTimes(1);
    expect(rows).toHaveLength(1);
  });

  it('não libera a reserva quando o provider omite usage', async () => {
    const update = vi.fn().mockResolvedValue({});
    const client = { $transaction: vi.fn(), agentRun: { update } };
    await reconcileLlmBudget(client, { id: 'reservation-1', maxOutputTokens: 8, reservedTokens: 74 }, {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      costUsd: 0,
      durationMs: 5,
      success: true,
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: 'reservation-1' },
      data: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        costUsd: 0,
        durationMs: 5,
        success: true,
        error: 'USAGE_UNAVAILABLE',
      },
    });
  });

  it('não libera a reserva quando total e componentes de usage são incoerentes', async () => {
    const update = vi.fn().mockResolvedValue({});
    const client = { $transaction: vi.fn(), agentRun: { update } };
    await reconcileLlmBudget(client, { id: 'reservation-2', maxOutputTokens: 8, reservedTokens: 74 }, {
      promptTokens: 20, completionTokens: 5, totalTokens: 3, costUsd: 0, durationMs: 5, success: true,
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: 'reservation-2' },
      data: {
        promptTokens: 20,
        completionTokens: 5,
        totalTokens: 3,
        costUsd: 0,
        durationMs: 5,
        success: true,
        error: 'USAGE_UNAVAILABLE',
      },
    });
  });

  it('não libera a reserva quando o provider envia apenas total sem componentes', async () => {
    const update = vi.fn().mockResolvedValue({});
    const client = { $transaction: vi.fn(), agentRun: { update } };
    await reconcileLlmBudget(client, { id: 'reservation-3', maxOutputTokens: 8, reservedTokens: 74 }, {
      promptTokens: 0, completionTokens: 0, totalTokens: 1, costUsd: 0, durationMs: 5, success: true,
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: 'reservation-3' },
      data: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 1,
        costUsd: 0,
        durationMs: 5,
        success: true,
        error: 'USAGE_UNAVAILABLE',
      },
    });
  });

  it('não libera a reserva quando o provider envia apenas total (sem prompt/completion)', async () => {
    const update = vi.fn().mockResolvedValue({});
    const client = { $transaction: vi.fn(), agentRun: { update } };
    await reconcileLlmBudget(client, { id: 'reservation-4', maxOutputTokens: 8, reservedTokens: 74 }, {
      totalTokens: 500, costUsd: 0, durationMs: 5, success: true,
    } as any);
    expect(update).toHaveBeenCalledWith({
      where: { id: 'reservation-4' },
      data: {
        promptTokens: undefined,
        completionTokens: undefined,
        totalTokens: 500,
        costUsd: 0,
        durationMs: 5,
        success: true,
        error: 'USAGE_UNAVAILABLE',
      },
    });
  });
});
