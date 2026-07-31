import { describe, expect, it, vi } from 'vitest';
import { createMutationCapability } from '@/lib/google-ads/client';
import { runExperimentAction, scheduleExperimentLifecycle } from '@/lib/google-ads-experiments/orchestration';

const updatedAt = new Date('2030-01-15T00:00:00.000Z');
const resourceName = 'customers/1234567890/experiments/999';

function authorization(overrides: Record<string, unknown> = {}) {
  return {
    confirmed: true,
    operation: 'SCHEDULE_EXPERIMENT',
    resourceId: 'exp_1',
    revision: updatedAt.toISOString(),
    idempotencyKey: 'schedule-key-123',
    ...overrides,
  };
}

function experiment(overrides: Record<string, unknown> = {}) {
  return {
    id: 'exp_1',
    userId: 'user_1',
    campaignId: 'campaign_1',
    resourceName,
    status: 'SETUP',
    updatedAt,
    variationConfig: {
      proof: { verified: true, finalUrl: 'https://example.com/treatment' },
      saga: { experiment: 'COMPLETE', arms: 'COMPLETE', variation: 'COMPLETE' },
    },
    arms: [
      { isControl: true, resourceName: 'customers/1234567890/experimentArms/1~1' },
      {
        isControl: false,
        finalUrl: 'https://example.com/treatment',
        inDesignCampaignResourceName: 'customers/1234567890/campaigns/222',
      },
    ],
    operations: [],
    ...overrides,
  };
}

function harness(exp = experiment()) {
  const prisma: any = {
    googleAdsExperiment: {
      findFirst: vi.fn().mockResolvedValue(exp),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      update: vi.fn().mockImplementation(async ({ data }: any) => ({ ...exp, ...data })),
      findUniqueOrThrow: vi.fn().mockResolvedValue(exp),
    },
    googleAdsExperimentOperation: {
      create: vi.fn().mockImplementation(async ({ data }: any) => ({ id: 'op_local', ...data })),
    },
    $transaction: vi.fn().mockImplementation(async (fn: any) => fn(prisma)),
  };
  const capability = createMutationCapability('scheduleExperiment');
  const deps = {
    prisma,
    checkReadiness: vi.fn().mockResolvedValue({ ready: true, errors: [], warnings: ['fresh'] }),
    readinessDeps: {},
    getAdsConfig: vi.fn().mockResolvedValue({
      customerId: '1234567890',
      developerToken: 'DEV_TOKEN_MOCK',
      clientId: 'id',
      clientSecret: 'secret',
      refreshToken: 'refresh',
    }),
    isMock: true,
    token: 'mock-token',
    assertMutationAllowed: vi.fn().mockReturnValue({ allowed: true, capability }),
    scheduleExperiment: vi.fn().mockResolvedValue({
      operationName: 'customers/1234567890/operations/mock-schedule-999',
    }),
    endExperiment: vi.fn().mockResolvedValue({ success: true }),
    promoteExperiment: vi.fn().mockResolvedValue({
      operationName: 'customers/1234567890/operations/mock-promote-999',
    }),
    graduateExperiment: vi.fn().mockResolvedValue({ success: true }),
    verifyTreatmentFinalUrl: vi.fn().mockResolvedValue(true),
  };
  return { prisma, deps };
}

