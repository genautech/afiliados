import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({
  campaign: { findFirst: vi.fn(), update: vi.fn() },
  channelLaunch: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
  claimLedgerEntry: { aggregate: vi.fn(), findMany: vi.fn() },
  google: { preflight: vi.fn(), create: vi.fn(), compensate: vi.fn() },
  meta: { preflight: vi.fn(), create: vi.fn(), compensate: vi.fn() },
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    campaign: h.campaign,
    channelLaunch: h.channelLaunch,
    claimLedgerEntry: h.claimLedgerEntry,
  },
}));

vi.mock('./google-adapter', () => ({
  googleAdsAdapter: {
    channel: 'GOOGLE_ADS', label: 'Google Ads',
    preflight: h.google.preflight, create: h.google.create, compensate: h.google.compensate,
  },
}));

vi.mock('./meta-adapter', () => ({
  metaAdsAdapter: {
    channel: 'META_ADS', label: 'Meta Ads',
    preflight: h.meta.preflight, create: h.meta.create, compensate: h.meta.compensate,
  },
}));

import { executeLaunch } from './orchestrator';

const base = { userId: 'u1', campaignId: 'c1', idempotencyKey: 'k1' };
const ready = { ready: true, mode: 'MOCK' as const, errors: [], warnings: [] };

beforeEach(() => {
  vi.clearAllMocks();
  h.campaign.findFirst.mockResolvedValue({ id: 'c1', userId: 'u1' });
  h.campaign.update.mockResolvedValue({});
  h.channelLaunch.findMany.mockResolvedValue([]);
  h.channelLaunch.create.mockImplementation(({ data }: any) =>
    Promise.resolve({ id: `row-${data.channel}`, ...data }));
  h.channelLaunch.update.mockResolvedValue({});
  h.claimLedgerEntry.aggregate.mockResolvedValue({ _max: { version: null } });
  h.claimLedgerEntry.findMany.mockResolvedValue([]);
  h.google.preflight.mockResolvedValue(ready);
  h.meta.preflight.mockResolvedValue(ready);
  h.google.create.mockResolvedValue({ externalIds: { campaign: 'g1' }, mode: 'MOCK', logs: ['google ok'] });
  h.meta.create.mockResolvedValue({ externalIds: { campaign: 'm1' }, mode: 'MOCK', logs: ['meta ok'] });
});

