import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { createGoogleCampaign, getGoogleAdsConfig } from '@/lib/google-ads';
import { generateRsaCopy } from '@/lib/rsa';
import { checkGoogleAdsReadiness } from '@/lib/google-ads/readiness';

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    campaign: { findFirst: vi.fn(), update: vi.fn() },
    campaignChecklist: { findMany: vi.fn() },
    productResearch: { findUnique: vi.fn() },
    campaignDecision: { create: vi.fn() },
  },
}));

vi.mock('@/lib/google-ads', () => ({
  createGoogleCampaign: vi.fn(),
  getGoogleAdsConfig: vi.fn(),
}));

vi.mock('@/lib/rsa', () => ({
  generateRsaCopy: vi.fn(),
}));

vi.mock('@/lib/google-ads/readiness', () => ({
  checkGoogleAdsReadiness: vi.fn(),
}));

describe('POST /api/google-ads/create', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getServerSession as any).mockResolvedValue({ user: { id: 'u1' } });
  });

  function createRequest(body: any) {
    return new NextRequest('http://localhost/api/google-ads/create', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  it('passes PREPARE readiness and creates campaign if valid', async () => {
    (prisma.campaign.findFirst as any).mockResolvedValue({ id: 'c1', userId: 'u1', keywords: [] });
    
    // Readiness succeeds in PREPARE mode
    (checkGoogleAdsReadiness as any).mockResolvedValue({
      ready: true,
      errors: [],
      warnings: ['warning URL'],
      data: {
        campaignName: 'Test',
        budgetDaily: 100,
        geo: 'BR',
        finalUrl: 'https://test.com',
        keywords: [{ text: 'kw1', matchType: 'PHRASE' }],
        forbiddenTerms: [],
        selectedKeywords: [{ keyword: 'kw1' }],
      }
    });

    (createGoogleCampaign as any).mockResolvedValue({
      googleCampaignId: 'g1',
      googleAdGroupId: 'ga1',
      mock: true,
      logs: ['success']
    });

    const req = createRequest({ campaignId: 'c1', headlines: ['H1'], descriptions: ['D1'] });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(checkGoogleAdsReadiness).toHaveBeenCalledWith('c1', 'u1', 'PREPARE', expect.any(Object));
    expect(createGoogleCampaign).toHaveBeenCalled();
    expect(generateRsaCopy).not.toHaveBeenCalled();
  });

  it('blocks before createGoogleCampaign if readiness fails', async () => {
    (prisma.campaign.findFirst as any).mockResolvedValue({ id: 'c1', userId: 'u1', keywords: [] });
    
    // Readiness fails
    (checkGoogleAdsReadiness as any).mockResolvedValue({
      ready: false,
      errors: ['Readiness error'],
      warnings: [],
    });

    const req = createRequest({ campaignId: 'c1' });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(422);
    expect(json.error).toBe('Readiness error');
    expect(checkGoogleAdsReadiness).toHaveBeenCalledWith('c1', 'u1', 'PREPARE', expect.any(Object));
    expect(createGoogleCampaign).not.toHaveBeenCalled();
  });
});
