export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { atpFetch, atpErrorResponse } from '@/lib/atp';

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const userId = (session.user as any)?.id;
    const body = await atpFetch(userId, '/me');
    const data = body?.data ?? {};
    return NextResponse.json({
      workspace: data?.workspace ?? null,
      plan: data?.plan_slug ?? data?.workspace?.atp_tier ?? null,
      scopes: data?.token?.scopes ?? [],
      searchesRemaining: data?.daily_search_budget_remaining ?? data?.quota?.searches?.remaining ?? null,
      searchesLimit: data?.quota?.searches?.limit ?? null,
      apiVersion: data?.api_version ?? null,
    });
  } catch (err: any) {
    const e = atpErrorResponse(err);
    return NextResponse.json({ error: e.error, details: e.details }, { status: e.status });
  }
}
