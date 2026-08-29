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

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[apply-proposal-api] Falha ao aplicar proposta:', message);

    // Erros de negócio são seguros e úteis ao operador; qualquer outra coisa pode carregar
    // detalhe interno (nome de tabela, stack do Prisma) e vira mensagem genérica.
    const esperado = [
      'Proposta não encontrada.',
      'Esta proposta já foi aplicada a esta pre-sell.',
      'Pre-sell associado à proposta não foi encontrado ou pertence a outro usuário.',
    ];
    const seguro = esperado.includes(message) || message.startsWith('Conteúdo da proposta fora do contrato:');
    if (seguro) {
      const status = message === 'Esta proposta já foi aplicada a esta pre-sell.' ? 409 : 400;
      return NextResponse.json({ error: message }, { status });
    }
    return NextResponse.json({ error: 'Erro interno ao aplicar proposta' }, { status: 500 });
  }
}
