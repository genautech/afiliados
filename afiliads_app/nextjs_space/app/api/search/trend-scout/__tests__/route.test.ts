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

function request(body: unknown) {
  return new NextRequest('http://localhost/api/search/trend-scout', { method: 'POST', body: JSON.stringify(body) });
}

describe('POST /api/search/trend-scout', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-1' } } as never);
    mockGenerateTrendScout.mockResolvedValue({
      idea: {
        name: 'Método Foco Profundo',
        vertical: 'Produtividade',
        potentialScore: 86,
        pricing: { suggestedPrice: 47.9, suggestedAov: 97, upsells: ['Áudio-livro'] },
        vslHook: 'Gancho de foco',
        leadMagnet: 'Checklist de foco',
        bonusSuggested: ['Planner'],
      },
      trendSlope: 'positive',
      source: 'mock sources',
      isMockMode: true,
    });
    mockPrisma.productResearch.upsert.mockResolvedValue({ id: 'product-1', name: 'Método Foco Profundo', productType: 'PROPRIETARY_LOW_TICKET', network: 'Meta_Google_Scout' });
  });

  it('exige autenticação', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);
    const response = await POST(request({ niche: 'foco', country: 'BR' }));
    expect(response.status).toBe(401);
    expect(mockGenerateTrendScout).not.toHaveBeenCalled();
  });

  it('valida o nicho e o país', async () => {
    const response = await POST(request({ niche: 'x', country: 'Brasil' }));
    expect(response.status).toBe(400);
    expect(mockGenerateTrendScout).not.toHaveBeenCalled();
  });

  it('gera e salva um produto proprietário de forma idempotente', async () => {
    const response = await POST(request({ niche: 'foco', country: 'us' }));
    expect(response.status).toBe(201);
    expect(mockGenerateTrendScout).toHaveBeenCalledWith('foco', 'US');
    expect(mockPrisma.productResearch.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId_name: { userId: 'user-1', name: 'Método Foco Profundo' } },
      create: expect.objectContaining({ network: 'Meta_Google_Scout', productType: 'PROPRIETARY_LOW_TICKET' }),
      update: expect.objectContaining({ network: 'Meta_Google_Scout', productType: 'PROPRIETARY_LOW_TICKET' }),
    }));
    const body = await response.json();
    expect(body.product.id).toBe('product-1');
    expect(body.trendSlope).toBe('positive');
  });

  it('retorna 500 quando a persistência falha', async () => {
    mockPrisma.productResearch.upsert.mockRejectedValueOnce(new Error('database unavailable'));
    const response = await POST(request({ niche: 'foco', country: 'ALL' }));
    expect(response.status).toBe(500);
  });
});
