// M04 — upsert parcial. O update antigo escrevia 0/null em todo campo ausente do body:
// um POST só com `spend` (sync do Google Ads) apagava a receita que o sync do ClickBank
// tinha gravado no mesmo dia.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';

const mocks = vi.hoisted(() => ({
  campaignFindFirst: vi.fn(),
  dailyLogUpsert: vi.fn(),
  userFindUnique: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    campaign: { findFirst: mocks.campaignFindFirst },
    dailyLog: { upsert: mocks.dailyLogUpsert, findMany: vi.fn() },
    user: { findUnique: mocks.userFindUnique },
  },
}));
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/loop-engine', () => ({ runCampaignLoop: vi.fn().mockResolvedValue({}) }));

import { POST, buildPartialUpdate } from '../route';

function req(body: unknown) {
  return new NextRequest('http://localhost/api/daily-logs', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

describe('M04 — atualização parcial do DailyLog', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-1' } } as never);
    mocks.campaignFindFirst.mockResolvedValue({
      platform: 'ClickBank', vertical: 'Weight Loss', geo: 'US',
      channel: 'SEARCH', funnel: 'BRIDGE', name: 'camp-1', loopEnabled: false,
    });
    mocks.dailyLogUpsert.mockResolvedValue({ id: 'log-1' });
  });

  it('POST só com spend não menciona revenue no update', async () => {
    await POST(req({ campaignId: 'c1', logDate: '2026-09-01', spend: 50 }));

    const update = mocks.dailyLogUpsert.mock.calls[0][0].update;
    expect(update.spend).toBe(50);
    expect(update).not.toHaveProperty('revenue');
    expect(update).not.toHaveProperty('refunds');
    expect(update).not.toHaveProperty('conversions');
  });

  it('POST com revenue=0 explícito grava zero (zerar de propósito continua possível)', async () => {
    await POST(req({ campaignId: 'c1', logDate: '2026-09-01', revenue: 0 }));

    const update = mocks.dailyLogUpsert.mock.calls[0][0].update;
    expect(update.revenue).toBe(0);
  });

  it('create ainda preenche os campos ausentes com zero', async () => {
    await POST(req({ campaignId: 'c1', logDate: '2026-09-01', spend: 50 }));

    const create = mocks.dailyLogUpsert.mock.calls[0][0].create;
    expect(create.spend).toBe(50);
    expect(create.revenue).toBe(0);
  });
});

describe('M04 — buildPartialUpdate', () => {
  it('ignora ausente e null, aceita zero', () => {
    expect(buildPartialUpdate({ spend: 50, revenue: null, clicks: 0 })).toEqual({ spend: 50, clicks: 0 });
  });

  it('descarta número inválido em vez de gravar NaN', () => {
    expect(buildPartialUpdate({ spend: 'abc' })).toEqual({});
  });

  it('converte string numérica', () => {
    expect(buildPartialUpdate({ spend: '12.5' })).toEqual({ spend: 12.5 });
  });
});
