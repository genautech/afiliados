export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getChecklistLearningReferencia } from '@/lib/complianceVerifier';

// Usado pelo botão "Regenerar com correções" (Passo 4 do wizard) — devolve as lições já
// aprendidas (ChecklistLearning) compatíveis com a vertical/canal/plataforma desta campanha,
// pra injetar como contexto extra na próxima geração da pré-sell (generatePresell() já aceita
// texto livre em args.context).
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const userId = (session.user as any)?.id;
    const campaign = await prisma.campaign.findFirst({ where: { id: params?.id, userId } });
    if (!campaign) return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 });

    const context = await getChecklistLearningReferencia(userId, campaign.vertical, campaign.channel, campaign.platform);
    return NextResponse.json({ context: context || '' });
  } catch (err: any) {
    console.error('GET checklists/learnings error:', err);
    return NextResponse.json({ error: err?.message ?? 'Erro ao buscar lições aprendidas' }, { status: 500 });
  }
}
