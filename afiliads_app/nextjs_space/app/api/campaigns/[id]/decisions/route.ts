export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// B5 (checkpoint pós-Tarefa 8 — .hermes/handoffs/2026-07-29_task8-cross-flow-quality-gate.md):
// sem este check, um usuário B autenticado podia POSTar SCALE pra um campaignId de outro
// usuário (A) e, se A já tivesse `budgetScale`/`googleCampaignId` configurados, isso disparava
// `mutateGoogleCampaign` de VERDADE na conta de A — aumento de gasto real por usuário sem
// relação com a campanha. Mesmo padrão de `findFirst({where:{id,userId}})` de
// app/api/campaigns/[id]/route.ts.
async function assertCampaignOwnership(campaignId: string, userId: string): Promise<boolean> {
  const campaign = await prisma.campaign.findFirst({ where: { id: campaignId, userId }, select: { id: true } });
  return Boolean(campaign);
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const userId = (session.user as any)?.id;
    if (!(await assertCampaignOwnership(params?.id, userId))) {
      return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 });
    }
    const decisions = await prisma.campaignDecision.findMany({ where: { campaignId: params?.id }, orderBy: { createdAt: 'desc' } });
    return NextResponse.json(decisions ?? []);
  } catch (err: any) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// "48h"/"72h" (horas) ou "5"/"7" (dias) — mesmo vocabulário de testDuration usado no Wizard
// (lib/wizard-data.ts) e no autofill (lib/wizard-autofill.ts).
function testDurationToDays(td: string | null | undefined): number {
  const s = String(td ?? '72h').trim().toLowerCase();
  if (s === '48h') return 2;
  if (s === '72h') return 3;
  const n = parseInt(s, 10);
  return Number.isFinite(n) && n > 0 ? n : 3;
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const userId = (session.user as any)?.id;
    if (!(await assertCampaignOwnership(params?.id, userId))) {
      return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 });
    }
    const body = await request.json();
    const decision = await prisma.campaignDecision.create({
      data: {
        campaignId: params?.id,
        userId,
        decision: body?.decision ?? 'OTIMIZAR',
        rationale: body?.rationale ?? null,
      },
    });
    // Update campaign status based on decision
    const statusMap: Record<string, string> = { KILL: 'KILL', OTIMIZAR: 'OTIMIZANDO', SCALE: 'SCALE' };
    const newStatus = statusMap?.[body?.decision] ?? 'EM_TESTE';
    const campaign = await prisma.campaign.update({ where: { id: params?.id }, data: { status: newStatus } });

    // Confirmar SCALE aplica o budget de scale (definido no Wizard) como orçamento diário
    // real no Google Ads — é o único ponto do sistema que aumenta gasto de verdade, e só
    // acontece por clique humano aqui (o loop automático nunca faz isso sozinho). Por isso tem
    // teto de segurança + gate de compliance: um budgetScale absurdo (alucinação de IA ou erro
    // de digitação) ou um checklist crítico pendente NUNCA podem virar gasto real sem barreira.
    let gadsLog: string | null = null;
    if (body?.decision === 'SCALE' && campaign.budgetScale > 0 && campaign.googleCampaignId) {
      const checklists = await prisma.campaignChecklist.findMany({ where: { campaignId: params?.id } });
      const criticalUnchecked = checklists.filter((c) => c.isCritical && !c.isChecked).length;
      const testDurationDays = testDurationToDays(campaign.testDuration);
      const dailyTestBudget = campaign.budgetTest > 0 ? campaign.budgetTest / testDurationDays : 0;
      const maxSafeScale = dailyTestBudget * 5; // teto documentado no SYSTEM_PROMPT do autofill (3x-5x o budget diário de teste)

      if (criticalUnchecked > 0) {
        gadsLog = `⚠️ Budget de scale NÃO aplicado no Google Ads: ${criticalUnchecked} item(ns) crítico(s) do checklist ainda pendente(s). Complete o checklist antes de escalar gasto real.`;
      } else if (dailyTestBudget > 0 && campaign.budgetScale > maxSafeScale) {
        gadsLog = `⚠️ Budget de scale NÃO aplicado no Google Ads: $${campaign.budgetScale.toFixed(2)}/dia excede o teto de segurança (5x o budget diário de teste = $${maxSafeScale.toFixed(2)}/dia). Revise o valor no Wizard.`;
      } else {
        try {
          const { mutateGoogleCampaign } = await import('@/lib/google-ads');
          const result = await mutateGoogleCampaign(userId, campaign.googleCampaignId, {
            budgetDaily: campaign.budgetScale,
            status: 'ENABLED',
          });
          gadsLog = result.log;
        } catch (e: any) {
          gadsLog = `Falha ao aplicar budget de scale no Google Ads: ${e?.message}`;
        }
      }
    }
    return NextResponse.json({ ...decision, gadsLog }, { status: 201 });
  } catch (err: any) {
    console.error('POST decision error:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
