export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type KeywordTransaction = Pick<typeof prisma, 'keyword'>;

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
    const userId = (session.user as { id?: string }).id;
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const body = await request.json();
    const keywordInputs = Array.isArray(body?.keywords) ? body.keywords : [body];
    const campaignIds = Array.from(new Set<string>(
      keywordInputs.flatMap((kw: unknown) => {
        if (!kw || typeof kw !== 'object') return [];
        const campaignId = (kw as { campaignId?: unknown }).campaignId;
        return typeof campaignId === 'string' && campaignId.length > 0 ? [campaignId] : [];
      }),
    ));
    if (campaignIds.length > 0) {
      const ownedCampaigns = await prisma.campaign.findMany({
        where: { id: { in: campaignIds }, userId },
        select: { id: true },
      });
      if (ownedCampaigns.length !== campaignIds.length) {
        return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 });
      }
    }
    if (Array.isArray(body?.keywords)) {
      const normalizedByIdentity = new Map<string, {
        campaignId: string;
        keyword: string;
        layer: string;
        matchType: string;
        cpcEstimate: number;
        relevanceScore: number;
        isSelected: boolean;
      }>();
      for (const raw of body.keywords) {
        const campaignId = typeof raw?.campaignId === 'string' ? raw.campaignId.trim() : '';
        const keyword = typeof raw?.keyword === 'string'
          ? raw.keyword.trim().replace(/\s+/g, ' ').toLowerCase()
          : '';
        const matchType = typeof raw?.matchType === 'string' ? raw.matchType.trim().toLowerCase() : 'phrase';
        if (!campaignId || !keyword || !['exact', 'phrase', 'broad'].includes(matchType)) {
          return NextResponse.json({ error: 'Keyword, campaignId ou matchType inválido' }, { status: 400 });
        }
        normalizedByIdentity.set(`${campaignId}\u0000${keyword}\u0000${matchType}`, {
          campaignId,
          keyword,
          matchType,
          layer: typeof raw?.layer === 'string' ? raw.layer : 'A',
          cpcEstimate: Number.isFinite(raw?.cpcEstimate) ? raw.cpcEstimate : 0,
          relevanceScore: Number.isInteger(raw?.relevanceScore) ? raw.relevanceScore : 3,
          isSelected: raw?.isSelected === true,
        });
      }
      const normalized = [...normalizedByIdentity.values()];
      const results = await prisma.$transaction(async (tx: KeywordTransaction) => {
        const existing = await tx.keyword.findMany({
          where: { userId, campaignId: { in: campaignIds } },
        });
        const existingByIdentity = new Map<string, typeof existing>();
        for (const row of existing) {
          if (!row.campaignId) continue;
          const key = `${row.campaignId}\u0000${row.keyword.trim().replace(/\s+/g, ' ').toLowerCase()}\u0000${row.matchType.trim().toLowerCase()}`;
          existingByIdentity.set(key, [...(existingByIdentity.get(key) ?? []), row]);
        }

        const persisted = [];
        for (const input of normalized) {
          const key = `${input.campaignId}\u0000${input.keyword}\u0000${input.matchType}`;
          const matches = existingByIdentity.get(key) ?? [];
          if (matches.length > 1) {
            throw { status: 409, message: 'Keywords legadas duplicadas exigem reconciliação explícita de métricas' };
          }
          const [first] = matches;
          if (first) {
            persisted.push(await tx.keyword.update({
              where: { id: first.id },
              data: {
                keyword: input.keyword,
                layer: input.layer,
                matchType: input.matchType,
                cpcEstimate: input.cpcEstimate,
                relevanceScore: input.relevanceScore,
                isSelected: input.isSelected,
              },
            }));
          } else {
            persisted.push(await tx.keyword.create({ data: { userId, ...input } }));
          }
        }
        return persisted;
      }, { isolationLevel: 'Serializable' });
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
    return NextResponse.json(
      { error: err?.status === 409 ? err.message : 'Erro interno' },
      { status: err?.status === 409 ? 409 : 500 },
    );
  }
}
