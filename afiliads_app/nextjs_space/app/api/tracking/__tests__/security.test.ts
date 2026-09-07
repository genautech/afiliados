// S02 — /api/tracking aceitava Purchase anônimo e credencial no body.
// Cada caso aqui reproduz um caminho que estava aberto.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';

const mocks = vi.hoisted(() => ({ findMany: vi.fn(), findUnique: vi.fn() }));

vi.mock('@/lib/prisma', () => ({
  prisma: { integration: { findMany: mocks.findMany }, user: { findUnique: mocks.findUnique } },
}));
vi.mock('@/lib/integration-secrets', () => ({
  readIntegrationFieldValue: (_f: string, v: string) => v,
}));
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));

import { POST } from '../route';
import { RATE_LIMIT_MAX, resetTrackingGuardState } from '@/lib/tracking-guard';

function req(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost/api/tracking', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json', ...headers },
  });
}

const integracaoMeta = [
  { fieldName: 'pixel_id', fieldValue: '123456789' },
  { fieldName: 'access_token', fieldValue: 'token-da-conta' },
];

describe('S02 — autenticação de eventos de tracking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetTrackingGuardState();
    mocks.findMany.mockResolvedValue([]);
    vi.mocked(getServerSession).mockResolvedValue(null as never);
    vi.stubEnv('META_PIXEL_ID', '');
    vi.stubEnv('META_ACCESS_TOKEN', '');
  });

  it('Purchase anônimo é rejeitado com 401', async () => {
    const res = await POST(req({
      eventName: 'Purchase',
      userId: 'vitima-1',
      customData: { value: 9999, currency: 'USD' },
      userData: {},
    }));
    expect(res.status).toBe(401);
    // e não chegou a buscar credencial de ninguém
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it('accessToken no body é recusado — era proxy anônimo para a CAPI', async () => {
    const res = await POST(req({
      eventName: 'PageView',
      pixelId: '999',
      accessToken: 'token-do-atacante',
      userData: {},
    }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain('accessToken');
  });

  it('Purchase autenticado sem integração Meta vinculada devolve 403', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-1' } } as never);
    mocks.findMany.mockResolvedValue([]);
    const res = await POST(req({ eventName: 'Purchase', userData: {}, customData: { value: 10 } }));
    expect(res.status).toBe(403);
  });

  it('Purchase autenticado usa a conta da sessão, ignorando o userId do body', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-1' } } as never);
    mocks.findMany.mockResolvedValue(integracaoMeta);
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true, text: async () => JSON.stringify({ events_received: 1 }),
    } as any);

    const res = await POST(req({
      eventName: 'Purchase',
      userId: 'vitima-1',
      userData: {},
      customData: { value: 10 },
    }));

    expect(res.status).toBe(200);
    expect(mocks.findMany).toHaveBeenCalledWith({ where: { userId: 'user-1', serviceName: 'meta' } });
    fetchSpy.mockRestore();
  });

  it('PageView anônimo continua funcionando', async () => {
    mocks.findMany.mockResolvedValue(integracaoMeta);
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true, text: async () => JSON.stringify({ events_received: 1 }),
    } as any);

    const res = await POST(req({ eventName: 'PageView', userId: 'dono-do-pixel', userData: {} }));
    expect(res.status).toBe(200);
    fetchSpy.mockRestore();
  });

  it('PageView anônimo é limitado por IP', async () => {
    mocks.findMany.mockResolvedValue(integracaoMeta);
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true, text: async () => JSON.stringify({ events_received: 1 }),
    } as any);

    const headers = { 'x-forwarded-for': '203.0.113.7' };
    for (let i = 0; i < RATE_LIMIT_MAX; i++) {
      const ok = await POST(req({ eventName: 'PageView', userId: 'dono', userData: {} }, headers));
      expect(ok.status).toBe(200);
    }
    const bloqueado = await POST(req({ eventName: 'PageView', userId: 'dono', userData: {} }, headers));
    expect(bloqueado.status).toBe(429);
    fetchSpy.mockRestore();
  });

  it('eventId repetido é deduplicado sem reenviar para o Meta', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-1' } } as never);
    mocks.findMany.mockResolvedValue(integracaoMeta);
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true, text: async () => JSON.stringify({ events_received: 1 }),
    } as any);

    const payload = { eventName: 'Purchase', eventId: 'evt-1', userData: {}, customData: { value: 10 } };
    const primeiro = await POST(req(payload));
    const segundo = await POST(req(payload));

    expect(primeiro.status).toBe(200);
    expect((await primeiro.json()).deduplicated).toBeUndefined();
    expect((await segundo.json()).deduplicated).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    fetchSpy.mockRestore();
  });
});

