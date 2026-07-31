import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('../../../../../../../lib/google-ads-experiments/orchestration', () => ({
  runExperimentAction: vi.fn(),
}));

import { getServerSession } from 'next-auth';
import { runExperimentAction } from '../../../../../../../lib/google-ads-experiments/orchestration';

const payload = {
  action: 'END',
  authorization: {
    confirmed: true,
    operation: 'END_EXPERIMENT',
    resourceId: 'exp_1',
    revision: '2030-01-15T00:00:00.000Z',
    idempotencyKey: 'end-action-key-123',
  },
};

describe('POST /api/google-ads/experiments/[id]/actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna 401 sem sessão e não delega', async () => {
    (getServerSession as any).mockResolvedValue(null);
    const request = new NextRequest('http://localhost', { method: 'POST', body: JSON.stringify(payload) });
    const response = await POST(request, { params: { id: 'exp_1' } } as any);
    expect(response.status).toBe(401);
    expect(runExperimentAction).not.toHaveBeenCalled();
  });

  it('retorna 400 para JSON inválido', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'user_1' } });
    const request = new NextRequest('http://localhost', { method: 'POST', body: '{' });
    const response = await POST(request, { params: { id: 'exp_1' } } as any);
    expect(response.status).toBe(400);
    expect(runExperimentAction).not.toHaveBeenCalled();
  });

  it('delega somente identidade do path, usuário autenticado e payload', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'user_1' } });
    (runExperimentAction as any).mockResolvedValue({ success: true });
    const request = new NextRequest('http://localhost', { method: 'POST', body: JSON.stringify(payload) });
    const response = await POST(request, { params: { id: 'exp_1' } } as any);
    expect(response.status).toBe(200);
    expect(runExperimentAction).toHaveBeenCalledWith({ id: 'exp_1', userId: 'user_1', payload });
  });
});
