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

    const [tests, decisions, logs, products] = await Promise.all([
      prisma.testResult.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 50 }),
      prisma.campaignDecision.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 50, include: { campaign: { select: { name: true } } } }),
      prisma.dailyLog.findMany({ where: { userId, notes: { not: null } }, orderBy: { logDate: 'desc' }, take: 50, include: { campaign: { select: { name: true } } } }),
      prisma.productResearch.findMany({ where: { userId, status: { not: 'novo' } }, orderBy: { updatedAt: 'desc' }, take: 30 }),
    ]);

    const feed: any[] = [];

    for (const t of tests) {
      if (!t.learning && !t.hypothesis) continue;
      feed.push({
        type: 'teste',
        title: `Teste ${t.testId} — ${t.offerName} (${t.result})`,
        text: [t.hypothesis ? `Hipótese: ${t.hypothesis}` : null, t.learning ? `Lição: ${t.learning}` : null, t.nextStep ? `Próximo passo: ${t.nextStep}` : null].filter(Boolean).join('\n'),
        date: t.endDate ?? t.createdAt,
        source: t.network,
      });
    }

    for (const d of decisions) {
      if (!d.rationale) continue;
      feed.push({
        type: 'decisao',
        title: `${d.decision} — ${d.campaign?.name ?? 'campanha'}`,
        text: d.rationale,
        date: d.createdAt,
        source: 'Auditoria de campanha',
      });
    }

    for (const l of logs) {
      if (!l.notes?.trim()) continue;
      feed.push({
        type: 'diario',
        title: `Diário — ${l.campaign?.name ?? l.offerName ?? 'campanha'} (${new Date(l.logDate).toLocaleDateString('pt-BR')})`,
        text: l.notes,
        date: l.logDate,
        source: l.decision ?? 'Lançamento diário',
      });
    }

    for (const p of products) {
      const ai = p.affiliateInsights as any;
      const parts: string[] = [];
      if (p.summary) parts.push(p.summary);
      if (ai?.campaignValidation?.notes) parts.push(`Validação: ${ai.campaignValidation.notes}`);
      if (Array.isArray(ai?.tips) && ai.tips.length) parts.push(`Dicas do produtor: ${ai.tips.slice(0, 3).join('; ')}`);
      if (Array.isArray(ai?.restrictions) && ai.restrictions.length) parts.push(`Restrições-chave: ${ai.restrictions.slice(0, 3).join('; ')}`);
      if (parts.length === 0) continue;
      feed.push({
        type: 'produto',
        title: `${p.name} — score ${p.score}/100${p.chosenKeyword ? ` · keyword "${p.chosenKeyword}"` : ''}`,
        text: parts.join('\n'),
        date: p.updatedAt,
        source: p.network,
      });
    }

    feed.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return NextResponse.json({ feed, counts: { testes: tests.length, decisoes: decisions.length, diario: logs.length, produtos: products.length } });
  } catch (err: any) {
    console.error('GET learnings error:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
