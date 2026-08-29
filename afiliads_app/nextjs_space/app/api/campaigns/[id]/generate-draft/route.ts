export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { draftsDir, researchDir, runWithMockFallback, updateManifest } from '@/lib/antigravity';
import path from 'node:path';
import { promises as fs } from 'node:fs';

async function latestResearch(campaignName: string): Promise<string | null> {
  const dir = researchDir(campaignName);
  try {
    const files = (await fs.readdir(dir)).filter((file) => file.endsWith('.json')).sort();
    return files.length ? path.join(dir, files[files.length - 1]) : null;
  } catch {
    return null;
  }
}

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const campaign = await prisma.campaign.findFirst({
      where: { id: params.id, userId },
      select: { id: true, name: true },
    });
    if (!campaign) return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 });

    const source = await latestResearch(campaign.name);
    const args = source
      ? ['--insights-json', source, '--output-dir', draftsDir(campaign.name)]
      : ['--output-dir', draftsDir(campaign.name)];
    const result = await runWithMockFallback('dna_aligner.py', source ? args : [...args, '--mock']);
    if (!result.ok) return NextResponse.json({ error: 'Não foi possível gerar os rascunhos', mode: result.mode }, { status: 502 });

    const landingPageHtml = await fs.readFile(path.join(draftsDir(campaign.name), 'landing_page_draft.html'), 'utf8');
    const ebookHtml = await fs.readFile(path.join(draftsDir(campaign.name), 'ebook_draft.html'), 'utf8');
    const draftData = {
      landingPageHtml,
      ebookHtml,
      generatedAt: new Date().toISOString(),
      mode: result.mode,
      sourceResearch: source,
    };
    const updated = await prisma.campaign.update({
      where: { id: campaign.id },
      data: { draftData },
    });
    await updateManifest(campaign.name, (manifest) => ({
      ...manifest,
      drafts: {
        ...(manifest.drafts && typeof manifest.drafts === 'object' ? manifest.drafts : {}),
        landing_page: '02_drafts/landing_page_draft.html',
        ebook: '02_drafts/ebook_draft.html',
        generated_at: draftData.generatedAt,
        mode: result.mode,
      },
    }));
    return NextResponse.json({ campaign: updated, draftData }, { status: 200 });
  } catch (error) {
    console.error('POST campaigns/generate-draft error:', error);
    return NextResponse.json({ error: 'Erro interno ao gerar rascunhos' }, { status: 500 });
  }
}
