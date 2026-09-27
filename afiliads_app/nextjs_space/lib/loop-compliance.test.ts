import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Campaign } from '@prisma/client';

vi.mock('./llm', () => ({ callAgent: vi.fn() }));
vi.mock('./compliance-judgments', () => ({ judgeBridgeCompliance: vi.fn() }));

const { callAgent } = await import('./llm');
const { judgeBridgeCompliance } = await import('./compliance-judgments');
const { checkPresellCompliance } = await import('./loop-compliance');

const agent = vi.mocked(callAgent);
const judge = vi.mocked(judgeBridgeCompliance);

const campaign = { id: 'c1', name: 'Campanha X', presellUrl: 'https://exemplo.com/p' } as Campaign;

const judged = (over: Record<string, { verdict: string; probability: number; note?: string }> = {}) => ({
  disclaimer: { verdict: 'passou', probability: 0.95 },
  sem_claims: { verdict: 'passou', probability: 0.03 },
  faq: { verdict: 'passou', probability: 0.9 },
  resultados_variam: { verdict: 'passou', probability: 0.92 },
  ...over,
}) as any;

function mockFetchOk(html = '<p>presell</p>') {
  global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve(html) }) as any;
}

beforeEach(() => {
  agent.mockReset();
  judge.mockReset();
  mockFetchOk();
});

describe('checkPresellCompliance — caminho de julgamento', () => {
  it('presell limpa não rebaixa decisão nem chama o agente generativo', async () => {
    judge.mockResolvedValue(judged());
    const r = await checkPresellCompliance('u1', campaign, { pausada: false });
    expect(r.critical).toBe(false);
    expect(r.triggers).toEqual([]);
    expect(r.agentsRun).toEqual(['compliance-judgment']);
    expect(agent).not.toHaveBeenCalled();
  });

  it('claim proibida é crítica e rebaixa a decisão', async () => {
    judge.mockResolvedValue(judged({ sem_claims: { verdict: 'reprovou', probability: 0.97, note: 'Claim proibida no texto: afirmação de cura (p=0.97)' } }));
    const r = await checkPresellCompliance('u1', campaign, { pausada: false });
    expect(r.critical).toBe(true);
    expect(r.triggers[0]).toContain('Compliance: 1 item(ns) crítico(s)');
    expect(r.triggers[0]).toContain('afirmação de cura');
  });

  it('disclosure de afiliado ausente também é crítica', async () => {
    judge.mockResolvedValue(judged({ disclaimer: { verdict: 'reprovou', probability: 0.02, note: 'Disclosure de afiliado não encontrada no texto da presell' } }));
    const r = await checkPresellCompliance('u1', campaign, { pausada: false });
    expect(r.critical).toBe(true);
  });

  it("'incerto' avisa mas NUNCA rebaixa decisão", async () => {
    judge.mockResolvedValue(judged({ sem_claims: { verdict: 'incerto', probability: 0.44, note: 'Possível promessa de resultado — revisar' } }));
    const r = await checkPresellCompliance('u1', campaign, { pausada: false });
    expect(r.critical).toBe(false);
    expect(r.triggers[0]).toContain('atenção, não rebaixa decisão');
  });

  it('FAQ e aviso de variação ausentes são atenção, não crítico', async () => {
    judge.mockResolvedValue(judged({
      faq: { verdict: 'reprovou', probability: 0.05 },
      resultados_variam: { verdict: 'reprovou', probability: 0.04 },
    }));
    const r = await checkPresellCompliance('u1', campaign, { pausada: false });
    expect(r.critical).toBe(false);
    expect(r.triggers[0]).toContain('sem seção de FAQ');
    expect(r.triggers[0]).toContain('sem aviso de que resultados variam');
  });

  it('prefixo distingue campanha pausada', async () => {
    judge.mockResolvedValue(judged({ sem_claims: { verdict: 'reprovou', probability: 0.9 } }));
    const r = await checkPresellCompliance('u1', campaign, { pausada: true });
    expect(r.triggers[0]).toContain('Compliance (campanha pausada)');
  });

  it('não gasta token do contador de IA do app', async () => {
    judge.mockResolvedValue(judged());
    const r = await checkPresellCompliance('u1', campaign, { pausada: false });
    expect(r.totalTokens).toBe(0);
  });
});

describe('checkPresellCompliance — fallback generativo', () => {
  it('sem julgamento disponível, usa o agente e mantém o comportamento antigo', async () => {
    judge.mockResolvedValue(null);
    agent.mockResolvedValue({
      data: { aprovado: false, alertas: [{ nivel: 'critico', texto: 'promessa de cura' }, { nivel: 'atencao', texto: 'urgência' }] },
      usage: { totalTokens: 1234 },
    } as any);

    const r = await checkPresellCompliance('u1', campaign, { pausada: false });
    expect(r.critical).toBe(true);
    expect(r.agentsRun).toEqual(['compliance-sentinel']);
    expect(r.totalTokens).toBe(1234);
    expect(r.triggers[0]).toContain('1 alerta(s) crítico(s)');
  });

  it('erro do agente não derruba o loop', async () => {
    judge.mockResolvedValue(null);
    agent.mockRejectedValue(new Error('quota estourada'));
    const r = await checkPresellCompliance('u1', campaign, { pausada: false });
    expect(r.critical).toBe(false);
    expect(r.error).toContain('quota estourada');
  });
});

describe('checkPresellCompliance — presell inacessível', () => {
  it('HTTP de erro vira trigger de hospedagem, sem julgar nada', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 502, text: () => Promise.resolve('') }) as any;
    const r = await checkPresellCompliance('u1', campaign, { pausada: false });
    expect(r.triggers[0]).toContain('Presell inacessível (HTTP 502)');
    expect(r.critical).toBe(false);
    expect(judge).not.toHaveBeenCalled();
  });

  it('falha de rede vira trigger e erro', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('ENOTFOUND')) as any;
    const r = await checkPresellCompliance('u1', campaign, { pausada: false });
    expect(r.triggers[0]).toContain('Presell inacessível (ENOTFOUND)');
    expect(r.error).toContain('ENOTFOUND');
  });

  it('campanha sem presellUrl não faz nada', async () => {
    const r = await checkPresellCompliance('u1', { ...campaign, presellUrl: null } as Campaign, { pausada: false });
    expect(r).toMatchObject({ triggers: [], critical: false, agentsRun: [], totalTokens: 0 });
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
