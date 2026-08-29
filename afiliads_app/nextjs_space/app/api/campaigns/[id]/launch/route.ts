import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { executeLaunchSaga } from '@/lib/campaignLaunchSaga';

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    const userId = (session.user as any)?.id;
    const campaignId = params.id;

    if (!campaignId) {
      return NextResponse.json({ error: 'ID da campanha é obrigatório' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const idempotencyKey = body?.idempotencyKey || request.headers.get('x-idempotency-key') || undefined;
    const isMockMode = body?.isMockMode ?? false;
    const bypassReadiness = body?.bypassReadiness ?? false;

    const result = await executeLaunchSaga(campaignId, userId, {
      idempotencyKey,
      isMockMode,
      bypassReadiness
    });

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || 'Erro durante a execução do saga de lançamento',
        checkpoint: result.checkpoint,
        logs: result.logs
      }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Launch campaign error:', err);
    return NextResponse.json({ error: err?.message ?? 'Erro ao lançar campanha' }, { status: 500 });
  }
}
