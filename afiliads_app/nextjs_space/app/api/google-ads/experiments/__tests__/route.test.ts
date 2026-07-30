import { expect, test, describe, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import { NextRequest } from 'next/server';

vi.mock('next-auth', () => ({
  getServerSession: vi.fn()
}));

vi.mock('../../../../../lib/google-ads-experiments/orchestration', () => ({
  setupExperiment: vi.fn()
}));

import { getServerSession } from 'next-auth';
import { setupExperiment } from '../../../../../lib/google-ads-experiments/orchestration';

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
