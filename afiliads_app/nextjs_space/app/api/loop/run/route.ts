export const dynamic = 'force-dynamic';
export const maxDuration = 300;
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { runCampaignLoop, runDueLoops } from '@/lib/loop-engine';

async function resolveUserId(request: NextRequest): Promise<string | null> {
  const mcpToken = request.headers.get('x-afiliads-token');
  if (mcpToken && process.env.AFILIADS_MCP_TOKEN && mcpToken === process.env.AFILIADS_MCP_TOKEN) {
    const email = process.env.AFILIADS_MCP_USER_EMAIL || 'genaujunior@gmail.com';
    const user = await prisma.user.findUnique({ where: { email } });
    return user?.id ?? null;
  }
  const session = await getServerSession(authOptions);
  return session?.user ? (session.user as any)?.id ?? null : null;
}

export async function POST(request: NextRequest) {
  try {
    const userId = await resolveUserId(request);
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    if (body?.campaignId) {
      const result = await runCampaignLoop(userId, body.campaignId, body?.trigger === 'daily-log' ? 'daily-log' : 'manual');
      return NextResponse.json(result);
    }
    const results = await runDueLoops('manual');
    return NextResponse.json({ ran: results.length, results });
  } catch (err: any) {
    console.error('Loop run error:', err);
    return NextResponse.json({ error: err?.message || 'Erro interno' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = await resolveUserId(request);
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId');
    const where: any = { userId };
    if (campaignId) where.campaignId = campaignId;
    const runs = await prisma.loopRun.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: { campaign: { select: { name: true, status: true } } },
    });
    return NextResponse.json(runs);
  } catch (err: any) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
