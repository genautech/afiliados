import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { POST } from '../route';
import { fetchPageContent } from '@/lib/salesPageAnalyzer';
import { callLLM } from '@/lib/llm';

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
vi.mock('@/lib/llm', () => ({ callLLM: vi.fn() }));
vi.mock('@/lib/salesPageAnalyzer', () => ({ fetchPageContent: vi.fn() }));

function request(body: unknown) {
  return new NextRequest('http://localhost/api/products/product-1/analyze', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe('POST /api/products/[id]/analyze', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-1' } } as never);
    mockPrisma.productResearch.findFirst.mockResolvedValue({
      id: 'product-1',
      userId: 'user-1',
      name: 'Produto',
      network: 'ClickBank',
      affiliatePageUrl: null,
      status: 'novo',
    });
  });

  it('usa o fetch seguro e não chama LLM quando a URL é bloqueada', async () => {
    vi.mocked(fetchPageContent).mockResolvedValueOnce(null);
    const rawFetch = vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('não deveria chamar'));

    const response = await POST(
      request({ affiliatePageUrl: 'https://127.0.0.1/internal' }),
      { params: { id: 'product-1' } },
    );

    expect(response.status).toBe(422);
    expect(fetchPageContent).toHaveBeenCalledWith('https://127.0.0.1/internal');
    expect(rawFetch).not.toHaveBeenCalled();
    expect(callLLM).not.toHaveBeenCalled();
    expect(mockPrisma.productResearch.update).not.toHaveBeenCalled();
  });
});
