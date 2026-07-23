export const dynamic = 'force-dynamic';
export const maxDuration = 120;
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { syncClickbank } from '@/lib/clickbank';

async function resolveUserId(request: NextRequest): Promise<string | null> {
  const token = request.headers.get('x-afiliads-token');
  if (token && process.env.AFILIADS_MCP_TOKEN && token === process.env.AFILIADS_MCP_TOKEN) {
    const email = process.env.AFILIADS_MCP_USER_EMAIL;
    const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
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
    const days = Math.min(30, Math.max(1, Number(body?.days ?? 3)));
    const result = await syncClickbank(userId, days);
    return NextResponse.json(result, { status: result.ok ? 200 : 422 });
  } catch (err: any) {
    console.error('clickbank sync error:', err);
    return NextResponse.json({ error: err?.message ?? 'Erro no sync ClickBank' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = await resolveUserId(request);
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const last = await prisma.integration.findFirst({
      where: { userId, serviceName: 'clickbank', fieldName: 'last_sync' },
    });
    const key = await prisma.integration.findFirst({
      where: { userId, serviceName: 'clickbank', fieldName: 'api_key' },
    });
    return NextResponse.json({
      configured: !!key?.fieldValue && !key.fieldValue.includes('MOCK'),
      lastSync: last?.fieldValue ?? null,
    });
  } catch (err) {
    return NextResponse.json({ error: 'Erro' }, { status: 500 });
  }
}
