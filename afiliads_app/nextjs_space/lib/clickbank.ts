import { prisma } from './prisma';

const CB_API = 'https://api.clickbank.com/rest/1.3';

export interface CbTransaction {
  transactionTime: string;
  txnType: string;
  trackingId: string | null;
  vendor: string;
  item: string | null;
  totalAccountAmount: number;
  receipt: string;
}

export interface CbSyncResult {
  ok: boolean;
  period: { start: string; end: string };
  transactions: number;
  matched: { campaign: string; date: string; sales: number; revenue: number; refunds: number }[];
  unmatchedTids: Record<string, { sales: number; revenue: number }>;
  error?: string;
}

async function getCbKey(userId: string): Promise<{ apiKey: string; nickname: string } | null> {
  const rows = await prisma.integration.findMany({ where: { userId, serviceName: 'clickbank' } });
  const apiKey = rows.find(r => r.fieldName === 'api_key')?.fieldValue ?? '';
  const nickname = rows.find(r => r.fieldName === 'account_nickname')?.fieldValue ?? '';
  if (!apiKey || apiKey.includes('MOCK')) return null;
  return { apiKey, nickname };
}

async function fetchTransactions(apiKey: string, startDate: string, endDate: string): Promise<CbTransaction[]> {
  const all: CbTransaction[] = [];
  for (let page = 1; page <= 10; page++) {
    const res = await fetch(`${CB_API}/orders2/list?startDate=${startDate}&endDate=${endDate}`, {
      headers: { Authorization: apiKey, Accept: 'application/json', Page: String(page) },
    });
    if (res.status === 204) break;
    if (res.status === 403 || res.status === 401) throw new Error(`ClickBank rejeitou a API key (${res.status})`);
    if (!res.ok) throw new Error(`ClickBank API erro ${res.status}: ${await res.text()}`);
    const text = await res.text();
    if (!text || text === 'null') break;
    const data = JSON.parse(text);
    const rows: any[] = Array.isArray(data) ? data : (data?.orderData ? [data.orderData].flat() : []);
    if (rows.length === 0) break;
    for (const r of rows) {
      all.push({
        transactionTime: r?.transactionTime ?? '',
        txnType: r?.txnType ?? '',
        trackingId: r?.trackingId ?? null,
        vendor: r?.vendor ?? '',
        item: r?.item ?? null,
        totalAccountAmount: Number(r?.totalAccountAmount ?? 0),
        receipt: r?.receipt ?? '',
      });
    }
    // orders2 devolve 100 por página; menos que isso = última página
    if (rows.length < 100) break;
  }
  return all;
}

const SALE_TYPES = new Set(['SALE', 'BILL', 'TEST_SALE', 'TEST_BILL']);
const REFUND_TYPES = new Set(['RFND', 'CGBK', 'INSF', 'TEST_RFND']);

export async function syncClickbank(userId: string, days = 3): Promise<CbSyncResult> {
  const creds = await getCbKey(userId);
  const end = new Date();
  const start = new Date(end.getTime() - days * 86400_000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const period = { start: fmt(start), end: fmt(end) };
  if (!creds) return { ok: false, period, transactions: 0, matched: [], unmatchedTids: {}, error: 'API key ClickBank não configurada (ou mock)' };

  const txns = await fetchTransactions(creds.apiKey, period.start, period.end);

  // Agrega por (trackingId, dia)
  const agg = new Map<string, { sales: number; revenue: number; refunds: number }>();
  for (const t of txns) {
    const tid = (t.trackingId ?? '').trim();
    const day = (t.transactionTime ?? '').slice(0, 10);
    if (!day) continue;
    const key = `${tid}|${day}`;
    const cur = agg.get(key) ?? { sales: 0, revenue: 0, refunds: 0 };
    if (SALE_TYPES.has(t.txnType)) {
      cur.sales += 1;
      cur.revenue += t.totalAccountAmount;
    } else if (REFUND_TYPES.has(t.txnType)) {
      cur.refunds += Math.abs(t.totalAccountAmount);
    }
    agg.set(key, cur);
  }

  // Casa trackingId com campanha (utmCampaign ou name, case-insensitive)
  const campaigns = await prisma.campaign.findMany({ where: { userId } });
  const byTid = new Map<string, (typeof campaigns)[number]>();
  for (const c of campaigns) {
    if (c.utmCampaign) byTid.set(c.utmCampaign.toLowerCase(), c);
    byTid.set(c.name.toLowerCase(), c);
  }

  const matched: CbSyncResult['matched'] = [];
  const unmatchedTids: CbSyncResult['unmatchedTids'] = {};

  for (const [key, v] of agg) {
    const [tid, day] = key.split('|');
    const campaign = byTid.get(tid.toLowerCase());
    if (!campaign) {
      if (v.sales > 0 || v.refunds > 0) {
        const u = unmatchedTids[tid || '(sem tid)'] ?? { sales: 0, revenue: 0 };
        u.sales += v.sales;
        u.revenue += v.revenue;
        unmatchedTids[tid || '(sem tid)'] = u;
      }
      continue;
    }
    const logDate = new Date(`${day}T00:00:00.000Z`);
    await prisma.dailyLog.upsert({
      where: { campaignId_logDate: { campaignId: campaign.id, logDate } },
      update: { conversions: v.sales, revenue: v.revenue, refunds: v.refunds, network: 'ClickBank', notes: `sync ClickBank ${new Date().toISOString().slice(0, 16)}` },
      create: {
        campaignId: campaign.id,
        userId,
        logDate,
        conversions: v.sales,
        revenue: v.revenue,
        refunds: v.refunds,
        network: 'ClickBank',
        notes: `sync ClickBank ${new Date().toISOString().slice(0, 16)}`,
      },
    });
    matched.push({ campaign: campaign.name, date: day, sales: v.sales, revenue: Math.round(v.revenue * 100) / 100, refunds: Math.round(v.refunds * 100) / 100 });
  }

  await prisma.integration.upsert({
    where: { userId_serviceName_fieldName: { userId, serviceName: 'clickbank', fieldName: 'last_sync' } } as any,
    update: { fieldValue: new Date().toISOString() },
    create: { userId, serviceName: 'clickbank', fieldName: 'last_sync', fieldValue: new Date().toISOString() },
  });

  return { ok: true, period, transactions: txns.length, matched, unmatchedTids };
}
