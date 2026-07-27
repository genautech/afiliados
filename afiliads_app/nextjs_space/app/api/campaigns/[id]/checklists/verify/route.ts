export const dynamic = 'force-dynamic';
export const maxDuration = 30;
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  ANTISTRIKE_ITEMS, BRIDGE_CHECKLIST, GOOGLE_ADS_CHECKLIST,
  TRACKING_CHECKLIST_MAXWEB, TRACKING_CHECKLIST_CB, GOLIVE_CHECKLIST,
} from '@/lib/wizard-data';
import {
  verifyAntistrikeItems, verifyBridgeChecklist, verifyGoogleAdsChecklist,
  verifyTrackingMaxweb, verifyTrackingCb, verifyGoLiveChecklist, type CheckResult,
} from '@/lib/complianceVerifier';

const STEP_ANTISTRIKE = 3;
const STEP_BRIDGE = 4;
const STEP_GOOGLE_ADS = 7;
const STEP_TRACKING = 8;
const STEP_GOLIVE = 9;

async function upsertAutoResults(campaignId: string, step: number, defs: Array<{ key: string; label: string; critical: boolean; verificationType: string }>, results: Record<string, CheckResult>) {
  const rows = [];
  for (const def of defs) {
    if (def.verificationType !== 'auto') continue;
    const result = results[def.key];
    if (!result) continue;
    const row = await prisma.campaignChecklist.upsert({
      where: { campaignId_step_itemKey: { campaignId, step, itemKey: def.key } },
      update: { isChecked: result.passed, note: result.note ?? null, checkedAt: result.passed ? new Date() : null, verificationType: 'auto', isCritical: def.critical, itemLabel: def.label },
      create: {
        campaignId, step, itemKey: def.key, itemLabel: def.label, isCritical: def.critical,
        isChecked: result.passed, note: result.note ?? null, checkedAt: result.passed ? new Date() : null, verificationType: 'auto',
      },
    });
    rows.push(row);
  }
  return rows;
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const userId = (session.user as any)?.id;
    const campaignId = params?.id;

    const campaign = await prisma.campaign.findFirst({ where: { id: campaignId, userId }, include: { keywords: true } });
    if (!campaign) return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 });

    const trackingDefs = campaign.platform === 'MaxWeb' ? TRACKING_CHECKLIST_MAXWEB : TRACKING_CHECKLIST_CB;
    const trackingResults = campaign.platform === 'MaxWeb' ? await verifyTrackingMaxweb(campaign) : await verifyTrackingCb(campaign);

    const [antistrikeResults, bridgeResults, googleAdsResults] = await Promise.all([
      verifyAntistrikeItems(campaign),
      verifyBridgeChecklist(campaign),
      verifyGoogleAdsChecklist(campaign),
    ]);

    const allRows: any[] = [];
    allRows.push(...await upsertAutoResults(campaignId, STEP_ANTISTRIKE, ANTISTRIKE_ITEMS as any, antistrikeResults));
    allRows.push(...await upsertAutoResults(campaignId, STEP_BRIDGE, BRIDGE_CHECKLIST as any, bridgeResults));
    allRows.push(...await upsertAutoResults(campaignId, STEP_GOOGLE_ADS, GOOGLE_ADS_CHECKLIST as any, googleAdsResults));
    allRows.push(...await upsertAutoResults(campaignId, STEP_TRACKING, trackingDefs as any, trackingResults));

    // GOLIVE precisa do estado dos outros checklists já gravado acima — recarrega antes de calcular.
    const priorChecklists = await prisma.campaignChecklist.findMany({ where: { campaignId, step: { in: [STEP_ANTISTRIKE, STEP_BRIDGE, STEP_GOOGLE_ADS, STEP_TRACKING] } } });
    const otherChecklistsCriticalUnchecked = priorChecklists.filter((c) => c.isCritical && !c.isChecked).length;
    const selectedKeywordsCount = (campaign.keywords ?? []).filter((k) => k.isSelected).length;

    const goLiveResults = await verifyGoLiveChecklist(campaign, { selectedKeywordsCount, otherChecklistsCriticalUnchecked });
    allRows.push(...await upsertAutoResults(campaignId, STEP_GOLIVE, GOLIVE_CHECKLIST as any, goLiveResults));

    return NextResponse.json({ verified: allRows.length, items: allRows });
  } catch (err: any) {
    console.error('POST checklists/verify error:', err);
    return NextResponse.json({ error: err?.message ?? 'Erro ao verificar checklist' }, { status: 500 });
  }
}
