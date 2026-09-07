import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { POST } from '../route';
import { LLM_PROVIDER_LIST, NO_LLM_KEY_ERROR } from '@/lib/llm-errors';

const mocks = vi.hoisted(() => ({
  callAgent: vi.fn(),
  getPresellOutcomeReferencia: vi.fn(),
  getMarketIntelReferencia: vi.fn(),
}));

vi.mock('@/lib/llm', () => ({ callAgent: mocks.callAgent }));
vi.mock('@/lib/presell', () => ({ getPresellOutcomeReferencia: mocks.getPresellOutcomeReferencia }));
vi.mock('@/lib/marketIntel', () => ({ getMarketIntelReferencia: mocks.getMarketIntelReferencia }));
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));

function request(body: unknown) {
  return new NextRequest('http://localhost/api/wizard-field-check', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe('POST /api/wizard-field-check', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-1' } } as never);
  });

  it('retorna 401 sem sessão', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null as never);
    const res = await POST(request({ fieldKey: 'vertical', fieldValue: 'Weight Loss' }));
    expect(res.status).toBe(401);
  });

  it('retorna 400 quando fieldKey/fieldValue faltam', async () => {
    const res = await POST(request({ fieldKey: 'vertical' }));
    expect(res.status).toBe(400);
  });

  it('retorna 400 para campo não mapeado', async () => {
    const res = await POST(request({ fieldKey: 'campoInexistente', fieldValue: 'x' }));
    expect(res.status).toBe(400);
  });

  it('retorna aviso quando campo está vazio', async () => {
    const res = await POST(request({ fieldKey: 'vertical', fieldValue: '  ' }));
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toContain('está vazio');
  });

  it('processa resposta do agente para vertical', async () => {
    mocks.callAgent.mockResolvedValueOnce({
      data: {
        diagnostico: 'A vertical Weight Loss é competitiva no Google Ads.',
        correcao_necessaria: false,
        valor_sugerido: null,
      },
      text: '',
    });

    const res = await POST(request({ fieldKey: 'vertical', fieldValue: 'Weight Loss' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.response).toContain('Weight Loss');
    expect(json.correcaoNecessaria).toBe(false);
    expect(json.valorSugerido).toBeNull();
    expect(mocks.callAgent).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ agent: 'wizard-validator', json: true }),
    );
  });

  it('rejeita sugestão incompatível com enum e acrescenta aviso no diagnóstico', async () => {
    mocks.callAgent.mockResolvedValueOnce({
      data: {
        diagnostico: 'A vertical parece ok.',
        correcao_necessaria: false,
        valor_sugerido: 'VerticalInexistente',
      },
      text: '',
    });

    const res = await POST(request({ fieldKey: 'vertical', fieldValue: 'Weight Loss' }));
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.valorSugerido).toBeNull();
    expect(json.response).toContain('não é compatível');
    expect(json.response).toContain('VerticalInexistente');
  });

  it('retorna mensagem de configuração quando callAgent falha por chave não configurada', async () => {
    mocks.callAgent.mockRejectedValueOnce(new Error(NO_LLM_KEY_ERROR));

    const res = await POST(request({ fieldKey: 'vertical', fieldValue: 'Weight Loss' }));
    const json = await res.json();

    expect(json.success).toBe(false);
    expect(json.error).toContain('Nenhuma chave de API de IA configurada');
    expect(json.error).toContain('Provedores de IA');
    expect(json.error).toContain(LLM_PROVIDER_LIST);
  });

  it.each([
    ['openrouter: 401 No auth credentials found'],
    ['OpenAI error: Incorrect API key provided'],
    ['FIRECRAWL_API_KEY não configurada no .env'],
  ])('não culpa o usuário por falta de chave quando o erro é %s', async (message) => {
    mocks.callAgent.mockRejectedValueOnce(new Error(message));

    const res = await POST(request({ fieldKey: 'vertical', fieldValue: 'Weight Loss' }));
    const json = await res.json();

    expect(json.success).toBe(false);
    expect(json.error).toContain('temporariamente indisponível');
    expect(json.error).not.toContain('Nenhuma chave de API de IA configurada');
  });

  it('retorna mensagem de serviço indisponível para falhas genéricas do LLM', async () => {
    mocks.callAgent.mockRejectedValueOnce(new Error('quota exceeded on provider openrouter'));

    const res = await POST(request({ fieldKey: 'vertical', fieldValue: 'Weight Loss' }));
    const json = await res.json();

    expect(json.success).toBe(false);
    expect(json.error).toContain('temporariamente indisponível');
    expect(json.error).toContain('quota exceeded');
  });

  it('injeta contexto de aprendizado contínuo para commission/channel/pageType', async () => {
    mocks.getPresellOutcomeReferencia.mockResolvedValueOnce('Outcome: EPC 1.2');
    mocks.getMarketIntelReferencia.mockResolvedValueOnce('Market: 3 competidores');
    mocks.callAgent.mockResolvedValueOnce({
      data: { diagnostico: 'Ok.', correcao_necessaria: false, valor_sugerido: null },
      text: '',
    });

    const res = await POST(request({
      fieldKey: 'commission',
      fieldValue: '40',
      context: { vertical: 'Weight Loss', channel: 'SEARCH' },
    }));
    const json = await res.json();

    expect(json.success).toBe(true);
    const prompt = mocks.callAgent.mock.calls[0][1].userPrompt;
    expect(prompt).toContain('Outcome: EPC 1.2');
    expect(prompt).toContain('Market: 3 competidores');
  });
});
