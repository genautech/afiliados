export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, name: true, email: true, image: true, role: true,
        metaReceitaMensal: true, metaRoi: true, budgetMensalAds: true, createdAt: true,
      },
    });
    if (!user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    return NextResponse.json(user);
  } catch (err) {
    console.error('GET profile error:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const body = await request.json();
    const data: Record<string, any> = {};
    if (typeof body?.name === 'string') data.name = body.name.trim();
    if (typeof body?.image === 'string') data.image = body.image.trim() || null;
    for (const field of ['metaReceitaMensal', 'metaRoi', 'budgetMensalAds'] as const) {
      if (body?.[field] !== undefined) {
        const value = Number(body[field]);
        if (!Number.isFinite(value) || value < 0) {
          return NextResponse.json({ error: `Valor inválido para ${field}` }, { status: 400 });
        }
        data[field] = value;
      }
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true, name: true, email: true, image: true, role: true,
        metaReceitaMensal: true, metaRoi: true, budgetMensalAds: true, createdAt: true,
      },
    });
    return NextResponse.json(user);
  } catch (err) {
    console.error('PUT profile error:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
