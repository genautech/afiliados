import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { POST } from '../route';
import { callAgent } from '@/lib/llm';

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/llm', () => ({ callAgent: vi.fn() }));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    campaign: { findFirst: vi.fn(async () => ({ id: 'camp-1' })) },
    productResearch: { findFirst: vi.fn(async () => ({ id: 'prod-1' })) },
    brandKit: {
      findFirst: vi.fn(async () => null),
      create: vi.fn(async () => ({ id: 'bk-1', version: 1 })),
    },
  },
}));

const brandKit = {
  palette: [
    { role: 'primary', hex: '#1D4ED8', usage: 'CTA' },
    { role: 'surface', hex: '#0F172A', usage: 'fundo' },
    { role: 'text', hex: '#F8FAFC', usage: 'corpo' },
  ],
  typography: { display: 'Inter Tight', text: 'Inter', rationale: 'legibilidade' },
  tone: {
    voice: 'direto',
    dos: ['nomear o problema', 'usar número verificável', 'falar com uma pessoa'],
    donts: ['prometer cura', 'garantir ganho', 'urgência falsa'],
  },
  bannedWords: ['cura'],
  positioning: 'guia prático',
  gaps: [],
};

function request(body: unknown) {
  return new NextRequest('http://localhost/api/brand-kit', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe('POST /api/brand-kit', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-1' } } as any);
  });

  it('retorna 401 sem sessão', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);
    const res = await POST(request({ brandName: 'X', niche: 'y', audience: 'z' }));
    expect(res.status).toBe(401);
    expect(callAgent).not.toHaveBeenCalled();
  });

  it('retorna 400 com issues quando a entrada é inválida', async () => {
    const res = await POST(request({ brandName: '' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.issues.map((i: any) => i.path)).toEqual(
      expect.arrayContaining(['brandName', 'niche', 'audience'])
    );
    expect(callAgent).not.toHaveBeenCalled();
  });

  it('retorna o brand kit validado', async () => {
    vi.mocked(callAgent).mockResolvedValue({
      text: '',
      data: brandKit,
      usage: { promptTokens: 5, completionTokens: 5, totalTokens: 10 },
      durationMs: 1,
      provider: 'openrouter',
      model: 'moonshotai/kimi-k2.5',
    } as any);

    const res = await POST(
      request({ brandName: 'Doce Lucro', niche: 'receitas fit', audience: 'mulheres 30-45' })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.agent).toBe('brand-dna-extractor');
    expect(body.data.typography.display).toBe('Inter Tight');
  });

  it('retorna 500 quando o agente devolve saída fora do contrato', async () => {
    vi.mocked(callAgent).mockResolvedValue({
      text: '',
      data: { palette: [] },
      usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
      durationMs: 1,
      provider: 'openrouter',
      model: 'x',
    } as any);

    const res = await POST(request({ brandName: 'X', niche: 'y', audience: 'z' }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/fora do contrato/);
  });
});
