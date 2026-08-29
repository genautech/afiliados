export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { executeLaunch, getLaunchState } from '@/lib/launch/orchestrator';
import type { LaunchChannel } from '@/lib/launch/types';

const CHANNELS: LaunchChannel[] = ['GOOGLE_ADS', 'META_ADS'];

async function requireUser() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  return userId ? String(userId) : null;
}

/** Estado do painel: uma linha por canal + histórico das últimas execuções. */
export async function GET(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params;
    const userId = await requireUser();
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    return NextResponse.json(await getLaunchState(userId, id));
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Erro ao ler estado do lançamento' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const { id: campaignId } = await props.params;
    const userId = await requireUser();
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    if (!campaignId) {
      return NextResponse.json({ error: 'ID da campanha é obrigatório' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({} as any));
    const idempotencyKey =
      body?.idempotencyKey || request.headers.get('x-idempotency-key') || undefined;
    if (!idempotencyKey) {
      return NextResponse.json(
        { success: false, error: 'idempotencyKey é obrigatória: sem ela não há como impedir lançamento duplicado.' },
        { status: 400 },
      );
    }

    const requested: LaunchChannel[] | undefined = Array.isArray(body?.channels)
      ? body.channels.filter((c: string): c is LaunchChannel => CHANNELS.includes(c as LaunchChannel))
      : undefined;
    if (Array.isArray(body?.channels) && (!requested || requested.length === 0)) {
      return NextResponse.json({ success: false, error: 'Nenhum canal válido informado.' }, { status: 400 });
    }

    const result = await executeLaunch({
      userId,
      campaignId,
      idempotencyKey: String(idempotencyKey),
      channels: requested,
      requestMock: body?.isMockMode ?? false,
      bypassReadiness: body?.bypassReadiness ?? false,
      overrides: body?.overrides,
    });

    // Recusa de regra (preflight reprovado, claim gate, canal já ocupado) é
    // resultado esperado, não defeito do servidor: 422 com o corpo inteiro. O 500
    // fica só para exceção de verdade, no catch — senão todo bloqueio legítimo
    // polui o log de erro e o painel não distingue "barrado" de "quebrou".
    return NextResponse.json(result, { status: result.success ? 200 : 422 });
  } catch (err: any) {
    console.error('Launch campaign error:', err);
    return NextResponse.json({ error: err?.message ?? 'Erro ao lançar campanha' }, { status: 500 });
  }
}
