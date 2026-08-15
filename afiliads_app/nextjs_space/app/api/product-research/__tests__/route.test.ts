import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { POST } from '../route';
import { callAgent } from '@/lib/llm';
import { fetchPageContent } from '@/lib/salesPageAnalyzer';
import { getChecklistLearningReferencia } from '@/lib/complianceVerifier';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    user: { findUnique: vi.fn() },
    productResearch: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/llm', () => ({ callAgent: vi.fn() }));
vi.mock('@/lib/salesPageAnalyzer', () => ({ fetchPageContent: vi.fn() }));
vi.mock('@/lib/complianceVerifier', () => ({
  getChecklistLearningReferencia: vi.fn().mockResolvedValue(''),
}));

function request() {
  return new NextRequest('http://localhost/api/product-research', {
    method: 'POST',
    body: JSON.stringify({ productName: 'Produto', network: 'clickbank' }),
  });
}

describe('POST /api/product-research', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-1' } } as never);
    mockPrisma.productResearch.findUnique.mockResolvedValue(null);
    mockPrisma.productResearch.upsert.mockResolvedValue({ id: 'product-1' });
    vi.mocked(fetchPageContent).mockResolvedValue(null);
    vi.mocked(getChecklistLearningReferencia).mockResolvedValue('');
    vi.mocked(callAgent)
      .mockResolvedValueOnce({
        data: {
          vertical: 'health',
          tags: [],
          affiliate_page_url_guess: 'https://127.0.0.1/affiliate',
          vendor_sales_page_url_guess: 'https://169.254.169.254/vendor',
        },
        usage: {},
      } as never)
      .mockResolvedValueOnce({
        data: { melhor_keyword: { kw: 'keyword' }, camada_A: [] },
        usage: {},
      } as never)
      .mockResolvedValueOnce({
        data: {
          risco_geral: 'alto',
          alertas: [],
          canais: {
            google_search_permitido: 'nao_verificado',
            brand_bidding_permitido: 'nao_verificado',
            termos_proibidos: [],
            fonte: 'não verificada',
            canais_permitidos: [],
            canais_proibidos: [],
          },
          elementos_presell_referencia: [],
        },
        usage: {},
      } as never);
  });

  it('não executa fetch direto para URLs sugeridas pelo Hunter', async () => {
    const rawFetch = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('não deveria chamar'));

    const response = await POST(request());
    await response.text();

    expect(fetchPageContent).toHaveBeenNthCalledWith(1, 'https://127.0.0.1/affiliate');
    expect(fetchPageContent).toHaveBeenNthCalledWith(2, 'https://169.254.169.254/vendor');
    expect(rawFetch).not.toHaveBeenCalled();
    expect(callAgent).toHaveBeenCalledTimes(3);
    expect(mockPrisma.productResearch.upsert).toHaveBeenCalledOnce();
  });
});
