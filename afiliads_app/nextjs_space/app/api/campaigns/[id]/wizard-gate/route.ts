export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { runFullChecklistVerify } from '@/lib/complianceVerifier';
import { evaluateWizardGate, type WizardGateStep } from '@/lib/wizard-gates';

const GatePayloadSchema = z.object({ step: z.union([z.literal(7), z.literal(8)]) }).strict();

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: unknown } | undefined)?.id;
    if (typeof userId !== 'string' || userId.length === 0) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const parsed = GatePayloadSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Passo de gate inválido' }, { status: 400 });

    const campaign = await prisma.campaign.findFirst({
      where: { id: params.id, userId },
      include: { keywords: true },
    });
    if (!campaign) return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 });

    // Recompute auto checks on the server immediately before deciding. Client
    // checkboxes are never accepted as proof for auto-verified items.
    await runFullChecklistVerify(campaign);
    const rows = await prisma.campaignChecklist.findMany({ where: { campaignId: campaign.id, step: parsed.data.step } });
    const result = evaluateWizardGate(parsed.data.step as WizardGateStep, campaign.platform, rows);
    return NextResponse.json(result, { status: result.allowed ? 200 : 409 });
  } catch (error: unknown) {
    console.error('POST wizard-gate error:', error);
    return NextResponse.json({ error: 'Não foi possível verificar o gate; avanço bloqueado.' }, { status: 502 });
  }
}
