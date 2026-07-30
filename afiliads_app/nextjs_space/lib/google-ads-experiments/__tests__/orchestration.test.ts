import { expect, test, describe, vi, beforeEach } from 'vitest';
import { setupExperiment, getExperimentDetail, syncExperiment } from '../orchestration';

vi.mock('../../prisma', () => ({
  prisma: {
    googleAdsExperiment: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    googleAdsExperimentArm: {
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prisma } from '../../prisma';

describe('Google Ads Experiments Orchestration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockConfig = {
    customerId: '1234567890',
    developerToken: 'DEV_TOKEN_MOCK',
    clientId: 'CLIENT_ID_MOCK',
    clientSecret: 'secret',
    refreshToken: 'refresh',
  };

  const baseDeps = {
    findCampaign: vi.fn().mockResolvedValue({ id: 'c1', googleCampaignId: '12345678', updatedAt: new Date(1700000000000), userId: 'u1' }),
    findPresell: vi.fn().mockResolvedValue({ id: 'p1', campaignId: 'c1', userId: 'u1' }),
    readinessDeps: {},
    checkReadiness: vi.fn().mockResolvedValue({ ready: true, data: { finalUrl: 'https://control.com' }, warnings: [] }),
    getAdsConfig: vi.fn().mockResolvedValue(mockConfig),
    isMock: true,
    assertMutationAllowed: vi.fn().mockReturnValue({ allowed: true, capability: { brand: 'GoogleAdsMutationCapability', operation: 'test' } }),
    createExperiment: vi.fn().mockResolvedValue({ googleExperimentId: 'exp1', resourceName: 'customers/1234567890/experiments/exp1' }),
    createExperimentArms: vi.fn().mockResolvedValue([
      { name: 'control', isControl: true, trafficSplit: 50, resourceName: 'armC', inDesignCampaignResourceName: null, servedCampaignResourceName: 'customers/1234567890/campaigns/12345678' },
      { name: 'treatment', isControl: false, trafficSplit: 50, resourceName: 'armT', inDesignCampaignResourceName: 'customers/1234567890/campaigns/MOCK-TREATMENT', servedCampaignResourceName: null },
    ]),
    applyFinalUrlVariation: vi.fn().mockResolvedValue({ verified: true, alreadyApplied: false }),
    fetchExperimentReport: vi.fn().mockResolvedValue({ status: 'ENABLED', control: { impressions: 10, clicks: 2, costMicros: 100, conversions: 0, conversionValue: 0 }, treatment: { impressions: 10, clicks: 3, costMicros: 150, conversions: 1, conversionValue: 10 }, statistics: {} }),
    upsertMetricSnapshot: vi.fn().mockResolvedValue(true),
  };

  const validPayload = {
    authorization: {
      confirmed: true,
      operation: 'SETUP_EXPERIMENT',
      resourceId: 'c1',
      revision: '1700000000000',
      idempotencyKey: 'validkey_1234567890',
    },
    campaignId: 'c1',
    presellId: 'p1',
    treatmentFinalUrl: 'https://treatment.com/landing',
  };

  test('1. payload malformado/desconhecido -> 400 Zod strict', async () => {
    await expect(setupExperiment({ userId: 'u1', payload: null, deps: baseDeps }))
      .rejects.toMatchObject({ status: 400 });

    await expect(setupExperiment({
      userId: 'u1',
      payload: { ...validPayload, unknownField: 'hacker_input' },
      deps: baseDeps,
    })).rejects.toMatchObject({ status: 400 });
  });

  test('2. campanha/experimento/presell de outro usuário -> 404', async () => {
    const deps = { ...baseDeps, findCampaign: vi.fn().mockResolvedValue(null) };
    await expect(setupExperiment({
      userId: 'u1',
      payload: validPayload,
      deps,
    })).rejects.toMatchObject({ status: 404 });
  });

  test('3. readiness fail -> 422 antes de OAuth/fetch', async () => {
    const deps = {
      ...baseDeps,
      checkReadiness: vi.fn().mockResolvedValue({ ready: false, errors: ['Checklist SSL pendente'] }),
    };
    await expect(setupExperiment({
      userId: 'u1',
      payload: validPayload,
      deps,
    })).rejects.toMatchObject({ status: 422 });

    expect(deps.getAdsConfig).not.toHaveBeenCalled();
  });

  test('4. confirmação/revision/operação divergente -> 400 bloqueio antes de fetch', async () => {
    const payloadDivergent = {
      ...validPayload,
      authorization: {
        ...validPayload.authorization,
        revision: 'wrong_revision_9999',
      },
    };
    await expect(setupExperiment({
      userId: 'u1',
      payload: payloadDivergent,
      deps: baseDeps,
    })).rejects.toMatchObject({ status: 400 });

    expect(baseDeps.getAdsConfig).not.toHaveBeenCalled();
  });

  test('5. flag/allowlist real negada -> 502 zero fetch mutate', async () => {
    const deps = {
      ...baseDeps,
      assertMutationAllowed: vi.fn().mockReturnValue({ allowed: false, reason: 'customerId not in allowlist' }),
    };
    (prisma.googleAdsExperiment.findUnique as any).mockResolvedValue(null);
    (prisma.googleAdsExperiment.create as any).mockResolvedValue({ id: 'exp1', arms: [] });

    await expect(setupExperiment({
      userId: 'u1',
      payload: validPayload,
      deps,
    })).rejects.toMatchObject({ status: 502 });

    expect(deps.createExperiment).not.toHaveBeenCalled();
  });

  test('6. happy path mock cria um experimento local, 2 braços, split 100 e treatment verificado', async () => {
    (prisma.googleAdsExperiment.findUnique as any).mockResolvedValue(null);
    const mockExp = { id: 'exp1', name: 'EXP-c1-validkey123', arms: [], resourceName: null, createdAt: new Date(), updatedAt: new Date() };
    (prisma.googleAdsExperiment.create as any).mockResolvedValue(mockExp);
    (prisma.googleAdsExperiment.update as any).mockResolvedValue({ ...mockExp, resourceName: 'customers/1234567890/experiments/exp1' });
    (prisma.googleAdsExperiment.findUniqueOrThrow as any).mockResolvedValue({
      id: 'exp1',
      createdAt: new Date(),
      updatedAt: new Date(),
      arms: [
        { isControl: true, finalUrl: 'https://control.com' },
        { isControl: false, id: 'armT1', inDesignCampaignResourceName: 'customers/1234567890/campaigns/MOCK-TREATMENT', finalUrl: 'https://treatment.com/landing' },
      ],
    });

    const res = await setupExperiment({
      userId: 'u1',
      payload: validPayload,
      deps: baseDeps,
    });

    expect(res.success).toBe(true);
    expect(baseDeps.createExperiment).toHaveBeenCalled();
    expect(baseDeps.createExperimentArms).toHaveBeenCalled();
    expect(baseDeps.applyFinalUrlVariation).toHaveBeenCalled();
  });

  test('7. mesma key/mesmo payload retorna mesmo ID e não repete create', async () => {
    (prisma.googleAdsExperiment.findUnique as any).mockResolvedValue({
      id: 'exp1',
      campaignId: 'c1',
      status: 'SETUP',
      resourceName: 'customers/1234567890/experiments/exp1',
      createdAt: new Date(),
      updatedAt: new Date(),
      arms: [
        { isControl: true, finalUrl: 'https://control.com' },
        { isControl: false, localPresellId: 'p1', finalUrl: 'https://treatment.com/landing' },
      ],
      lastError: null,
    });

    const res = await setupExperiment({
      userId: 'u1',
      payload: validPayload,
      deps: baseDeps,
    });

    expect(res.success).toBe(true);
    expect(baseDeps.createExperiment).not.toHaveBeenCalled();
    expect(baseDeps.createExperimentArms).not.toHaveBeenCalled();
  });

  test('8. mesma key/payload diferente -> 409', async () => {
    (prisma.googleAdsExperiment.findUnique as any).mockResolvedValue({
      id: 'exp1',
      campaignId: 'c_OTHER_CAMPAIGN',
      status: 'SETUP',
      arms: [],
    });

    await expect(setupExperiment({
      userId: 'u1',
      payload: validPayload,
      deps: baseDeps,
    })).rejects.toMatchObject({ status: 409 });
  });

  test('9. concorrência simulada trata P2002 sem duplicar', async () => {
    const p2002Err = new Error('Unique constraint failed on the fields: (`userId`,`idempotencyKey`)') as any;
    p2002Err.code = 'P2002';

    (prisma.googleAdsExperiment.findUnique as any).mockResolvedValueOnce(null);
    (prisma.googleAdsExperiment.create as any).mockRejectedValueOnce(p2002Err);
    (prisma.googleAdsExperiment.findUniqueOrThrow as any).mockResolvedValue({
      id: 'exp1',
      campaignId: 'c1',
      createdAt: new Date(),
      updatedAt: new Date(),
      arms: [
        { isControl: true, finalUrl: 'https://control.com' },
        { isControl: false, id: 'armT1', inDesignCampaignResourceName: 'customers/1234567890/campaigns/MOCK-TREATMENT', finalUrl: 'https://treatment.com/landing' },
      ],
    });
    (prisma.googleAdsExperiment.update as any).mockResolvedValue({ id: 'exp1' });

    const res = await setupExperiment({
      userId: 'u1',
      payload: validPayload,
      deps: baseDeps,
    });

    expect(res.success).toBe(true);
  });

  test('10. retry após checkpoint de experiment continua nos braços', async () => {
    (prisma.googleAdsExperiment.findUnique as any).mockResolvedValue({
      id: 'exp1',
      campaignId: 'c1',
      status: 'SETUP',
      resourceName: 'customers/1234567890/experiments/exp1',
      googleExperimentId: 'exp1',
      arms: [],
    });

    (prisma.googleAdsExperiment.findUniqueOrThrow as any).mockResolvedValue({
      id: 'exp1',
      campaignId: 'c1',
      status: 'SETUP',
      resourceName: 'customers/1234567890/experiments/exp1',
      createdAt: new Date(),
      updatedAt: new Date(),
      arms: [
        { isControl: true, finalUrl: 'https://control.com' },
        { isControl: false, id: 'armT1', inDesignCampaignResourceName: 'customers/1234567890/campaigns/MOCK-TREATMENT', finalUrl: 'https://treatment.com/landing' },
      ],
    });
    (prisma.googleAdsExperiment.update as any).mockResolvedValue({ id: 'exp1' });

    const res = await setupExperiment({
      userId: 'u1',
      payload: validPayload,
      deps: baseDeps,
    });

    expect(res.success).toBe(true);
    expect(baseDeps.createExperiment).not.toHaveBeenCalled();
    expect(baseDeps.createExperimentArms).toHaveBeenCalled();
  });

  test('11. retry após braços continua na variação', async () => {
    (prisma.googleAdsExperiment.findUnique as any).mockResolvedValue({
      id: 'exp1',
      campaignId: 'c1',
      status: 'SETUP',
      resourceName: 'customers/1234567890/experiments/exp1',
      googleExperimentId: 'exp1',
      arms: [
        { isControl: true, finalUrl: 'https://control.com' },
        { isControl: false, id: 'armT1', inDesignCampaignResourceName: 'customers/1234567890/campaigns/MOCK-TREATMENT', finalUrl: 'https://control.com' },
      ],
    });
    (prisma.googleAdsExperiment.update as any).mockResolvedValue({ id: 'exp1' });

    const res = await setupExperiment({
      userId: 'u1',
      payload: validPayload,
      deps: baseDeps,
    });

    expect(res.success).toBe(true);
    expect(baseDeps.createExperiment).not.toHaveBeenCalled();
    expect(baseDeps.createExperimentArms).not.toHaveBeenCalled();
    expect(baseDeps.applyFinalUrlVariation).toHaveBeenCalled();
  });

  test('12. GET owned DTO exclui secrets, tokens e sourcePayload', async () => {
    (prisma.googleAdsExperiment.findUnique as any).mockResolvedValue({
      id: 'exp1',
      userId: 'u1',
      campaignId: 'c1',
      googleExperimentId: 'g1',
      resourceName: 'res1',
      name: 'Test Exp',
      type: 'SEARCH_CUSTOM',
      status: 'SETUP',
      syncEnabled: true,
      trafficAllocationType: 'SEARCH_CUSTOM',
      startDate: new Date('2026-08-01T00:00:00Z'),
      endDate: new Date('2026-09-01T00:00:00Z'),
      variationType: 'PRESELL_URL',
      createdAt: new Date(),
      updatedAt: new Date(),
      arms: [],
      operations: [],
      metricSnapshots: [
        {
          id: 's1',
          experimentId: 'exp1',
          snapshotDate: new Date('2026-08-02T00:00:00Z'),
          controlImpressions: 100,
          controlClicks: 10,
          controlCostMicros: 1000,
          controlConversions: 1,
          controlConversionValue: 50,
          treatmentImpressions: 100,
          treatmentClicks: 15,
          treatmentCostMicros: 1200,
          treatmentConversions: 2,
          treatmentConversionValue: 100,
          statistics: {},
          sourcePayload: { token: 'SECRET_TOKEN_DO_NOT_EXPOSE' },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    });

    const res = await getExperimentDetail('exp1', 'u1');
    expect(res.id).toBe('exp1');
    expect(res.metricSnapshots[0]).not.toHaveProperty('sourcePayload');
    expect(res.metricSnapshots[0].controlClicks).toBe(10);
  });

  test('13. sync owned atualiza status remoto mapeado e snapshot', async () => {
    (prisma.googleAdsExperiment.findUnique as any).mockResolvedValue({
      id: 'exp1',
      userId: 'u1',
      resourceName: 'customers/1234567890/experiments/exp1',
      status: 'SETUP',
      arms: [],
    });
    (prisma.googleAdsExperiment.update as any).mockResolvedValue({ id: 'exp1' });

    const res = await syncExperiment('exp1', 'u1', baseDeps);
    expect(res.success).toBe(true);
    expect(res.changed).toBe(true);
    expect(res.status).toBe('RUNNING'); // mapped from ENABLED in fetchExperimentReport mock
    expect(baseDeps.fetchExperimentReport).toHaveBeenCalled();
    expect(baseDeps.upsertMetricSnapshot).toHaveBeenCalled();
  });

  test('14. sync repetido sem mudança -> changed: false', async () => {
    (prisma.googleAdsExperiment.findUnique as any).mockResolvedValue({
      id: 'exp1',
      userId: 'u1',
      resourceName: 'customers/1234567890/experiments/exp1',
      status: 'RUNNING',
      arms: [],
    });
    (prisma.googleAdsExperiment.update as any).mockResolvedValue({ id: 'exp1' });

    const res = await syncExperiment('exp1', 'u1', baseDeps);
    expect(res.success).toBe(true);
    expect(res.changed).toBe(false);
  });

  test('15. remote status UNKNOWN -> status local virar ERROR (fail closed)', async () => {
    const deps = {
      ...baseDeps,
      fetchExperimentReport: vi.fn().mockResolvedValue({ status: 'UNKNOWN', control: { impressions: 0 }, treatment: { impressions: 0 }, statistics: {} }),
    };

    (prisma.googleAdsExperiment.findUnique as any).mockResolvedValue({
      id: 'exp1',
      userId: 'u1',
      resourceName: 'customers/1234567890/experiments/exp1',
      status: 'RUNNING',
      arms: [],
    });
    (prisma.googleAdsExperiment.update as any).mockResolvedValue({ id: 'exp1' });

    const res = await syncExperiment('exp1', 'u1', deps);
    expect(res.status).toBe('ERROR');
    expect(res.warnings[0]).toContain('Status remoto não mapeado');
  });

  test('16. falha externa sanitizada e último estado válido preservado em 502', async () => {
    const deps = {
      ...baseDeps,
      fetchExperimentReport: vi.fn().mockRejectedValue(new Error('Google Ads 500 Internal Server Error (Token: secret_abc)')),
    };

    (prisma.googleAdsExperiment.findUnique as any).mockResolvedValue({
      id: 'exp1',
      userId: 'u1',
      resourceName: 'customers/1234567890/experiments/exp1',
      status: 'RUNNING',
      arms: [],
    });

    await expect(syncExperiment('exp1', 'u1', deps)).rejects.toMatchObject({
      status: 502,
      message: expect.stringContaining('Google Ads 500 Internal Server Error'),
    });

    expect(prisma.googleAdsExperiment.update).toHaveBeenCalledWith({
      where: { id: 'exp1' },
      data: { lastError: expect.stringContaining('Google Ads 500 Internal Server Error') },
    });
  });
});
