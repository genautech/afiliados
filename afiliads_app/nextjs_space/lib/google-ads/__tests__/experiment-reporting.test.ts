import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildExperimentReportQuery,
  buildMetricSnapshotUpsertInput,
  fetchExperimentReport,
  parseExperimentReportRow,
  upsertMetricSnapshot,
  validateFallbackArms,
  sanitizeSourcePayload
} from '@/lib/google-ads/experiment-reporting';
import type { GoogleAdsCredentials } from '@/lib/google-ads/client';
import { createExperiment } from '@/lib/google-ads/experiments';

function realCredentials(overrides: Partial<GoogleAdsCredentials> = {}): GoogleAdsCredentials {
  return {
    customerId: '1234567890',
    developerToken: 'real-token',
    clientId: 'real-client-id',
    clientSecret: 'real-secret',
    refreshToken: 'real-refresh',
    ...overrides,
  };
}

function mockCredentials(): GoogleAdsCredentials {
  return realCredentials({ developerToken: 'DEV_TOKEN_MOCK' });
}

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const EXPERIMENT = 'customers/1234567890/experiments/999';

function validatedFallback() {
  return validateFallbackArms('local-exp-1', [
    { isControl: true, servedCampaignResourceName: 'customers/1234567890/campaigns/111', experimentId: 'local-exp-1' },
    { isControl: false, servedCampaignResourceName: 'customers/1234567890/campaigns/222', experimentId: 'local-exp-1' },
  ]);
}

describe('buildExperimentReportQuery', () => {
  it('1. monta GAQL sobre o recurso `experiment` filtrado pelo resource_name, com métricas de controle e tratamento', () => {
    const query = buildExperimentReportQuery(EXPERIMENT);
    expect(query).toContain('FROM experiment');
    expect(query).toContain(`WHERE experiment.resource_name = '${EXPERIMENT}'`);
    expect(query).toContain('metrics.clicks');
    expect(query).toContain('metrics.control_clicks');
    expect(query).toContain('metrics.conversions_absolute_change_p_value');
  });

  it('2. rejeita resource name fora do contrato antes da rede', () => {
    expect(() => buildExperimentReportQuery("customers/1/experiments/O'Brien")).toThrow(/Invalid experiment resource name/);
    expect(() => buildExperimentReportQuery("x\\'; SELECT campaign.id FROM campaign --")).toThrow(/Invalid experiment resource name/);
  });
});

