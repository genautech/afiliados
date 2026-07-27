export const dynamic = 'force-dynamic';
export const maxDuration = 60;
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { collectMarketIntel } from '@/lib/marketIntel';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const userId = (session.user as any)?.id;

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const vertical = searchParams.get('vertical');
    if (!productId && !vertical) {
      return NextResponse.json({ error: 'productId ou vertical é obrigatório' }, { status: 400 });
    }

    const snapshot = await prisma.marketIntelSnapshot.findFirst({
      where: { userId, ...(productId ? { productId } : {}), ...(vertical ? { vertical } : {}) },
      orderBy: { fetchedAt: 'desc' },
    });
    return NextResponse.json(snapshot ?? null);
  } catch (err) {
    console.error('GET market-intel error:', err);
    return NextResponse.json({ error: 'Erro ao buscar inteligência de mercado' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const userId = (session.user as any)?.id;

    const body = await request.json();
    const productId: string | undefined = body?.productId;
    if (!productId) return NextResponse.json({ error: 'productId é obrigatório' }, { status: 400 });

    const product = await prisma.productResearch.findFirst({ where: { id: productId, userId } });
    if (!product) return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });

    let vendorDomain: string | undefined;
    try {
      if (product.vendorPageUrl) vendorDomain = new URL(product.vendorPageUrl).hostname;
    } catch { /* URL inválida — segue sem excluir domínio */ }

    const snapshot = await collectMarketIntel(userId, {
      productName: product.name,
      vertical: product.vertical,
      productId: product.id,
      vendorDomain,
    });
    return NextResponse.json(snapshot, { status: 201 });
  } catch (err: any) {
    console.error('POST market-intel error:', err);
    return NextResponse.json({ error: err?.message ?? 'Erro ao coletar inteligência de mercado' }, { status: 500 });
  }
}
