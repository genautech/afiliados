import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { POST } from '../route';
import { fetchPageContent } from '@/lib/salesPageAnalyzer';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    productResearch: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/salesPageAnalyzer', () => ({
  fetchPageContent: vi.fn(),
  analyzeDom: vi.fn(() => ({
    hasVideo: false,
    hasQuizForm: false,
    hasLeadGenForm: false,
    isAdvertorialLike: false,
    hasDirectPitch: true,
  })),
  classifySalesPage: vi.fn(() => 'DIRECT'),
}));

function request(body: unknown) {
  return new NextRequest('http://localhost/api/sales-page-analysis', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe('POST /api/sales-page-analysis', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('bloqueia requisição sem autenticação antes do fetch externo', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);

    const response = await POST(request({ url: 'https://example.com' }));

    expect(response.status).toBe(401);
    expect(fetchPageContent).not.toHaveBeenCalled();
    expect(mockPrisma.productResearch.update).not.toHaveBeenCalled();
  });

  it('não analisa nem atualiza produto pertencente a outro usuário', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: { id: 'user-1' } } as never);
    mockPrisma.productResearch.findFirst.mockResolvedValueOnce(null);

    const response = await POST(request({ url: 'https://example.com', productId: 'product-2' }));

    expect(response.status).toBe(404);
    expect(mockPrisma.productResearch.findFirst).toHaveBeenCalledWith({
      where: { id: 'product-2', userId: 'user-1' },
      select: { id: true },
    });
    expect(fetchPageContent).not.toHaveBeenCalled();
    expect(mockPrisma.productResearch.update).not.toHaveBeenCalled();
  });

  it('analisa e persiste resultado para produto do usuário autenticado', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: { id: 'user-1' } } as never);
    mockPrisma.productResearch.findFirst.mockResolvedValueOnce({ id: 'product-1' });
    vi.mocked(fetchPageContent).mockResolvedValueOnce('<html></html>');
    mockPrisma.productResearch.update.mockResolvedValueOnce({ id: 'product-1' });

    const response = await POST(request({ url: 'https://example.com', productId: 'product-1' }));

    expect(response.status).toBe(200);
    expect(mockPrisma.productResearch.update).toHaveBeenCalledWith({
      where: { id: 'product-1' },
      data: { salesPageType: 'DIRECT' },
    });
  });
});
