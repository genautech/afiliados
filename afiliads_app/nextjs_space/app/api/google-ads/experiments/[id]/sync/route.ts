import { NextRequest, NextResponse } from 'next/server';
import { syncExperiment } from '@/lib/google-ads-experiments/orchestration';
import { resolveUserId } from '@/lib/mcp-auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await resolveUserId(request);
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const result = await syncExperiment(params.id, userId);

    return NextResponse.json(result);
  } catch (error: any) {
    const status = error.status || 500;
    const message = error.message || 'Erro interno';
    return NextResponse.json({ error: message }, { status });
  }
}
