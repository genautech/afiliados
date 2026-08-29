export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { resolveScope, StudioScopeError } from '@/lib/product-agent-persistence';

// Estado salvo do Estúdio de Produto: a última versão de cada artefato no escopo pedido.
// Uma rota só, e não sete GETs, porque a tela sempre abre os sete painéis de uma vez.

const SINGLE_RECORD_TABS = [
  ['brand', 'brandKit'],
  ['offer', 'offerDesign'],
  ['content', 'contentArchitecture'],
  ['copyqa', 'copyQaReport'],
  ['visual', 'visualSystem'],
  ['launch', 'launchPlan'],
] as const;

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId') || undefined;
    const productResearchId = searchParams.get('productResearchId') || undefined;

    if (!campaignId && !productResearchId) {
      return NextResponse.json({ error: 'Informe campaignId ou productResearchId' }, { status: 400 });
    }

    const scope = await resolveScope(userId, { campaignId, productResearchId });
    const where = { userId, campaignId: scope.campaignId, productResearchId: scope.productResearchId };

    const results: Record<string, any> = {};

    for (const [tab, delegateName] of SINGLE_RECORD_TABS) {
      const row = await (prisma as any)[delegateName].findFirst({ where, orderBy: { version: 'desc' } });
      if (row) results[tab] = row;
    }

    // O ledger de claims é uma linha por claim: devolve o lote da última versão.
    const lastClaim = await prisma.claimLedgerEntry.findFirst({
      where,
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    if (lastClaim) {
      const ledger = await prisma.claimLedgerEntry.findMany({
        where: { ...where, version: lastClaim.version },
        orderBy: { createdAt: 'asc' },
      });
      results.claims = { version: lastClaim.version, ledger, blocked: ledger.filter((c) => c.status === 'PROIBIDO').map((c) => c.claim) };
    }

    return NextResponse.json({ ok: true, scope, results });
  } catch (error: any) {
    if (error instanceof StudioScopeError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error('[product-studio GET]', error);
    return NextResponse.json({ error: error?.message ?? 'Erro interno' }, { status: 500 });
  }
}
