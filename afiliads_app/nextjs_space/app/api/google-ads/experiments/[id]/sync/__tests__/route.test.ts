import { expect, test, describe, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import { NextRequest } from 'next/server';

vi.mock('next-auth', () => ({
  getServerSession: vi.fn()
}));

vi.mock('../../../../../../../lib/google-ads-experiments/orchestration', () => ({
  syncExperiment: vi.fn()
}));

import { getServerSession } from 'next-auth';
import { syncExperiment } from '../../../../../../../lib/google-ads-experiments/orchestration';

describe('POST /api/google-ads/experiments/[id]/sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('401 sem sessão', async () => {
    (getServerSession as any).mockResolvedValue(null);
    const req = new NextRequest('http://localhost', { method: 'POST' });
    const res = await POST(req, { params: { id: 'e1' } } as any);
    expect(res.status).toBe(401);
  });

  test('200 success delegando pro orquestrador', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'u1' } });
    (syncExperiment as any).mockResolvedValue({ success: true, changed: true, status: 'RUNNING' });

    const req = new NextRequest('http://localhost', { method: 'POST' });
    const res = await POST(req, { params: { id: 'e1' } } as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.changed).toBe(true);
  });

  test('Propaga erro custom do orquestrador (ex: 502)', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'u1' } });
    (syncExperiment as any).mockRejectedValue({ status: 502, message: 'Google Ads Error' });

    const req = new NextRequest('http://localhost', { method: 'POST' });
    const res = await POST(req, { params: { id: 'e1' } } as any);
    expect(res.status).toBe(502);
  });
});
