import { expect, test, describe, vi, beforeEach } from 'vitest';
import { GET, POST } from '../route';
import { NextRequest } from 'next/server';

vi.mock('next-auth', () => ({
  getServerSession: vi.fn()
}));

vi.mock('../../../../../lib/google-ads-experiments/orchestration', () => ({
  setupExperiment: vi.fn(),
  toExperimentDetailDTO: vi.fn((value) => value),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    campaign: { findFirst: vi.fn() },
    googleAdsExperiment: { findMany: vi.fn() },
  },
}));

import { getServerSession } from 'next-auth';
import { setupExperiment } from '../../../../../lib/google-ads-experiments/orchestration';
import { prisma } from '@/lib/prisma';

describe('GET /api/google-ads/experiments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('404 para campanha sem ownership e não consulta experimento', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'u2' } });
    vi.mocked(prisma.campaign.findFirst).mockResolvedValue(null);
    const res = await GET(new NextRequest('http://localhost/api/google-ads/experiments?campaignId=c1'));
    expect(res.status).toBe(404);
    expect(prisma.googleAdsExperiment.findMany).not.toHaveBeenCalled();
  });

  test('retorna revisão da campanha própria e experimento mais recente', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'u1' } });
    vi.mocked(prisma.campaign.findFirst).mockResolvedValue({ id: 'c1', updatedAt: new Date(1234) } as any);
    vi.mocked(prisma.googleAdsExperiment.findMany).mockResolvedValue([{ id: 'e1' }] as any);
    const res = await GET(new NextRequest('http://localhost/api/google-ads/experiments?campaignId=c1'));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      experiments: [{ id: 'e1' }],
      setupAuthorization: { resourceId: 'c1', revision: '1234' },
    });
  });

  test('não esconde duplicatas ativas legadas e bloqueia nova preparação', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'u1' } });
    vi.mocked(prisma.campaign.findFirst).mockResolvedValue({ id: 'c1', updatedAt: new Date(1234) } as any);
    vi.mocked(prisma.googleAdsExperiment.findMany).mockResolvedValue([{ id: 'e2' }, { id: 'e1' }] as any);
    const res = await GET(new NextRequest('http://localhost/api/google-ads/experiments?campaignId=c1'));
    expect(await res.json()).toMatchObject({
      experiments: [{ id: 'e2' }, { id: 'e1' }],
      setupAuthorization: null,
      conflict: expect.stringContaining('mais de um experimento ativo'),
    });
  });
});

describe('POST /api/google-ads/experiments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('401 sem sessão', async () => {
    (getServerSession as any).mockResolvedValue(null);
    const req = new NextRequest('http://localhost', { method: 'POST', body: JSON.stringify({}) });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  test('400 schema', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'u1' } });
    (setupExperiment as any).mockRejectedValue({ status: 400, message: 'Bad request' });
    const req = new NextRequest('http://localhost', { method: 'POST', body: JSON.stringify({}) });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  test('200 success delegando pro orquestrador', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'u1' } });
    (setupExperiment as any).mockResolvedValue({ success: true });

    const req = new NextRequest('http://localhost', {
      method: 'POST',
      body: JSON.stringify({
        campaignId: 'c1',
        presellId: 'p1',
        treatmentFinalUrl: 'https://ex.com',
        authorization: { confirmed: true, operation: 'SETUP_EXPERIMENT', resourceId: 'c1', revision: 'r1', idempotencyKey: 'k1' }
      })
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  test('Propaga 404/409 do orquestrador', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'u1' } });
    (setupExperiment as any).mockRejectedValue({ status: 409, message: 'Conflict' });

    const req = new NextRequest('http://localhost', {
      method: 'POST',
      body: JSON.stringify({
        campaignId: 'c1',
        presellId: 'p1',
        treatmentFinalUrl: 'https://ex.com',
        authorization: { confirmed: true, operation: 'SETUP_EXPERIMENT', resourceId: 'c1', revision: 'r1', idempotencyKey: 'k1' }
      })
    });
    const res = await POST(req);
    expect(res.status).toBe(409);
  });
});
