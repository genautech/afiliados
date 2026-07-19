export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getRoutingContext, buildChain, AGENT_TIERS, ACTIVE_PROVIDERS, Tier, Provider } from '@/lib/llm';

const TIERS: Tier[] = ['premium', 'standard', 'light'];
const PROVIDERS: Provider[] = ACTIVE_PROVIDERS;

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const userId = (session.user as any)?.id;

    const ctx = await getRoutingContext(userId);
    const chains: Record<string, any[]> = {};
    for (const tier of TIERS) {
      chains[tier] = buildChain(ctx, tier).map(s => ({
        provider: s.provider,
        model: s.model,
        overBudget: s.overBudget,
      }));
    }
    const providers = PROVIDERS.map(p => ({
      provider: p,
      hasKey: !!ctx.keys[p],
      enabled: !ctx.disabled.has(p),
      budgetTokens: ctx.budgets[p] ?? 0,
      monthTokens: ctx.monthUsage[p] ?? 0,
      overBudget: !!ctx.budgets[p] && (ctx.monthUsage[p] ?? 0) >= ctx.budgets[p],
    }));
    return NextResponse.json({
      mode: ctx.mode,
      manualProvider: ctx.manualProvider,
      providers,
      chains,
      agentTiers: AGENT_TIERS,
    });
  } catch (err) {
    console.error('GET llm-routing error:', err);
    return NextResponse.json({ error: 'Erro ao carregar roteamento' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const userId = (session.user as any)?.id;
    const body = await request.json();

    const updates: { fieldName: string; fieldValue: string }[] = [];
    if (body?.mode === 'auto' || body?.mode === 'manual') {
      updates.push({ fieldName: 'routing', fieldValue: body.mode });
    }
    if (typeof body?.manualProvider === 'string' && PROVIDERS.includes(body.manualProvider)) {
      updates.push({ fieldName: 'provider', fieldValue: body.manualProvider });
    }
    if (Array.isArray(body?.disabledProviders)) {
      const clean = body.disabledProviders.filter((p: string) => PROVIDERS.includes(p as Provider));
      updates.push({ fieldName: 'disabled_providers', fieldValue: clean.join(',') });
    }
    if (body?.budgets && typeof body.budgets === 'object') {
      for (const p of PROVIDERS) {
        if (body.budgets[p] !== undefined && !Number.isNaN(Number(body.budgets[p]))) {
          updates.push({ fieldName: `budget_tokens_${p}`, fieldValue: String(Math.max(0, Number(body.budgets[p]))) });
        }
      }
    }
    for (const u of updates) {
      await prisma.integration.upsert({
        where: { userId_serviceName_fieldName: { userId, serviceName: 'llm', fieldName: u.fieldName } } as any,
        update: { fieldValue: u.fieldValue },
        create: { userId, serviceName: 'llm', fieldName: u.fieldName, fieldValue: u.fieldValue },
      });
    }
    return NextResponse.json({ ok: true, updated: updates.length });
  } catch (err) {
    console.error('PATCH llm-routing error:', err);
    return NextResponse.json({ error: 'Erro ao salvar roteamento' }, { status: 500 });
  }
}
