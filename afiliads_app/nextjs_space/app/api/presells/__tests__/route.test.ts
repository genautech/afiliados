import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { POST } from '../route';
import { generatePresell } from '@/lib/presell';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    user: { findUnique: vi.fn() },
    campaign: { findFirst: vi.fn() },
    productResearch: { findFirst: vi.fn() },
    presell: { update: vi.fn() },
  },
}));
vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/presell', () => ({ generatePresell: vi.fn() }));
vi.mock('@/lib/agentSequence', () => ({ runAgentSequence: vi.fn() }));

function request(body: unknown) {
  return new NextRequest('http://localhost/api/presells', { method: 'POST', body: JSON.stringify(body) });
}

describe('POST /api/presells', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-1' } } as never);
  });

  it('rejeita campaignId de outro usuário antes de gerar conteúdo', async () => {
    mockPrisma.campaign.findFirst.mockResolvedValueOnce(null);

    const response = await POST(request({
      productName: 'Produto', hopLink: 'https://example.com', campaignId: 'campaign-2',
    }));

    expect(response.status).toBe(404);
    expect(mockPrisma.campaign.findFirst).toHaveBeenCalledWith({
      where: { id: 'campaign-2', userId: 'user-1' }, select: { id: true },
    });
    expect(generatePresell).not.toHaveBeenCalled();
  });
});
