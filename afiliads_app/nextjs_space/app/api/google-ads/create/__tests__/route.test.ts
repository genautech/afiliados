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
  isMockMode: vi.fn(() => true),
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

  it('bloqueia sem confirmação/autorização antes do readiness ou da mutação', async () => {
    (prisma.campaign.findFirst as any).mockResolvedValue({ id: 'c1', userId: 'u1', updatedAt: new Date(1234), keywords: [] });
    const res = await POST(createRequest({ campaignId: 'c1' }));
    expect(res.status).toBe(400);
    expect(checkGoogleAdsReadiness).not.toHaveBeenCalled();
    expect(createGoogleCampaign).not.toHaveBeenCalled();
  });

  it('passes PREPARE readiness and creates campaign if valid', async () => {
    (prisma.campaign.findFirst as any).mockResolvedValue({ id: 'c1', userId: 'u1', updatedAt: new Date(1234), keywords: [] });
    (getGoogleAdsConfig as any).mockResolvedValue({ customerId: '1234567890', developerToken: 'mock' });

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

    const req = createRequest({ campaignId: 'c1', headlines: ['H1'], descriptions: ['D1'], authorization: { confirmed: true, operation: 'CREATE_CAMPAIGN', resourceId: 'c1', revision: '1234', idempotencyKey: 'create_key_123' } });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.warnings).toEqual(['warning URL']);
    expect(checkGoogleAdsReadiness).toHaveBeenCalledWith('c1', 'u1', 'PREPARE', expect.any(Object));
    expect(createGoogleCampaign).toHaveBeenCalled();
    expect(generateRsaCopy).not.toHaveBeenCalled();
  });

  it('blocks before createGoogleCampaign if readiness fails', async () => {
    (prisma.campaign.findFirst as any).mockResolvedValue({ id: 'c1', userId: 'u1', updatedAt: new Date(1234), keywords: [] });
    (getGoogleAdsConfig as any).mockResolvedValue({ customerId: '1234567890', developerToken: 'mock' });

    // Readiness fails
    (checkGoogleAdsReadiness as any).mockResolvedValue({
      ready: false,
      errors: ['Readiness error'],
      warnings: [],
    });

    const req = createRequest({ campaignId: 'c1', authorization: { confirmed: true, operation: 'CREATE_CAMPAIGN', resourceId: 'c1', revision: '1234', idempotencyKey: 'create_key_123' } });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(422);
    expect(json.error).toBe('Readiness error');
    expect(checkGoogleAdsReadiness).toHaveBeenCalledWith('c1', 'u1', 'PREPARE', expect.any(Object));
    expect(createGoogleCampaign).not.toHaveBeenCalled();
  });

  it('não cria uma segunda campanha quando já existe ID remoto persistido', async () => {
    (prisma.campaign.findFirst as any).mockResolvedValue({
      id: 'c1', userId: 'u1', updatedAt: new Date(1234), keywords: [],
      googleCampaignId: 'g-existing', googleAdGroupId: 'ga-existing',
    });

    const req = createRequest({
      campaignId: 'c1',
      authorization: { confirmed: true, operation: 'CREATE_CAMPAIGN', resourceId: 'c1', revision: '1234', idempotencyKey: 'create_retry_123' },
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ success: true, alreadyExists: true, googleCampaignId: 'g-existing', googleAdGroupId: 'ga-existing', launchState: 'CONFIGURING' });
    expect(getGoogleAdsConfig).not.toHaveBeenCalled();
    expect(createGoogleCampaign).not.toHaveBeenCalled();
  });

  it('propaga campaignId ao gerador RSA para aplicar o Campaign Guard', async () => {
    (prisma.campaign.findFirst as any).mockResolvedValue({ id: 'c1', userId: 'u1', vertical: 'health', updatedAt: new Date(1234), keywords: [] });
    (getGoogleAdsConfig as any).mockResolvedValue({ customerId: '1234567890', developerToken: 'mock' });
    (checkGoogleAdsReadiness as any).mockResolvedValue({
      ready: true,
      errors: [],
      warnings: [],
      data: {
        campaignName: 'Test', budgetDaily: 100, geo: 'BR', finalUrl: 'https://test.com',
        forbiddenTerms: [], selectedKeywords: [{ keyword: 'kw1' }],
      },
    });
    (generateRsaCopy as any).mockResolvedValue({ titles: [], descriptions: [] });
    await POST(createRequest({ campaignId: 'c1', authorization: { confirmed: true, operation: 'CREATE_CAMPAIGN', resourceId: 'c1', revision: '1234', idempotencyKey: 'create_key_123' } }));
    expect(generateRsaCopy).toHaveBeenCalledWith('u1', expect.objectContaining({ campaignId: 'c1' }));
  });
});
