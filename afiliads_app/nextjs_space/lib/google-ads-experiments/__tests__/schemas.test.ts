import { describe, expect, it } from 'vitest';
import {
  ApplyPresellVariationInputSchema,
  CreateExperimentArmsInputSchema,
  CreateExperimentDraftInputSchema,
  ExperimentActionInputSchema,
  ExperimentActionRoutePayloadSchema,
  ExperimentReportSchema,
  ExperimentSyncResultSchema,
  ScheduleExperimentInputSchema,
  ScheduleExperimentRoutePayloadSchema,
  assertStartDateIsFuture,
  experimentUrlSchema,
  trafficSplitSchema,
} from '@/lib/google-ads-experiments/schemas';

const lifecycleAuthorization = (operation: string) => ({
  confirmed: true,
  operation,
  resourceId: 'exp_1',
  revision: '2030-01-15T00:00:00.000Z',
  idempotencyKey: 'lifecycle-key-123',
});

describe('trafficSplitSchema', () => {
  it('1. aceita inteiros de 1 a 99', () => {
    expect(trafficSplitSchema.safeParse(1).success).toBe(true);
    expect(trafficSplitSchema.safeParse(50).success).toBe(true);
    expect(trafficSplitSchema.safeParse(99).success).toBe(true);
  });

  it('2. rejeita 0 e 100 — nunca um braço com 0% ou 100% de tráfego', () => {
    expect(trafficSplitSchema.safeParse(0).success).toBe(false);
    expect(trafficSplitSchema.safeParse(100).success).toBe(false);
  });

  it('3. rejeita não-inteiro', () => {
    expect(trafficSplitSchema.safeParse(50.5).success).toBe(false);
  });
});

describe('experimentUrlSchema', () => {
  it('4. aceita HTTPS público', () => {
    expect(experimentUrlSchema.safeParse('https://example.com/presell').success).toBe(true);
  });

  it('5. rejeita HTTP (não-HTTPS)', () => {
    expect(experimentUrlSchema.safeParse('http://example.com/presell').success).toBe(false);
  });

  it('6. rejeita localhost/IP privado', () => {
    expect(experimentUrlSchema.safeParse('https://localhost:3000/presell').success).toBe(false);
    expect(experimentUrlSchema.safeParse('https://192.168.0.10/presell').success).toBe(false);
    expect(experimentUrlSchema.safeParse('https://127.0.0.1/presell').success).toBe(false);
    expect(experimentUrlSchema.safeParse('https://10.0.0.5/presell').success).toBe(false);
  });

  it('7. rejeita string que não é URL', () => {
    expect(experimentUrlSchema.safeParse('não é uma url').success).toBe(false);
  });
});

function validDraft(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    campaignId: 'campaign_1',
    googleCampaignId: '1234567890',
    hypothesis: 'Trocar a URL da presell aumenta CVR',
    startDate: '2030-01-10',
    endDate: '2030-01-20',
    lossCap: 200,
    ...overrides,
  };
}

describe('CreateExperimentDraftInputSchema', () => {
  it('8. aceita um draft válido e aplica variationType default PRESELL_URL', () => {
    const result = CreateExperimentDraftInputSchema.safeParse(validDraft());
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.variationType).toBe('PRESELL_URL');
  });

  it('9. rejeita endDate <= startDate', () => {
    expect(
      CreateExperimentDraftInputSchema.safeParse(
        validDraft({ startDate: '2030-01-20', endDate: '2030-01-10' })
      ).success
    ).toBe(false);
    expect(
      CreateExperimentDraftInputSchema.safeParse(
        validDraft({ startDate: '2030-01-10', endDate: '2030-01-10' })
      ).success
    ).toBe(false);
  });

  it('10. rejeita googleCampaignId não numérico', () => {
    expect(
      CreateExperimentDraftInputSchema.safeParse(validDraft({ googleCampaignId: 'abc123' }))
        .success
    ).toBe(false);
  });

  it('11. rejeita lossCap zero ou negativo', () => {
    expect(CreateExperimentDraftInputSchema.safeParse(validDraft({ lossCap: 0 })).success).toBe(
      false
    );
    expect(CreateExperimentDraftInputSchema.safeParse(validDraft({ lossCap: -10 })).success).toBe(
      false
    );
  });
});

