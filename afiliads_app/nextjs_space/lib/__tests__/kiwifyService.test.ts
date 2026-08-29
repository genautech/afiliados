import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processKiwifyWebhook, KiwifyWebhookPayload } from '../kiwifyService';
import { prisma } from '../prisma';

vi.mock('../prisma', () => ({
  prisma: {
    campaign: {
      findFirst: vi.fn(),
    },
    dailyLog: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn((cb) => cb(prisma)),
  },
}));

describe('Kiwify Webhook Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const samplePayload: KiwifyWebhookPayload = {
    order_id: 'order_123',
    order_status: 'paid',
    product_id: 'prod_99',
    product_name: 'Proprietary Low Ticket Ebook',
    amount: 1990, // R$ 19,90
    customer: {
      name: 'Test Customer',
      email: 'customer@test.com',
    },
    tracking_parameters: {
      utm_campaign: 'camp_abc',
    },
  };

  it('should ignore process if tracking utm_campaign is missing', async () => {
    const payloadNoCampaign = { ...samplePayload, tracking_parameters: {} };
    const result = await processKiwifyWebhook(payloadNoCampaign, undefined, { bypassSignature: true });
    expect(result.success).toBe(true);
    expect(result.message).toContain('no utm_campaign tracking parameter found');
    expect(prisma.campaign.findFirst).not.toHaveBeenCalled();
  });

  it('should process paid order webhook and create/update DailyLog', async () => {
    vi.mocked(prisma.campaign.findFirst).mockResolvedValue({
      id: 'camp_abc',
      userId: 'user_1',
      name: 'Camp ABC',
      platform: 'google',
      vertical: 'health',
      geo: 'BR',
      channel: 'search',
      funnel: 'BRIDGE',
      status: 'EM_TESTE',
      createdAt: new Date(),
      updatedAt: new Date(),
      launchCheckpoint: 'DRAFT',
      launchIdempotencyKey: null,
    } as any);

    vi.mocked(prisma.dailyLog.findUnique).mockResolvedValue(null);

    const result = await processKiwifyWebhook(samplePayload, undefined, { bypassSignature: true });
    expect(result.success).toBe(true);
    expect(result.campaignId).toBe('camp_abc');
    expect(prisma.dailyLog.create).toHaveBeenCalled();
  });
});
