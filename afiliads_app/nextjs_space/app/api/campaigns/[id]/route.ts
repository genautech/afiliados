export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const userId = (session.user as any)?.id;
    const campaign = await prisma.campaign.findFirst({
      where: { id: params?.id, userId },
      include: {
        checklists: true,
        keywords: true,
        dailyLogs: { orderBy: { logDate: 'asc' } },
        decisions: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!campaign) return NextResponse.json({ error: 'Não encontrada' }, { status: 404 });
    return NextResponse.json(campaign);
  } catch (err: any) {
    console.error('GET campaign error:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const userId = (session.user as any)?.id;
    const body = await request.json();
    const existing = await prisma.campaign.findFirst({ where: { id: params?.id, userId } });
    if (!existing) return NextResponse.json({ error: 'Não encontrada' }, { status: 404 });
    const updated = await prisma.campaign.update({
      where: { id: params?.id },
      data: { ...(body ?? {}) },
    });
    return NextResponse.json(updated);
  } catch (err: any) {
    console.error('PATCH campaign error:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const userId = (session.user as any)?.id;
    const existing = await prisma.campaign.findFirst({ where: { id: params?.id, userId } });
    if (!existing) return NextResponse.json({ error: 'Não encontrada' }, { status: 404 });
    await prisma.campaign.delete({ where: { id: params?.id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('DELETE campaign error:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
