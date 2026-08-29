import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateTrendScout } from '@/lib/trendScoutService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const schema = z.object({
  niche: z.string().trim().min(2).max(120),
  country: z.string().trim().toUpperCase().regex(/^(ALL|[A-Z]{2})$/),
}).strict();

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    let raw: unknown;
    try { raw = await request.json(); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }
    const parsed = schema.safeParse(raw);
    if (!parsed.success) return NextResponse.json({ error: 'Payload inválido', details: parsed.error.flatten() }, { status: 400 });

    const result = await generateTrendScout(parsed.data.niche, parsed.data.country);
    const product = await prisma.productResearch.upsert({
      where: { userId_name: { userId, name: result.idea.name } },
      create: {
        userId, name: result.idea.name, network: 'Meta_Google_Scout', productType: 'PROPRIETARY_LOW_TICKET',
        vertical: result.idea.vertical, score: result.idea.potentialScore, source: 'trend-scout', status: 'novo',
        chosenKeyword: parsed.data.niche, summary: result.idea.vslHook,
        tags: [parsed.data.niche, parsed.data.country, 'trend-scout'],
        strategy: { ...result.idea, trendSlope: result.trendSlope, source: result.source },
      },
      update: {
        network: 'Meta_Google_Scout', productType: 'PROPRIETARY_LOW_TICKET', vertical: result.idea.vertical,
        score: result.idea.potentialScore, source: 'trend-scout', chosenKeyword: parsed.data.niche,
        summary: result.idea.vslHook, tags: [parsed.data.niche, parsed.data.country, 'trend-scout'],
        strategy: { ...result.idea, trendSlope: result.trendSlope, source: result.source },
      },
    });
    return NextResponse.json({ success: true, product, trendSlope: result.trendSlope }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    const status = message.startsWith('Credenciais ausentes') ? 503 : /Firecrawl|OpenRouter/.test(message) ? 502 : 500;
    console.error('[products/idea] POST error:', message);
    return NextResponse.json({ error: 'Erro ao gerar ideia de produto', details: message }, { status });
  }
}