describe('CreateExperimentArmsInputSchema', () => {
  function validArms(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      experimentId: 'exp_1',
      control: { googleCampaignId: '111', finalUrl: 'https://example.com/control' },
      treatment: { presellId: 'presell_2', finalUrl: 'https://example.com/treatment' },
      ...overrides,
    };
  }

  it('12. trafficSplitControl é derivado (100 - treatment), nunca informado direto', () => {
    const result = CreateExperimentArmsInputSchema.safeParse(
      validArms({ trafficSplitTreatment: 30 })
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.trafficSplitTreatment).toBe(30);
      expect(result.data.trafficSplitControl).toBe(70);
      expect(result.data.trafficSplitControl + result.data.trafficSplitTreatment).toBe(100);
    }
  });

  it('13. default é 50/50 quando trafficSplitTreatment não é informado', () => {
    const result = CreateExperimentArmsInputSchema.safeParse(validArms());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.trafficSplitTreatment).toBe(50);
      expect(result.data.trafficSplitControl).toBe(50);
    }
  });

  it('14. rejeita finalUrl de controle ou tratamento que não seja HTTPS público', () => {
    expect(
      CreateExperimentArmsInputSchema.safeParse(
        validArms({ treatment: { presellId: 'p', finalUrl: 'http://example.com/t' } })
      ).success
    ).toBe(false);
  });
});

describe('ApplyPresellVariationInputSchema', () => {
  it('15. aceita payload válido', () => {
    expect(
      ApplyPresellVariationInputSchema.safeParse({
        experimentId: 'exp_1',
        armId: 'arm_1',
        presellId: 'presell_1',
        finalUrl: 'https://example.com/nova-presell',
      }).success
    ).toBe(true);
  });
});

describe('ScheduleExperimentInputSchema', () => {
  it('16. rejeita agendamento quando treatmentModified=false, mesmo com confirmRealMutation=true', () => {
    expect(
      ScheduleExperimentInputSchema.safeParse({
        experimentId: 'exp_1',
        treatmentModified: false,
        confirmRealMutation: true,
      }).success
    ).toBe(false);
  });

  it('17. aceita quando treatmentModified=true — confirmRealMutation é decisão separada do chamador', () => {
    expect(
      ScheduleExperimentInputSchema.safeParse({
        experimentId: 'exp_1',
        treatmentModified: true,
        confirmRealMutation: false,
      }).success
    ).toBe(true);
  });
});

describe('ExperimentActionInputSchema', () => {
  it('18. aceita só END | PROMOTE | GRADUATE', () => {
    for (const action of ['END', 'PROMOTE', 'GRADUATE']) {
      expect(
        ExperimentActionInputSchema.safeParse({
          experimentId: 'exp_1',
          action,
          confirmRealMutation: true,
        }).success
      ).toBe(true);
    }
  });

  it('19. rejeita ação desconhecida', () => {
    expect(
      ExperimentActionInputSchema.safeParse({
        experimentId: 'exp_1',
        action: 'DELETE',
        confirmRealMutation: true,
      }).success
    ).toBe(false);
  });
});

describe('payloads HTTP de lifecycle (Tarefa 10C)', () => {
  it('22. schedule aceita somente autorização vinculada a SCHEDULE_EXPERIMENT', () => {
    expect(ScheduleExperimentRoutePayloadSchema.safeParse({
      authorization: lifecycleAuthorization('SCHEDULE_EXPERIMENT'),
    }).success).toBe(true);
    expect(ScheduleExperimentRoutePayloadSchema.safeParse({
      authorization: lifecycleAuthorization('END_EXPERIMENT'),
    }).success).toBe(false);
  });

  it('23. schedule rejeita campos client-side que fingem prova de variação ou identidade', () => {
    for (const extra of [
      { experimentId: 'exp_1' },
      { treatmentModified: true },
      { confirmRealMutation: true },
    ]) {
      expect(ScheduleExperimentRoutePayloadSchema.safeParse({
        authorization: lifecycleAuthorization('SCHEDULE_EXPERIMENT'),
        ...extra,
      }).success).toBe(false);
    }
  });

  it('24. actions vincula cada ação à operação autorizada exata', () => {
    const expected = {
      END: 'END_EXPERIMENT',
      PROMOTE: 'PROMOTE_EXPERIMENT',
      GRADUATE: 'GRADUATE_EXPERIMENT',
    } as const;
    for (const [action, operation] of Object.entries(expected)) {
      expect(ExperimentActionRoutePayloadSchema.safeParse({
        action,
        authorization: lifecycleAuthorization(operation),
      }).success).toBe(true);
      expect(ExperimentActionRoutePayloadSchema.safeParse({
        action,
        authorization: lifecycleAuthorization('SCHEDULE_EXPERIMENT'),
      }).success).toBe(false);
    }
  });

  it('25. actions rejeita budget mapping e identidade enviados pelo cliente', () => {
    expect(ExperimentActionRoutePayloadSchema.safeParse({
      action: 'GRADUATE',
      authorization: lifecycleAuthorization('GRADUATE_EXPERIMENT'),
      graduatedCampaignBudgetResourceName: 'customers/1/campaignBudgets/2',
    }).success).toBe(false);
  });
});

