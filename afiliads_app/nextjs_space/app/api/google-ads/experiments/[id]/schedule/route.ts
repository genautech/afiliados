import { NextRequest, NextResponse } from 'next/server';
import { scheduleExperimentLifecycle } from '@/lib/google-ads-experiments/orchestration';
import { redactSensitive } from '@/lib/google-ads/errors';
import { resolveUserId } from '@/lib/mcp-auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await resolveUserId(request);
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const payload = await request.json().catch(() => null);
    if (!payload) return NextResponse.json({ error: 'Payload JSON inválido' }, { status: 400 });
    const result = await scheduleExperimentLifecycle({ id: params.id, userId, payload });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: redactSensitive(error?.message || 'Erro interno') },
      { status: error?.status || 500 }
    );
  }
}
