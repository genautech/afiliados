import type { MutationAuthorization } from '@/lib/google-ads/route-mutation-authorization';

function authorization(
  operation: MutationAuthorization['operation'],
  resourceId: string,
  revision: string,
  idempotencyKey: string,
): MutationAuthorization {
  return { confirmed: true, operation, resourceId, revision, idempotencyKey };
}

export function buildExperimentSetupPayload(input: {
  campaignId: string;
  presellId: string;
  treatmentFinalUrl: string;
  trafficSplitTreatment: number;
  name?: string;
  revision: string;
  idempotencyKey: string;
}) {
  return {
    campaignId: input.campaignId,
    presellId: input.presellId,
    treatmentFinalUrl: input.treatmentFinalUrl,
    trafficSplitTreatment: input.trafficSplitTreatment,
    ...(input.name ? { name: input.name } : {}),
    authorization: authorization('SETUP_EXPERIMENT', input.campaignId, input.revision, input.idempotencyKey),
  };
}

export function buildExperimentSchedulePayload(input: {
  experimentId: string;
  revision: string;
  idempotencyKey: string;
}) {
  return {
    authorization: authorization('SCHEDULE_EXPERIMENT', input.experimentId, input.revision, input.idempotencyKey),
  };
}

export function buildExperimentActionPayload(input: {
  experimentId: string;
  action: 'END' | 'PROMOTE' | 'GRADUATE';
  revision: string;
  idempotencyKey: string;
  reason?: string;
}) {
  return {
    action: input.action,
    ...(input.reason ? { reason: input.reason } : {}),
    authorization: authorization(`${input.action}_EXPERIMENT`, input.experimentId, input.revision, input.idempotencyKey),
  };
}
