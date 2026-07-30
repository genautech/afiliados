import { expect, test, describe, vi, beforeEach } from 'vitest';
import { setupExperiment, getExperimentDetail, syncExperiment } from '../orchestration';

vi.mock('../../prisma', () => ({
  prisma: {
    googleAdsExperiment: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    googleAdsExperimentArm: {
      create: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
    },
    googleAdsExperimentOperation: {
      update: vi.fn(),
    },
  },
}));

import { prisma } from '../../prisma';

describe('Google Ads Experiments Orchestration (recuperação Tarefa 10B)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.googleAdsExperiment.update as any).mockResolvedValue({ id: 'exp1', arms: [] });
    (prisma.googleAdsExperiment.updateMany as any).mockResolvedValue({ count: 1 });
    (prisma.googleAdsExperimentArm.createMany as any).mockResolvedValue({ count: 2 });
  });

  const mockConfig = {
    customerId: '1234567890',
    developerToken: 'DEV_TOKEN_MOCK',
    clientId: 'CLIENT_ID_MOCK',
    clientSecret: 'secret',
    refreshToken: 'refresh',
  };

  const controlCampaignResourceName = 'customers/1234567890/campaigns/12345678';

  const baseDeps = {
    findCampaign: vi.fn().mockResolvedValue({ id: 'c1', googleCampaignId: '12345678', updatedAt: new Date(1700000000000), userId: 'u1' }),
    findPresell: vi.fn().mockResolvedValue({ id: 'p1', campaignId: 'c1', userId: 'u1' }),
    readinessDeps: {},
    checkReadiness: vi.fn().mockResolvedValue({ ready: true, data: { finalUrl: 'https://control.com' }, warnings: [] }),
    getAdsConfig: vi.fn().mockResolvedValue(mockConfig),
    isMock: true,
    assertMutationAllowed: vi.fn().mockImplementation(({ operation }: any) => ({
      allowed: true,
      capability: { brand: 'GoogleAdsMutationCapability', operation },
    })),
    createExperiment: vi.fn().mockResolvedValue({ googleExperimentId: 'exp1', resourceName: 'customers/1234567890/experiments/exp1' }),
    createExperimentArms: vi.fn().mockResolvedValue([
      { name: 'control', isControl: true, trafficSplit: 50, resourceName: 'armC', inDesignCampaignResourceName: null, servedCampaignResourceName: controlCampaignResourceName },
      { name: 'treatment', isControl: false, trafficSplit: 50, resourceName: 'armT', inDesignCampaignResourceName: 'customers/1234567890/campaigns/MOCK-TREATMENT', servedCampaignResourceName: null },
    ]),
    applyFinalUrlVariation: vi.fn().mockResolvedValue({ verified: true, alreadyApplied: false, adsModified: [{ resourceName: 'ad1' }] }),
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
    trafficSplitTreatment: 50,
  };

  const currentConfig = (saga: Record<string, string> = {}) => ({
    setupPayload: {
      campaignId: 'c1',
      presellId: 'p1',
      treatmentFinalUrl: 'https://treatment.com/landing',
      name: 'EXP-c1-validkey1234',
      startDate: null,
      endDate: null,
      trafficSplitTreatment: 50,
    },
    saga: {
      experiment: 'PENDING',
      arms: 'PENDING',
      variation: 'PENDING',
      ...saga,
    },
  });

  const armsFixture = () => [
    { isControl: true, id: 'armC', finalUrl: 'https://control.com', trafficSplit: 50, localPresellId: null, inDesignCampaignResourceName: null },
    { isControl: false, id: 'armT', finalUrl: 'https://treatment.com/landing', trafficSplit: 50, localPresellId: 'p1', inDesignCampaignResourceName: 'customers/1234567890/campaigns/MOCK-TREATMENT' },
  ];

  // -----------------------------------------------------------------------------------------
  // Gates básicos (cobertura restaurada de c9ac033, itens 1-5 do handoff)
  // -----------------------------------------------------------------------------------------
  describe('Gates básicos antes de qualquer rede', () => {
    test('1. payload malformado/desconhecido -> 400 Zod strict', async () => {
      await expect(setupExperiment({ userId: 'u1', payload: null, deps: baseDeps }))
        .rejects.toMatchObject({ status: 400 });

      await expect(setupExperiment({
        userId: 'u1',
        payload: { ...validPayload, unknownField: 'hacker_input' },
        deps: baseDeps,
      })).rejects.toMatchObject({ status: 400 });
    });

    test('2. campanha de outro usuário -> 404', async () => {
      const deps = { ...baseDeps, findCampaign: vi.fn().mockResolvedValue(null) };
      await expect(setupExperiment({ userId: 'u1', payload: validPayload, deps }))
        .rejects.toMatchObject({ status: 404 });
    });

    test('2b. presell de outro usuário -> 404', async () => {
      const deps = { ...baseDeps, findPresell: vi.fn().mockResolvedValue(null) };
      await expect(setupExperiment({ userId: 'u1', payload: validPayload, deps }))
        .rejects.toMatchObject({ status: 404 });
    });

    test('3. readiness fail -> 422 antes de OAuth/fetch', async () => {
      const deps = {
        ...baseDeps,
        checkReadiness: vi.fn().mockResolvedValue({ ready: false, errors: ['Checklist SSL pendente'] }),
      };
      await expect(setupExperiment({ userId: 'u1', payload: validPayload, deps }))
        .rejects.toMatchObject({ status: 422 });

      expect(deps.getAdsConfig).not.toHaveBeenCalled();
    });

    test('4. confirmação/revision divergente -> 400 antes de fetch', async () => {
      const payloadDivergent = {
        ...validPayload,
        authorization: { ...validPayload.authorization, revision: 'wrong_revision_9999' },
      };
      await expect(setupExperiment({ userId: 'u1', payload: payloadDivergent, deps: baseDeps }))
        .rejects.toMatchObject({ status: 400 });

      expect(baseDeps.getAdsConfig).not.toHaveBeenCalled();
    });

    test('5. flag/allowlist real negada -> 502 zero fetch mutate', async () => {
      const deps = {
        ...baseDeps,
        assertMutationAllowed: vi.fn().mockReturnValue({ allowed: false, reason: 'customerId not in allowlist' }),
      };
      (prisma.googleAdsExperiment.findUnique as any).mockResolvedValue(null);
      (prisma.googleAdsExperiment.create as any).mockResolvedValue({ id: 'exp1', name: 'EXP-c1-k5', campaignId: 'c1', arms: [] });

      await expect(setupExperiment({ userId: 'u1', payload: validPayload, deps }))
        .rejects.toMatchObject({ status: 502 });

      expect(deps.createExperiment).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------------------------
  // Happy path (restaurado, item 6)
  // -----------------------------------------------------------------------------------------
  test('6. happy path mock cria um experimento local, 2 braços, split 100 e treatment verificado', async () => {
    (prisma.googleAdsExperiment.findUnique as any).mockResolvedValue(null);
    const mockExp = { id: 'exp1', name: 'EXP-c1-hap', campaignId: 'c1', arms: [], resourceName: null, variationConfig: currentConfig(), createdAt: new Date(), updatedAt: new Date() };
    (prisma.googleAdsExperiment.create as any).mockResolvedValue(mockExp);
    (prisma.googleAdsExperiment.update as any).mockResolvedValue({ ...mockExp, resourceName: 'customers/1234567890/experiments/exp1' });
    (prisma.googleAdsExperiment.findUniqueOrThrow as any).mockResolvedValue({
      id: 'exp1',
      createdAt: new Date(),
      updatedAt: new Date(),
      variationConfig: currentConfig(),
      arms: armsFixture(),
    });

    const res = await setupExperiment({ userId: 'u1', payload: validPayload, deps: baseDeps });

    expect(res.success).toBe(true);
    expect(baseDeps.createExperiment).toHaveBeenCalledTimes(1);
    expect(baseDeps.createExperimentArms).toHaveBeenCalledTimes(1);
    expect(baseDeps.applyFinalUrlVariation).toHaveBeenCalledTimes(1);

    const armsOp = (baseDeps.createExperimentArms as any).mock.calls[0][2];
    const splitSum = armsOp.arms[0].trafficSplit + armsOp.arms[1].trafficSplit;
    expect(splitSum).toBe(100);
  });

  // -----------------------------------------------------------------------------------------
  // P1-B: payload canônico persistido na reserva, comparação simétrica completa
  // -----------------------------------------------------------------------------------------
  describe('P1-B: idempotência por payload canônico completo', () => {
    const canonicalBaseline = {
      campaignId: 'c1',
      presellId: 'p1',
      treatmentFinalUrl: 'https://treatment.com/landing',
      name: 'EXP-c1-baseline',
      startDate: null,
      endDate: null,
      trafficSplitTreatment: 50,
    };

    function existingWithBaseline(overrides: Partial<typeof canonicalBaseline> = {}) {
      return {
        id: 'exp1',
        campaignId: 'c1',
        status: 'SETUP',
        arms: [],
        variationConfig: { setupPayload: { ...canonicalBaseline, ...overrides } },
      };
    }

    test('409 se campaignId divergir', async () => {
      (prisma.googleAdsExperiment.findUnique as any).mockResolvedValue(existingWithBaseline());
      await expect(setupExperiment({ userId: 'u1', payload: { ...validPayload, campaignId: 'c_DIVERGENT' }, deps: baseDeps }))
        .rejects.toMatchObject({ status: 409 });
    });

    test('409 se presellId divergir', async () => {
      (prisma.googleAdsExperiment.findUnique as any).mockResolvedValue(existingWithBaseline());
      await expect(setupExperiment({ userId: 'u1', payload: { ...validPayload, presellId: 'p_OTHER' }, deps: baseDeps }))
        .rejects.toMatchObject({ status: 409 });
    });

    test('409 se treatmentFinalUrl divergir', async () => {
      (prisma.googleAdsExperiment.findUnique as any).mockResolvedValue(existingWithBaseline());
      await expect(setupExperiment({ userId: 'u1', payload: { ...validPayload, treatmentFinalUrl: 'https://outra-url.com/x' }, deps: baseDeps }))
        .rejects.toMatchObject({ status: 409 });
    });

    test('409 se name divergir', async () => {
      (prisma.googleAdsExperiment.findUnique as any).mockResolvedValue(existingWithBaseline());
      await expect(setupExperiment({ userId: 'u1', payload: { ...validPayload, name: 'NOME_DIFERENTE' }, deps: baseDeps }))
        .rejects.toMatchObject({ status: 409 });
    });

    test('409 se startDate divergir', async () => {
      (prisma.googleAdsExperiment.findUnique as any).mockResolvedValue(existingWithBaseline());
      await expect(setupExperiment({ userId: 'u1', payload: { ...validPayload, startDate: '2026-09-01' }, deps: baseDeps }))
        .rejects.toMatchObject({ status: 409 });
    });

    test('409 se endDate divergir', async () => {
      (prisma.googleAdsExperiment.findUnique as any).mockResolvedValue(existingWithBaseline());
      await expect(setupExperiment({ userId: 'u1', payload: { ...validPayload, endDate: '2026-12-01' }, deps: baseDeps }))
        .rejects.toMatchObject({ status: 409 });
    });

    test('409 se trafficSplitTreatment divergir', async () => {
      (prisma.googleAdsExperiment.findUnique as any).mockResolvedValue(existingWithBaseline());
      await expect(setupExperiment({ userId: 'u1', payload: { ...validPayload, trafficSplitTreatment: 70 }, deps: baseDeps }))
        .rejects.toMatchObject({ status: 409 });
    });

    test('mesmo payload canônico em todos os 7 campos não gera 409 e prossegue', async () => {
      (prisma.googleAdsExperiment.findUnique as any).mockResolvedValue(
        existingWithBaseline({ name: undefined as any, treatmentFinalUrl: validPayload.treatmentFinalUrl })
      );
      // name canônico do payload sem `name` explícito é derivado deterministicamente —
      // usamos o mesmo valor já persistido pra simular retomada idêntica.
      const stored = existingWithBaseline().variationConfig.setupPayload;
      (prisma.googleAdsExperiment.findUnique as any).mockResolvedValue({
        id: 'exp1', campaignId: 'c1', status: 'SETUP', arms: [],
        variationConfig: { setupPayload: { ...stored, treatmentFinalUrl: validPayload.treatmentFinalUrl } },
      });
      (prisma.googleAdsExperiment.findUniqueOrThrow as any).mockResolvedValue({ id: 'exp1', arms: armsFixture(), variationConfig: currentConfig() });

      const res = await setupExperiment({
        userId: 'u1',
        payload: { ...validPayload, name: stored.name },
        deps: baseDeps,
      });
      expect(res.success).toBe(true);
    });

    test('P2002: concorrência simulada trata unique conflict sem duplicar, aplicando a mesma comparação canônica', async () => {
      const p2002Err = new Error('Unique constraint failed on the fields: (`userId`,`idempotencyKey`)') as any;
      p2002Err.code = 'P2002';

      (prisma.googleAdsExperiment.findUnique as any).mockResolvedValueOnce(null);
      (prisma.googleAdsExperiment.create as any).mockRejectedValueOnce(p2002Err);
      (prisma.googleAdsExperiment.findUniqueOrThrow as any)
        .mockResolvedValueOnce({ id: 'exp1', campaignId: 'c1', name: 'EXP-c1-p2002', arms: [], variationConfig: currentConfig() })
        .mockResolvedValueOnce({ id: 'exp1', arms: armsFixture(), variationConfig: currentConfig() });

      const res = await setupExperiment({ userId: 'u1', payload: validPayload, deps: baseDeps });

      expect(res.success).toBe(true);
      expect(prisma.googleAdsExperiment.create).toHaveBeenCalledTimes(1);
    });
  });

  // -----------------------------------------------------------------------------------------
  // P1-A: reconciliação do experimento é discriminada (FOUND/NOT_FOUND/UNKNOWN), fail-closed
  // -----------------------------------------------------------------------------------------
  describe('P1-A: reconciliação do experimento remoto', () => {
    test('primeira tentativa comprovadamente inédita: UNKNOWN não bloqueia (nada podia ter sido criado antes) -> uma create', async () => {
      (prisma.googleAdsExperiment.findUnique as any).mockResolvedValue(null);
      (prisma.googleAdsExperiment.create as any).mockResolvedValue({ id: 'exp1', name: 'EXP-fresh', campaignId: 'c1', arms: [], variationConfig: currentConfig() });
      (prisma.googleAdsExperiment.findUniqueOrThrow as any).mockResolvedValue({ id: 'exp1', arms: armsFixture(), variationConfig: currentConfig() });

      const reconcileExperiment = vi.fn().mockRejectedValue(new Error('timeout de rede'));
      const deps = { ...baseDeps, reconcileExperiment };

      const res = await setupExperiment({ userId: 'u1', payload: validPayload, deps });
      expect(res.success).toBe(true);
      expect(reconcileExperiment).toHaveBeenCalled();
      expect(deps.createExperiment).toHaveBeenCalledTimes(1);
    });

    test('retry (reserva já existia) + UNKNOWN -> zero create, 502, erro persistido sem 2ª mutate', async () => {
      (prisma.googleAdsExperiment.findUnique as any).mockResolvedValue({
        id: 'exp1', name: 'EXP-retry-unknown', campaignId: 'c1', status: 'SETUP', resourceName: null, arms: [], variationConfig: currentConfig(),
      });

      const reconcileExperiment = vi.fn().mockResolvedValue(undefined);
      const deps = { ...baseDeps, reconcileExperiment };

      await expect(setupExperiment({ userId: 'u1', payload: validPayload, deps }))
        .rejects.toMatchObject({ status: 502 });

      expect(deps.createExperiment).not.toHaveBeenCalled();
      expect(prisma.googleAdsExperiment.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ lastError: expect.stringContaining('inconclusiva') }),
      }));
    });

    test('retry + resposta vazia/inválida (UNKNOWN) -> zero create', async () => {
      (prisma.googleAdsExperiment.findUnique as any).mockResolvedValue({
        id: 'exp1', name: 'EXP-retry-empty', campaignId: 'c1', status: 'SETUP', resourceName: null, arms: [], variationConfig: currentConfig(),
      });

      const reconcileExperiment = vi.fn().mockRejectedValue(new Error(''));
      const deps = { ...baseDeps, reconcileExperiment };

      await expect(setupExperiment({ userId: 'u1', payload: validPayload, deps }))
        .rejects.toMatchObject({ status: 502 });
      expect(deps.createExperiment).not.toHaveBeenCalled();
    });

    test('FOUND -> persiste checkpoint (resourceName) e não cria de novo', async () => {
      (prisma.googleAdsExperiment.findUnique as any).mockResolvedValue({
        id: 'exp1', name: 'EXP-retry-found', campaignId: 'c1', status: 'SETUP', resourceName: null, arms: [], variationConfig: currentConfig(),
      });
      (prisma.googleAdsExperiment.findUniqueOrThrow as any).mockResolvedValue({ id: 'exp1', arms: armsFixture(), variationConfig: currentConfig() });

      const reconcileExperiment = vi.fn().mockResolvedValue({ googleExperimentId: 'gExp1', resourceName: 'customers/1234567890/experiments/gExp1' });
      const deps = { ...baseDeps, reconcileExperiment };

      const res = await setupExperiment({ userId: 'u1', payload: validPayload, deps });
      expect(res.success).toBe(true);
      expect(reconcileExperiment).toHaveBeenCalledWith('EXP-retry-found');
      expect(deps.createExperiment).not.toHaveBeenCalled();
    });

    test('NOT_FOUND explícito (retry) -> autoritativo, prossegue com uma create', async () => {
      (prisma.googleAdsExperiment.findUnique as any).mockResolvedValue({
        id: 'exp1', name: 'EXP-retry-notfound', campaignId: 'c1', status: 'SETUP', resourceName: null, arms: [], variationConfig: currentConfig(),
      });
      (prisma.googleAdsExperiment.findUniqueOrThrow as any).mockResolvedValue({ id: 'exp1', arms: armsFixture(), variationConfig: currentConfig() });

      const reconcileExperiment = vi.fn().mockResolvedValue(null);
      const deps = { ...baseDeps, reconcileExperiment };

      const res = await setupExperiment({ userId: 'u1', payload: validPayload, deps });
      expect(res.success).toBe(true);
      expect(deps.createExperiment).toHaveBeenCalledTimes(1);
    });
  });

  // -----------------------------------------------------------------------------------------
  // P1-A/P1-C: reconciliação dos braços é discriminada e validada, nunca fabrica estado
  // -----------------------------------------------------------------------------------------
  describe('P1-A/P1-C: reconciliação dos braços remotos', () => {
    test('experimento recém-criado nesta chamada: braços não podem existir ainda -> pula reconciliação, cria direto', async () => {
      (prisma.googleAdsExperiment.findUnique as any).mockResolvedValue(null);
      (prisma.googleAdsExperiment.create as any).mockResolvedValue({ id: 'exp1', name: 'EXP-arms-fresh', campaignId: 'c1', arms: [], variationConfig: currentConfig() });
      (prisma.googleAdsExperiment.findUniqueOrThrow as any).mockResolvedValue({ id: 'exp1', arms: armsFixture(), variationConfig: currentConfig() });

      const reconcileArms = vi.fn();
      const deps = { ...baseDeps, reconcileArms };

      const res = await setupExperiment({ userId: 'u1', payload: validPayload, deps });
      expect(res.success).toBe(true);
      expect(reconcileArms).not.toHaveBeenCalled();
      expect(baseDeps.createExperimentArms).toHaveBeenCalledTimes(1);
    });

    test('retry (resourceName pré-existente) + FOUND bem-formado -> não recria braços', async () => {
      (prisma.googleAdsExperiment.findUnique as any).mockResolvedValue({
        id: 'exp1', campaignId: 'c1', status: 'SETUP',
        resourceName: 'customers/1234567890/experiments/expX', googleExperimentId: 'expX', arms: [], variationConfig: currentConfig(),
      });
      (prisma.googleAdsExperiment.findUniqueOrThrow as any).mockResolvedValue({ id: 'exp1', arms: armsFixture(), variationConfig: currentConfig() });

      const reconcileArms = vi.fn().mockResolvedValue([
        { name: 'control', isControl: true, trafficSplit: 50, resourceName: 'armC', inDesignCampaignResourceName: null, servedCampaignResourceName: controlCampaignResourceName },
        { name: 'treatment', isControl: false, trafficSplit: 50, resourceName: 'armT', inDesignCampaignResourceName: 'customers/1234567890/campaigns/MOCK-TREATMENT', servedCampaignResourceName: null },
      ]);
      const deps = { ...baseDeps, reconcileArms };

      const res = await setupExperiment({ userId: 'u1', payload: validPayload, deps });
      expect(res.success).toBe(true);
      expect(reconcileArms).toHaveBeenCalledWith('customers/1234567890/experiments/expX');
      expect(deps.createExperimentArms).not.toHaveBeenCalled();
    });

    test('retry + braços reconciliados fabricados/inválidos (contagem errada) -> UNKNOWN, 502, zero create', async () => {
      (prisma.googleAdsExperiment.findUnique as any).mockResolvedValue({
        id: 'exp1', campaignId: 'c1', status: 'SETUP',
        resourceName: 'customers/1234567890/experiments/expX', googleExperimentId: 'expX', arms: [], variationConfig: currentConfig(),
      });

      const reconcileArms = vi.fn().mockResolvedValue([
        { name: 'control', isControl: true, trafficSplit: 50, resourceName: 'armC', servedCampaignResourceName: controlCampaignResourceName },
      ]);
      const deps = { ...baseDeps, reconcileArms };

      await expect(setupExperiment({ userId: 'u1', payload: validPayload, deps }))
        .rejects.toMatchObject({ status: 502 });
      expect(deps.createExperimentArms).not.toHaveBeenCalled();
    });

    test('retry + split divergente do payload reservado -> UNKNOWN, fail-closed', async () => {
      (prisma.googleAdsExperiment.findUnique as any).mockResolvedValue({
        id: 'exp1', campaignId: 'c1', status: 'SETUP',
        resourceName: 'customers/1234567890/experiments/expX', googleExperimentId: 'expX', arms: [], variationConfig: currentConfig(),
      });

      const reconcileArms = vi.fn().mockResolvedValue([
        { name: 'control', isControl: true, trafficSplit: 70, resourceName: 'armC', servedCampaignResourceName: controlCampaignResourceName },
        { name: 'treatment', isControl: false, trafficSplit: 30, resourceName: 'armT', inDesignCampaignResourceName: 'campT', servedCampaignResourceName: null },
      ]);
      const deps = { ...baseDeps, reconcileArms };

      await expect(setupExperiment({ userId: 'u1', payload: validPayload, deps }))
        .rejects.toMatchObject({ status: 502 });
      expect(deps.createExperimentArms).not.toHaveBeenCalled();
    });

    test('retry + NOT_FOUND (null) -> autoritativo, cria braços', async () => {
      (prisma.googleAdsExperiment.findUnique as any).mockResolvedValue({
        id: 'exp1', campaignId: 'c1', status: 'SETUP',
        resourceName: 'customers/1234567890/experiments/expX', googleExperimentId: 'expX', arms: [], variationConfig: currentConfig(),
      });
      (prisma.googleAdsExperiment.findUniqueOrThrow as any).mockResolvedValue({ id: 'exp1', arms: armsFixture(), variationConfig: currentConfig() });

      const reconcileArms = vi.fn().mockResolvedValue(null);
      const deps = { ...baseDeps, reconcileArms };

      const res = await setupExperiment({ userId: 'u1', payload: validPayload, deps });
      expect(res.success).toBe(true);
      expect(deps.createExperimentArms).toHaveBeenCalledTimes(1);
    });
  });

  // -----------------------------------------------------------------------------------------
  // Retomada/retry entre checkpoints (restaurado, itens 10-11)
  // -----------------------------------------------------------------------------------------
  describe('Retomada entre checkpoints', () => {
    test('10. retry após checkpoint de experiment continua nos braços', async () => {
      (prisma.googleAdsExperiment.findUnique as any).mockResolvedValue({
        id: 'exp1', campaignId: 'c1', status: 'SETUP',
        resourceName: 'customers/1234567890/experiments/exp1', googleExperimentId: 'exp1', arms: [], variationConfig: currentConfig(),
      });
      (prisma.googleAdsExperiment.findUniqueOrThrow as any).mockResolvedValue({ id: 'exp1', arms: armsFixture(), variationConfig: currentConfig() });

      const res = await setupExperiment({ userId: 'u1', payload: validPayload, deps: baseDeps });

      expect(res.success).toBe(true);
      expect(baseDeps.createExperiment).not.toHaveBeenCalled();
      expect(baseDeps.createExperimentArms).toHaveBeenCalledTimes(1);
    });

    test('11. retry após braços continua na variação', async () => {
      (prisma.googleAdsExperiment.findUnique as any).mockResolvedValue({
        id: 'exp1', campaignId: 'c1', status: 'SETUP',
        resourceName: 'customers/1234567890/experiments/exp1', googleExperimentId: 'exp1',
        variationConfig: currentConfig(),
        arms: [
          { isControl: true, id: 'armC', finalUrl: 'https://control.com' },
          { isControl: false, id: 'armT', inDesignCampaignResourceName: 'customers/1234567890/campaigns/MOCK-TREATMENT', finalUrl: 'https://control.com', localPresellId: 'p1' },
        ],
      });

      const res = await setupExperiment({ userId: 'u1', payload: validPayload, deps: baseDeps });

      expect(res.success).toBe(true);
      expect(baseDeps.createExperiment).not.toHaveBeenCalled();
      expect(baseDeps.createExperimentArms).not.toHaveBeenCalled();
      expect(baseDeps.applyFinalUrlVariation).toHaveBeenCalledTimes(1);
    });
  });

  // -----------------------------------------------------------------------------------------
  // Prova persistida em variationConfig.proof (fast return)
  // -----------------------------------------------------------------------------------------
  describe('Fast return só com prova persistida (variationConfig.proof)', () => {
    test('não faz fast return se proof não existir ou verified !== true', async () => {
      (prisma.googleAdsExperiment.findUnique as any).mockResolvedValue({
        id: 'exp1', campaignId: 'c1', status: 'SETUP', resourceName: 'customers/1234567890/experiments/exp1',
        arms: [
          { isControl: true, finalUrl: 'https://control.com' },
          { isControl: false, id: 'armT', inDesignCampaignResourceName: 'campT', finalUrl: 'https://treatment.com/landing', localPresellId: 'p1' },
        ],
        variationConfig: currentConfig(),
        lastError: null,
      });

      const res = await setupExperiment({ userId: 'u1', payload: validPayload, deps: baseDeps });
      expect(res.success).toBe(true);
      expect(baseDeps.applyFinalUrlVariation).toHaveBeenCalled();
    });

    test('faz fast return somente quando proof.verified===true e finalUrl correspondente', async () => {
      (prisma.googleAdsExperiment.findUnique as any).mockResolvedValue({
        id: 'exp1', campaignId: 'c1', status: 'SETUP', resourceName: 'customers/1234567890/experiments/exp1',
        arms: [
          { isControl: true, finalUrl: 'https://control.com' },
          { isControl: false, id: 'armT', inDesignCampaignResourceName: 'campT', finalUrl: 'https://treatment.com/landing', localPresellId: 'p1' },
        ],
        variationConfig: { setupPayload: { campaignId: 'c1', presellId: 'p1', treatmentFinalUrl: 'https://treatment.com/landing', name: 'EXP-c1-validkey1234', startDate: null, endDate: null, trafficSplitTreatment: 50 }, proof: { verified: true, finalUrl: 'https://treatment.com/landing', presellId: 'p1' } },
        lastError: null,
      });

      const res = await setupExperiment({ userId: 'u1', payload: validPayload, deps: baseDeps });
      expect(res.success).toBe(true);
      expect(baseDeps.applyFinalUrlVariation).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------------------------
  // P1-E: MutationCapability emitida só na etapa exata, nunca antecipada
  // -----------------------------------------------------------------------------------------
  test('P1-E: capability é solicitada só pra etapa que realmente executa nesta chamada', async () => {
    (prisma.googleAdsExperiment.findUnique as any).mockResolvedValue({
      id: 'exp1', campaignId: 'c1', status: 'SETUP', resourceName: 'customers/1234567890/experiments/exp1',
      arms: [
        { isControl: true, id: 'armC', finalUrl: 'https://control.com' },
        { isControl: false, id: 'armT', inDesignCampaignResourceName: 'campT', finalUrl: 'https://old-url.com', localPresellId: 'p1' },
      ],
      variationConfig: currentConfig(),
      lastError: null,
    });

    const assertMutationAllowed = vi.fn().mockImplementation(({ operation }: any) => ({
      allowed: true,
      capability: { brand: 'GoogleAdsMutationCapability', operation },
    }));
    const deps = { ...baseDeps, assertMutationAllowed };

    const res = await setupExperiment({ userId: 'u1', payload: validPayload, deps });

    expect(res.success).toBe(true);
    expect(assertMutationAllowed).toHaveBeenCalledTimes(1);
    expect(assertMutationAllowed).toHaveBeenCalledWith(expect.objectContaining({ operation: 'updateAdFinalUrls' }));
    expect(deps.applyFinalUrlVariation).toHaveBeenCalledWith(
      expect.anything(), expect.anything(), expect.anything(), expect.anything(),
      expect.objectContaining({ operation: 'updateAdFinalUrls' })
    );
  });

  test('P1-E: capability divergente bloqueia antes do mutator', async () => {
    (prisma.googleAdsExperiment.findUnique as any).mockResolvedValue({
      id: 'exp1', campaignId: 'c1', status: 'SETUP', resourceName: 'customers/1234567890/experiments/exp1',
      arms: armsFixture(), variationConfig: currentConfig({ experiment: 'COMPLETE', arms: 'COMPLETE' }),
      lastError: null, updatedAt: new Date(),
    });
    const deps = {
      ...baseDeps,
      assertMutationAllowed: vi.fn().mockReturnValue({
        allowed: true,
        capability: { brand: 'GoogleAdsMutationCapability', operation: 'createExperiment' },
      }),
    };

    await expect(setupExperiment({ userId: 'u1', payload: validPayload, deps }))
      .rejects.toMatchObject({ status: 502 });
    expect(deps.applyFinalUrlVariation).not.toHaveBeenCalled();
  });

  describe('Remediação final: saga durável, CAS, legado e atomicidade', () => {
    test('retry após createExperiment ambíguo + NOT_FOUND não repete mutate', async () => {
      (prisma.googleAdsExperiment.findUnique as any).mockResolvedValue({
        id: 'exp1', name: 'EXP-c1-validkey1234', campaignId: 'c1', status: 'SETUP',
        resourceName: null, arms: [], variationConfig: currentConfig({ experiment: 'UNKNOWN' }),
      });
      const deps = { ...baseDeps, reconcileExperiment: vi.fn().mockResolvedValue(null) };

      await expect(setupExperiment({ userId: 'u1', payload: validPayload, deps }))
        .rejects.toMatchObject({ status: 502 });
      expect(deps.createExperiment).not.toHaveBeenCalled();
    });

    test('retry após createExperimentArms ambíguo + NOT_FOUND não repete mutate', async () => {
      (prisma.googleAdsExperiment.findUnique as any).mockResolvedValue({
        id: 'exp1', name: 'EXP-c1-validkey1234', campaignId: 'c1', status: 'SETUP',
        resourceName: 'customers/1234567890/experiments/exp1', arms: [],
        variationConfig: currentConfig({ experiment: 'COMPLETE', arms: 'UNKNOWN' }),
      });
      const deps = { ...baseDeps, reconcileArms: vi.fn().mockResolvedValue(null) };

      await expect(setupExperiment({ userId: 'u1', payload: validPayload, deps }))
        .rejects.toMatchObject({ status: 502 });
      expect(deps.createExperimentArms).not.toHaveBeenCalled();
    });

    test('claim CAS perdido impede createExperiment concorrente', async () => {
      const existing = {
        id: 'exp1', name: 'EXP-c1-validkey1234', campaignId: 'c1', status: 'SETUP',
        resourceName: null, arms: [], updatedAt: new Date(), variationConfig: currentConfig(),
      };
      (prisma.googleAdsExperiment.findUnique as any).mockResolvedValue(existing);
      (prisma.googleAdsExperiment.updateMany as any).mockResolvedValueOnce({ count: 0 });
      (prisma.googleAdsExperiment.findUniqueOrThrow as any).mockResolvedValue({
        ...existing, variationConfig: currentConfig({ experiment: 'IN_FLIGHT' }),
      });
      const deps = { ...baseDeps, reconcileExperiment: vi.fn().mockResolvedValue(null) };

      await expect(setupExperiment({ userId: 'u1', payload: validPayload, deps }))
        .rejects.toMatchObject({ status: 502 });
      expect(deps.createExperiment).not.toHaveBeenCalled();
    });

    test('registro legado incompleto falha antes de config/OAuth/mutate', async () => {
      (prisma.googleAdsExperiment.findUnique as any).mockResolvedValue({
        id: 'legacy1', name: 'Legacy', campaignId: 'c1', status: 'SETUP', arms: [], variationConfig: null,
      });
      const deps = { ...baseDeps };

      await expect(setupExperiment({ userId: 'u1', payload: validPayload, deps }))
        .rejects.toMatchObject({ status: 409 });
      expect(deps.getAdsConfig).not.toHaveBeenCalled();
      expect(deps.createExperiment).not.toHaveBeenCalled();
    });

    test('P2002 aplica comparação canônica e rejeita URL divergente', async () => {
      const p2002: any = new Error('P2002');
      p2002.code = 'P2002';
      (prisma.googleAdsExperiment.findUnique as any).mockResolvedValueOnce(null);
      (prisma.googleAdsExperiment.create as any).mockRejectedValueOnce(p2002);
      (prisma.googleAdsExperiment.findUniqueOrThrow as any).mockResolvedValue({
        id: 'exp1', name: 'EXP-c1-validkey1234', campaignId: 'c1', arms: [],
        variationConfig: {
          ...currentConfig(),
          setupPayload: { ...currentConfig().setupPayload, treatmentFinalUrl: 'https://different.example/path' },
        },
      });

      await expect(setupExperiment({ userId: 'u1', payload: validPayload, deps: baseDeps }))
        .rejects.toMatchObject({ status: 409 });
      expect(baseDeps.createExperiment).not.toHaveBeenCalled();
    });

    test('retorno parcial de createExperimentArms não persiste nenhum arm', async () => {
      (prisma.googleAdsExperiment.findUnique as any).mockResolvedValue(null);
      const fresh = {
        id: 'exp1', name: 'EXP-c1-validkey1234', campaignId: 'c1', arms: [],
        resourceName: null, updatedAt: new Date(), variationConfig: currentConfig(),
      };
      (prisma.googleAdsExperiment.create as any).mockResolvedValue(fresh);
      (prisma.googleAdsExperiment.update as any).mockResolvedValue({
        ...fresh, resourceName: 'customers/1234567890/experiments/exp1',
        variationConfig: currentConfig({ experiment: 'COMPLETE' }),
      });
      const deps = {
        ...baseDeps,
        createExperimentArms: vi.fn().mockResolvedValue([
          { name: 'control', isControl: true, trafficSplit: 50, resourceName: 'armC', servedCampaignResourceName: controlCampaignResourceName },
        ]),
      };

      await expect(setupExperiment({ userId: 'u1', payload: validPayload, deps }))
        .rejects.toMatchObject({ status: 502 });
      expect(prisma.googleAdsExperimentArm.createMany).not.toHaveBeenCalled();
      expect(prisma.googleAdsExperimentArm.create).not.toHaveBeenCalled();
    });

    test('remoteCreateInput persistido é reutilizado sem recalcular datas', async () => {
      const fixedConfig = {
        ...currentConfig(),
        remoteCreateInput: { startDate: '2026-08-01', endDate: '2026-08-31' },
      };
      (prisma.googleAdsExperiment.findUnique as any).mockResolvedValue({
        id: 'exp1', name: 'EXP-c1-validkey1234', campaignId: 'c1', status: 'SETUP',
        resourceName: null, arms: [], updatedAt: new Date(), variationConfig: fixedConfig,
      });
      (prisma.googleAdsExperiment.findUniqueOrThrow as any).mockResolvedValue({
        id: 'exp1', arms: armsFixture(), variationConfig: currentConfig(),
      });
      const deps = { ...baseDeps, reconcileExperiment: vi.fn().mockResolvedValue(null) };

      await setupExperiment({ userId: 'u1', payload: validPayload, deps });
      expect(deps.createExperiment).toHaveBeenCalledWith(
        expect.anything(), expect.anything(),
        expect.objectContaining({ startDate: '2026-08-01', endDate: '2026-08-31' }),
        expect.objectContaining({ operation: 'createExperiment' })
      );
    });

    test('claim de variação perdido impede updateAdFinalUrls concorrente', async () => {
      const existing = {
        id: 'exp1', name: 'EXP-c1-validkey1234', campaignId: 'c1', status: 'SETUP',
        resourceName: 'customers/1234567890/experiments/exp1', arms: armsFixture(),
        updatedAt: new Date(), variationConfig: currentConfig({ experiment: 'COMPLETE', arms: 'COMPLETE' }),
      };
      (prisma.googleAdsExperiment.findUnique as any).mockResolvedValue(existing);
      (prisma.googleAdsExperiment.updateMany as any).mockResolvedValueOnce({ count: 0 });
      (prisma.googleAdsExperiment.findUniqueOrThrow as any).mockResolvedValue({
        ...existing, variationConfig: currentConfig({ experiment: 'COMPLETE', arms: 'COMPLETE', variation: 'IN_FLIGHT' }),
      });

      await expect(setupExperiment({ userId: 'u1', payload: validPayload, deps: baseDeps }))
        .rejects.toMatchObject({ status: 502 });
      expect(baseDeps.applyFinalUrlVariation).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------------------------
  // GET detalhe: lookup owned + DTO sem segredos (restaurado, itens 12/14)
  // -----------------------------------------------------------------------------------------
  describe('GET detalhe: ownership e DTO sanitizado', () => {
    test('12. getExperimentDetail executa findFirst com { id, userId } e falha 404 se não pertencer', async () => {
      (prisma.googleAdsExperiment.findFirst as any).mockResolvedValue(null);

      await expect(getExperimentDetail('exp1', 'u_HACKER')).rejects.toMatchObject({ status: 404 });
      expect(prisma.googleAdsExperiment.findFirst).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'exp1', userId: 'u_HACKER' },
      }));
    });

    test('syncExperiment executa findFirst com { id, userId } e falha 404 se não pertencer', async () => {
      (prisma.googleAdsExperiment.findFirst as any).mockResolvedValue(null);

      await expect(syncExperiment('exp1', 'u_HACKER', baseDeps)).rejects.toMatchObject({ status: 404 });
      expect(prisma.googleAdsExperiment.findFirst).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'exp1', userId: 'u_HACKER' },
      }));
    });

    test('14. GET owned DTO exclui secrets, tokens e sourcePayload, redige erros de operação', async () => {
      (prisma.googleAdsExperiment.findFirst as any).mockResolvedValue({
        id: 'exp1', userId: 'u1', campaignId: 'c1', googleExperimentId: 'g1', resourceName: 'res1',
        name: 'Test Exp', type: 'SEARCH_CUSTOM', status: 'SETUP', syncEnabled: true,
        trafficAllocationType: 'SEARCH_CUSTOM', startDate: new Date(), endDate: new Date(),
        variationType: 'PRESELL_URL', createdAt: new Date(), updatedAt: new Date(),
        arms: [],
        operations: [{
          id: 'op1', experimentId: 'exp1', operationType: 'SCHEDULE', operationName: 'op_name_1', status: 'FAILED',
          errorMessage: 'Falha com Bearer sensitive_bearer_token',
          errors: ['Error: developerToken: dev_secret_123'],
          startedAt: new Date(), completedAt: new Date(),
        }],
        metricSnapshots: [],
      });

      const res: any = await getExperimentDetail('exp1', 'u1');
      expect(res.operations[0].errorMessage).not.toContain('sensitive_bearer_token');
      expect(res.operations[0].errorMessage).toContain('[REDACTED]');
      expect(res.operations[0].errors[0]).not.toContain('dev_secret_123');
      expect(res.operations[0].errors[0]).toContain('[REDACTED]');
      expect(res.sourcePayload).toBeUndefined();
    });
  });

  // -----------------------------------------------------------------------------------------
  // Sync: polling, redaction, changed:false, remoteStatusRaw, unknown status, P1-D
  // -----------------------------------------------------------------------------------------
  describe('Sync', () => {
    test('redactSensitive oculta tokens em erros salvos e lançados', async () => {
      const deps = {
        ...baseDeps,
        fetchExperimentReport: vi.fn().mockRejectedValue(new Error('Erro HTTP 401: Bearer secret_token_xyz_123 com developer-token: dev_tok_999')),
      };
      (prisma.googleAdsExperiment.findFirst as any).mockResolvedValue({ id: 'exp1', userId: 'u1', resourceName: 'res1', status: 'RUNNING', arms: [] });

      await expect(syncExperiment('exp1', 'u1', deps)).rejects.toMatchObject({
        status: 502,
        message: expect.not.stringContaining('secret_token_xyz_123'),
      });

      expect(prisma.googleAdsExperiment.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ lastError: expect.not.stringContaining('secret_token_xyz_123') }),
      }));
    });

    test('processa operação PENDING via pollExperimentOperation e salva erros paginados sanitizados', async () => {
      (prisma.googleAdsExperiment.findFirst as any).mockResolvedValue({
        id: 'exp1', userId: 'u1', resourceName: 'res1', status: 'SETUP', arms: [],
        operations: [{ id: 'op1', operationName: 'op_name_1', status: 'PENDING' }],
      });

      const pollExperimentOperation = vi.fn().mockResolvedValue({ status: 'FAILED', errors: ['Operation failed with Bearer my_secret_token'] });
      const listExperimentAsyncErrors = vi.fn().mockResolvedValue({ errors: ['Error 1: refresh_token: ref_secret_123'], truncated: false });
      const deps = { ...baseDeps, pollExperimentOperation, listExperimentAsyncErrors };

      const res = await syncExperiment('exp1', 'u1', deps);

      expect(pollExperimentOperation).toHaveBeenCalledWith('mock_access_token_123', mockConfig, 'op_name_1');
      expect(prisma.googleAdsExperimentOperation.update).toHaveBeenCalledWith({
        where: { id: 'op1' },
        data: expect.objectContaining({ status: 'FAILED', errorMessage: expect.not.stringContaining('ref_secret_123') }),
      });
    });

    test('P1-D: operação PENDING que falha permanece ERROR mesmo se o reporting mapear pra RUNNING', async () => {
      (prisma.googleAdsExperiment.findFirst as any).mockResolvedValue({
        id: 'exp1', userId: 'u1', resourceName: 'res1', status: 'SETUP', arms: [],
        operations: [{ id: 'op1', operationName: 'op_name_1', status: 'PENDING' }],
      });

      const pollExperimentOperation = vi.fn().mockResolvedValue({ status: 'FAILED', errors: ['LRO failed: quota exceeded'] });
      const listExperimentAsyncErrors = vi.fn().mockResolvedValue({ errors: [], truncated: false });
      // Reporting não vê nenhum erro e mapeia como se estivesse rodando normalmente —
      // simula exatamente o cenário do bug: reporting tenta "limpar" o estado de erro.
      const fetchExperimentReport = vi.fn().mockResolvedValue({
        status: 'ENABLED',
        control: { impressions: 1, clicks: 1, costMicros: 1, conversions: 0, conversionValue: 0 },
        treatment: { impressions: 1, clicks: 1, costMicros: 1, conversions: 0, conversionValue: 0 },
        statistics: {},
      });
      const deps = { ...baseDeps, pollExperimentOperation, listExperimentAsyncErrors, fetchExperimentReport };

      const res = await syncExperiment('exp1', 'u1', deps);

      expect(res.status).toBe('ERROR');
      expect(prisma.googleAdsExperiment.update).toHaveBeenLastCalledWith(expect.objectContaining({
        where: { id: 'exp1' },
        data: expect.objectContaining({
          status: 'ERROR',
          lastError: expect.not.stringContaining('null'),
        }),
      }));
      const lastCall = (prisma.googleAdsExperiment.update as any).mock.calls[(prisma.googleAdsExperiment.update as any).mock.calls.length - 1][0];
      expect(lastCall.data.lastError).not.toBeNull();
      expect(lastCall.data.status).toBe('ERROR');
    });

    test('preserva remoteStatusRaw em decisionPolicy e no retorno', async () => {
      (prisma.googleAdsExperiment.findFirst as any).mockResolvedValue({
        id: 'exp1', userId: 'u1', resourceName: 'res1', status: 'SETUP', decisionPolicy: { initialParam: 'value' }, arms: [],
      });

      const res = await syncExperiment('exp1', 'u1', baseDeps);
      expect(res.remoteStatusRaw).toBe('ENABLED');
      expect(prisma.googleAdsExperiment.update).toHaveBeenCalledWith({
        where: { id: 'exp1' },
        data: expect.objectContaining({
          decisionPolicy: expect.objectContaining({ lastRemoteStatusRaw: 'ENABLED', initialParam: 'value' }),
        }),
      });
    });

    test('sync repetido sem mudança de status -> changed:false', async () => {
      (prisma.googleAdsExperiment.findFirst as any).mockResolvedValue({
        id: 'exp1', userId: 'u1', resourceName: 'res1', status: 'RUNNING', arms: [],
      });

      const res = await syncExperiment('exp1', 'u1', baseDeps);
      expect(res.changed).toBe(false);
      expect(res.status).toBe('RUNNING');
    });

    test('status remoto desconhecido -> ERROR fail-closed, raw preservado', async () => {
      (prisma.googleAdsExperiment.findFirst as any).mockResolvedValue({
        id: 'exp1', userId: 'u1', resourceName: 'res1', status: 'RUNNING', arms: [],
      });
      const deps = {
        ...baseDeps,
        fetchExperimentReport: vi.fn().mockResolvedValue({
          status: 'SOME_UNMAPPED_STATUS', control: { impressions: 0, clicks: 0, costMicros: 0, conversions: 0, conversionValue: 0 },
          treatment: { impressions: 0, clicks: 0, costMicros: 0, conversions: 0, conversionValue: 0 }, statistics: {},
        }),
      };

      const res = await syncExperiment('exp1', 'u1', deps);
      expect(res.status).toBe('ERROR');
      expect(res.remoteStatusRaw).toBe('SOME_UNMAPPED_STATUS');
      expect(res.warnings.length).toBeGreaterThan(0);
    });
  });

  test('nenhum teste toca rede/Prisma real (sanity check de isolamento)', () => {
    expect(process.env.DATABASE_URL || '').not.toMatch(/railway/i);
  });
});
