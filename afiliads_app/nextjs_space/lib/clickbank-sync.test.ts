// M01 — ponta a ponta do syncClickbank: transação de teste não pode chegar ao DailyLog.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  integrationFindMany: vi.fn(),
  integrationUpsert: vi.fn(),
  campaignFindMany: vi.fn(),
  dailyLogUpsert: vi.fn(),
}));

vi.mock('./prisma', () => ({
  prisma: {
    integration: { findMany: mocks.integrationFindMany, upsert: mocks.integrationUpsert },
    campaign: { findMany: mocks.campaignFindMany },
    dailyLog: { upsert: mocks.dailyLogUpsert },
  },
}));
vi.mock('./integration-secrets', () => ({
  readIntegrationFieldValue: (_f: string, v: string) => v,
}));

import { syncClickbank } from './clickbank';

function txn(txnType: string, amount: number) {
  return {
    txnType,
    transactionTime: '2026-09-01T10:00:00Z',
    trackingId: 'camp-neurovera',
    vendor: 'v',
    item: null,
    totalAccountAmount: amount,
    receipt: `r-${txnType}-${amount}`,
  };
}

describe('M01 — syncClickbank ignora transação de teste', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.integrationFindMany.mockResolvedValue([
      { fieldName: 'api_key', fieldValue: 'cb-key-real' },
      { fieldName: 'account_nickname', fieldValue: 'nick' },
    ]);
    mocks.campaignFindMany.mockResolvedValue([
      { id: 'c1', name: 'camp-neurovera', utmCampaign: 'camp-neurovera' },
    ]);
    mocks.dailyLogUpsert.mockResolvedValue({});
    mocks.integrationUpsert.mockResolvedValue({});
  });

  function mockOrders(rows: any[]) {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ orderData: rows }),
    } as any);
  }

  it('TEST_SALE de 50 não vira receita', async () => {
    mockOrders([txn('TEST_SALE', 50)]);
    const res = await syncClickbank('user-1', 3);

    expect(res.ok).toBe(true);
    expect(res.testTransactionsIgnored).toBe(1);
    expect(mocks.dailyLogUpsert).not.toHaveBeenCalled();
    expect(res.matched).toHaveLength(0);
  });

  it('SALE de 50 vira receita 50', async () => {
    mockOrders([txn('SALE', 50)]);
    const res = await syncClickbank('user-1', 3);

    expect(res.testTransactionsIgnored).toBe(0);
    expect(mocks.dailyLogUpsert).toHaveBeenCalledTimes(1);
    const dados = mocks.dailyLogUpsert.mock.calls[0][0];
    expect(dados.update.revenue).toBe(50);
    expect(dados.update.conversions).toBe(1);
  });

  it('mistura de real e teste conta só o real', async () => {
    mockOrders([txn('SALE', 50), txn('TEST_SALE', 999), txn('TEST_BILL', 999), txn('RFND', -10)]);
    const res = await syncClickbank('user-1', 3);

    expect(res.testTransactionsIgnored).toBe(2);
    const dados = mocks.dailyLogUpsert.mock.calls[0][0];
    expect(dados.update.revenue).toBe(50);
    expect(dados.update.conversions).toBe(1);
    expect(dados.update.refunds).toBe(10);
  });

  it('TEST_RFND não infla o reembolso', async () => {
    mockOrders([txn('SALE', 50), txn('TEST_RFND', -50)]);
    const res = await syncClickbank('user-1', 3);

    expect(res.testTransactionsIgnored).toBe(1);
    expect(mocks.dailyLogUpsert.mock.calls[0][0].update.refunds).toBe(0);
  });
});
