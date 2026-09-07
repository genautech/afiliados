import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { findMany } = vi.hoisted(() => ({
  findMany: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    integration: { findMany },
    user: { findUnique: vi.fn() },
  },
}));
vi.mock('next-auth', () => ({ getServerSession: vi.fn().mockResolvedValue(null) }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));

import { POST } from '../route';
import { resetTrackingGuardState } from '@/lib/tracking-guard';

describe('POST /api/tracking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetTrackingGuardState();
    findMany.mockResolvedValue([]);
    vi.stubEnv('META_PIXEL_ID', '');
    vi.stubEnv('META_ACCESS_TOKEN', '');
  });

  it('rejeita requisição sem eventName', async () => {
    const response = await POST(new NextRequest('http://localhost/api/tracking', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'content-type': 'application/json' },
    }));
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toContain('eventName é obrigatório');
  });

  it('rejeita se pixelId não estiver configurado ou fornecido', async () => {
    const response = await POST(new NextRequest('http://localhost/api/tracking', {
      method: 'POST',
      body: JSON.stringify({ eventName: 'PageView' }),
      headers: { 'content-type': 'application/json' },
    }));
    expect(response.status).toBe(422);
    const json = await response.json();
    expect(json.error).toContain('pixelId não configurado ou fornecido');
  });

  it('despacha evento formatado com sucesso para a API do Meta', async () => {
    // Credencial vem do ambiente/integração — o body não aceita mais accessToken (S02).
    vi.stubEnv('META_ACCESS_TOKEN', 'mock-token');
    // Mock global fetch for meta CAPI
    const globalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ events_received: 1 })),
    }) as any;

    try {
      const response = await POST(new NextRequest('http://localhost/api/tracking', {
        method: 'POST',
        body: JSON.stringify({
          eventName: 'PageView',
          pixelId: '123456789',
          userData: {
            email: 'test@example.com',
            firstName: 'Genautech',
          },
        }),
        headers: { 'content-type': 'application/json' },
      }));

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.metaResponse.events_received).toBe(1);

      // Verify that the email was hashed in SHA256 format
      const lastFetchBody = JSON.parse((vi.mocked(global.fetch).mock.calls[0][1] as any).body);
      const userData = lastFetchBody.data[0].user_data;
      expect(userData.em[0]).toBe('973dfe463ec85785f5f95af5ba3906eedb2d931c24e69824a89ea65dba4e813b'); // sha256 of test@example.com
      expect(userData.fn[0]).toBe('29c16f6e7c677efced93455e1e51a215379d2a30b58de0f6505f2cb015c117d1'); // sha256 of genautech
    } finally {
      global.fetch = globalFetch;
    }
  });
});
