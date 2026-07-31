import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('../../../../../../../lib/google-ads-experiments/orchestration', () => ({
  scheduleExperimentLifecycle: vi.fn(),
}));

import { getServerSession } from 'next-auth';
import { scheduleExperimentLifecycle } from '../../../../../../../lib/google-ads-experiments/orchestration';

const payload = {
  authorization: {
    confirmed: true,
    operation: 'SCHEDULE_EXPERIMENT',
    resourceId: 'exp_1',
    revision: '2030-01-15T00:00:00.000Z',
    idempotencyKey: 'schedule-key-123',
  },
};

describe('POST /api/google-ads/experiments/[id]/schedule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna 401 antes do orquestrador sem sessão', async () => {
    (getServerSession as any).mockResolvedValue(null);
    const request = new NextRequest('http://localhost', { method: 'POST', body: JSON.stringify(payload) });
    const response = await POST(request, { params: { id: 'exp_1' } } as any);
    expect(response.status).toBe(401);
    expect(scheduleExperimentLifecycle).not.toHaveBeenCalled();
  });

  it('retorna 400 para JSON inválido', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'user_1' } });
    const request = new NextRequest('http://localhost', { method: 'POST', body: '{' });
    const response = await POST(request, { params: { id: 'exp_1' } } as any);
    expect(response.status).toBe(400);
    expect(scheduleExperimentLifecycle).not.toHaveBeenCalled();
  });

  it('delega id do path, user autenticado e payload ao orquestrador', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'user_1' } });
    (scheduleExperimentLifecycle as any).mockResolvedValue({ success: true, operation: { status: 'PENDING' } });
    const request = new NextRequest('http://localhost', { method: 'POST', body: JSON.stringify(payload) });
    const response = await POST(request, { params: { id: 'exp_1' } } as any);
    expect(response.status).toBe(200);
    expect(scheduleExperimentLifecycle).toHaveBeenCalledWith({ id: 'exp_1', userId: 'user_1', payload });
  });
});
