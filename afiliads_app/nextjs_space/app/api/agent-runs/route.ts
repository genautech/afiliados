export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const userId = (session.user as any)?.id;

    const grouped = await prisma.agentRun.groupBy({
      by: ['agent'],
      where: { userId },
      _count: { _all: true },
      _sum: { totalTokens: true, promptTokens: true, completionTokens: true },
      _avg: { durationMs: true },
      _max: { createdAt: true },
    });
    const failures = await prisma.agentRun.groupBy({
      by: ['agent'],
      where: { userId, success: false },
      _count: { _all: true },
    });
    const failMap = new Map(failures.map((f) => [f.agent, f._count._all]));

    const byAgent = grouped.map((g) => ({
      agent: g.agent,
      runs: g._count._all,
      totalTokens: g._sum.totalTokens ?? 0,
      promptTokens: g._sum.promptTokens ?? 0,
      completionTokens: g._sum.completionTokens ?? 0,
      avgDurationMs: Math.round(g._avg.durationMs ?? 0),
      failures: failMap.get(g.agent) ?? 0,
      lastRunAt: g._max.createdAt,
    })).sort((a, b) => b.totalTokens - a.totalTokens);

    const recent = await prisma.agentRun.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, agent: true, provider: true, model: true, totalTokens: true, promptTokens: true, completionTokens: true, durationMs: true, success: true, createdAt: true },
    });

    const totals = byAgent.reduce(
      (acc, a) => ({ runs: acc.runs + a.runs, totalTokens: acc.totalTokens + a.totalTokens }),
      { runs: 0, totalTokens: 0 }
    );

    // Problemas acionáveis: falhas das últimas 24h agrupadas por agente+causa
    const dayAgo = new Date(Date.now() - 24 * 3600_000);
    const recentFailures = await prisma.agentRun.findMany({
      where: { userId, success: false, createdAt: { gte: dayAgo } },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: { agent: true, provider: true, error: true, createdAt: true },
    });
    const problemMap = new Map<string, { agent: string; provider: string; cause: string; count: number; lastAt: Date }>();
    for (const f of recentFailures) {
      const raw = f.error ?? 'erro desconhecido';
      const cause = raw.includes('insufficient_quota') || raw.includes('no remaining credits') ? 'Provedor sem crédito'
        : raw.includes('validação') || raw.includes('valida') ? `Validação de output: ${raw.slice(0, 120)}`
        : raw.includes('429') ? 'Rate limit do provedor'
        : raw.includes('401') || raw.includes('API Key') ? 'Chave de API inválida/ausente'
        : raw.slice(0, 120);
      const key = `${f.agent}|${f.provider}|${cause}`;
      const prev = problemMap.get(key);
      if (prev) { prev.count++; }
      else problemMap.set(key, { agent: f.agent, provider: f.provider, cause, count: 1, lastAt: f.createdAt });
    }
    const problems = Array.from(problemMap.values()).sort((a, b) => b.count - a.count).slice(0, 10);

    return NextResponse.json({ byAgent, recent, totals, problems });
  } catch (err: any) {
    console.error('GET agent-runs error:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
