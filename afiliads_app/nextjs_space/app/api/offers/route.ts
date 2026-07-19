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
    const offers = await prisma.offer.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(offers ?? []);
  } catch (err: any) {
    console.error('GET offers error:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const userId = (session.user as any)?.id;
    const body = await request.json();
    const offer = await prisma.offer.upsert({
      where: { userId_offerId: { userId, offerId: body?.offerId ?? '' } },
      update: { ...body, userId },
      create: { ...body, userId },
    });
    return NextResponse.json(offer);
  } catch (err: any) {
    console.error('POST offers error:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
