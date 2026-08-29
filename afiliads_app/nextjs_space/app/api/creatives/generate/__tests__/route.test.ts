import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { POST } from '../route';
import { callAgent } from '@/lib/llm';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    campaign: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/llm', () => ({ callAgent: vi.fn() }));

function request(body: unknown) {
  return new NextRequest('http://localhost/api/creatives/generate', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe('POST /api/creatives/generate', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-123' } } as any);
  });

  it('retorna 401 para usuário não autenticado', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);

    const res = await POST(request({}));
    expect(res.status).toBe(401);
  });

  it('retorna 400 para parâmetros ausentes', async () => {
    const res = await POST(request({ campaignId: 'c1' }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Parâmetros obrigatórios ausentes');
  });

  it('retorna 404 se a campanha não pertence ao usuário', async () => {
    mockPrisma.campaign.findFirst.mockResolvedValueOnce(null);

    const res = await POST(
      request({
        campaignId: 'c1',
        productType: 'AFFILIATE',
        productName: 'Diet Caps',
        productNiche: 'Weight Loss',
      })
    );
    expect(res.status).toBe(404);
  });

  it('gera criativo com sucesso e risco LOW na primeira tentativa', async () => {
    mockPrisma.campaign.findFirst.mockResolvedValueOnce({ id: 'c1', userId: 'user-123' });
    mockPrisma.campaign.update.mockResolvedValueOnce({});

    const mockLlmResponse = {
      data: {
        angle: 'Alerta de Fraude',
        headline: 'Atenção aos produtos falsificados',
        primaryText: 'Muitos sites vendem imitações. Compre apenas através do site oficial.',
        description: 'Resultados individuais variam de pessoa para pessoa.',
      },
    };
    vi.mocked(callAgent).mockResolvedValueOnce(mockLlmResponse as any);

    const res = await POST(
      request({
        campaignId: 'c1',
        productType: 'AFFILIATE',
        productName: 'Diet Caps',
        productNiche: 'Weight Loss',
        intentQueries: ['diet caps reclame aqui'],
        competitorDores: ['muitas imitações no mercado'],
        tone: 'alert',
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.attempts).toBe(1);
    expect(data.creative.headline).toBe('Atenção aos produtos falsificados');
    expect(data.compliance.riskLevel).toBe('LOW');
    expect(data.compliance.passed).toBe(true);
    expect(mockPrisma.campaign.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: { updatedAt: expect.any(Date) },
    });
  });

  it('realiza regeneração automática ao detectar alto risco na primeira tentativa', async () => {
    mockPrisma.campaign.findFirst.mockResolvedValueOnce({ id: 'c1', userId: 'user-123' });
    mockPrisma.campaign.update.mockResolvedValueOnce({});

    // Primeira resposta: Contém claim de risco HIGH (Cure sua diabetes)
    const mockLlmResponseHighRisk = {
      data: {
        angle: 'Cura Rápida',
        headline: 'Cure sua diabetes agora!',
        primaryText: 'Este segredo reverte diabetes em semanas de forma 100% garantida.',
        description: 'Recuperação milagrosa.',
      },
    };

    // Segunda resposta: Limpa, sem claims banidos
    const mockLlmResponseSafe = {
      data: {
        angle: 'Suporte à Saúde',
        headline: 'Ajuda a manter níveis de açúcar saudáveis',
        primaryText: 'Fórmula que apoia o controle natural da glicemia associada a hábitos saudáveis.',
        description: 'Resultados variam.',
      },
    };

    vi.mocked(callAgent)
      .mockResolvedValueOnce(mockLlmResponseHighRisk as any)
      .mockResolvedValueOnce(mockLlmResponseSafe as any);

    const res = await POST(
      request({
        campaignId: 'c1',
        productType: 'AFFILIATE',
        productName: 'Gluco Control',
        productNiche: 'Health',
        intentQueries: [],
        competitorDores: [],
        tone: 'scientific',
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.attempts).toBe(2);
    expect(data.creative.headline).toBe('Ajuda a manter níveis de açúcar saudáveis');
    expect(data.compliance.riskLevel).toBe('LOW');
  });

  it('retorna 422 se o LLM falhar em gerar uma cópia segura após o limite de tentativas', async () => {
    mockPrisma.campaign.findFirst.mockResolvedValueOnce({ id: 'c1', userId: 'user-123' });
    mockPrisma.campaign.update.mockResolvedValueOnce({});

    const mockLlmResponseHighRisk = {
      data: {
        angle: 'Cura Rápida',
        headline: 'Cure sua diabetes de vez!',
        primaryText: 'Esta cura definitiva é 100% garantida.',
        description: 'Fórmula mágica de emagrecimento rápido.',
      },
    };

    vi.mocked(callAgent).mockResolvedValue(mockLlmResponseHighRisk as any);

    const res = await POST(
      request({
        campaignId: 'c1',
        productType: 'AFFILIATE',
        productName: 'Gluco Control',
        productNiche: 'Health',
      })
    );

    expect(res.status).toBe(422);
    const data = await res.json();
    expect(data.error).toContain('Geração bloqueada pelo Compliance Sentinel');
    expect(data.compliance.passed).toBe(false);
    expect(data.compliance.riskLevel).toBe('HIGH');
  });
});
