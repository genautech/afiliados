import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    injectedKnowledge: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    campaign: { findFirst: vi.fn() },
  },
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/youtubeTranscript', () => ({ fetchYoutubeTranscript: vi.fn() }));
vi.mock('@/lib/competitorScraper', () => ({ fetchCompetitorPage: vi.fn() }));
vi.mock('@/lib/landingPageProposalService', () => ({ processInjectedKnowledge: vi.fn() }));

import { GET, POST } from '../route';
import { getServerSession } from 'next-auth';

const comSessao = () => vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u1' } } as any);

const postRequest = (body: unknown) =>
  new NextRequest('http://localhost/api/knowledge/inject', {
    method: 'POST',
    body: JSON.stringify(body),
  });

describe('POST /api/knowledge/inject', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockPrisma.injectedKnowledge.updateMany.mockResolvedValue({ count: 1 });
  });

  it('exige autenticação', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);
    expect((await POST(postRequest({}))).status).toBe(401);
  });

  it('recusa campanha de outro usuário', async () => {
    comSessao();
    mockPrisma.campaign.findFirst.mockResolvedValueOnce(null);
    const res = await POST(postRequest({
      sourceType: 'CONCORRENTE_URL', sourceUrl: 'https://x.com/lp', campaignId: 'c-alheia',
    }));
    expect(res.status).toBe(404);
    expect(mockPrisma.injectedKnowledge.create).not.toHaveBeenCalled();
  });

  it('bloqueia com 409 a mesma fonte já em processamento (clique duplo)', async () => {
    comSessao();
    mockPrisma.campaign.findFirst.mockResolvedValue({ id: 'c1', userId: 'u1' });
    mockPrisma.injectedKnowledge.findFirst.mockResolvedValueOnce({ id: 'k-em-voo' });

    const res = await POST(postRequest({
      sourceType: 'YOUTUBE_URL', sourceUrl: 'https://youtu.be/abcdefghijk', campaignId: 'c1',
    }));

    expect(res.status).toBe(409);
    // O ponto do teste: nenhum registro novo, logo nenhuma segunda rodada de LLM paga.
    expect(mockPrisma.injectedKnowledge.create).not.toHaveBeenCalled();
  });

  it('só considera em voo o que ainda está PENDING/PROCESSING e recente', async () => {
    comSessao();
    mockPrisma.campaign.findFirst.mockResolvedValue({ id: 'c1', userId: 'u1' });
    mockPrisma.injectedKnowledge.findFirst.mockResolvedValueOnce(null);
    mockPrisma.injectedKnowledge.create.mockResolvedValueOnce({ id: 'k1', status: 'PENDING' });

    const res = await POST(postRequest({
      sourceType: 'YOUTUBE_URL', sourceUrl: 'https://youtu.be/abcdefghijk', campaignId: 'c1',
    }));

    expect(res.status).toBe(201);
    const where = mockPrisma.injectedKnowledge.findFirst.mock.calls[0][0].where;
    expect(where.status).toEqual({ in: ['PENDING', 'PROCESSING'] });
    expect(where.updatedAt.gte).toBeInstanceOf(Date);
    expect(where.userId).toBe('u1');
  });

  it('nasce PENDING: o claim para PROCESSING é do worker, não do handler', async () => {
    comSessao();
    mockPrisma.injectedKnowledge.findFirst.mockResolvedValueOnce(null);
    mockPrisma.injectedKnowledge.create.mockResolvedValueOnce({ id: 'k1', status: 'PENDING' });

    await POST(postRequest({ sourceType: 'CONCORRENTE_URL', sourceUrl: 'https://x.com/lp' }));

    expect(mockPrisma.injectedKnowledge.create.mock.calls[0][0].data.status).toBe('PENDING');
  });

  it('não grava rawContent de fonte remota no create (vem da extração)', async () => {
    comSessao();
    mockPrisma.injectedKnowledge.findFirst.mockResolvedValueOnce(null);
    mockPrisma.injectedKnowledge.create.mockResolvedValueOnce({ id: 'k1' });

    await POST(postRequest({ sourceType: 'CONCORRENTE_URL', sourceUrl: 'https://x.com/lp' }));

    expect(mockPrisma.injectedKnowledge.create.mock.calls[0][0].data.rawContent).toBeNull();
  });

  it('rejeita payload com campo desconhecido (strict)', async () => {
    comSessao();
    const res = await POST(postRequest({
      sourceType: 'SOURCE_CODE', rawContent: 'texto', truqueDeInjecao: 'x',
    }));
    expect(res.status).toBe(400);
  });
});

describe('GET /api/knowledge/inject', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockPrisma.injectedKnowledge.updateMany.mockResolvedValue({ count: 0 });
    mockPrisma.injectedKnowledge.findMany.mockResolvedValue([]);
  });

  it('exige autenticação', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);
    const res = await GET(new NextRequest('http://localhost/api/knowledge/inject'));
    expect(res.status).toBe(401);
  });

  it('fecha ingestões abandonadas antes de listar', async () => {
    comSessao();
    await GET(new NextRequest('http://localhost/api/knowledge/inject'));

    const reaper = mockPrisma.injectedKnowledge.updateMany.mock.calls[0][0];
    expect(reaper.where.status).toEqual({ in: ['PENDING', 'PROCESSING'] });
    expect(reaper.where.userId).toBe('u1');
    expect(reaper.where.updatedAt.lt).toBeInstanceOf(Date);
    expect(reaper.data.status).toBe('FAILED');
    // Sem isto, o painel poleia um registro morto de 4 em 4 segundos para sempre.
    expect(reaper.data.errorMessage).toMatch(/interrompid/i);
  });

  it('nunca devolve rawContent na listagem, que é polida a cada 4s', async () => {
    comSessao();
    await GET(new NextRequest('http://localhost/api/knowledge/inject'));

    const select = mockPrisma.injectedKnowledge.findMany.mock.calls[0][0].select;
    expect(select.rawContent).toBeUndefined();
    expect(select.status).toBe(true);
    expect(select.refinedMetadata).toBe(true);
  });

  it('limita a listagem e escopa por usuário', async () => {
    comSessao();
    await GET(new NextRequest('http://localhost/api/knowledge/inject?campaignId=c1'));

    const args = mockPrisma.injectedKnowledge.findMany.mock.calls[0][0];
    expect(args.take).toBe(50);
    expect(args.where).toMatchObject({ userId: 'u1', campaignId: 'c1' });
  });

  it('não expõe proposedCustomCode nas propostas', async () => {
    comSessao();
    await GET(new NextRequest('http://localhost/api/knowledge/inject'));

    const propostas = mockPrisma.injectedKnowledge.findMany.mock.calls[0][0].select.proposals.select;
    expect(propostas.proposedCustomCode).toBeUndefined();
  });
});