describe('ExperimentSyncResultSchema / ExperimentReportSchema', () => {
  it('20. valida um resultado de sync mínimo', () => {
    expect(
      ExperimentSyncResultSchema.safeParse({
        experimentId: 'exp_1',
        status: 'RUNNING',
        remoteStatusRaw: 'ENABLED',
        lastSyncedAt: '2030-01-15T00:00:00Z',
        changed: true,
        warnings: [],
      }).success
    ).toBe(true);
  });

  it('21. valida um relatório completo com estatística ausente (INCONCLUSIVO)', () => {
    const metricPoint = { impressions: 0, clicks: 0, costMicros: 0, conversions: 0, conversionValue: 0 };
    expect(
      ExperimentReportSchema.safeParse({
        experimentId: 'exp_1',
        status: 'RUNNING',
        remoteStatusRaw: 'ENABLED',
        metricsValid: true,
        control: metricPoint,
        treatment: metricPoint,
        statistics: {
          conversions: { pointEstimate: null, marginOfError: null, pValue: null },
        },
        hasSignificantResult: false,
        feasibility: 'UNDERPOWERED',
        summary: 'Amostra insuficiente até agora.',
        campaignId: 'campaign_test_id', // ADICIONADO AQUI
        startDate: '2030-01-01',          // ADICIONADO AQUI
        endDate: '2030-01-05',            // ADICIONADO AQUI
      }).success
    ).toBe(true);
  });

  it('21a. rejeita remoteStatusRaw vazio ou whitespace em report e sync', () => {
    const syncBase = {
      experimentId: 'exp_1', status: 'RUNNING', lastSyncedAt: '2030-01-15T00:00:00Z', changed: false, warnings: [],
    };
    expect(ExperimentSyncResultSchema.safeParse({ ...syncBase, remoteStatusRaw: '' }).success).toBe(false);
    expect(ExperimentSyncResultSchema.safeParse({ ...syncBase, remoteStatusRaw: '   ' }).success).toBe(false);

    const metricPoint = { impressions: 0, clicks: 0, costMicros: 0, conversions: 0, conversionValue: 0 };
    const reportBase = {
      experimentId: 'exp_1', status: 'RUNNING', metricsValid: true, control: metricPoint, treatment: metricPoint,
      statistics: {}, hasSignificantResult: false, feasibility: 'UNDERPOWERED', summary: 'x',
    };
    expect(ExperimentReportSchema.safeParse({ ...reportBase, remoteStatusRaw: '' }).success).toBe(false);
    expect(ExperimentReportSchema.safeParse({ ...reportBase, remoteStatusRaw: '   ' }).success).toBe(false);
  });
});

describe('assertStartDateIsFuture', () => {
  const now = new Date('2030-01-15T12:00:00Z');

  it('22. data futura (relativa a `now` injetado) retorna true', () => {
    expect(assertStartDateIsFuture('2030-01-16', now)).toBe(true);
  });

  it('23. hoje ou no passado retorna false', () => {
    expect(assertStartDateIsFuture('2030-01-15', now)).toBe(false);
    expect(assertStartDateIsFuture('2030-01-14', now)).toBe(false);
  });
});
