export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin';

function parsePeriod(period: string | null): { period: string; start: Date; end: Date } | null {
  const now = new Date();
  const fallback = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const value = period && /^\d{4}-\d{2}$/.test(period) ? period : fallback;
  const [year, month] = value.split('-').map(Number);
  if (month < 1 || month > 12) return null;
  return {
    period: value,
    start: new Date(year, month - 1, 1),
    end: new Date(year, month, 1),
  };
}

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: 'Acesso restrito ao admin' }, { status: 403 });

    const parsed = parsePeriod(request.nextUrl.searchParams.get('period'));
    if (!parsed) return NextResponse.json({ error: 'Período inválido (use YYYY-MM)' }, { status: 400 });
    const { period, start, end } = parsed;

    const grouped = await prisma.agentRun.groupBy({
      by: ['userId', 'keySource'],
      where: { createdAt: { gte: start, lt: end } },
      _count: { _all: true },
      _sum: { totalTokens: true, costUsd: true },
    });

    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, isActive: true },
      orderBy: { createdAt: 'asc' },
    });
    const payments = await prisma.usagePayment.findMany({
      where: { period },
      select: { userId: true, amountUsd: true, status: true, paidAt: true, notes: true },
    });
    const paymentMap = new Map(payments.map((p) => [p.userId, p]));

    const byUser = new Map<string, { platform: { runs: number; totalTokens: number; costUsd: number }; byok: { runs: number; totalTokens: number; costUsd: number } }>();
    for (const g of grouped) {
      const entry = byUser.get(g.userId) ?? {
        platform: { runs: 0, totalTokens: 0, costUsd: 0 },
        byok: { runs: 0, totalTokens: 0, costUsd: 0 },
      };
      const bucket = g.keySource === 'byok' ? entry.byok : entry.platform;
      bucket.runs += g._count._all;
      bucket.totalTokens += g._sum.totalTokens ?? 0;
      bucket.costUsd += g._sum.costUsd ?? 0;
      byUser.set(g.userId, entry);
    }

    const rows = users.map((u) => {
      const usage = byUser.get(u.id) ?? {
        platform: { runs: 0, totalTokens: 0, costUsd: 0 },
        byok: { runs: 0, totalTokens: 0, costUsd: 0 },
      };
      return {
        user: u,
        platform: usage.platform,
        byok: usage.byok,
        payment: paymentMap.get(u.id) ?? null,
      };
    });

    const totals = rows.reduce(
      (acc, r) => ({
        platformCostUsd: acc.platformCostUsd + r.platform.costUsd,
        byokCostUsd: acc.byokCostUsd + r.byok.costUsd,
        runs: acc.runs + r.platform.runs + r.byok.runs,
      }),
      { platformCostUsd: 0, byokCostUsd: 0, runs: 0 }
    );

    return NextResponse.json({ period, rows, totals });
  } catch (err) {
    console.error('GET admin/agent-costs error:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// Gera ou atualiza a cobrança do período de um usuário.
// action: 'generate' (cria/atualiza com o custo plataforma do período) | 'mark_paid' | 'mark_pending'
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: 'Acesso restrito ao admin' }, { status: 403 });

    const body = await request.json();
    const { userId, action, notes } = body ?? {};
    const parsed = parsePeriod(body?.period ?? null);
    if (!userId || !parsed || !['generate', 'mark_paid', 'mark_pending'].includes(action)) {
      return NextResponse.json({ error: 'userId, period (YYYY-MM) e action válidos são obrigatórios' }, { status: 400 });
    }
    const { period, start, end } = parsed;

    if (action === 'generate') {
      const agg = await prisma.agentRun.aggregate({
        where: { userId, keySource: 'platform', createdAt: { gte: start, lt: end } },
        _sum: { costUsd: true },
      });
      const amountUsd = Math.round((agg._sum.costUsd ?? 0) * 100) / 100;
      const payment = await prisma.usagePayment.upsert({
        where: { userId_period: { userId, period } },
        create: { userId, period, amountUsd, status: 'PENDENTE', notes: notes ?? null },
        update: { amountUsd, notes: notes ?? undefined },
      });
      return NextResponse.json(payment);
    }

    const isPaid = action === 'mark_paid';
    const existing = await prisma.usagePayment.findUnique({ where: { userId_period: { userId, period } } });
    if (!existing) return NextResponse.json({ error: 'Cobrança do período ainda não foi gerada' }, { status: 404 });
    const payment = await prisma.usagePayment.update({
      where: { id: existing.id },
      data: { status: isPaid ? 'PAGO' : 'PENDENTE', paidAt: isPaid ? new Date() : null, notes: notes ?? undefined },
    });
    return NextResponse.json(payment);
  } catch (err) {
    console.error('POST admin/agent-costs error:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
