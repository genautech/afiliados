export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import path from 'node:path';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { readJsonFile, researchDir, runWithMockFallback, updateManifest } from '@/lib/antigravity';

const requestSchema = z.object({
  videoUrl: z.string().url().max(2048),
  campaignId: z.string().min(1).max(255).optional(),
  tags: z.array(z.string().trim().min(1).max(80)).max(50).default([]),
}).strict();

function isSupportedVideoUrl(value: string): boolean {
  const url = new URL(value);
  return url.protocol === 'https:' || url.protocol === 'http:';
}

function sourceKind(videoUrl: string, tags: string[]): 'youtube' | 'reference' {
  const hostname = new URL(videoUrl).hostname.toLowerCase();
  if (hostname === 'youtube.com' || hostname.endsWith('.youtube.com') || hostname === 'youtu.be') return 'youtube';
  return tags.map((tag) => tag.toLowerCase()).includes('youtube') ? 'youtube' : 'reference';
}

async function processReference(input: {
  videoUrl: string;
  campaignId: string;
  campaignName: string;
  tags: string[];
  kind: 'youtube' | 'reference';
}) {
  const outputPath = path.join(researchDir(input.campaignName), input.kind === 'youtube' ? 'youtube_insights.json' : 'competitor_scrape.json');
  const args = input.kind === 'youtube'
    ? ['--url', input.videoUrl, '--output-json', outputPath]
    : ['--url', input.videoUrl, '--output-json', outputPath];
  const script = input.kind === 'youtube' ? 'process_youtube_knowledge.py' : 'firecrawl_competitor_scraper.py';
  const result = await runWithMockFallback(script, args);
  if (!result.ok) throw new Error(`Antigravity falhou: ${result.stderr.slice(-1000)}`);

  const data = await readJsonFile(outputPath);
  const insights = input.kind === 'youtube' ? (data.insights ?? data) : data;
  const title = typeof data.title === 'string' ? data.title : 'Referência processada';
  const summary = input.kind === 'youtube'
    ? JSON.stringify(insights)
    : (typeof data.markdown === 'string' ? data.markdown : JSON.stringify(data));
  const insight = await prisma.globalKnowledgeInsight.upsert({
    where: { videoUrl: input.videoUrl },
    update: { title, summary, insights: insights as object, tags: input.tags },
    create: {
      videoUrl: input.videoUrl,
      title,
      channel: input.kind === 'youtube' ? 'YouTube' : null,
      vertical: null,
      summary,
      insights: insights as object,
      tags: input.tags,
      campaigns: { connect: { id: input.campaignId } },
    },
  });
  await updateManifest(input.campaignName, (manifest) => {
    const current = Array.isArray(manifest.insights) ? manifest.insights : [];
    const next = current.filter((item) => item && typeof item === 'object' && (item as { url?: string }).url !== input.videoUrl);
    return {
      ...manifest,
      insights: [...next, { id: insight.id, url: input.videoUrl, title, tags: input.tags, source: input.kind, mode: result.mode, processed_at: new Date().toISOString() }],
    };
  });
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Payload JSON inválido' }, { status: 400 });
    }

    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Payload inválido', details: parsed.error.flatten() }, { status: 400 });
    }

    const { videoUrl, campaignId, tags } = parsed.data;
    if (!isSupportedVideoUrl(videoUrl)) {
      return NextResponse.json({ error: 'videoUrl deve usar http ou https' }, { status: 400 });
    }

    if (!campaignId) {
      return NextResponse.json({ error: 'campaignId é obrigatório para processar uma referência' }, { status: 400 });
    }
    const campaign = await prisma.campaign.findFirst({
        where: { id: campaignId, userId },
        select: { id: true, name: true },
    });
    if (!campaign) return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 });

    const kind = sourceKind(videoUrl, tags);
    void processReference({ videoUrl, campaignId: campaign.id, campaignName: campaign.name, tags, kind })
      .catch((error) => console.error('Antigravity knowledge process failed:', error));
    const acceptedAt = new Date().toISOString();
    return NextResponse.json(
      { accepted: true, status: 'QUEUED', videoUrl, campaignId, tags, source: kind, acceptedAt },
      { status: 202 },
    );
  } catch (error) {
    console.error('POST knowledge/process error:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
