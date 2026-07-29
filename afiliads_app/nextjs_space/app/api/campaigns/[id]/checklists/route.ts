export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getChecklistVerificationType } from '@/lib/wizard-data';

// B5 (checkpoint pós-Tarefa 8 — .hermes/handoffs/2026-07-29_task8-cross-flow-quality-gate.md):
// antes, esta rota só checava `session?.user` (qualquer usuário autenticado), sem confirmar
// que `params.id` pertence a ele — IDOR: usuário B lia/escrevia o checklist da campanha de A
// só sabendo/adivinhando o campaignId. Mesmo padrão de `findFirst({where:{id,userId}})` já
// usado em app/api/campaigns/[id]/route.ts.
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
    const items = await prisma.campaignChecklist.findMany({ where: { campaignId: params?.id }, orderBy: [{ step: 'asc' }, { itemKey: 'asc' }] });
    return NextResponse.json(items ?? []);
  } catch (err: any) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
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
    const items = body?.items ?? [];
    const results = [];
    for (const item of items) {
      const itemKey = item?.itemKey ?? '';
      const verificationType = getChecklistVerificationType(itemKey);
      // Itens 'auto' NUNCA aceitam autoatestação do cliente — só a rota /checklists/verify
      // (checagem real) pode escrever isChecked/note pra eles. Aqui, se o item é auto e já
      // existe uma linha (de uma verificação anterior), preserva o valor real; se ainda não
      // existe, cria como pendente (false) até a primeira verificação real rodar.
      const clientWantsChecked = !!item?.isChecked;
      const existing = verificationType === 'auto'
        ? await prisma.campaignChecklist.findUnique({ where: { campaignId_step_itemKey: { campaignId: params?.id, step: item?.step ?? 0, itemKey } } })
        : null;
      const isChecked = verificationType === 'auto' ? (existing?.isChecked ?? false) : clientWantsChecked;
      const checkedAt = verificationType === 'auto' ? (existing?.checkedAt ?? null) : (clientWantsChecked ? new Date() : null);

      const result = await prisma.campaignChecklist.upsert({
        where: { campaignId_step_itemKey: { campaignId: params?.id, step: item?.step ?? 0, itemKey } },
        update: { isChecked, checkedAt, verificationType, isCritical: item?.isCritical ?? false },
        create: {
          campaignId: params?.id,
          step: item?.step ?? 0,
          itemKey,
          itemLabel: item?.itemLabel ?? '',
          isCritical: item?.isCritical ?? false,
          isChecked,
          checkedAt,
          verificationType,
        },
      });
      results.push(result);
    }
    return NextResponse.json(results);
  } catch (err: any) {
    console.error('POST checklists error:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
