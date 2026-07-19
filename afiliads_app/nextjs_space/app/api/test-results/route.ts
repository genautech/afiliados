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
    const results = await prisma.testResult.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(results ?? []);
  } catch (err: any) {
    console.error('GET test-results error:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const userId = (session.user as any)?.id;
    const body = await request.json();
    const result = await prisma.testResult.upsert({
      where: { userId_testId: { userId, testId: body?.testId ?? '' } },
      update: { ...body, userId },
      create: { ...body, userId },
    });
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('POST test-results error:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
