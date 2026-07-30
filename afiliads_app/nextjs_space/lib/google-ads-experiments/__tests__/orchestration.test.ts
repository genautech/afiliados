import { expect, test, describe, vi, beforeEach } from 'vitest';
import { setupExperiment, getExperimentDetail, syncExperiment } from '../orchestration';

vi.mock('../../prisma', () => ({
  prisma: {
    googleAdsExperiment: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    googleAdsExperimentArm: {
      create: vi.fn(),
      update: vi.fn(),
    },
    googleAdsExperimentOperation: {
      update: vi.fn(),
    },
  },
}));

import { prisma } from '../../prisma';

describe('Google Ads Experiments Orchestration (P1 Recovery Audit Suite)', () => {
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

  describe('P1 Item 1: Persistência e verificação de prova em variationConfig', () => {
    test('não faz fast return se variationConfig não existir ou verified !== true', async () => {
      (prisma.googleAdsExperiment.findUnique as any).mockResolvedValue({
        id: 'exp1',
        campaignId: 'c1',
        status: 'SETUP',
        resourceName: 'customers/1234567890/experiments/exp1',
        arms: [
          { isControl: true, finalUrl: 'https://control.com' },
          { isControl: false, id: 'armT', inDesignCampaignResourceName: 'campT', finalUrl: 'https://treatment.com/landing', localPresellId: 'p1' },
        ],
        variationConfig: null, // Sem variação provada
        lastError: null,
      });
      (prisma.googleAdsExperiment.update as any).mockResolvedValue({ id: 'exp1' });

      const res = await setupExperiment({ userId: 'u1', payload: validPayload, deps: baseDeps });
      expect(res.success).toBe(true);
      expect(baseDeps.applyFinalUrlVariation).toHaveBeenCalled();
    });

    test('faz fast return somente quando variationConfig tem verified: true e finalUrl correspondente', async () => {
      (prisma.googleAdsExperiment.findUnique as any).mockResolvedValue({
        id: 'exp1',
        campaignId: 'c1',
        status: 'SETUP',
        resourceName: 'customers/1234567890/experiments/exp1',
        arms: [
          { isControl: true, finalUrl: 'https://control.com' },
          { isControl: false, id: 'armT', inDesignCampaignResourceName: 'campT', finalUrl: 'https://treatment.com/landing', localPresellId: 'p1' },
        ],
        variationConfig: { verified: true, finalUrl: 'https://treatment.com/landing', presellId: 'p1' },
        lastError: null,
      });

      const res = await setupExperiment({ userId: 'u1', payload: validPayload, deps: baseDeps });
      expect(res.success).toBe(true);
      expect(baseDeps.applyFinalUrlVariation).not.toHaveBeenCalled();
    });
  });

  describe('P1 Item 2: Reconciliação de timeout ambíguo', () => {
    test('reconcilia experimento existente pelo nome se resourceName estiver ausente antes de tentar criar', async () => {
      (prisma.googleAdsExperiment.findUnique as any).mockResolvedValue({
        id: 'exp1',
        name: 'EXP-c1-validkey1234',
        campaignId: 'c1',
        status: 'SETUP',
        resourceName: null,
        arms: [],
      });
      (prisma.googleAdsExperiment.update as any).mockResolvedValue({ id: 'exp1', resourceName: 'reconciled_res' });
      (prisma.googleAdsExperiment.findUniqueOrThrow as any).mockResolvedValue({
        id: 'exp1',
        arms: [
          { isControl: true, finalUrl: 'https://control.com' },
          { isControl: false, id: 'armT', inDesignCampaignResourceName: 'campT', finalUrl: 'https://treatment.com/landing' },
        ],
      });

      const reconcileExperiment = vi.fn().mockResolvedValue({ googleExperimentId: 'exp_rec_1', resourceName: 'reconciled_res' });
      const deps = { ...baseDeps, reconcileExperiment };

      const res = await setupExperiment({ userId: 'u1', payload: validPayload, deps });
      expect(res.success).toBe(true);
      expect(reconcileExperiment).toHaveBeenCalledWith('EXP-c1-validkey1234');
      expect(baseDeps.createExperiment).not.toHaveBeenCalled();
    });

    test('reconcilia braços remotos existentes se arms locais estiverem vazios', async () => {
      (prisma.googleAdsExperiment.findUnique as any).mockResolvedValue({
        id: 'exp1',
        campaignId: 'c1',
        status: 'SETUP',
        resourceName: 'res1',
        googleExperimentId: 'gExp1',
        arms: [],
      });

      const reconciledArms = [
        { name: 'control', isControl: true, trafficSplit: 50, resourceName: 'armC', inDesignCampaignResourceName: null, servedCampaignResourceName: 'c1' },
        { name: 'treatment', isControl: false, trafficSplit: 50, resourceName: 'armT', inDesignCampaignResourceName: 'campT', servedCampaignResourceName: null },
      ];
      const reconcileArms = vi.fn().mockResolvedValue(reconciledArms);
      const deps = { ...baseDeps, reconcileArms };

      (prisma.googleAdsExperiment.findUniqueOrThrow as any).mockResolvedValue({
        id: 'exp1',
        arms: [
          { isControl: true, finalUrl: 'https://control.com' },
          { isControl: false, id: 'armT', inDesignCampaignResourceName: 'campT', finalUrl: 'https://treatment.com/landing' },
        ],
      });
      (prisma.googleAdsExperiment.update as any).mockResolvedValue({ id: 'exp1' });

      const res = await setupExperiment({ userId: 'u1', payload: validPayload, deps });
      expect(res.success).toBe(true);
      expect(reconcileArms).toHaveBeenCalledWith('res1');
      expect(baseDeps.createExperimentArms).not.toHaveBeenCalled();
    });
  });

  describe('P1 Item 3: Comparação de payload canônico completo em idempotência', async () => {
    test('409 se campaignId diferir', async () => {
      (prisma.googleAdsExperiment.findUnique as any).mockResolvedValue({
        id: 'exp1', campaignId: 'c_DIVERGENT', status: 'SETUP', arms: []
      });
      await expect(setupExperiment({ userId: 'u1', payload: validPayload, deps: baseDeps })).rejects.toMatchObject({ status: 409 });
    });

    test('409 se name diferir', async () => {
      (prisma.googleAdsExperiment.findUnique as any).mockResolvedValue({
        id: 'exp1', campaignId: 'c1', name: 'EXP_OLD_NAME', status: 'SETUP', arms: []
      });
      await expect(setupExperiment({ userId: 'u1', payload: { ...validPayload, name: 'EXP_NEW_NAME' }, deps: baseDeps })).rejects.toMatchObject({ status: 409 });
    });

    test('409 se presellId diferir nos braços', async () => {
      (prisma.googleAdsExperiment.findUnique as any).mockResolvedValue({
        id: 'exp1', campaignId: 'c1', status: 'SETUP', arms: [{ isControl: false, localPresellId: 'p_OTHER' }]
      });
      await expect(setupExperiment({ userId: 'u1', payload: validPayload, deps: baseDeps })).rejects.toMatchObject({ status: 409 });
    });

    test('409 se treatmentFinalUrl diferir em variationConfig', async () => {
      (prisma.googleAdsExperiment.findUnique as any).mockResolvedValue({
        id: 'exp1', campaignId: 'c1', status: 'SETUP', arms: [], variationConfig: { finalUrl: 'https://other-url.com' }
      });
      await expect(setupExperiment({ userId: 'u1', payload: validPayload, deps: baseDeps })).rejects.toMatchObject({ status: 409 });
    });

    test('409 se trafficSplitTreatment diferir nos braços', async () => {
      (prisma.googleAdsExperiment.findUnique as any).mockResolvedValue({
        id: 'exp1', campaignId: 'c1', status: 'SETUP', arms: [{ isControl: false, trafficSplit: 70 }]
      });
      await expect(setupExperiment({ userId: 'u1', payload: { ...validPayload, trafficSplitTreatment: 50 }, deps: baseDeps })).rejects.toMatchObject({ status: 409 });
    });
  });

  describe('P1 Item 4: Prisma Owned Lookup por { id, userId }', () => {
    test('getExperimentDetail executa findFirst com { id, userId } e falha 404 se não pertencer', async () => {
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
  });

  describe('P1 Item 5: Redação de dados sensíveis via redactSensitive', () => {
    test('redactSensitive oculta tokens em erros salvos e lançados', async () => {
      const deps = {
        ...baseDeps,
        fetchExperimentReport: vi.fn().mockRejectedValue(new Error('Erro HTTP 401: Bearer secret_token_xyz_123 com developer-token: dev_tok_999')),
      };
      (prisma.googleAdsExperiment.findFirst as any).mockResolvedValue({
        id: 'exp1', userId: 'u1', resourceName: 'res1', status: 'RUNNING', arms: []
      });

      await expect(syncExperiment('exp1', 'u1', deps)).rejects.toMatchObject({
        status: 502,
        message: expect.not.stringContaining('secret_token_xyz_123'),
      });

      expect(prisma.googleAdsExperiment.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          lastError: expect.not.stringContaining('secret_token_xyz_123'),
        }),
      }));
    });

    test('getExperimentDetail oculta erros brutos sensíveis em operações no DTO', async () => {
      (prisma.googleAdsExperiment.findFirst as any).mockResolvedValue({
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
        startDate: new Date(),
        endDate: new Date(),
        variationType: 'PRESELL_URL',
        createdAt: new Date(),
        updatedAt: new Date(),
        arms: [],
        operations: [
          {
            id: 'op1',
            experimentId: 'exp1',
            operationType: 'SCHEDULE',
            operationName: 'op_name_1',
            status: 'FAILED',
            errorMessage: 'Falha com Bearer sensitive_bearer_token',
            errors: ['Error: developerToken: dev_secret_123'],
            startedAt: new Date(),
            completedAt: new Date(),
          },
        ],
        metricSnapshots: [],
      });

      const res = await getExperimentDetail('exp1', 'u1');
      expect(res.operations[0].errorMessage).not.toContain('sensitive_bearer_token');
      expect(res.operations[0].errorMessage).toContain('[REDACTED]');
      expect(res.operations[0].errors[0]).not.toContain('dev_secret_123');
      expect(res.operations[0].errors[0]).toContain('[REDACTED]');
    });
  });

  describe('P1 Item 6 & 7: Sync com polling de operação pendente, erros paginados e preservação de remoteStatusRaw', () => {
    test('sync processa operação PENDING via pollExperimentOperation e salva erros sanitizados', async () => {
      (prisma.googleAdsExperiment.findFirst as any).mockResolvedValue({
        id: 'exp1',
        userId: 'u1',
        resourceName: 'res1',
        status: 'SETUP',
        arms: [],
        operations: [
          { id: 'op1', operationName: 'op_name_1', status: 'PENDING' },
        ],
      });

      const pollExperimentOperation = vi.fn().mockResolvedValue({ status: 'FAILED', errors: ['Operation failed with Bearer my_secret_token'] });
      const listExperimentAsyncErrors = vi.fn().mockResolvedValue({ errors: ['Error 1: refresh_token: ref_secret_123'], truncated: false });
      const deps = { ...baseDeps, pollExperimentOperation, listExperimentAsyncErrors };

      (prisma.googleAdsExperiment.update as any).mockResolvedValue({ id: 'exp1' });

      const res = await syncExperiment('exp1', 'u1', deps);

      expect(pollExperimentOperation).toHaveBeenCalledWith('mock_access_token_123', mockConfig, 'op_name_1');
      expect(prisma.googleAdsExperimentOperation.update).toHaveBeenCalledWith({
        where: { id: 'op1' },
        data: expect.objectContaining({
          status: 'FAILED',
          errorMessage: expect.not.stringContaining('ref_secret_123'),
        }),
      });
      expect(res.remoteStatusRaw).toBe('ENABLED');
    });

    test('sync preserva remoteStatusRaw em decisionPolicy e no retorno', async () => {
      (prisma.googleAdsExperiment.findFirst as any).mockResolvedValue({
        id: 'exp1',
        userId: 'u1',
        resourceName: 'res1',
        status: 'SETUP',
        decisionPolicy: { initialParam: 'value' },
        arms: [],
      });
      (prisma.googleAdsExperiment.update as any).mockResolvedValue({ id: 'exp1' });

      const res = await syncExperiment('exp1', 'u1', baseDeps);
      expect(res.remoteStatusRaw).toBe('ENABLED');
      expect(prisma.googleAdsExperiment.update).toHaveBeenCalledWith({
        where: { id: 'exp1' },
        data: expect.objectContaining({
          decisionPolicy: expect.objectContaining({
            lastRemoteStatusRaw: 'ENABLED',
            initialParam: 'value',
          }),
        }),
      });
    });
  });
});
