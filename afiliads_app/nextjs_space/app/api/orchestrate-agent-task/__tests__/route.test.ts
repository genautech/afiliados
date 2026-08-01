import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  productFindFirst: vi.fn(),
  campaignFindFirst: vi.fn(),
  presellFindFirst: vi.fn(),
  callAgent: vi.fn(),
  generatePresell: vi.fn(),
}));

vi.mock('next-auth', () => ({ getServerSession: mocks.getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    productResearch: { findFirst: mocks.productFindFirst },
    campaign: { findFirst: mocks.campaignFindFirst },
    presell: { findFirst: mocks.presellFindFirst },
  },
}));
vi.mock('@/lib/llm', () => ({ callAgent: mocks.callAgent }));
vi.mock('@/lib/presell', () => ({ generatePresell: mocks.generatePresell }));

import { POST } from '../route';

function request(body: Record<string, unknown>) {
  return new Request('http://localhost/api/orchestrate-agent-task', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as any;
}

describe('POST /api/orchestrate-agent-task', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getServerSession.mockResolvedValue({ user: { id: 'user-1' } });
    mocks.productFindFirst.mockResolvedValue({
      id: 'product-1',
      userId: 'user-1',
      name: 'SleepWell Pro',
      vertical: 'Health',
      summary: 'Suplemento de sono',
      hopLink: 'https://example.com/hop',
      vendorPageUrl: 'https://example.com/sales',
    });
    mocks.campaignFindFirst.mockResolvedValue(null);
  });

  it('valida um rascunho real com um agente independente e retorna provider/modelo', async () => {
    const draft = {
      tipo: 'QUIZ_FUNNEL',
      headline: 'Descubra uma rotina de sono adequada ao seu perfil',
      perguntas: [{ pergunta: 'Como está seu sono?', opcoes: ['Leve', 'Irregular'] }],
    };
    mocks.callAgent.mockResolvedValue({
      data: { approved: true, score: 92, issues: [], recommendations: [] },
      text: '{"approved":true,"score":92,"issues":[],"recommendations":[]}',
      usage: { promptTokens: 100, completionTokens: 40, totalTokens: 140 },
      durationMs: 500,
      provider: 'grok',
      model: 'grok-4.1-fast-reasoning',
    });

    const response = await POST(request({
      taskType: 'validate',
      bridgePageType: 'QUIZ_FUNNEL',
      context: 'Validar compliance e continuidade da jornada.',
      productId: 'product-1',
      artifact: draft,
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.callAgent).toHaveBeenCalledWith('user-1', expect.objectContaining({
      agent: 'bridge-page-validator',
      json: true,
    }));
    expect(body).toMatchObject({
      success: true,
      dispatchedAgent: 'bridge-page-validator',
      validation: { approved: true, score: 92 },
      provider: 'grok',
      model: 'grok-4.1-fast-reasoning',
    });
  });

  it('busca a presell mais recente do próprio usuário quando artifact não é enviado', async () => {
    mocks.presellFindFirst.mockResolvedValue({
      id: 'presell-1',
      title: 'SleepWell Review',
      pageType: 'pogo',
      html: '<main><h1>Conheça uma nova abordagem</h1></main>',
      content: { headline: 'Conheça uma nova abordagem' },
    });
    mocks.callAgent.mockResolvedValue({
      data: { approved: false, score: 60, issues: ['CTA pouco claro'], recommendations: ['Usar CTA único'] },
      text: '{}',
      usage: { promptTokens: 80, completionTokens: 30, totalTokens: 110 },
      durationMs: 400,
      provider: 'grok',
      model: 'grok-4.1-fast-reasoning',
    });

    const response = await POST(request({
      taskType: 'validate',
      bridgePageType: 'POGO',
      context: 'Validar o último rascunho.',
      productId: 'product-1',
    }));

    expect(response.status).toBe(200);
    expect(mocks.presellFindFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ userId: 'user-1', productId: 'product-1' }),
    }));
  });
});
