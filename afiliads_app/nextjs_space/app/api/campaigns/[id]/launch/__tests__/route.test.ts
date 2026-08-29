import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({
  executeLaunch: vi.fn(),
  getLaunchState: vi.fn(),
  getServerSession: vi.fn(),
}));

vi.mock('next-auth', () => ({ getServerSession: h.getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/launch/orchestrator', () => ({
  executeLaunch: h.executeLaunch,
  getLaunchState: h.getLaunchState,
}));

import { GET, POST } from '../route';

const params = Promise.resolve({ id: 'camp-1' });
const req = (body?: any) =>
  ({ json: async () => body ?? {}, headers: new Headers() }) as any;

describe('POST /api/campaigns/[id]/launch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.getServerSession.mockResolvedValue({ user: { id: 'u1' } });
    h.executeLaunch.mockResolvedValue({ success: true, logs: [], channels: [], replayed: false });
  });

  it('exige idempotencyKey — sem ela não há defesa contra lançamento duplicado', async () => {
    const res = await POST(req({ isMockMode: true }), { params });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain('idempotencyKey');
    expect(h.executeLaunch).not.toHaveBeenCalled();
  });

  it('recusa sessão ausente antes de tocar no orquestrador', async () => {
    h.getServerSession.mockResolvedValue(null);
    const res = await POST(req({ idempotencyKey: 'k1' }), { params });
    expect(res.status).toBe(401);
    expect(h.executeLaunch).not.toHaveBeenCalled();
  });

  it('repassa subconjunto de canais para reexecutar só o que falhou', async () => {
    await POST(req({ idempotencyKey: 'k1', channels: ['META_ADS'] }), { params });
    expect(h.executeLaunch).toHaveBeenCalledWith(
      expect.objectContaining({ campaignId: 'camp-1', userId: 'u1', channels: ['META_ADS'] }),
    );
  });

  it('rejeita canal desconhecido em vez de lançar em tudo', async () => {
    const res = await POST(req({ idempotencyKey: 'k1', channels: ['TIKTOK'] }), { params });
    expect(res.status).toBe(400);
    expect(h.executeLaunch).not.toHaveBeenCalled();
  });

  it('sem channels no corpo, deixa o orquestrador usar todos', async () => {
    await POST(req({ idempotencyKey: 'k1' }), { params });
    expect(h.executeLaunch).toHaveBeenCalledWith(
      expect.objectContaining({ channels: undefined }),
    );
  });

  it('recusa de regra é 422 com o corpo inteiro, não 500', async () => {
    h.executeLaunch.mockResolvedValue({
      success: false, logs: ['x'], error: 'Ledger de claims reprovado', channels: [], replayed: false,
    });
    const res = await POST(req({ idempotencyKey: 'k1' }), { params });
    expect(res.status).toBe(422);
    expect((await res.json()).error).toContain('Ledger de claims');
  });

  it('preflight reprovado devolve 422 com os canais para o painel desenhar', async () => {
    h.executeLaunch.mockResolvedValue({
      success: false,
      logs: ['[Google Ads] bloqueio: brand bidding'],
      error: 'Lançamento abortado: canal reprovado no preflight. Nada foi criado.',
      channels: [
        { channel: 'GOOGLE_ADS', label: 'Google Ads', status: 'FAILED', mode: 'MOCK', externalIds: {}, error: 'brand bidding', logs: [], alreadyExisted: false },
        { channel: 'META_ADS', label: 'Meta Ads', status: 'PENDING', mode: 'MOCK', externalIds: {}, error: null, logs: [], alreadyExisted: false },
      ],
      replayed: false,
    });
    const res = await POST(req({ idempotencyKey: 'k1' }), { params });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.channels.map((c: any) => c.status)).toEqual(['FAILED', 'PENDING']);
  });

  it('exceção de verdade continua sendo 500', async () => {
    h.executeLaunch.mockRejectedValue(new Error('conexão com o banco caiu'));
    const res = await POST(req({ idempotencyKey: 'k1' }), { params });
    expect(res.status).toBe(500);
    expect((await res.json()).error).toContain('conexão com o banco');
  });

  it('não deixa requestMock virar true por omissão', async () => {
    await POST(req({ idempotencyKey: 'k1' }), { params });
    expect(h.executeLaunch).toHaveBeenCalledWith(expect.objectContaining({ requestMock: false }));
  });
});

describe('GET /api/campaigns/[id]/launch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.getServerSession.mockResolvedValue({ user: { id: 'u1' } });
  });

  it('devolve o estado por canal do dono da campanha', async () => {
    h.getLaunchState.mockResolvedValue({ channels: [{ channel: 'GOOGLE_ADS' }], history: [] });
    const res = await GET(req(), { params });
    expect(res.status).toBe(200);
    expect(h.getLaunchState).toHaveBeenCalledWith('u1', 'camp-1');
  });

  it('recusa leitura sem sessão', async () => {
    h.getServerSession.mockResolvedValue(null);
    const res = await GET(req(), { params });
    expect(res.status).toBe(401);
    expect(h.getLaunchState).not.toHaveBeenCalled();
  });
});
