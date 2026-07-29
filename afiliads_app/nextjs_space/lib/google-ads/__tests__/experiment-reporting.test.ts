import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildExperimentReportQuery,
  buildMetricSnapshotUpsertInput,
  fetchExperimentReport,
  parseExperimentReportRow,
} from '@/lib/google-ads/experiment-reporting';
import type { GoogleAdsCredentials } from '@/lib/google-ads/client';

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

describe('buildExperimentReportQuery', () => {
  it('1. monta GAQL sobre o recurso `experiment` filtrado pelo resource_name, com métricas de controle e tratamento', () => {
    const query = buildExperimentReportQuery(EXPERIMENT);
    expect(query).toContain('FROM experiment');
    expect(query).toContain(`WHERE experiment.resource_name = '${EXPERIMENT}'`);
    expect(query).toContain('metrics.clicks');
    expect(query).toContain('metrics.control_clicks');
    expect(query).toContain('metrics.conversions_absolute_change_p_value');
  });

  it('2. escapa aspas simples no resource name', () => {
    const query = buildExperimentReportQuery("customers/1/experiments/O'Brien");
    expect(query).toContain("O\\'Brien");
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
    expect(report.status).toBe('RUNNING'); // ENABLED -> RUNNING (mapGoogleExperimentRemoteStatus)
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
    expect(report.summary).toMatch(/não retornou p-value/);
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
});

describe('fetchExperimentReport', () => {
  it('8. modo mock não chama fetch e devolve relatório determinístico VIABLE+significativo', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const report = await fetchExperimentReport('tok', mockCredentials(), EXPERIMENT, { targetClicks: 50 });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(report.experimentId).toBe('999');
    expect(report.feasibility).toBe('VIABLE');
    expect(report.hasSignificantResult).toBe(true);
  });

  it('9. modo real: busca via googleAds:search, para na primeira página com resultado e faz parse da linha', async () => {
    const fetchSpy = vi.fn().mockResolvedValueOnce(
      jsonResponse({
        results: [
          {
            experiment: { resourceName: EXPERIMENT, experimentId: '999', status: 'ENABLED' },
            metrics: { clicks: 60, controlClicks: 50, conversionsAbsoluteChangePValue: 0.04, conversionsAbsoluteChangePointEstimate: 2 },
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

  it('10. sem linhas e sem fallback => relatório inconclusivo explícito, nunca finge SETUP/RUNNING', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse({ results: [] }));
    vi.stubGlobal('fetch', fetchSpy);
    const report = await fetchExperimentReport('tok', realCredentials(), EXPERIMENT, { targetClicks: 50 });
    expect(report.status).toBe('ERROR');
    expect(report.feasibility).toBe('UNDERPOWERED');
    expect(report.hasSignificantResult).toBe(false);
    expect(report.summary).toMatch(/não retornou linhas/);
  });

  it('11. sem linhas mas com fallback de campanhas => métricas cruas por campanha, sem uplift/p-value inventado', async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ results: [] })) // experiment search
      .mockResolvedValueOnce(jsonResponse({ results: [{ metrics: { clicks: 40, conversions: 3 } }] })) // control campaign
      .mockResolvedValueOnce(jsonResponse({ results: [{ metrics: { clicks: 45, conversions: 5 } }] })); // treatment campaign
    vi.stubGlobal('fetch', fetchSpy);

    const report = await fetchExperimentReport('tok', realCredentials(), EXPERIMENT, {
      targetClicks: 50,
      fallbackCampaigns: {
        controlCampaignResourceName: 'customers/1234567890/campaigns/1',
        treatmentCampaignResourceName: 'customers/1234567890/campaigns/2',
      },
    });

    expect(fetchSpy).toHaveBeenCalledTimes(3);
    expect(report.control.clicks).toBe(40);
    expect(report.treatment.clicks).toBe(45);
    expect(report.statistics.conversions).toEqual({ pointEstimate: null, marginOfError: null, pValue: null });
    expect(report.hasSignificantResult).toBe(false);
    expect(report.summary).toMatch(/Fallback de diagnóstico/);
  });
});

describe('buildMetricSnapshotUpsertInput', () => {
  it('12. mapeia ExperimentReport pro shape de GoogleAdsExperimentMetricSnapshot (mapper puro, sem Prisma)', () => {
    const report = parseExperimentReportRow(baseRowFixture(), 50);
    const snapshotDate = new Date('2026-07-29T00:00:00.000Z');
    const input = buildMetricSnapshotUpsertInput('local-experiment-id', snapshotDate, report, { raw: true });

    expect(input.experimentId).toBe('local-experiment-id');
    expect(input.snapshotDate).toBe(snapshotDate);
    expect(input.controlClicks).toBe(report.control.clicks);
    expect(input.treatmentClicks).toBe(report.treatment.clicks);
    expect(input.controlConversions).toBe(report.control.conversions);
    expect(input.treatmentConversions).toBe(report.treatment.conversions);
    expect(input.statistics).toBe(report.statistics);
    expect(input.sourcePayload).toEqual({ raw: true });
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
    },
  };
}
