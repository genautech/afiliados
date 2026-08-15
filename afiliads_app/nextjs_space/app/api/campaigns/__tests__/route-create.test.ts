import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { POST } from '../route';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    productResearch: { findFirst: vi.fn() },
    campaign: { create: vi.fn() },
  },
}));
vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));

function request(body: unknown) {
  return new NextRequest('http://localhost/api/campaigns', { method: 'POST', body: JSON.stringify(body) });
}

describe('POST /api/campaigns', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-1' } } as never);
  });

  it('rejeita ProductResearch de outro usuário antes de criar campanha', async () => {
    mockPrisma.productResearch.findFirst.mockResolvedValueOnce(null);

    const response = await POST(request({ name: 'Campaign', productResearchId: 'product-2' }));

    expect(response.status).toBe(404);
    expect(mockPrisma.productResearch.findFirst).toHaveBeenCalledWith({
      where: { id: 'product-2', userId: 'user-1' },
      select: { id: true },
    });
    expect(mockPrisma.campaign.create).not.toHaveBeenCalled();
  });
});
