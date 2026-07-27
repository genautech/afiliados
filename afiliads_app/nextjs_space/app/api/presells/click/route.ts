export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Endpoint público (sem auth) — chamado via navigator.sendBeacon() pelo visitante anônimo da
// presell publicada, às vezes de um domínio WordPress externo do afiliado, não do app. Só
// incrementa um contador; nunca falha de forma visível (sendBeacon é fire-and-forget, ninguém
// olha a resposta) e nunca revela se o id existe ou não.
export async function POST(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  if (id) {
    await prisma.presell.update({ where: { id }, data: { ctaClicks: { increment: 1 } } }).catch(() => {});
  }
  return new NextResponse(null, { status: 204 });
}
