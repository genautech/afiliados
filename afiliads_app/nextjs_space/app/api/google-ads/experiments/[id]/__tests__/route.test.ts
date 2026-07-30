import { expect, test, describe, vi, beforeEach } from 'vitest';
import { GET } from '../route';
import { NextRequest } from 'next/server';

vi.mock('next-auth', () => ({
  getServerSession: vi.fn()
}));

vi.mock('../../../../../../lib/google-ads-experiments/orchestration', () => ({
  getExperimentDetail: vi.fn()
}));

import { getServerSession } from 'next-auth';
import { getExperimentDetail } from '../../../../../../lib/google-ads-experiments/orchestration';

describe('GET /api/google-ads/experiments/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('401 sem sessão', async () => {
    (getServerSession as any).mockResolvedValue(null);
    const req = new NextRequest('http://localhost');
    const res = await GET(req, { params: { id: 'e1' } } as any);
    expect(res.status).toBe(401);
  });

  test('200 success delegando pro orquestrador', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'u1' } });
    (getExperimentDetail as any).mockResolvedValue({ id: 'e1' });

    const req = new NextRequest('http://localhost');
    const res = await GET(req, { params: { id: 'e1' } } as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.id).toBe('e1');
  });

  test('Propaga erro custom do orquestrador (ex: 404)', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'u1' } });
    (getExperimentDetail as any).mockRejectedValue({ status: 404, message: 'Not Found' });

    const req = new NextRequest('http://localhost');
    const res = await GET(req, { params: { id: 'e1' } } as any);
    expect(res.status).toBe(404);
  });
});
