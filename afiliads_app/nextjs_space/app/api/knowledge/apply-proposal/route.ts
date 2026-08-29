export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { applyPresellProposal } from '@/lib/landingPageProposalService';

const applyRequestSchema = z.object({
  proposalId: z.string().min(1).max(255),
}).strict();

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Payload JSON inválido' }, { status: 400 });
    }

    const parsed = applyRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Campos inválidos', details: parsed.error.flatten() }, { status: 400 });
    }

    const { proposalId } = parsed.data;

    // Aplicar a proposta de forma síncrona
    await applyPresellProposal(proposalId, userId);

    return NextResponse.json({
      success: true,
      message: 'Proposta de pre-sell aplicada com sucesso! O HTML foi regenerado e atualizado.',
    });

  } catch (error: any) {
    console.error('[apply-proposal-api] Falha ao aplicar proposta:', error?.message);
    return NextResponse.json({ error: error?.message || 'Erro interno ao aplicar proposta' }, { status: 500 });
  }
}
