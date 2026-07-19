export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const userId = (session.user as any)?.id;
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId');
    const where: any = { userId };
    if (campaignId) where.campaignId = campaignId;
    const keywords = await prisma.keyword.findMany({ where, orderBy: { createdAt: 'desc' }, include: { campaign: { select: { name: true, status: true } } } });
    return NextResponse.json(keywords ?? []);
  } catch (err: any) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const userId = (session.user as any)?.id;
    const body = await request.json();
    if (Array.isArray(body?.keywords)) {
      const results = [];
      for (const kw of body.keywords) {
        const created = await prisma.keyword.create({
          data: {
            userId,
            campaignId: kw?.campaignId ?? null,
            keyword: kw?.keyword ?? '',
            layer: kw?.layer ?? 'A',
            matchType: kw?.matchType ?? 'phrase',
            cpcEstimate: kw?.cpcEstimate ?? 0,
            relevanceScore: kw?.relevanceScore ?? 3,
            isSelected: kw?.isSelected ?? false,
          },
        });
        results.push(created);
      }
      return NextResponse.json(results, { status: 201 });
    }
    const keyword = await prisma.keyword.create({
      data: {
        userId,
        campaignId: body?.campaignId ?? null,
        keyword: body?.keyword ?? '',
        layer: body?.layer ?? 'A',
        matchType: body?.matchType ?? 'phrase',
        cpcEstimate: body?.cpcEstimate ?? 0,
        relevanceScore: body?.relevanceScore ?? 3,
        isSelected: body?.isSelected ?? false,
      },
    });
    return NextResponse.json(keyword, { status: 201 });
  } catch (err: any) {
    console.error('POST keywords error:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
