export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { processKiwifyWebhook, type KiwifyWebhookPayload } from '@/lib/kiwifyService';

const payloadSchema = z.object({
  order_id: z.string().min(1).max(255),
  order_status: z.enum(['paid', 'refused', 'refunded', 'chargedback', 'pending_approval']),
  product_id: z.string().min(1).max(255).default('mock-product'),
  product_name: z.string().min(1).max(500).default('Mock Low Ticket'),
  amount: z.number().finite().nonnegative().max(100_000_000),
  customer: z.object({
    name: z.string().max(255).default('Mock Customer'),
    email: z.string().email().max(320).default('mock@example.com'),
    mobile: z.string().max(40).optional(),
  }).default({ name: 'Mock Customer', email: 'mock@example.com' }),
  tracking_parameters: z.object({
    utm_campaign: z.string().min(1).max(255).optional(),
    utm_source: z.string().max(255).optional(),
    utm_medium: z.string().max(255).optional(),
    utm_content: z.string().max(255).optional(),
  }).optional(),
}).strict();

function mockWebhookEnabled(request: Request): boolean {
  if (process.env.KIWIFY_MOCK_MODE === 'true') return true;
  if (process.env.NODE_ENV !== 'production') return true;
  const configured = process.env.KIWIFY_TEST_WEBHOOK_SECRET;
  return Boolean(configured && request.headers.get('x-kiwify-test-secret') === configured);
}

export async function POST(request: Request) {
  try {
    if (!mockWebhookEnabled(request)) return NextResponse.json({ error: 'Webhook de teste desabilitado' }, { status: 404 });

    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json({ error: 'Payload JSON inválido' }, { status: 400 });
    }
    const envelope = raw && typeof raw === 'object' && 'data' in raw ? (raw as { data?: unknown }).data : raw;
    const parsed = payloadSchema.safeParse(envelope);
    if (!parsed.success) return NextResponse.json({ error: 'Payload de webhook inválido', details: parsed.error.flatten() }, { status: 400 });

    const payload = parsed.data as KiwifyWebhookPayload;
    const result = await processKiwifyWebhook(payload, undefined, { isMockMode: true, bypassSignature: true });
    if (!result.success) return NextResponse.json({ error: result.message }, { status: 502 });

    if (result.campaignId && payload.order_status === 'paid') {
      await prisma.campaign.update({ where: { id: result.campaignId }, data: { status: 'ATIVA' } });
    }
    return NextResponse.json({ ...result, simulated: true, campaignStatus: payload.order_status === 'paid' ? 'ATIVA' : undefined });
  } catch (error) {
    console.error('POST webhooks/kiwify-test error:', error);
    return NextResponse.json({ error: 'Erro interno ao processar webhook de teste' }, { status: 500 });
  }
}
