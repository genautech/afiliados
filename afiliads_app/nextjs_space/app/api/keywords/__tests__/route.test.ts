import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { POST } from '../route';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    $transaction: vi.fn(),
    campaign: { findMany: vi.fn() },
    keyword: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));
vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));

function request(body: unknown) {
  return new NextRequest('http://localhost/api/keywords', { method: 'POST', body: JSON.stringify(body) });
}

describe('POST /api/keywords', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-1' } } as never);
    mockPrisma.$transaction.mockImplementation(async (callback: (tx: typeof mockPrisma) => unknown) => callback(mockPrisma));
  });

  it('rejeita batch ligado a campanha de outro usuário antes do primeiro write', async () => {
    mockPrisma.campaign.findMany.mockResolvedValueOnce([]);

    const response = await POST(request({ keywords: [
      { campaignId: 'campaign-2', keyword: 'one' },
      { campaignId: 'campaign-2', keyword: 'two' },
    ] }));

    expect(response.status).toBe(404);
    expect(mockPrisma.campaign.findMany).toHaveBeenCalledWith({
      where: { id: { in: ['campaign-2'] }, userId: 'user-1' },
      select: { id: true },
    });
    expect(mockPrisma.keyword.create).not.toHaveBeenCalled();
  });

  it('deduplica identidade normalizada e persiste o batch em transação serializable', async () => {
    mockPrisma.campaign.findMany.mockResolvedValueOnce([{ id: 'campaign-1' }]);
    mockPrisma.keyword.findMany.mockResolvedValueOnce([]);
    mockPrisma.keyword.create.mockResolvedValueOnce({ id: 'kw-1', keyword: 'buy now' });

    const response = await POST(request({ keywords: [
      { campaignId: 'campaign-1', keyword: '  Buy   Now ', matchType: 'PHRASE', isSelected: true },
      { campaignId: 'campaign-1', keyword: 'buy now', matchType: 'phrase', isSelected: true },
    ] }));

    expect(response.status).toBe(201);
    expect(mockPrisma.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: 'Serializable' });
    expect(mockPrisma.keyword.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.keyword.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ keyword: 'buy now', matchType: 'phrase' }),
    }));
  });

  it('retry do mesmo batch atualiza o registro existente sem duplicar nem zerar métricas', async () => {
    mockPrisma.campaign.findMany.mockResolvedValueOnce([{ id: 'campaign-1' }]);
    mockPrisma.keyword.findMany.mockResolvedValueOnce([{
      id: 'kw-existing', campaignId: 'campaign-1', keyword: 'buy now', matchType: 'phrase',
      clicks: 7, conversions: 2,
    }]);
    mockPrisma.keyword.update.mockResolvedValueOnce({ id: 'kw-existing', keyword: 'buy now' });

    const response = await POST(request({ keywords: [
      { campaignId: 'campaign-1', keyword: 'BUY NOW', matchType: 'PHRASE', relevanceScore: 5, isSelected: true },
    ] }));

    expect(response.status).toBe(201);
    expect(mockPrisma.keyword.create).not.toHaveBeenCalled();
    expect(mockPrisma.keyword.update).toHaveBeenCalledWith({
      where: { id: 'kw-existing' },
      data: expect.not.objectContaining({ clicks: expect.anything(), conversions: expect.anything() }),
    });
  });

  it('falha fechado diante de duplicatas legadas sem apagar métricas', async () => {
    mockPrisma.campaign.findMany.mockResolvedValueOnce([{ id: 'campaign-1' }]);
    mockPrisma.keyword.findMany.mockResolvedValueOnce([
      { id: 'kw-a', campaignId: 'campaign-1', keyword: 'buy now', matchType: 'phrase', clicks: 7, conversions: 2 },
      { id: 'kw-b', campaignId: 'campaign-1', keyword: 'BUY NOW', matchType: 'PHRASE', clicks: 11, conversions: 3 },
    ]);
    const response = await POST(request({ keywords: [
      { campaignId: 'campaign-1', keyword: 'buy now', matchType: 'phrase', isSelected: true },
    ] }));
    expect(response.status).toBe(409);
    expect(mockPrisma.keyword.update).not.toHaveBeenCalled();
    expect(mockPrisma.keyword.deleteMany).not.toHaveBeenCalled();
  });
});
