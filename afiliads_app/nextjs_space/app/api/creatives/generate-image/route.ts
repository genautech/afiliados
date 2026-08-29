export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const requestSchema = z.object({
  campaignId: z.string().min(1).max(255),
  prompt: z.string().trim().min(1).max(5_000),
  type: z.enum(['ebook-cover', 'facebook-ad']),
  isMockMode: z.boolean().optional(),
}).strict();

const MOCK_IMAGE = '/images/mocks/ebook-cover-placeholder.png';
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

function isMockMode(requested?: boolean): boolean {
  return requested === true
    || process.env.IMAGE_GENERATION_MOCK_MODE === 'true'
    || !process.env.IMAGE_GENERATION_API_URL
    || !process.env.IMAGE_GENERATION_API_KEY;
}

function imageFileName(type: 'ebook-cover' | 'facebook-ad', prompt: string): string {
  return `${type}-${createHash('sha256').update(prompt).digest('hex').slice(0, 16)}.png`;
}

function isAllowedProviderUrl(url: URL): boolean {
  return url.protocol === 'https:'
    || (url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname));
}

async function fetchGeneratedImage(prompt: string, type: 'ebook-cover' | 'facebook-ad', campaignId: string): Promise<Buffer> {
  const endpoint = process.env.IMAGE_GENERATION_API_URL;
  const apiKey = process.env.IMAGE_GENERATION_API_KEY;
  if (!endpoint || !apiKey) throw new Error('Provedor de imagens não configurado');
  const url = new URL(endpoint);
  if (!isAllowedProviderUrl(url)) throw new Error('IMAGE_GENERATION_API_URL deve usar HTTPS (HTTP só é permitido para loopback)');
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ prompt, type, campaignId }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) throw new Error(`Provedor de imagens retornou HTTP ${response.status}`);
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    const data = await response.json() as { image_url?: unknown; url?: unknown; image_base64?: unknown };
    if (typeof data.image_base64 === 'string') return Buffer.from(data.image_base64, 'base64');
    const imageUrl = typeof data.image_url === 'string' ? data.image_url : typeof data.url === 'string' ? data.url : null;
    if (!imageUrl) throw new Error('Resposta do provedor não contém imagem');
    const parsedUrl = new URL(imageUrl);
    if (!isAllowedProviderUrl(parsedUrl)) throw new Error('URL de imagem retornada deve usar HTTPS (HTTP só é permitido para loopback)');
    const imageResponse = await fetch(parsedUrl, { signal: AbortSignal.timeout(60_000) });
    if (!imageResponse.ok) throw new Error(`Download da imagem retornou HTTP ${imageResponse.status}`);
    const bytes = Buffer.from(await imageResponse.arrayBuffer());
    if (bytes.byteLength > MAX_IMAGE_BYTES) throw new Error('Imagem excede o limite permitido');
    return bytes;
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.byteLength > MAX_IMAGE_BYTES) throw new Error('Imagem excede o limite permitido');
  return bytes;
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    let raw: unknown;
    try { raw = await request.json(); } catch { return NextResponse.json({ error: 'Payload JSON inválido' }, { status: 400 }); }
    const parsed = requestSchema.safeParse(raw);
    if (!parsed.success) return NextResponse.json({ error: 'Payload inválido', details: parsed.error.flatten() }, { status: 400 });

    const campaign = await prisma.campaign.findFirst({ where: { id: parsed.data.campaignId, userId }, select: { id: true } });
    if (!campaign) return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 });
    if (isMockMode(parsed.data.isMockMode)) return NextResponse.json({ success: true, mock: true, path: MOCK_IMAGE });

    let bytes: Buffer;
    try {
      bytes = await fetchGeneratedImage(parsed.data.prompt, parsed.data.type, campaign.id);
    } catch (error) {
      console.warn('Image provider failed; using mock image:', error instanceof Error ? error.message : error);
      return NextResponse.json({ success: true, mock: true, path: MOCK_IMAGE, fallback: true });
    }

    const relativePath = `/campaigns_data/low_ticket/${campaign.id}/marketing_assets/images/${imageFileName(parsed.data.type, parsed.data.prompt)}`;
    const outputPath = path.join(process.cwd(), 'public', relativePath);
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    const tempPath = `${outputPath}.${process.pid}.${Date.now()}.tmp`;
    await fs.writeFile(tempPath, bytes, { mode: 0o600 });
    await fs.rename(tempPath, outputPath);
    return NextResponse.json({ success: true, mock: false, path: relativePath });
  } catch (error) {
    console.error('POST creatives/generate-image error:', error);
    return NextResponse.json({ error: 'Erro interno ao gerar imagem' }, { status: 500 });
  }
}
