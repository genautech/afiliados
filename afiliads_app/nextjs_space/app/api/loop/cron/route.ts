export const dynamic = 'force-dynamic';
export const maxDuration = 300;
import { NextRequest, NextResponse } from 'next/server';
import { runDueLoops } from '@/lib/loop-engine';
import { timingSafeEqual } from 'crypto';

// Varredura global de loops (todas as contas). Fica separada de /api/loop/run de propósito:
// aquela rota é de usuário autenticado e só pode tocar nas campanhas dele. Esta aqui é o
// entrypoint do scheduler e roda em nome de todo mundo — por isso exige segredo interno e
// falha fechada quando o segredo não está configurado.
function autorizado(request: NextRequest): boolean {
  const esperado = process.env.LOOP_CRON_SECRET;
  if (!esperado) return false; // sem segredo configurado, ninguém entra
  const recebido =
    request.headers.get('x-loop-cron-secret') ??
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ??
    '';
  if (!recebido) return false;
  const a = Buffer.from(recebido);
  const b = Buffer.from(esperado);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  if (!autorizado(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  try {
    const results = await runDueLoops('cron', {
      kind: 'all-users',
      reason: 'scheduler interno /api/loop/cron',
    });
    return NextResponse.json({ ran: results.length, results });
  } catch (err: any) {
    console.error('Loop cron error:', err);
    return NextResponse.json({ error: err?.message || 'Erro interno' }, { status: 500 });
  }
}
