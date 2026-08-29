import { prisma } from './prisma';
import crypto from 'crypto';

export interface KiwifyWebhookPayload {
  order_id: string;
  order_status: 'paid' | 'refused' | 'refunded' | 'chargedback' | 'pending_approval';
  product_id: string;
  product_name: string;
  amount: number; // in cents, e.g. 1990 for R$ 19,90
  customer: {
    name: string;
    email: string;
    mobile?: string;
  };
  tracking_parameters?: {
    src?: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string; // We map this to Campaign ID or name
    utm_content?: string;
  };
}

export interface KiwifyServiceOptions {
  isMockMode?: boolean;
  bypassSignature?: boolean;
}

/**
 * Kiwify webhook service
 */
export async function processKiwifyWebhook(
  payload: KiwifyWebhookPayload,
  signatureHeader?: string,
  options: KiwifyServiceOptions = {}
): Promise<{ success: boolean; message: string; campaignId?: string }> {
  const isMock = options.isMockMode ?? process.env.KIWIFY_MOCK_MODE === 'true';
  const bypassSignature = options.bypassSignature ?? isMock;

  // Signature verification (Kiwify sends SHA1 signature of JSON payload using webhook token)
  if (!bypassSignature && signatureHeader) {
    const secret = process.env.KIWIFY_WEBHOOK_SECRET;
    if (!secret) {
      return { success: false, message: 'Kiwify webhook secret not configured on server' };
    }
    const hmac = crypto.createHmac('sha1', secret);
    const digest = hmac.update(JSON.stringify(payload)).digest('hex');
    if (digest !== signatureHeader) {
      return { success: false, message: 'Invalid webhook signature' };
    }
  }

  const { order_id, order_status, product_id, product_name, amount, tracking_parameters, customer } = payload;
  const revenueGained = amount / 100; // convert cents to currency unit

  // Find Campaign based on utm_campaign
  const campaignIdentifier = tracking_parameters?.utm_campaign;
  if (!campaignIdentifier) {
    return { success: true, message: 'Webhook processed, but no utm_campaign tracking parameter found.' };
  }

  // Find the campaign by ID or name
  const campaign = await prisma.campaign.findFirst({
    where: {
      OR: [
        { id: campaignIdentifier },
        { name: campaignIdentifier },
        { googleCampaignId: campaignIdentifier }
      ]
    }
  });

  if (!campaign) {
    return { success: true, message: `Webhook processed, but campaign not found for identifier: ${campaignIdentifier}` };
  }

  // Update DailyLog for the campaign (for today's date)
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const conversionsDelta = order_status === 'paid' ? 1 : 0;
  const revenueDelta = order_status === 'paid' ? revenueGained : 0;
  const refundsDelta = order_status === 'refunded' || order_status === 'chargedback' ? revenueGained : 0;

  try {
    await prisma.$transaction(async (tx) => {
      const existingLog = await tx.dailyLog.findUnique({
        where: {
          campaignId_logDate: {
            campaignId: campaign.id,
            logDate: today,
          }
        }
      });

      if (existingLog) {
        await tx.dailyLog.update({
          where: { id: existingLog.id },
          data: {
            conversions: { increment: conversionsDelta },
            revenue: { increment: revenueDelta },
            refunds: { increment: refundsDelta },
          }
        });
      } else {
        await tx.dailyLog.create({
          data: {
            campaignId: campaign.id,
            userId: campaign.userId,
            logDate: today,
            conversions: conversionsDelta,
            revenue: revenueDelta,
            refunds: refundsDelta,
            network: 'kiwify',
            offerName: product_name,
            vertical: campaign.vertical,
            geo: campaign.geo,
            channel: campaign.channel,
            funnel: campaign.funnel,
          }
        });
      }
    });

    return {
      success: true,
      message: `Webhook successfully integrated with campaign ${campaign.id}. Status: ${order_status}`,
      campaignId: campaign.id
    };
  } catch (err: any) {
    console.error('Error integrating Kiwify webhook with DailyLog:', err);
    return { success: false, message: `Database update failed: ${err.message}` };
  }
}