describe('R02/R03 — dedup com ciclo de vida e integração da conta', () => {
  const respostaOk = () => ({ ok: true, text: async () => JSON.stringify({ events_received: 1 }) } as any);
  const resposta503 = () => ({ ok: false, status: 503, text: async () => JSON.stringify({ error: 'unavailable' }) } as any);

  beforeEach(() => {
    vi.clearAllMocks();
    resetTrackingGuardState();
    mocks.findMany.mockResolvedValue(integracaoMeta);
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-1' } } as never);
    vi.stubEnv('META_PIXEL_ID', '');
    vi.stubEnv('META_ACCESS_TOKEN', '');
  });

  it('R02 — 503 do Meta não vira falso-positivo: o retry é reenviado', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch')
      .mockResolvedValueOnce(resposta503())
      .mockResolvedValueOnce(respostaOk());

    const payload = { eventName: 'Purchase', eventId: 'evt-503', userData: {}, customData: { value: 10 } };
    const falha = await POST(req(payload));
    expect(falha.status).toBe(503);
    expect((await falha.json()).retryable).toBe(true);

    const retry = await POST(req(payload));
    expect(retry.status).toBe(200);
    expect((await retry.json()).deduplicated).toBeUndefined();
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    fetchSpy.mockRestore();
  });

  it('R02 — queda de rede também libera o retry', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch')
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockResolvedValueOnce(respostaOk());

    const payload = { eventName: 'Purchase', eventId: 'evt-rede', userData: {}, customData: { value: 10 } };
    const falha = await POST(req(payload));
    expect(falha.status).toBe(502);

    const retry = await POST(req(payload));
    expect(retry.status).toBe(200);
    expect((await retry.json()).deduplicated).toBeUndefined();
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    fetchSpy.mockRestore();
  });

  it('R02 — mesmo eventId em contas diferentes não colide', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(respostaOk());
    const payload = { eventName: 'Purchase', eventId: 'evt-1', userData: {}, customData: { value: 10 } };

    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'conta-a' } } as never);
    const a = await POST(req(payload));
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'conta-b' } } as never);
    const b = await POST(req(payload));

    expect((await a.json()).deduplicated).toBeUndefined();
    expect((await b.json()).deduplicated).toBeUndefined();
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    fetchSpy.mockRestore();
  });

  it('R02 — mesmo eventId em eventos diferentes não colide', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(respostaOk());

    const lead = await POST(req({ eventName: 'Lead', eventId: 'evt-1', userData: {} }));
    const compra = await POST(req({ eventName: 'Purchase', eventId: 'evt-1', userData: {}, customData: { value: 10 } }));

    expect((await lead.json()).deduplicated).toBeUndefined();
    expect((await compra.json()).deduplicated).toBeUndefined();
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    fetchSpy.mockRestore();
  });

  it('R03 — credencial global no .env não bloqueia nem sequestra a conta com integração', async () => {
    vi.stubEnv('META_PIXEL_ID', 'pixel-global');
    vi.stubEnv('META_ACCESS_TOKEN', 'token-global');
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(respostaOk());

    const res = await POST(req({ eventName: 'Purchase', userData: {}, customData: { value: 10 } }));

    expect(res.status).toBe(200);
    expect(mocks.findMany).toHaveBeenCalledWith({ where: { userId: 'user-1', serviceName: 'meta' } });
    const url = String(fetchSpy.mock.calls[0][0]);
    expect(url).toContain('123456789');
    expect(url).not.toContain('pixel-global');
    expect(url).toContain('token-da-conta');
    expect(url).not.toContain('token-global');
    fetchSpy.mockRestore();
  });
});
