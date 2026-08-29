import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { POST, GET } from '../route';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    $transaction: vi.fn(),
    marketResearch: {
      upsert: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    campaign: {
      findFirst: vi.fn(),
    },
    productResearch: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/obsidianSync', () => ({ logLearningToObsidian: vi.fn() }));

function request(body: unknown) {
  return new NextRequest('http://localhost/api/search/market-scout', { method: 'POST', body: JSON.stringify(body) });
}

describe('POST /api/search/market-scout', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-1' } } as never);
    mockPrisma.$transaction.mockImplementation(async (callback: (tx: typeof mockPrisma) => unknown) => callback(mockPrisma));
  });

  it('rejeita requisição sem autenticação', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);
    const response = await POST(request({ query: 'diet caps', productType: 'AFFILIATE' }));
    expect(response.status).toBe(401);
  });

  it('rejeita payload inválido pelo Zod', async () => {
    const response = await POST(request({ query: '', productType: 'INVALID' }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('Payload inválido');
  });

  it('retorna resultado válido do Ad Scout e persiste no banco via Prisma', async () => {
    mockPrisma.marketResearch.create.mockResolvedValueOnce({
      id: 'research-123',
      query: 'diet caps',
      productType: 'AFFILIATE',
      adCount: 12,
      avgPrice: 47.5,
      competitors: [],
      audiencePain: ['Fome noturna', 'Inchaço abdominal'],
      analyzedClaims: [],
      anglesSuggested: ['Fórmula termogênica natural'],
    });

    const response = await POST(request({ query: 'diet caps', productType: 'AFFILIATE' }));
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.query).toBe('diet caps');
    expect(body.adCount).toBeGreaterThanOrEqual(0);
    expect(body.avgPrice).toBeGreaterThan(0);
    expect(Array.isArray(body.audiencePain)).toBe(true);
    expect(Array.isArray(body.analyzedClaims)).toBe(true);
  });
});

describe('GET /api/search/market-scout', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-1' } } as never);
  });

  it('retorna found: false se não houver pesquisa prévia para a campanha', async () => {
    mockPrisma.marketResearch.findFirst.mockResolvedValueOnce(null);
    const req = new NextRequest('http://localhost/api/search/market-scout?campaignId=camp-123');
    const response = await GET(req);
    expect(response.status).toBe(200);
    
    const body = await response.json();
    expect(body.found).toBe(false);
  });

  it('retorna os dados salvos quando houver correspondência por campaignId', async () => {
    const mockResearch = {
      id: 'research-123',
      query: 'suplemento slim',
      adCount: 15,
      avgPrice: 67.0,
      audiencePain: ['Vício em doce'],
      analyzedClaims: [{ claim: 'perca 10kg', riskLevel: 'HIGH', justification: 'Falsidade', sourceCompetitor: 'SlimCaps' }],
      anglesSuggested: ['Foco em saúde intestinal'],
      productType: 'AFFILIATE',
      competitors: [],
    };
    mockPrisma.marketResearch.findFirst.mockResolvedValueOnce(mockResearch);

    const req = new NextRequest('http://localhost/api/search/market-scout?campaignId=camp-123');
    const response = await GET(req);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.found).toBe(true);
    expect(body.data.query).toBe('suplemento slim');
    expect(body.data.adCount).toBe(15);
  });
});
