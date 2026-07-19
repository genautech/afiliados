export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { atpFetch, atpErrorResponse, ATP_PROVIDERS } from '@/lib/atp';

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const userId = (session.user as any)?.id;
    const searches = await prisma.atpSearch.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { campaign: { select: { name: true, status: true } } },
    });
    return NextResponse.json(searches ?? []);
  } catch (err: any) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const userId = (session.user as any)?.id;
    const body = await request.json();

    const keyword = String(body?.keyword ?? '').trim().toLowerCase();
    const language = String(body?.language ?? 'en').trim().toLowerCase();
    const region = String(body?.region ?? 'us').trim().toLowerCase();
    const provider = String(body?.provider ?? 'gweb').trim().toLowerCase();
    const campaignId = body?.campaignId || null;

    if (!keyword) {
      return NextResponse.json({ error: 'Informe a keyword' }, { status: 422 });
    }
    if (!(ATP_PROVIDERS as readonly string[]).includes(provider)) {
      return NextResponse.json({ error: `Provider inválido: ${provider}` }, { status: 422 });
    }
    if (body?.confirm !== true) {
      return NextResponse.json(
        { error: 'Busca consome crédito do AnswerThePublic e exige confirmação explícita (confirm: true)' },
        { status: 422 }
      );
    }

    // Reuso local <24h: mesma keyword+idioma+região já buscada não gasta crédito de novo
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const existing = await prisma.atpSearch.findFirst({
      where: { userId, keyword, language, region, provider, createdAt: { gte: dayAgo }, searchId: { not: null } },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) {
      return NextResponse.json({ search: existing, reused: true, remaining: null }, { status: 200 });
    }

    const me = await atpFetch(userId, '/me');
    const remaining = me?.data?.daily_search_budget_remaining ?? me?.data?.quota?.searches?.remaining ?? null;
    if (remaining !== null && remaining <= 0) {
      return NextResponse.json({ error: 'Sem créditos de busca restantes no AnswerThePublic' }, { status: 403 });
    }

    const created = await atpFetch(userId, '/searches', {
      method: 'POST',
      body: JSON.stringify({ search: { keyword, language, region, provider } }),
    });
    const parent = created?.data ?? {};
    const child = (parent?.searches ?? []).find((s: any) => s?.provider === provider) ?? parent?.searches?.[0];

    // Dedupe remoto de 24h devolve um parent antigo — nesse caso não houve cobrança
    const parentAgeMs = parent?.created_at ? Date.now() - new Date(parent.created_at).getTime() : 0;
    const creditCharged = parentAgeMs < 60 * 1000;

    const search = await prisma.atpSearch.create({
      data: {
        userId,
        campaignId,
        keyword,
        language,
        region,
        provider,
        parentSearchId: parent?.parent_search_id ?? null,
        searchId: child?.id ?? null,
        status: child?.status ?? parent?.status ?? 'loading',
        creditCharged,
      },
    });

    return NextResponse.json(
      { search, reused: !creditCharged, remaining: remaining !== null ? remaining - (creditCharged ? 1 : 0) : null },
      { status: 201 }
    );
  } catch (err: any) {
    const e = atpErrorResponse(err);
    return NextResponse.json({ error: e.error, details: e.details }, { status: e.status });
  }
}
