export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { validateCampaignPatch } from '@/lib/campaigns/patch-schema';
import { deriveCampaignLaunchState } from '@/lib/campaign-launch-state';

type RouteContext = { params: { id: string } };

function getUserId(session: { user?: unknown } | null): string | null {
  const id = (session?.user as { id?: unknown } | undefined)?.id;
  return typeof id === 'string' && id.length > 0 ? id : null;
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    const userId = getUserId(session);
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const campaign = await prisma.campaign.findFirst({
      where: { id: params?.id, userId },
      include: {
        checklists: true,
        keywords: true,
        dailyLogs: { orderBy: { logDate: 'asc' } },
        decisions: { orderBy: { createdAt: 'desc' } },
        presells: {
          where: { userId },
          select: { id: true, slug: true, publishedUrl: true, pageType: true, status: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        productResearch: { select: { id: true, name: true, vertical: true, riskLevel: true, network: true, avgPayout: true, affiliatePageUrl: true, assetsUrl: true } },
      },
    });
    if (!campaign) return NextResponse.json({ error: 'Não encontrada' }, { status: 404 });
    return NextResponse.json({ ...campaign, launchState: deriveCampaignLaunchState(campaign) });
  } catch (err: unknown) {
    console.error('GET campaign error:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    const userId = getUserId(session);
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const body: unknown = await request.json().catch(() => null);
    if (body === null || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Payload JSON inválido' }, { status: 400 });
    }
    const existing = await prisma.campaign.findFirst({ where: { id: params?.id, userId } });
    if (!existing) return NextResponse.json({ error: 'Não encontrada' }, { status: 404 });

    let validatedData;
    try {
      validatedData = validateCampaignPatch(body, existing.status || 'RASCUNHO');
    } catch (e: unknown) {
      return NextResponse.json({ error: e instanceof Error ? e.message : 'Payload inválido' }, { status: 400 });
    }

    const { productResearchId, ...rest } = validatedData;
    const data: Record<string, unknown> = { ...rest };

    if (productResearchId !== undefined) {
      if (productResearchId === null) {
        data.productResearch = { disconnect: true };
      } else {
        const product = await prisma.productResearch.findFirst({ where: { id: productResearchId, userId } });
        if (!product) return NextResponse.json({ error: 'Não encontrada' }, { status: 404 });
        data.productResearch = { connect: { id: productResearchId } };
      }
    }

    const updated = await prisma.campaign.update({
      where: { id: params?.id },
      data,
    });
    return NextResponse.json(updated);
  } catch (err: unknown) {
    console.error('PATCH campaign error:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    const userId = getUserId(session);
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const existing = await prisma.campaign.findFirst({ where: { id: params?.id, userId } });
    if (!existing) return NextResponse.json({ error: 'Não encontrada' }, { status: 404 });
    await prisma.campaign.delete({ where: { id: params?.id } });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('DELETE campaign error:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
