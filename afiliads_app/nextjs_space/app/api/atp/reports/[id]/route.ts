export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { atpFetch, atpErrorResponse } from '@/lib/atp';

const ALLOWED_PARAMS = [
  'providers', 'grouped', 'source_name', 'category', 'page', 'per_page',
  'sort_by', 'sort_order', 'range_start_volume', 'range_end_volume',
  'range_start_cost', 'range_end_cost', 'search_string', 'intents', 'sentiments',
];

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const userId = (session.user as any)?.id;

    const { searchParams } = new URL(request.url);
    const qs = new URLSearchParams();
    for (const p of ALLOWED_PARAMS) {
      const v = searchParams.get(p);
      if (v !== null && v !== '') qs.set(p, v);
    }
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    const report = await atpFetch(userId, `/reports/${params.id}${suffix}`);
    return NextResponse.json(report?.data ?? {});
  } catch (err: any) {
    const e = atpErrorResponse(err);
    return NextResponse.json({ error: e.error, details: e.details }, { status: e.status });
  }
}
