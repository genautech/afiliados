import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchMaxWebOffers } from '../maxwebService';
import { prisma } from '../prisma';

vi.mock('../prisma', () => ({
  prisma: {
    integration: {
      findMany: vi.fn(),
    },
  },
}));

describe('MaxWeb Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return mock offers in mock mode ordered by epc descending', async () => {
    const offers = await searchMaxWebOffers(undefined, { isMockMode: true });
    expect(offers.length).toBeGreaterThan(0);
    for (let i = 0; i < offers.length - 1; i++) {
      expect(offers[i].epc).toBeGreaterThanOrEqual(offers[i + 1].epc);
    }
  });

  it('should filter by niche in mock mode', async () => {
    const offers = await searchMaxWebOffers('Self-Help', { isMockMode: true });
    expect(offers.length).toBe(1);
    expect(offers[0].id).toBe('mw-wealth-dna');
  });

  it('should fallback to mock mode if meta rows are not found', async () => {
    vi.mocked(prisma.integration.findMany).mockResolvedValue([]);
    const offers = await searchMaxWebOffers(undefined, { userId: 'user1' });
    expect(offers.length).toBeGreaterThan(0);
  });
});
