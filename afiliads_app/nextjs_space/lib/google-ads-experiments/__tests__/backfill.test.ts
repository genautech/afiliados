import { describe, expect, it } from 'vitest';
import {
  buildBackfillIdempotencyKey,
  clampTrafficSplit,
  mapLegacyCampaignToExperimentDraft,
  normalizeLegacyStatus,
  normalizeLegacyVariationType,
  shouldSkipBackfill,
  type LegacyExperimentCampaign,
} from '@/lib/google-ads-experiments/backfill';

function campaign(overrides: Partial<LegacyExperimentCampaign> = {}): LegacyExperimentCampaign {
  return {
    id: 'campaign_1',
    userId: 'user_1',
    isExperiment: true,
    experimentId: null,
    experimentStatus: null,
    experimentTrafficSplit: 50,
    baseCampaignId: 'gc_control_123',
    googleTrialCampaignId: null,
    experimentVariationType: null,
    experimentVariationValue: 'https://example.com/presell-b',
    presellUrl: 'https://example.com/presell-a',
    googleCampaignId: 'gc_fallback_999',
    ...overrides,
  };
}

describe('mapLegacyCampaignToExperimentDraft', () => {
  it('1. retorna null quando isExperiment=false — não migra campanha comum', () => {
    const draft = mapLegacyCampaignToExperimentDraft(campaign({ isExperiment: false }));
    expect(draft).toBeNull();
  });

  it('2. gera idempotencyKey estável e determinística por campanha', () => {
    const draft = mapLegacyCampaignToExperimentDraft(campaign());
    expect(draft?.idempotencyKey).toBe(buildBackfillIdempotencyKey('campaign_1'));
    expect(draft?.idempotencyKey).toBe('legacy-backfill-campaign_1');
  });

  it('3. normaliza variationType legado "PRESELL" para o canônico "PRESELL_URL"', () => {
    const draft = mapLegacyCampaignToExperimentDraft(
      campaign({ experimentVariationType: 'PRESELL' })
    );
    expect(draft?.data.variationType).toBe('PRESELL_URL');
  });

  it('4. mantém variationType desconhecido (uppercased) sem inventar um valor', () => {
    const draft = mapLegacyCampaignToExperimentDraft(
      campaign({ experimentVariationType: 'ads_copy' })
    );
    expect(draft?.data.variationType).toBe('ADS_COPY');
  });

  it('5. cria exatamente 2 arms com split somando 100 (control + treatment)', () => {
    const draft = mapLegacyCampaignToExperimentDraft(
      campaign({ experimentTrafficSplit: 30 })
    );
    expect(draft?.arms).toHaveLength(2);
    const [control, treatment] = draft!.arms;
    expect(control.isControl).toBe(true);
    expect(treatment.isControl).toBe(false);
    expect(control.trafficSplit + treatment.trafficSplit).toBe(100);
    expect(treatment.trafficSplit).toBe(30);
  });

  it('6. control usa baseCampaignId; cai para googleCampaignId só se baseCampaignId for nulo', () => {
    const withBase = mapLegacyCampaignToExperimentDraft(campaign());
    expect(withBase?.arms[0].googleCampaignId).toBe('gc_control_123');

    const withoutBase = mapLegacyCampaignToExperimentDraft(
      campaign({ baseCampaignId: null })
    );
    expect(withoutBase?.arms[0].googleCampaignId).toBe('gc_fallback_999');
  });

  it('7. control usa presellUrl e treatment usa experimentVariationValue como finalUrl', () => {
    const draft = mapLegacyCampaignToExperimentDraft(campaign());
    expect(draft?.arms[0].finalUrl).toBe('https://example.com/presell-a');
    expect(draft?.arms[1].finalUrl).toBe('https://example.com/presell-b');
  });

  it('8. status desconhecido/ausente cai em SETUP (fail-safe), status conhecido é preservado', () => {
    expect(mapLegacyCampaignToExperimentDraft(campaign())?.data.status).toBe('SETUP');
    expect(
      mapLegacyCampaignToExperimentDraft(campaign({ experimentStatus: 'running' }))?.data.status
    ).toBe('RUNNING');
    expect(
      mapLegacyCampaignToExperimentDraft(campaign({ experimentStatus: 'algo_invalido' }))?.data
        .status
    ).toBe('SETUP');
  });

  it('9. preserva variationValue bruto em variationConfig para auditoria', () => {
    const draft = mapLegacyCampaignToExperimentDraft(campaign());
    expect(draft?.data.variationConfig).toMatchObject({
      source: 'legacy-campaign-fields',
      rawVariationValue: 'https://example.com/presell-b',
    });
  });
});

describe('clampTrafficSplit', () => {
  it('10. mantém valores dentro de 1-99 inalterados', () => {
    expect(clampTrafficSplit(50)).toBe(50);
  });

  it('11. faz clamp de valores fora do range (evita split 0 ou 100)', () => {
    expect(clampTrafficSplit(0)).toBe(1);
    expect(clampTrafficSplit(150)).toBe(99);
    expect(clampTrafficSplit(-10)).toBe(1);
  });

  it('12. cai em 50 (fail-safe) para valores não finitos', () => {
    expect(clampTrafficSplit(NaN)).toBe(50);
    expect(clampTrafficSplit(Infinity)).toBe(50);
  });
});

describe('normalizeLegacyStatus / normalizeLegacyVariationType', () => {
  it('13. normalizeLegacyStatus(null) => SETUP', () => {
    expect(normalizeLegacyStatus(null)).toBe('SETUP');
  });

  it('14. normalizeLegacyVariationType(null) => PRESELL_URL', () => {
    expect(normalizeLegacyVariationType(null)).toBe('PRESELL_URL');
  });
});

describe('shouldSkipBackfill', () => {
  it('15. pula quando idempotencyKey já existe — garante idempotência do backfill', () => {
    const existing = new Set(['legacy-backfill-campaign_1']);
    expect(shouldSkipBackfill('legacy-backfill-campaign_1', existing)).toBe(true);
    expect(shouldSkipBackfill('legacy-backfill-campaign_2', existing)).toBe(false);
  });

  it('16. rodar o backfill duas vezes sobre o mesmo conjunto não gera segunda migração', () => {
    const c = campaign();
    const draft = mapLegacyCampaignToExperimentDraft(c)!;
    const existingKeysAfterFirstRun = new Set([draft.idempotencyKey]);

    const secondRunDraft = mapLegacyCampaignToExperimentDraft(c)!;
    expect(shouldSkipBackfill(secondRunDraft.idempotencyKey, existingKeysAfterFirstRun)).toBe(
      true
    );
  });
});
