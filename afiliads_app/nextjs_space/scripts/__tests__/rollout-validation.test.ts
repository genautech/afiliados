import { describe, expect, it, vi } from 'vitest';
import {
  mapLegacyCampaignToExperimentDraft,
  shouldSkipBackfill,
} from '../../lib/google-ads-experiments/backfill';

describe('Rollout & Migration Safety (Tarefa 16)', () => {
  it('garante que a função de mapeamento de backfill preserve a idempotência sem sobrescrever experimentos existentes', () => {
    const legacyCampaign = {
      id: 'camp_legacy_1',
      userId: 'user_1',
      isExperiment: true,
      experimentId: 'exp_gads_123',
      experimentStatus: 'RUNNING',
      experimentTrafficSplit: 50,
      experimentVariationType: 'PRESELL',
      experimentVariationValue: 'https://example.com/v2',
      presellUrl: 'https://example.com/v1',
      googleCampaignId: '12345678',
    };

    const draft = mapLegacyCampaignToExperimentDraft(legacyCampaign as any);
    expect(draft).not.toBeNull();
    expect(draft?.idempotencyKey).toBe('legacy-backfill-camp_legacy_1');
    expect(draft?.data.variationType).toBe('PRESELL_URL'); // Normalização canônica

    const existingKeys = new Set(['legacy-backfill-camp_legacy_1']);
    expect(shouldSkipBackfill(draft!.idempotencyKey, existingKeys)).toBe(true);
  });
});