describe('executeLaunch', () => {
  it('lança os dois canais e marca sucesso', async () => {
    const r = await executeLaunch(base);
    expect(r.success).toBe(true);
    expect(r.channels.map(c => c.status)).toEqual(['SUCCESS', 'SUCCESS']);
    expect(h.google.create).toHaveBeenCalledOnce();
    expect(h.meta.create).toHaveBeenCalledOnce();
  });

  it('bloqueia quando o ledger de claims reprova, sem chamar canal nenhum', async () => {
    h.claimLedgerEntry.aggregate.mockResolvedValue({ _max: { version: 2 } });
    h.claimLedgerEntry.findMany.mockResolvedValue([
      { id: 'x', claim: 'Ganho garantido', status: 'PROIBIDO', source: null, allowedChannels: ['google-ads'] },
    ]);
    const r = await executeLaunch(base);
    expect(r.success).toBe(false);
    expect(r.error).toContain('Ledger de claims reprovado');
    expect(h.google.create).not.toHaveBeenCalled();
    expect(h.meta.create).not.toHaveBeenCalled();
  });

  it('bypassReadiness não pula o gate de claims', async () => {
    h.claimLedgerEntry.aggregate.mockResolvedValue({ _max: { version: 1 } });
    h.claimLedgerEntry.findMany.mockResolvedValue([
      { id: 'x', claim: 'Cura garantida', status: 'PROIBIDO', source: null, allowedChannels: ['meta-ads'] },
    ]);
    const r = await executeLaunch({ ...base, bypassReadiness: true });
    expect(r.success).toBe(false);
    expect(h.google.create).not.toHaveBeenCalled();
  });

  it('preflight reprovado em um canal impede que qualquer canal suba', async () => {
    h.meta.preflight.mockResolvedValue({ ready: false, mode: 'MOCK', errors: ['sem pixel'], warnings: [] });
    const r = await executeLaunch(base);
    expect(r.success).toBe(false);
    expect(r.channels.find(c => c.channel === 'META_ADS')?.status).toBe('FAILED');
    // O canal aprovado NÃO sobe: meio-lançamento é o que este bloco impede.
    expect(r.channels.find(c => c.channel === 'GOOGLE_ADS')?.status).toBe('PENDING');
    expect(h.google.create).not.toHaveBeenCalled();
    expect(h.meta.create).not.toHaveBeenCalled();
  });

  it('bloqueio de preflight vira linha no banco, para o painel não esquecer', async () => {
    h.meta.preflight.mockResolvedValue({ ready: false, mode: 'MOCK', errors: ['sem pixel'], warnings: [] });
    await executeLaunch(base);
    const gravados = h.channelLaunch.create.mock.calls.map((c: any) => c[0].data);
    const metaRow = gravados.find((d: any) => d.channel === 'META_ADS');
    expect(metaRow).toMatchObject({ status: 'FAILED', idempotencyKey: base.idempotencyKey });
    expect(metaRow.error).toContain('sem pixel');
    // O canal que nem chegou a rodar não inventa linha.
    expect(gravados.find((d: any) => d.channel === 'GOOGLE_ADS')).toBeUndefined();
  });

  it('canal isolado reprovado não arrasta ninguém: só ele volta reprovado', async () => {
    h.google.preflight.mockResolvedValue({ ready: false, mode: 'MOCK', errors: ['brand bidding'], warnings: [] });
    const r = await executeLaunch({ ...base, channels: ['GOOGLE_ADS'] });
    expect(r.success).toBe(false);
    expect(r.channels).toHaveLength(1);
    expect(r.channels[0]).toMatchObject({ channel: 'GOOGLE_ADS', status: 'FAILED' });
    expect(h.meta.preflight).not.toHaveBeenCalled();
  });

  it('compensa o canal que subiu quando o seguinte falha', async () => {
    h.meta.create.mockRejectedValue(new Error('token expirado'));
    h.google.compensate.mockResolvedValue({ ok: true, logs: ['google pausado'] });
    const r = await executeLaunch(base);
    expect(r.success).toBe(false);
    expect(h.google.compensate).toHaveBeenCalledWith(expect.anything(), { campaign: 'g1' });
    expect(r.channels.find(c => c.channel === 'GOOGLE_ADS')?.status).toBe('COMPENSATED');
  });

  it('grita quando a própria compensação falha', async () => {
    h.meta.create.mockRejectedValue(new Error('token expirado'));
    h.google.compensate.mockRejectedValue(new Error('API fora do ar'));
    const r = await executeLaunch(base);
    expect(r.logs.join(' ')).toContain('COMPENSAÇÃO FALHOU');
    expect(r.success).toBe(false);
  });

  it('replay: chave já concluída não reexecuta nada', async () => {
    h.channelLaunch.findMany.mockResolvedValue([
      { channel: 'GOOGLE_ADS', status: 'SUCCESS', mode: 'LIVE', externalIds: { campaign: 'g1' }, error: null, logs: [] },
      { channel: 'META_ADS', status: 'SUCCESS', mode: 'LIVE', externalIds: { campaign: 'm1' }, error: null, logs: [] },
    ]);
    const r = await executeLaunch(base);
    expect(r.success).toBe(true);
    expect(r.replayed).toBe(true);
    expect(h.google.create).not.toHaveBeenCalled();
  });

  it('corrida na mesma chave: P2002 no lock não vira criação duplicada', async () => {
    h.channelLaunch.create.mockRejectedValueOnce(Object.assign(new Error('dup'), { code: 'P2002' }));
    h.channelLaunch.findFirst.mockResolvedValue({
      channel: 'GOOGLE_ADS', status: 'FAILED', mode: 'MOCK',
      externalIds: {}, error: 'falhou antes', logs: ['tentativa anterior'],
    });
    const r = await executeLaunch(base);
    expect(h.google.create).not.toHaveBeenCalled();
    expect(h.meta.create).toHaveBeenCalledOnce();
    // O canal travado pelo lock não some do painel: aparece com o que ficou gravado.
    expect(r.channels.map(c => c.channel)).toEqual(['GOOGLE_ADS', 'META_ADS']);
    const g = r.channels.find(c => c.channel === 'GOOGLE_ADS')!;
    expect(g.status).toBe('FAILED');
    expect(g.error).toBe('falhou antes');
    expect(g.alreadyExisted).toBe(true);
  });

  it('P2002 com linha sumida não inventa canal no painel', async () => {
    h.channelLaunch.create.mockRejectedValueOnce(Object.assign(new Error('dup'), { code: 'P2002' }));
    h.channelLaunch.findFirst.mockResolvedValue(null);
    const r = await executeLaunch(base);
    expect(r.channels.map(c => c.channel)).toEqual(['META_ADS']);
  });

  it('A01: canal LIVE deixa a campanha em PENDING_LAUNCH, nunca ATIVA', async () => {
    await executeLaunch(base);
    const mockCall = h.campaign.update.mock.calls.at(-1)?.[0];
    expect(mockCall.data.status).toBeUndefined();

    vi.clearAllMocks();
    h.campaign.findFirst.mockResolvedValue({ id: 'c1', userId: 'u1' });
    h.channelLaunch.findMany.mockResolvedValue([]);
    h.channelLaunch.create.mockImplementation(({ data }: any) => Promise.resolve({ id: 'r', ...data }));
    h.claimLedgerEntry.aggregate.mockResolvedValue({ _max: { version: null } });
    h.google.preflight.mockResolvedValue({ ...ready, mode: 'LIVE' });
    h.meta.preflight.mockResolvedValue({ ...ready, mode: 'LIVE' });
    h.google.create.mockResolvedValue({ externalIds: { campaign: 'g1' }, mode: 'LIVE', logs: [] });
    h.meta.create.mockResolvedValue({ externalIds: { campaign: 'm1' }, mode: 'LIVE', logs: [] });
    await executeLaunch({ ...base, idempotencyKey: 'k2' });
    // O adapter cria a campanha PAUSED no anunciante: ATIVA aqui seria mentira do painel.
    expect(h.campaign.update.mock.calls.at(-1)?.[0].data.status).toBe('PENDING_LAUNCH');
  });
});
