export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
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
    const body = await request.json();
    const items = body?.items ?? [];
    const results = [];
    for (const item of items) {
      const result = await prisma.campaignChecklist.upsert({
        where: { campaignId_step_itemKey: { campaignId: params?.id, step: item?.step ?? 0, itemKey: item?.itemKey ?? '' } },
        update: { isChecked: item?.isChecked ?? false, checkedAt: item?.isChecked ? new Date() : null },
        create: {
          campaignId: params?.id,
          step: item?.step ?? 0,
          itemKey: item?.itemKey ?? '',
          itemLabel: item?.itemLabel ?? '',
          isCritical: item?.isCritical ?? false,
          isChecked: item?.isChecked ?? false,
          checkedAt: item?.isChecked ? new Date() : null,
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
