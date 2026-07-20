export const dynamic = 'force-dynamic';
export const maxDuration = 120;
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generatePresell } from '@/lib/presell';

async function resolveUserId(request: NextRequest): Promise<string | null> {
  const token = request.headers.get('x-afiliads-token');
  if (token && process.env.AFILIADS_MCP_TOKEN && token === process.env.AFILIADS_MCP_TOKEN) {
    const email = process.env.AFILIADS_MCP_USER_EMAIL || 'genaujunior@gmail.com';
    const user = await prisma.user.findUnique({ where: { email } });
    return user?.id ?? null;
  }
  const session = await getServerSession(authOptions);
  return session?.user ? (session.user as any)?.id ?? null : null;
}

export async function GET(request: NextRequest) {
  try {
    const userId = await resolveUserId(request);
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const presells = await prisma.presell.findMany({
      where: { userId },
      select: { id: true, slug: true, title: true, productName: true, angle: true, geo: true, language: true, status: true, views: true, ctaClicks: true, trackingId: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(presells);
  } catch (err) {
    console.error('GET presells error:', err);
    return NextResponse.json({ error: 'Erro ao listar presells' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await resolveUserId(request);
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const body = await request.json();
    const productName = String(body?.productName ?? '').trim();
    const hopLink = String(body?.hopLink ?? '').trim();
    if (!productName) return NextResponse.json({ error: 'productName é obrigatório' }, { status: 400 });
    if (!hopLink || !/^https?:\/\//.test(hopLink)) {
      return NextResponse.json({ error: 'hopLink válido (https://...) é obrigatório — pegue na página de afiliado do produtor' }, { status: 422 });
    }
    const { presell, usage, provider, model } = await generatePresell(userId, {
      productName,
      hopLink,
      trackingId: body?.trackingId,
      angle: body?.angle,
      geo: body?.geo,
      language: body?.language,
      productId: body?.productId,
      googleAdsId: body?.googleAdsId,
      context: body?.context,
    });
    return NextResponse.json({
      id: presell.id, slug: presell.slug, title: presell.title, url: `/p/${presell.slug}`,
      usage, provider, model,
    }, { status: 201 });
  } catch (err: any) {
    console.error('POST presells error:', err);
    return NextResponse.json({ error: err?.message ?? 'Erro ao gerar presell' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = await resolveUserId(request);
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });
    await prisma.presell.delete({ where: { id, userId } as any });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: 'Erro ao excluir' }, { status: 500 });
  }
}
