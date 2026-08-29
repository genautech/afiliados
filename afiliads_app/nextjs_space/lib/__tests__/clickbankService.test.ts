import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchClickBankOffers } from '../clickbankService';
import { prisma } from '../prisma';

vi.mock('../prisma', () => ({
  prisma: {
    integration: {
      findMany: vi.fn(),
    },
  },
}));

describe('ClickBank Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return mock offers in mock mode ordered by gravity', async () => {
    const offers = await searchClickBankOffers(undefined, { isMockMode: true });
    expect(offers.length).toBeGreaterThan(0);
    // Ordered by gravity descending
    for (let i = 0; i < offers.length - 1; i++) {
      expect(offers[i].gravity).toBeGreaterThanOrEqual(offers[i + 1].gravity);
    }
  });

  it('should filter by niche in mock mode', async () => {
    const offers = await searchClickBankOffers('Self-Help', { isMockMode: true });
    expect(offers.length).toBe(1);
    expect(offers[0].id).toBe('neurodrine');
  });

  it('should fallback to mock mode if integration table is empty or has mock config', async () => {
    vi.mocked(prisma.integration.findMany).mockResolvedValue([
      { id: '1', userId: 'user1', serviceName: 'clickbank', fieldName: 'is_mock_mode', fieldValue: 'true', createdAt: new Date(), updatedAt: new Date() }
    ]);
    const offers = await searchClickBankOffers(undefined, { userId: 'user1' });
    expect(offers.length).toBeGreaterThan(0);
  });
});