describe('parseExperimentReportRow', () => {
  function baseRow(overrides: Record<string, unknown> = {}) {
    return {
      experiment: {
        resourceName: EXPERIMENT,
        experimentId: '999',
        status: 'ENABLED',
      },
      metrics: {
        impressions: 1000,
        controlImpressions: 1000,
        clicks: 60,
        controlClicks: 50,
        clicksPointEstimate: 10,
        clicksMarginOfError: 5,
        clicksPValue: 0.03,
        costMicros: 27_000_000,
        controlCostMicros: 25_000_000,
        costMicrosChangePointEstimate: 2_000_000,
        costMicrosMarginOfError: 1_000_000,
        costMicrosPValue: 0.2,
        conversions: 7,
        controlConversions: 5,
        conversionsAbsoluteChangePointEstimate: 2,
        conversionsAbsoluteChangeMarginOfError: 1.5,
        conversionsAbsoluteChangePValue: 0.04,
        conversionsValue: 700,
        controlConversionValue: 500,
        conversionValueChangePointEstimate: 200,
        conversionValueMarginOfError: 150,
        conversionValuePValue: 0.06,
        ...overrides,
      },
    };
  }

  it('3. caminho feliz: amostra suficiente + p-value < 0.05 => VIABLE e resultado significativo', () => {
    const report = parseExperimentReportRow(baseRow(), 50);
    expect(report.experimentId).toBe('999');
    expect(report.status).toBe('RUNNING');
    expect(report.remoteStatusRaw).toBe('ENABLED');
    expect(report.control).toEqual({
      impressions: 1000,
      clicks: 50,
      costMicros: 25_000_000,
      conversions: 5,
      conversionValue: 500,
    });
    expect(report.treatment).toEqual({
      impressions: 1000,
      clicks: 60,
      costMicros: 27_000_000,
      conversions: 7,
      conversionValue: 700,
    });
    expect(report.statistics.conversions).toEqual({ pointEstimate: 2, marginOfError: 1.5, pValue: 0.04 });
    expect(report.feasibility).toBe('VIABLE');
    expect(report.hasSignificantResult).toBe(true);
    expect(report.summary).toMatch(/significativa/);
  });

  it('4. amostra abaixo do alvo => UNDERPOWERED mesmo com p-value < 0.05 (nunca declara vencedor cedo)', () => {
    const report = parseExperimentReportRow(baseRow(), 1000);
    expect(report.feasibility).toBe('UNDERPOWERED');
    expect(report.hasSignificantResult).toBe(false);
    expect(report.summary).toMatch(/Amostra insuficiente/);
  });

  it('5. p-value de conversões ausente (null) => inconclusivo, mesmo com amostra suficiente', () => {
    const report = parseExperimentReportRow(
      baseRow({ conversionsAbsoluteChangePValue: null, conversionsAbsoluteChangePointEstimate: null }),
      50
    );
    expect(report.feasibility).toBe('UNDERPOWERED');
    expect(report.hasSignificantResult).toBe(false);
    expect(report.summary).toMatch(/Estatísticas ausentes ou inválidas/);
  });

  it('6. amostra suficiente + p-value >= 0.05 => VIABLE mas sem resultado significativo (nunca escolhe vencedor)', () => {
    const report = parseExperimentReportRow(baseRow({ conversionsAbsoluteChangePValue: 0.5 }), 50);
    expect(report.feasibility).toBe('VIABLE');
    expect(report.hasSignificantResult).toBe(false);
    expect(report.summary).toMatch(/não é estatisticamente significativa/);
  });

  it('7. status remoto desconhecido nunca vira SETUP por default (A4) — cai em ERROR', () => {
    const report = parseExperimentReportRow(baseRow({}), 50);
    const weird = parseExperimentReportRow(
      { experiment: { resourceName: EXPERIMENT, experimentId: '999', status: 'SOME_FUTURE_STATUS' }, metrics: {} },
      50
    );
    expect(report.status).not.toBe('SETUP');
    expect(weird.status).toBe('ERROR');
  });

  it('8. Testes adversariais (P1): NaN, "", Infinity viram null/0 e evitam falhas', () => {
    const report = parseExperimentReportRow(baseRow({
      conversionsAbsoluteChangePValue: '',
      conversionsAbsoluteChangeMarginOfError: 'abc',
      conversions: NaN,
      clicks: -5, // negativas indevidas em base
      conversionsAbsoluteChangePointEstimate: '2' // Int64 from REST
    }), 50);

    expect(report.treatment.conversions).toBe(0);
    expect(report.treatment.clicks).toBe(0); // rejected negative
    expect(report.statistics.conversions.pValue).toBe(null); // empty string rejected
    expect(report.statistics.conversions.marginOfError).toBe(null); // 'abc' rejected
    expect(report.statistics.conversions.pointEstimate).toBe(2); // '2' parsed fine
    expect(report.feasibility).toBe('UNDERPOWERED');
    expect(report.hasSignificantResult).toBe(false);
  });

  it('9. Testes adversariais (P1): p-value inválido ou intervalo cruzando zero', () => {
    // p-value < 0 invalid
    let report = parseExperimentReportRow(baseRow({ conversionsAbsoluteChangePValue: -0.1 }), 50);
    expect(report.statistics.conversions.pValue).toBe(null);
    expect(report.hasSignificantResult).toBe(false);

    // p-value > 1 invalid
    report = parseExperimentReportRow(baseRow({ conversionsAbsoluteChangePValue: 1.2 }), 50);
    expect(report.statistics.conversions.pValue).toBe(null);

    // crosses zero: estimate 2, margin 3 (lower is -1, upper is 5) => crosses zero despite p-value 0.04
    report = parseExperimentReportRow(baseRow({
      conversionsAbsoluteChangePointEstimate: 2,
      conversionsAbsoluteChangeMarginOfError: 3,
      conversionsAbsoluteChangePValue: 0.04
    }), 50);
    expect(report.hasSignificantResult).toBe(false);
    expect(report.summary).toMatch(/cruza zero/);
  });

  it('10. Rejeita ausência de identidade (P2)', () => {
    expect(() => parseExperimentReportRow({ metrics: {} }, 50)).toThrow(/Identidade do experimento ausente/);
  });

  it('10a. Parsing numérico estrito rejeita boolean, object e whitespace (P2)', () => {
    const report = parseExperimentReportRow(baseRow({
      conversions: true,
      clicks: [10],
      impressions: '   ',
      controlClicks: { a: 1 }
    }), 50);
    expect(report.treatment.conversions).toBe(0);
    expect(report.treatment.clicks).toBe(0);
    expect(report.treatment.impressions).toBe(0);
    expect(report.control.clicks).toBe(0);
  });

  it('10b. targetClicks inválido falha fechado (P1)', () => {
    const row = baseRow();
    expect(() => parseExperimentReportRow(row, NaN)).toThrow(/targetClicks/);
    expect(() => parseExperimentReportRow(row, Infinity)).toThrow(/targetClicks/);
    expect(() => parseExperimentReportRow(row, 0)).toThrow(/targetClicks/);
    expect(() => parseExperimentReportRow(row, -5)).toThrow(/targetClicks/);
    expect(() => parseExperimentReportRow(row, 1.5)).toThrow(/targetClicks/);
    expect(() => parseExperimentReportRow(row, '10' as any)).toThrow(/targetClicks/);
  });

  it('10c. parser rejeita formatos numéricos malformados (hex, bin, oct, whitespace interno) antes do Number() (P2)', () => {
    const report = parseExperimentReportRow(baseRow({
      conversions: '0x10',
      clicks: '0b10',
      impressions: '0o10',
      controlClicks: '10 10',
      controlImpressions: '10.5.5'
    }), 50);
    expect(report.treatment.conversions).toBe(0);
    expect(report.treatment.clicks).toBe(0);
    expect(report.treatment.impressions).toBe(0);
    expect(report.control.clicks).toBe(0);
    expect(report.control.impressions).toBe(0);
  });

  it('10d. contador inválido torna o resultado inconclusivo mesmo com estatística significativa', () => {
    const report = parseExperimentReportRow(baseRow({ clicks: 'abc' }), 50);
    expect(report.treatment.clicks).toBe(0);
    expect(report.metricsValid).toBe(false);
    expect(report.hasSignificantResult).toBe(false);
    expect(report.feasibility).toBe('UNDERPOWERED');
    expect(report.summary).toMatch(/métricas cumulativas inválidas/i);
  });

  it('10e. rejeita contadores fracionários, inseguros e identidade divergente', () => {
    const fractional = parseExperimentReportRow(baseRow({ clicks: '1.5' }), 1);
    const unsafe = parseExperimentReportRow(baseRow({ clicks: '9007199254740993' }), 1);
    expect(fractional.hasSignificantResult).toBe(false);
    expect(unsafe.hasSignificantResult).toBe(false);
    expect(() => parseExperimentReportRow({
      ...baseRow(),
      experiment: { resourceName: EXPERIMENT, experimentId: 'OTHER', status: 'ENABLED' },
    }, 50, EXPERIMENT)).toThrow(/Identidade do experimento divergente/);
  });

  it.each(['', '   ', 123, false])('10f. status remoto inválido %p normaliza para UNSPECIFIED', (status) => {
    const row = baseRowFixture() as any;
    row.experiment.status = status;
    const report = parseExperimentReportRow(row, 50);
    expect(report.status).toBe('ERROR');
    expect(report.remoteStatusRaw).toBe('UNSPECIFIED');
  });

  it('10g. targetClicks inválido falha antes do atalho de métricas cumulativas inválidas', () => {
    expect(() => parseExperimentReportRow(baseRow({ clicks: 'corrompido' }), NaN)).toThrow(/targetClicks/);
  });
});

