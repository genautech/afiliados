import { NextRequest, NextResponse } from 'next/server';
import { getExperimentDetail } from '@/lib/google-ads-experiments/orchestration';
import { resolveUserId } from '@/lib/mcp-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await resolveUserId(request);
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const result = await getExperimentDetail(params.id, userId);

    return NextResponse.json(result);
  } catch (error: any) {
    const status = error.status || 500;
    const message = error.message || 'Erro interno';
    return NextResponse.json({ error: message }, { status });
  }
}
