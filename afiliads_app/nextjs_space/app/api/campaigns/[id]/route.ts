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
        productResearch: { select: { id: true, name: true, vertical: true, riskLevel: true, network: true, avgPayout: true, affiliatePageUrl: true, assetsUrl: true } },
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
    const { productResearchId, userId: _ignoredUserId, id: _ignoredId, ...rest } = (body ?? {}) as Record<string, any>;
    const data: Record<string, any> = { ...rest };
    if (Object.prototype.hasOwnProperty.call(body ?? {}, 'productResearchId')) {
      data.productResearch = productResearchId ? { connect: { id: productResearchId } } : { disconnect: true };
    }
    const updated = await prisma.campaign.update({
      where: { id: params?.id },
      data,
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
