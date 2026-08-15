import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { getSession, upsert, findMany } = vi.hoisted(() => ({
  getSession: vi.fn(),
  upsert: vi.fn(),
  findMany: vi.fn(),
}));
vi.mock('next-auth', () => ({ getServerSession: getSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    integration: { upsert, findMany },
    agentRun: { groupBy: vi.fn().mockResolvedValue([]), create: vi.fn() },
  },
}));

import { GET, POST } from '../route';

describe('POST /api/integrations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSession.mockResolvedValue({ user: { id: 'u1' } });
    upsert.mockResolvedValue({ id: 'i1', serviceName: 'llm', fieldName: 'api_key_openai' });
    findMany.mockResolvedValue([]);
    process.env.INTEGRATION_ENCRYPTION_KEY = Buffer.alloc(32, 3).toString('base64');
  });

  it('rejeita model override fora da allowlist sem persistir', async () => {
    const response = await POST(new NextRequest('http://localhost/api/integrations', {
      method: 'POST',
      body: JSON.stringify({ serviceName: 'llm', fieldName: 'model_openai', fieldValue: 'gpt-unknown' }),
      headers: { 'content-type': 'application/json' },
    }));
    expect(response.status).toBe(400);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('criptografa BYOK antes do upsert', async () => {
    const response = await POST(new NextRequest('http://localhost/api/integrations', {
      method: 'POST',
      body: JSON.stringify({ serviceName: 'llm', fieldName: 'api_key_openai', fieldValue: 'sentinel-secret' }),
      headers: { 'content-type': 'application/json' },
    }));
    expect(response.status).toBe(200);
    const input = upsert.mock.calls[0][0];
    expect(input.create.fieldValue).toMatch(/^enc:v1:/);
    expect(input.create.fieldValue).not.toContain('sentinel-secret');
  });

  it('mascara campos sensíveis legados independentemente de maiúsculas', async () => {
    findMany.mockResolvedValue([{ id: 'legacy', serviceName: 'other', fieldName: 'API_TOKEN', fieldValue: 'legacy-secret' }]);
    const response = await GET();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([
      expect.objectContaining({ fieldName: 'API_TOKEN', fieldValue: '••••••••' }),
    ]);
  });
});
