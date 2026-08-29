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

const { mockAdScoutSearch } = vi.hoisted(() => ({ mockAdScoutSearch: vi.fn() }));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/adScoutService', () => ({ AdScoutService: class { search = mockAdScoutSearch; } }));
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
    mockAdScoutSearch.mockResolvedValue({
      query: 'diet caps', productType: 'AFFILIATE', adCount: 12, avgPrice: 47.5,
      competitors: [], audiencePain: ['Fome noturna'], anglesSuggested: ['Praticidade'], analyzedClaims: [],
    });
  });

  it('rejeita requisição sem autenticação (401)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);
    const response = await POST(request({ query: 'diet caps', productType: 'AFFILIATE' }));
    expect(response.status).toBe(401);
  });

  it('rejeita payload inválido pelo Zod (400)', async () => {
    const response = await POST(request({ query: '', productType: 'INVALID' }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('Payload inválido');
  });

  it('rejeita requisição com IDOR se a campanha pertencer a outro usuário (404)', async () => {
    mockPrisma.campaign.findFirst.mockResolvedValueOnce(null);
    const response = await POST(request({
      query: 'suplemento emagrecimento',
      productType: 'AFFILIATE',
      campaignId: 'camp-other-user',
    }));

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe('Campanha não encontrada');
  });

  it('retorna resultado válido do Ad Scout no modo mock e persiste no banco via Prisma (200)', async () => {
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

  it('suporta scraping mockado para produtos do tipo PROPRIETARY_LOW_TICKET (200)', async () => {
    mockPrisma.marketResearch.create.mockResolvedValueOnce({
      id: 'research-456',
      query: 'guia receitas fit',
      productType: 'PROPRIETARY_LOW_TICKET',
      adCount: 18,
      avgPrice: 47.9,
      competitors: [],
      audiencePain: ['Falta de tempo para cozinhar'],
      analyzedClaims: [],
      anglesSuggested: ['Praticidade de 15 minutos'],
    });

    const response = await POST(request({ query: 'guia receitas fit', productType: 'PROPRIETARY_LOW_TICKET' }));
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.productType).toBe('PROPRIETARY_LOW_TICKET');
    expect(body.query).toBe('guia receitas fit');
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
