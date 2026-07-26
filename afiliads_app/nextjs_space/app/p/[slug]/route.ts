export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_request: NextRequest, { params }: { params: { slug: string } }) {
  const presell = await prisma.presell.findUnique({ where: { slug: params.slug } });
  if (!presell || (presell.status !== 'publicada' && presell.status !== 'rascunho')) {
    return new NextResponse('Página não encontrada', { status: 404 });
  }
  if (presell.status === 'publicada') {
    prisma.presell.update({ where: { id: presell.id }, data: { views: { increment: 1 } } }).catch(() => {});
  }
  return new NextResponse(presell.html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': presell.status === 'rascunho' ? 'no-store' : 'public, max-age=60',
      ...(presell.status === 'rascunho' ? { 'X-Robots-Tag': 'noindex, nofollow' } : {}),
    },
  });
}