describe('scheduleExperimentLifecycle', () => {
  it('agenda após ownership, prova persistida, readiness, autorização e capability exata', async () => {
    const { prisma, deps } = harness();

    const result = await scheduleExperimentLifecycle({
      id: 'exp_1',
      userId: 'user_1',
      payload: { authorization: authorization() },
      deps: deps as any,
    });

    expect(deps.checkReadiness).toHaveBeenCalledWith(
      'campaign_1',
      'user_1',
      'SCHEDULE',
      expect.objectContaining({ verifyApprovedUrlUnchanged: expect.any(Function) })
    );
    expect(deps.assertMutationAllowed).toHaveBeenCalledWith({
      operation: 'scheduleExperiment',
      customerId: '1234567890',
      isMock: true,
      confirmed: true,
    });
    expect(deps.scheduleExperiment).toHaveBeenCalledWith(
      'mock-token',
      expect.objectContaining({ customerId: '1234567890' }),
      resourceName,
      'SETUP',
      expect.objectContaining({ operation: 'scheduleExperiment' })
    );
    expect(prisma.googleAdsExperimentOperation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        experimentId: 'exp_1',
        operationType: 'SCHEDULE',
        status: 'PENDING',
      }),
    });
    expect(result).toEqual(expect.objectContaining({ success: true, mock: true }));
  });

  it('nega experimento de outro usuário antes de readiness, token ou mutate', async () => {
    const { deps } = harness(null as any);
    await expect(scheduleExperimentLifecycle({
      id: 'exp_1',
      userId: 'user_1',
      payload: { authorization: authorization() },
      deps: deps as any,
    })).rejects.toMatchObject({ status: 404 });
    expect(deps.checkReadiness).not.toHaveBeenCalled();
    expect(deps.scheduleExperiment).not.toHaveBeenCalled();
  });

  it('nega schedule sem prova persistida da variação antes de readiness ou mutate', async () => {
    const { deps } = harness(experiment({ variationConfig: { saga: {} } }));
    await expect(scheduleExperimentLifecycle({
      id: 'exp_1',
      userId: 'user_1',
      payload: { authorization: authorization() },
      deps: deps as any,
    })).rejects.toMatchObject({ status: 422 });
    expect(deps.checkReadiness).not.toHaveBeenCalled();
    expect(deps.scheduleExperiment).not.toHaveBeenCalled();
  });

  it('persiste UNKNOWN e erro sanitizado quando a mutate remota falha', async () => {
    const { prisma, deps } = harness();
    deps.scheduleExperiment.mockRejectedValue(new Error('token=secret-value falhou'));
    await expect(scheduleExperimentLifecycle({
      id: 'exp_1',
      userId: 'user_1',
      payload: { authorization: authorization() },
      deps: deps as any,
    })).rejects.toMatchObject({ status: 502 });
    expect(prisma.googleAdsExperiment.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        variationConfig: expect.objectContaining({
          saga: expect.objectContaining({ schedule: 'UNKNOWN' }),
        }),
      }),
    }));
  });

  it('bloqueia modo real quando a releitura remota diverge da URL treatment persistida', async () => {
    const { deps } = harness();
    deps.isMock = false;
    deps.verifyTreatmentFinalUrl = vi.fn().mockResolvedValue(false);
    await expect(scheduleExperimentLifecycle({
      id: 'exp_1',
      userId: 'user_1',
      payload: { authorization: authorization() },
      deps: deps as any,
    })).rejects.toMatchObject({ status: 422 });
    expect(deps.verifyTreatmentFinalUrl).toHaveBeenCalledWith(
      'mock-token',
      expect.objectContaining({ customerId: '1234567890' }),
      'customers/1234567890/campaigns/222',
      'https://example.com/treatment'
    );
    expect(deps.assertMutationAllowed).not.toHaveBeenCalled();
    expect(deps.scheduleExperiment).not.toHaveBeenCalled();
  });

  it('rejeita operationName de outro customer e não persiste operação', async () => {
    const { prisma, deps } = harness();
    deps.scheduleExperiment.mockResolvedValue({ operationName: 'customers/9999999999/operations/evil' });
    await expect(scheduleExperimentLifecycle({
      id: 'exp_1',
      userId: 'user_1',
      payload: { authorization: authorization() },
      deps: deps as any,
    })).rejects.toMatchObject({ status: 502 });
    expect(prisma.googleAdsExperimentOperation.create).not.toHaveBeenCalled();
  });

  it('bloqueia registro legado com operação SCHEDULE sem envelope lifecycle', async () => {
    const legacy = experiment({
      operations: [{
        operationName: 'customers/1234567890/operations/legacy-schedule',
        operationType: 'SCHEDULE',
        status: 'PENDING',
      }],
    });
    const { deps } = harness(legacy);
    await expect(scheduleExperimentLifecycle({
      id: 'exp_1',
      userId: 'user_1',
      payload: { authorization: authorization() },
      deps: deps as any,
    })).rejects.toMatchObject({ status: 409 });
    expect(deps.assertMutationAllowed).not.toHaveBeenCalled();
    expect(deps.scheduleExperiment).not.toHaveBeenCalled();
  });

  it('checkpoint COMPLETE com a mesma chave retorna sem token, guard ou mutate', async () => {
    const operationName = 'customers/1234567890/operations/mock-schedule-999';
    const complete = experiment({
      variationConfig: {
        proof: { verified: true, finalUrl: 'https://example.com/treatment' },
        saga: { schedule: 'COMPLETE' },
        lifecycle: {
          schedule: {
            idempotencyKey: 'schedule-key-123',
            authorizedRevision: updatedAt.toISOString(),
            state: 'COMPLETE',
            operationName,
          },
        },
      },
      operations: [{ operationName, operationType: 'SCHEDULE', status: 'PENDING' }],
    });
    const { deps } = harness(complete);
    const result = await scheduleExperimentLifecycle({
      id: 'exp_1',
      userId: 'user_1',
      payload: { authorization: authorization() },
      deps: deps as any,
    });
    expect(result.operation.operationName).toBe(operationName);
    expect(deps.checkReadiness).not.toHaveBeenCalled();
    expect(deps.getAdsConfig).not.toHaveBeenCalled();
    expect(deps.assertMutationAllowed).not.toHaveBeenCalled();
    expect(deps.scheduleExperiment).not.toHaveBeenCalled();
  });
});

