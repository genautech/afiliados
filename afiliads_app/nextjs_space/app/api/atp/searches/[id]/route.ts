export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { atpFetch, atpErrorResponse } from '@/lib/atp';

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const userId = (session.user as any)?.id;

    const search = await prisma.atpSearch.findFirst({ where: { id: params.id, userId } });
    if (!search) return NextResponse.json({ error: 'Busca não encontrada' }, { status: 404 });
    if (!search.searchId) return NextResponse.json({ search, status: search.status });

    const remote = await atpFetch(userId, `/searches/${search.searchId}`);
    const status = remote?.data?.status ?? search.status;
    if (status !== search.status) {
      await prisma.atpSearch.update({ where: { id: search.id }, data: { status } });
    }
    return NextResponse.json({ search: { ...search, status }, status });
  } catch (err: any) {
    const e = atpErrorResponse(err);
    return NextResponse.json({ error: e.error, details: e.details }, { status: e.status });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const userId = (session.user as any)?.id;
    await prisma.atpSearch.deleteMany({ where: { id: params.id, userId } });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
