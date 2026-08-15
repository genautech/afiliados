export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const KeywordPatchSchema = z.object({
  status: z.enum(['ativa', 'negativa']),
}).strict();

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const userId = (session.user as { id?: string }).id;
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const body = await request.json();
    const parsed = KeywordPatchSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Payload inválido' }, { status: 400 });
    const keyword = await prisma.keyword.findFirst({
      where: { id: params.id, userId },
      select: { id: true },
    });
    if (!keyword) return NextResponse.json({ error: 'Keyword não encontrada' }, { status: 404 });
    const updated = await prisma.keyword.update({ where: { id: keyword.id }, data: parsed.data });
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const userId = (session.user as { id?: string }).id;
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const keyword = await prisma.keyword.findFirst({
      where: { id: params.id, userId },
      select: { id: true },
    });
    if (!keyword) return NextResponse.json({ error: 'Keyword não encontrada' }, { status: 404 });
    await prisma.keyword.delete({ where: { id: keyword.id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