describe('validateFallbackArms', () => {
  it('11. valida braços corretamente', () => {
    const arms = [
      { isControl: true, servedCampaignResourceName: 'c1', experimentId: 'exp1' },
      { isControl: false, servedCampaignResourceName: 'c2', experimentId: 'exp1' }
    ];
    const res = validateFallbackArms('exp1', arms);
    expect(res.controlCampaignResourceName).toBe('c1');
    expect(res.treatmentCampaignResourceName).toBe('c2');
  });

  it('12. rejeita invalidações', () => {
    // falta de servedCampaignResourceName
    expect(() => validateFallbackArms('exp1', [
      { isControl: true, experimentId: 'exp1' },
      { isControl: false, servedCampaignResourceName: 'c2', experimentId: 'exp1' }
    ])).toThrow(/Braços devem ter campanhas/);

    // IDs diferentes
    expect(() => validateFallbackArms('exp1', [
      { isControl: true, servedCampaignResourceName: 'c1', experimentId: 'exp2' },
      { isControl: false, servedCampaignResourceName: 'c2', experimentId: 'exp1' }
    ])).toThrow(/Braços não pertencem/);
  });
});

describe('fetchExperimentReport', () => {
  it('13. modo mock não chama fetch nem fabrica vencedor significativo', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const report = await fetchExperimentReport('tok', mockCredentials(), EXPERIMENT, { targetClicks: 50 });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(report.experimentId).toBe('999');
    expect(report.feasibility).toBe('UNDERPOWERED');
    expect(report.hasSignificantResult).toBe(false);
  });

  it('13a. resourceName criado pelo mock oficial é canônico e aceito pelo reporting', async () => {
    const credentials = mockCredentials();
    const created = await createExperiment('tok', credentials, {
      name: 'Mock integrado', suffix: 'exp-integrado-1', startDate: '2030-01-10', endDate: '2030-01-20',
    }, { allowed: true } as any);
    expect(created.resourceName).toMatch(/^customers\/1234567890\/experiments\/\d+$/);
    expect(created.googleExperimentId).toMatch(/^\d+$/);
    const report = await fetchExperimentReport('tok', credentials, created.resourceName, { targetClicks: 50 });
    expect(report.experimentId).toBe(created.googleExperimentId);
    expect(report.status).toBe('RUNNING');
  });

  it.each([
    ['sem fallback', undefined],
    ['com fallback', {} as any],
  ])('13b. targetClicks inválido falha antes de HTTP em resposta potencialmente vazia %s', async (_label, fallbackCampaigns) => {
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse({ results: [] }));
    vi.stubGlobal('fetch', fetchSpy);
    await expect(fetchExperimentReport('tok', realCredentials(), EXPERIMENT, {
      targetClicks: 0,
      fallbackCampaigns,
    })).rejects.toThrow(/targetClicks/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('14. modo real: busca via googleAds:search, para na primeira página com resultado e faz parse da linha', async () => {
    const fetchSpy = vi.fn().mockResolvedValueOnce(
      jsonResponse({
        results: [
          {
            experiment: { resourceName: EXPERIMENT, experimentId: '999', status: 'ENABLED' },
            metrics: { clicks: 60, controlClicks: 50, conversionsAbsoluteChangePValue: 0.04, conversionsAbsoluteChangePointEstimate: 2, conversionsAbsoluteChangeMarginOfError: 1 },
          },
        ],
      })
    );
    vi.stubGlobal('fetch', fetchSpy);
    const report = await fetchExperimentReport('tok', realCredentials(), EXPERIMENT, { targetClicks: 50 });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(report.experimentId).toBe('999');
    expect(report.treatment.clicks).toBe(60);
  });

  it('15. sem linhas e sem fallback => relatório inconclusivo explícito, nunca finge SETUP/RUNNING', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse({ results: [] }));
    vi.stubGlobal('fetch', fetchSpy);
    const report = await fetchExperimentReport('tok', realCredentials(), EXPERIMENT, { targetClicks: 50 });
    expect(report.status).toBe('ERROR');
    expect(report.feasibility).toBe('UNDERPOWERED');
    expect(report.hasSignificantResult).toBe(false);
    expect(report.summary).toMatch(/não retornou linhas/);
  });

  it('16. sem linhas mas com fallback de campanhas => métricas cruas por campanha, sem uplift/p-value inventado', async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ results: [] }))
      .mockResolvedValueOnce(jsonResponse({ results: [{ metrics: { clicks: 40, conversions: 3 } }] }))
      .mockResolvedValueOnce(jsonResponse({ results: [{ metrics: { clicks: 45, conversions: 5 } }] }));
    vi.stubGlobal('fetch', fetchSpy);

    const report = await fetchExperimentReport('tok', realCredentials(), EXPERIMENT, {
      targetClicks: 50,
      fallbackCampaigns: validatedFallback(),
    });

    expect(fetchSpy).toHaveBeenCalledTimes(3);
    expect(report.control.clicks).toBe(40);
    expect(report.treatment.clicks).toBe(45);
    expect(report.statistics.conversions).toEqual({ pointEstimate: null, marginOfError: null, pValue: null });
    expect(report.hasSignificantResult).toBe(false);
    expect(report.feasibility).toBe('UNDERPOWERED'); // Mesmo com sample >= 50, sem estatística deve ser UNDERPOWERED
    expect(report.summary).toMatch(/Fallback de diagnóstico/);
  });

  it('16a. fallback envia queries de recurso exatas sem backslash na string literal (P1 contract test)', async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ results: [] }))
      .mockResolvedValueOnce(jsonResponse({ results: [{ metrics: { clicks: 40, conversions: 3 } }] }))
      .mockResolvedValueOnce(jsonResponse({ results: [{ metrics: { clicks: 45, conversions: 5 } }] }));
    vi.stubGlobal('fetch', fetchSpy);

    await fetchExperimentReport('tok', realCredentials(), EXPERIMENT, {
      targetClicks: 50,
      fallbackCampaigns: validatedFallback(),
    });

    const call1 = JSON.parse(fetchSpy.mock.calls[1][1].body);
    const call2 = JSON.parse(fetchSpy.mock.calls[2][1].body);
    expect(call1.query).toContain("WHERE campaign.resource_name = 'customers/1234567890/campaigns/111'");
    expect(call1.query).not.toContain("$");
    expect(call2.query).toContain("WHERE campaign.resource_name = 'customers/1234567890/campaigns/222'");
    expect(call2.query).not.toContain("$");
  });

  it('16b. fallback não validado ou com resource name inválido falha antes das queries de campanha', async () => {
    const fetchSpy = vi.fn().mockResolvedValueOnce(jsonResponse({ results: [] }));
    vi.stubGlobal('fetch', fetchSpy);

    await expect(fetchExperimentReport('tok', realCredentials(), EXPERIMENT, {
      targetClicks: 50,
      fallbackCampaigns: {
        controlCampaignResourceName: 'invalido',
        treatmentCampaignResourceName: 'customers/123/campaigns/222',
        experimentId: 'outro-experimento'
      } as any,
    })).rejects.toThrow(/Fallback arms não validados/);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('16c. rejeita linha de experimento diferente da solicitada', async () => {
    const fetchSpy = vi.fn().mockResolvedValueOnce(jsonResponse({ results: [{
      experiment: { resourceName: 'customers/1234567890/experiments/998', experimentId: '998', status: 'ENABLED' },
      metrics: baseRowFixture().metrics,
    }] }));
    vi.stubGlobal('fetch', fetchSpy);
    await expect(fetchExperimentReport('tok', realCredentials(), EXPERIMENT, { targetClicks: 50 }))
      .rejects.toThrow(/Identidade do experimento divergente/);
  });

  it('16d. rejeita experimento de customer diferente da configuração antes da rede', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    await expect(fetchExperimentReport('tok', realCredentials({ customerId: '9999999999' }), EXPERIMENT, { targetClicks: 50 }))
      .rejects.toThrow(/customer da configuração/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('16e. rejeita campanhas fallback de outro customer antes das queries de campanha', async () => {
    const fetchSpy = vi.fn().mockResolvedValueOnce(jsonResponse({ results: [] }));
    vi.stubGlobal('fetch', fetchSpy);
    const fallback = validateFallbackArms('local-exp', [
      { experimentId: 'local-exp', isControl: true, servedCampaignResourceName: 'customers/9999999999/campaigns/111' },
      { experimentId: 'local-exp', isControl: false, servedCampaignResourceName: 'customers/1234567890/campaigns/222' },
    ]);
    await expect(fetchExperimentReport('tok', realCredentials(), EXPERIMENT, { targetClicks: 50, fallbackCampaigns: fallback }))
      .rejects.toThrow(/não pertencem ao customer/);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});

describe('buildMetricSnapshotUpsertInput & upsertMetricSnapshot', () => {
  it('17. mapeia ExperimentReport pro shape de GoogleAdsExperimentMetricSnapshot (mapper puro, sem Prisma)', () => {
    const report = parseExperimentReportRow(baseRowFixture(), 50);
    expect(report.metricsValid).toBe(true);
    const snapshotDate = new Date('2026-07-29T00:00:00.000Z');
    const input = buildMetricSnapshotUpsertInput('local-experiment-id', snapshotDate, report, { raw: true });

    expect(input.experimentId).toBe('local-experiment-id');
    expect(input.snapshotDate).toBe(snapshotDate);
    expect(input.controlClicks).toBe(report.control.clicks);
    expect(input.treatmentClicks).toBe(report.treatment.clicks);
    expect(input.controlConversions).toBe(report.control.conversions);
    expect(input.treatmentConversions).toBe(report.treatment.conversions);
    expect(input.statistics).toBe(report.statistics);
    // Sanitize in upsert function, input retains original
    expect(input.sourcePayload).toEqual({ raw: true });
  });

  it('18. upsertMetricSnapshot normaliza data para UTC midnight e faz upsert idempotente via mock Prisma', async () => {
    const report = parseExperimentReportRow(baseRowFixture(), 50);
    // two dates, same UTC day
    const date1 = new Date('2026-07-29T10:00:00.000Z');
    const date2 = new Date('2026-07-29T15:00:00.000Z');

    const input1 = buildMetricSnapshotUpsertInput('exp1', date1, report, { raw: true });
    const input2 = buildMetricSnapshotUpsertInput('exp1', date2, report, { raw: true });

    const mockPrisma = {
      googleAdsExperimentMetricSnapshot: {
        upsert: vi.fn().mockResolvedValue({})
      }
    };

    await upsertMetricSnapshot(mockPrisma as any, input1);
    await upsertMetricSnapshot(mockPrisma as any, input2);

    expect(mockPrisma.googleAdsExperimentMetricSnapshot.upsert).toHaveBeenCalledTimes(2);

    const call1Args = mockPrisma.googleAdsExperimentMetricSnapshot.upsert.mock.calls[0][0];
    const call2Args = mockPrisma.googleAdsExperimentMetricSnapshot.upsert.mock.calls[1][0];

    const expectedMidnight = new Date(Date.UTC(2026, 6, 29)); // Month is 0-indexed in Date.UTC (6 = July)

    // Assegura idempotencia com a data de meia-noite
    expect(call1Args.where.experimentId_snapshotDate.snapshotDate).toEqual(expectedMidnight);
    expect(call2Args.where.experimentId_snapshotDate.snapshotDate).toEqual(expectedMidnight);
    expect(call1Args.create.snapshotDate).toEqual(expectedMidnight);
    expect(call2Args.create.snapshotDate).toEqual(expectedMidnight);

    // Garante q payloads perigosos/gigantes sao sanitizados
    expect(call1Args.create.sourcePayload).toEqual({});
  });

  it('18a. rejeita snapshotDate inválido antes do Prisma', async () => {
    const report = parseExperimentReportRow(baseRowFixture(), 50);
    const input = buildMetricSnapshotUpsertInput('exp1', new Date('invalid'), report);
    const mockPrisma = { googleAdsExperimentMetricSnapshot: { upsert: vi.fn() } };
    await expect(upsertMetricSnapshot(mockPrisma as any, input)).rejects.toThrow(/snapshotDate inválido/);
    expect(mockPrisma.googleAdsExperimentMetricSnapshot.upsert).not.toHaveBeenCalled();
  });

  it('18b. normaliza UTC sem converter anos entre 0 e 99 para 1900+', async () => {
    const report = parseExperimentReportRow(baseRowFixture(), 50);
    const year99 = new Date(0);
    year99.setUTCFullYear(99, 6, 29);
    year99.setUTCHours(15, 30, 0, 0);
    const mockPrisma = { googleAdsExperimentMetricSnapshot: { upsert: vi.fn().mockResolvedValue({}) } };
    await upsertMetricSnapshot(mockPrisma as any, buildMetricSnapshotUpsertInput('exp1', year99, report));
    const stored = mockPrisma.googleAdsExperimentMetricSnapshot.upsert.mock.calls[0][0].create.snapshotDate;
    expect(stored.getUTCFullYear()).toBe(99);
    expect(stored.toISOString()).toBe('0099-07-29T00:00:00.000Z');
  });

  it('18c. relatório com métrica inválida não produz input de snapshot', () => {
    const row = baseRowFixture() as any;
    row.metrics.clicks = 'corrompido';
    const report = parseExperimentReportRow(row, 50);
    expect(() => buildMetricSnapshotUpsertInput('exp1', new Date(), report))
      .toThrow(/métricas cumulativas inválidas/);
  });
});

describe('sanitizeSourcePayload', () => {
  it('19. sanitiza corretamente e remove segredos e chaves não autorizadas (P1)', () => {
    const payload = {
      experiment: { resourceName: 'res', experimentId: 'exp', status: 'ENABLED', secret: 'abc' },
      metrics: { clicks: 10, developerToken: 'secret1', refreshToken: 'secret2', email: 'a@b.com' },
      cookie: 'session=1',
      authorization: 'Bearer token'
    };
    const sanitized = sanitizeSourcePayload(payload);
    expect(sanitized).toEqual({
      experiment: { resourceName: 'res', experimentId: 'exp', status: 'ENABLED' },
      metrics: { clicks: 10 }
    });
  });

  it('20. limita tamanho do payload e lida com tipos inesperados', () => {
    expect(sanitizeSourcePayload(null)).toEqual({});
    expect(sanitizeSourcePayload(true)).toEqual({});

    // huge payload array (which are bypassed or kept empty)
    const arr = { metrics: [1, 2, 3] };
    expect(sanitizeSourcePayload(arr)).toEqual({});
  });

  it('21. sanitiza strings longas de métricas limitando e removendo strings gigantes (P1)', () => {
    const huge = { metrics: { clicks: 10, impressions: 'a'.repeat(6000) } };
    const sanitized = sanitizeSourcePayload(huge);
    // As it was limited before copy, it doesn't trigger "Payload exceeds limit", it just drops the field 'impressions'
    expect(sanitized).toEqual({ metrics: { clicks: 10 } });

    // huge identity field
    const hugeExp = { experiment: { resourceName: 'b'.repeat(300), experimentId: 'c' } };
    expect(sanitizeSourcePayload(hugeExp)).toEqual({
      experiment: { resourceName: undefined, experimentId: 'c', status: undefined }
    });
  });

  it('22. remove números não finitos do payload diagnóstico', () => {
    expect(sanitizeSourcePayload({ metrics: { clicks: Infinity, impressions: NaN, conversions: 3 } }))
      .toEqual({ metrics: { conversions: 3 } });
  });
});

function baseRowFixture() {
  return {
    experiment: { resourceName: EXPERIMENT, experimentId: '999', status: 'ENABLED' },
    metrics: {
      impressions: 1000,
      controlImpressions: 1000,
      clicks: 60,
      controlClicks: 50,
      conversions: 7,
      controlConversions: 5,
      conversionsValue: 700,
      controlConversionValue: 500,
      costMicros: 27_000_000,
      controlCostMicros: 25_000_000,
      conversionsAbsoluteChangePValue: 0.04,
      conversionsAbsoluteChangePointEstimate: 2,
      conversionsAbsoluteChangeMarginOfError: 1, // Add margin to avoid crossing zero and get true
    },
  };
}
