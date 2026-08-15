import { describe, expect, it } from 'vitest';
import { getCampaignPresellId } from './wizard-campaign-hydration';

describe('getCampaignPresellId', () => {
  it('restaura o ID da presell canônica retornada ao reabrir a campanha', () => {
    expect(getCampaignPresellId({ presells: [{ id: 'presell-latest' }] })).toBe('presell-latest');
  });

  it('falha seguro quando a campanha ainda não possui presell', () => {
    expect(getCampaignPresellId({ presells: [] })).toBeNull();
    expect(getCampaignPresellId(null)).toBeNull();
  });
});
