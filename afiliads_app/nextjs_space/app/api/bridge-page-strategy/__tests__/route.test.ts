import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { POST } from '../route';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    productResearch: { findFirst: vi.fn() },
    campaign: { findFirst: vi.fn() },
    bridgePageStrategyRecommendation: { create: vi.fn() },
  },
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/bridgePageRecommender', () => ({
  recommendBridgePage: vi.fn(() => ({
    recommendedType: 'ADVERTORIAL',
    reasoning: 'reason',
    confidenceScore: 0.9,
  })),
  BridgePageType: {},
}));

function request(body: unknown) {
  return new NextRequest('http://localhost/api/bridge-page-strategy', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe('POST /api/bridge-page-strategy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('não cria recomendação para produto de outro usuário', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: { id: 'user-1' } } as never);
    mockPrisma.productResearch.findFirst.mockResolvedValueOnce(null);

    const response = await POST(request({ productId: 'product-2', salesPageType: 'DIRECT' }));

    expect(response.status).toBe(404);
    expect(mockPrisma.productResearch.findFirst).toHaveBeenCalledWith({
      where: { id: 'product-2', userId: 'user-1' },
    });
    expect(mockPrisma.bridgePageStrategyRecommendation.create).not.toHaveBeenCalled();
  });

  it('não aceita campaignId de outro usuário silenciosamente', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: { id: 'user-1' } } as never);
    mockPrisma.productResearch.findFirst.mockResolvedValueOnce({ id: 'product-1', userId: 'user-1' });
    mockPrisma.campaign.findFirst.mockResolvedValueOnce(null);

    const response = await POST(request({
      productId: 'product-1',
      campaignId: 'campaign-2',
      salesPageType: 'DIRECT',
    }));

    expect(response.status).toBe(404);
    expect(mockPrisma.bridgePageStrategyRecommendation.create).not.toHaveBeenCalled();
  });
});
