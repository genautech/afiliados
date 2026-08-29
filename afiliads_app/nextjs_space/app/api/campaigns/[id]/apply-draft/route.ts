export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Prisma } from '@prisma/client';
import path from 'node:path';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { draftsDir, updateManifest, writeTextAtomic } from '@/lib/antigravity';

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const campaign = await prisma.campaign.findFirst({
      where: { id: params.id, userId },
      select: { id: true, name: true, draftData: true },
    });
    if (!campaign) return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 });
    if (campaign.draftData === null) {
      return NextResponse.json({ error: 'A campanha não possui rascunho para aprovar' }, { status: 409 });
    }

    const draft = campaign.draftData as Prisma.JsonObject;
    const landingHtml = typeof draft.landingPageHtml === 'string'
      ? draft.landingPageHtml
      : typeof draft.landing_page_html === 'string' ? draft.landing_page_html : null;
    const ebookHtml = typeof draft.ebookHtml === 'string'
      ? draft.ebookHtml
      : typeof draft.ebook_html === 'string' ? draft.ebook_html : null;
    if (!landingHtml || !ebookHtml) {
      return NextResponse.json({ error: 'Rascunho incompleto: landing e e-book são obrigatórios' }, { status: 409 });
    }

    const outputDir = draftsDir(campaign.name);
    await Promise.all([
      writeTextAtomic(path.join(outputDir, 'landing_page.html'), landingHtml),
      writeTextAtomic(path.join(outputDir, 'ebook.html'), ebookHtml),
    ]);
    await updateManifest(campaign.name, (manifest) => ({
      ...manifest,
      status: 'ready_to_deploy',
      drafts: {
        ...(manifest.drafts && typeof manifest.drafts === 'object' ? manifest.drafts : {}),
        landing_page: '02_drafts/landing_page.html',
        ebook: '02_drafts/ebook.html',
        approved_at: new Date().toISOString(),
      },
    }));

    // Repetir a chamada grava os mesmos arquivos e o mesmo estado, sem criar
    // versões ou registros duplicados.
    const updated = await prisma.$transaction((tx) =>
      tx.campaign.update({
        where: { id: campaign.id },
        data: {
          activeData: campaign.draftData === null ? Prisma.JsonNull : campaign.draftData,
          status: 'ready_to_deploy',
        },
      }),
    );

    return NextResponse.json(updated);
  } catch (error) {
    console.error('POST campaigns/apply-draft error:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
