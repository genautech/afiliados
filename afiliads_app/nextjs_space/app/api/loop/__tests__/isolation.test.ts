// S01 — isolamento do loop por usuário.
// Antes: /api/loop/run sem campaignId chamava runDueLoops('manual') sem userId, e o engine
// varria as campanhas de TODAS as contas — qualquer usuário logado disparava loop (e pausa
// automática no Google Ads) em campanha de terceiro.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  runCampaignLoop: vi.fn(),
  runComplianceOnlyCheck: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: { campaign: { findMany: mocks.findMany }, user: { findUnique: vi.fn() } },
}));
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));

import { runDueLoops } from '@/lib/loop-engine';
import { POST } from '../run/route';
import { POST as CRON_POST } from '../cron/route';

function request(body?: string, headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost/api/loop/run', { method: 'POST', body, headers });
}

describe('S01 — isolamento do loop', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.findMany.mockResolvedValue([]);
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-1' } } as never);
  });

  it('varredura de usuário filtra as campanhas por userId no banco', async () => {
    await runDueLoops('manual', { kind: 'user', userId: 'user-1' });
    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: 'user-1' }) }),
    );
  });

  it('varredura global não filtra por usuário — e só é alcançável pelo cron', async () => {
    await runDueLoops('cron', { kind: 'all-users', reason: 'teste' });
    const where = mocks.findMany.mock.calls[0][0].where;
    expect(where).not.toHaveProperty('userId');
  });

  it('escopo de usuário sem userId falha fechado', async () => {
    await expect(runDueLoops('manual', { kind: 'user', userId: '' })).rejects.toThrow(/userId/);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it('POST sem campaignId roda apenas as campanhas do usuário autenticado', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-2' } } as never);
    const res = await POST(request());
    expect(res.status).toBe(200);
    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: 'user-2' }) }),
    );
  });

  it('POST com JSON malformado devolve 400 em vez de virar varredura', async () => {
    const res = await POST(request('{isso não é json'));
    expect(res.status).toBe(400);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it('POST sem sessão devolve 401 e não toca no banco', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null as never);
    const res = await POST(request());
    expect(res.status).toBe(401);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });
});

describe('S01 — /api/loop/cron', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.findMany.mockResolvedValue([]);
    vi.unstubAllEnvs();
  });

  function cronRequest(headers: Record<string, string> = {}) {
    return new NextRequest('http://localhost/api/loop/cron', { method: 'POST', headers });
  }

  it('sem LOOP_CRON_SECRET configurado, nega tudo (fail-closed)', async () => {
    vi.stubEnv('LOOP_CRON_SECRET', '');
    const res = await CRON_POST(cronRequest({ 'x-loop-cron-secret': 'qualquer' }));
    expect(res.status).toBe(401);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it('segredo errado é rejeitado', async () => {
    vi.stubEnv('LOOP_CRON_SECRET', 'segredo-certo');
    const res = await CRON_POST(cronRequest({ 'x-loop-cron-secret': 'segredo-errado' }));
    expect(res.status).toBe(401);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it('segredo correto libera a varredura global', async () => {
    vi.stubEnv('LOOP_CRON_SECRET', 'segredo-certo');
    const res = await CRON_POST(cronRequest({ 'x-loop-cron-secret': 'segredo-certo' }));
    expect(res.status).toBe(200);
    const where = mocks.findMany.mock.calls[0][0].where;
    expect(where).not.toHaveProperty('userId');
  });
});
