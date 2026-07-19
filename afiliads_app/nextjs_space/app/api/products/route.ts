export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const userId = (session.user as any)?.id;
    const products = await prisma.productResearch.findMany({
      where: { userId },
      orderBy: [{ score: 'desc' }, { updatedAt: 'desc' }],
    });
    return NextResponse.json(products);
  } catch (err) {
    console.error('GET products error:', err);
    return NextResponse.json({ error: 'Erro ao listar produtos' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const userId = (session.user as any)?.id;
    const body = await request.json();
    const name = String(body?.name ?? '').trim();
    if (!name) return NextResponse.json({ error: 'name é obrigatório' }, { status: 422 });
    const data: any = {};
    for (const k of ['network', 'vertical', 'gravity', 'avgPayout', 'commissionPct', 'conversionRate', 'rebill', 'score', 'riskLevel', 'source', 'summary', 'tags', 'keywords', 'strategy', 'compliance', 'hopLink', 'affiliatePageUrl', 'affiliateInsights', 'status', 'chosenKeyword']) {
      if (body?.[k] !== undefined) data[k] = body[k];
    }
    const product = await prisma.productResearch.upsert({
      where: { userId_name: { userId, name } },
      update: data,
      create: { userId, name, ...data },
    });
    return NextResponse.json(product, { status: 201 });
  } catch (err) {
    console.error('POST products error:', err);
    return NextResponse.json({ error: 'Erro ao salvar produto' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const userId = (session.user as any)?.id;
    const body = await request.json();
    const { id, ...data } = body ?? {};
    if (!id) return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });
    const allowed: any = {};
    for (const k of ['status', 'chosenKeyword', 'hopLink', 'notes', 'affiliatePageUrl', 'affiliateInsights']) {
      if (data[k] !== undefined) allowed[k] = data[k];
    }
    const product = await prisma.productResearch.update({
      where: { id, userId } as any,
      data: allowed,
    });
    return NextResponse.json(product);
  } catch (err) {
    console.error('PATCH products error:', err);
    return NextResponse.json({ error: 'Erro ao atualizar produto' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const userId = (session.user as any)?.id;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });
    await prisma.productResearch.delete({ where: { id, userId } as any });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE products error:', err);
    return NextResponse.json({ error: 'Erro ao excluir produto' }, { status: 500 });
  }
}