describe('runExperimentAction', () => {
  it('bloqueia registro legado com operação PROMOTE sem envelope lifecycle', async () => {
    const legacy = experiment({
      status: 'RUNNING',
      operations: [{
        operationName: 'customers/1234567890/operations/legacy-promote',
        operationType: 'PROMOTE',
        status: 'PENDING',
      }],
    });
    const { deps } = harness(legacy);
    await expect(runExperimentAction({
      id: 'exp_1',
      userId: 'user_1',
      payload: {
        action: 'PROMOTE',
        authorization: authorization({ operation: 'PROMOTE_EXPERIMENT', idempotencyKey: 'promote-key-123' }),
      },
      deps: deps as any,
    })).rejects.toMatchObject({ status: 409 });
    expect(deps.assertMutationAllowed).not.toHaveBeenCalled();
    expect(deps.promoteExperiment).not.toHaveBeenCalled();
  });

  it('END exige autorização exata e persiste estado terminal', async () => {
    const { prisma, deps } = harness(experiment({ status: 'RUNNING' }));
    deps.assertMutationAllowed.mockReturnValue({
      allowed: true,
      capability: createMutationCapability('endExperiment'),
    });
    const result = await runExperimentAction({
      id: 'exp_1',
      userId: 'user_1',
      payload: {
        action: 'END',
        reason: 'Encerramento humano',
        authorization: authorization({ operation: 'END_EXPERIMENT', idempotencyKey: 'end-action-key-123' }),
      },
      deps: deps as any,
    });
    expect(deps.endExperiment).toHaveBeenCalledWith(
      'mock-token',
      expect.objectContaining({ customerId: '1234567890' }),
      resourceName,
      'RUNNING',
      expect.objectContaining({ operation: 'endExperiment' })
    );
    expect(prisma.googleAdsExperiment.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'ENDED', lastError: null }),
    }));
    expect(result.experiment.status).toBe('ENDED');
  });

  it('PROMOTE persiste operação assíncrona sem declarar promoção concluída', async () => {
    const { prisma, deps } = harness(experiment({ status: 'RUNNING' }));
    deps.assertMutationAllowed.mockReturnValue({
      allowed: true,
      capability: createMutationCapability('promoteExperiment'),
    });
    const result = await runExperimentAction({
      id: 'exp_1',
      userId: 'user_1',
      payload: {
        action: 'PROMOTE',
        authorization: authorization({ operation: 'PROMOTE_EXPERIMENT', idempotencyKey: 'promote-key-123' }),
      },
      deps: deps as any,
    });
    expect(prisma.googleAdsExperimentOperation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ operationType: 'PROMOTE', status: 'PENDING' }),
    });
    expect(result.experiment.status).toBe('RUNNING');
  });

  it('GRADUATE bloqueia antes do guard sem budget mapping resolvido server-side', async () => {
    const { deps } = harness(experiment({ status: 'RUNNING' }));
    await expect(runExperimentAction({
      id: 'exp_1',
      userId: 'user_1',
      payload: {
        action: 'GRADUATE',
        authorization: authorization({ operation: 'GRADUATE_EXPERIMENT', idempotencyKey: 'graduate-key-123' }),
      },
      deps: deps as any,
    })).rejects.toMatchObject({ status: 422 });
    expect(deps.assertMutationAllowed).not.toHaveBeenCalled();
    expect(deps.graduateExperiment).not.toHaveBeenCalled();
  });
});
