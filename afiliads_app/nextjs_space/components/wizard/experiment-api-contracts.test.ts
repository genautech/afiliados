import { describe, expect, it } from 'vitest';
import {
  ExperimentActionRoutePayloadSchema,
  ScheduleExperimentRoutePayloadSchema,
  SetupExperimentPayloadSchema,
} from '@/lib/google-ads-experiments/schemas';
import {
  buildExperimentActionPayload,
  buildExperimentSchedulePayload,
  buildExperimentSetupPayload,
} from './experiment-api-contracts';

const KEY = 'idem_1234567890';

describe('Wizard experiment API contracts', () => {
  it('setup produzido pela UI satisfaz schema real', () => {
    const payload = buildExperimentSetupPayload({
      campaignId: 'c1', presellId: 'p1', treatmentFinalUrl: 'https://example.com/b',
      trafficSplitTreatment: 50, revision: '123', idempotencyKey: KEY,
    });
    expect(SetupExperimentPayloadSchema.safeParse(payload).success).toBe(true);
  });

  it('schedule produzido pela UI satisfaz schema real', () => {
    const payload = buildExperimentSchedulePayload({ experimentId: 'e1', revision: 'rev:hash', idempotencyKey: KEY });
    expect(ScheduleExperimentRoutePayloadSchema.safeParse(payload).success).toBe(true);
  });

  it.each(['END', 'PROMOTE', 'GRADUATE'] as const)('%s produzido pela UI satisfaz schema real', (action) => {
    const payload = buildExperimentActionPayload({ experimentId: 'e1', action, revision: 'rev', idempotencyKey: KEY });
    expect(ExperimentActionRoutePayloadSchema.safeParse(payload).success).toBe(true);
  });
});
