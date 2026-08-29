import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { POST } from '../route';

const { mockPrisma, mockGenerateTrendScout } = vi.hoisted(() => ({
  mockPrisma: { productResearch: { upsert: vi.fn() } },
  mockGenerateTrendScout: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/trendScoutService', () => ({ generateTrendScout: mockGenerateTrendScout }));

const request = (body: unknown) => new NextRequest('http://localhost/api/products/idea', { method: 'POST', body: JSON.stringify(body) });

describe('POST /api/products/idea', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-1' } } as never);
    mockGenerateTrendScout.mockResolvedValue({
      idea: { name: 'Método Foco', vertical: 'Produtividade', potentialScore: 80, pricing: { suggestedPrice: 47, suggestedAov: 97, upsells: [] }, vslHook: 'Hook', leadMagnet: 'Magnet', bonusSuggested: [] },
      trendSlope: null, source: 'real source', isMockMode: false,
    });
    mockPrisma.productResearch.upsert.mockResolvedValue({ id: 'p1', name: 'Método Foco', productType: 'PROPRIETARY_LOW_TICKET' });
  });

  it('salva a ideia como ProductResearch proprietário', async () => {
    const response = await POST(request({ niche: 'foco', country: 'BR' }));
    expect(response.status).toBe(201);
    expect(mockPrisma.productResearch.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ network: 'Meta_Google_Scout', productType: 'PROPRIETARY_LOW_TICKET' }),
    }));
  });

  it('retorna erro de credenciais sem mascarar falha', async () => {
    mockGenerateTrendScout.mockRejectedValueOnce(new Error('Credenciais ausentes: FIRECRAWL_API_KEY'));
    const response = await POST(request({ niche: 'foco', country: 'BR' }));
    expect(response.status).toBe(503);
    expect((await response.json()).details).toContain('FIRECRAWL_API_KEY');
  });
});
