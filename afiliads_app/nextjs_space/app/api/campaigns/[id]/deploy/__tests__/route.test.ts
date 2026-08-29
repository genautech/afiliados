import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';
import { getServerSession } from 'next-auth';

const { mockPrisma, mockAntigravity } = vi.hoisted(() => ({
  mockPrisma: {
    campaign: { findFirst: vi.fn(), update: vi.fn() },
  },
  mockAntigravity: {
    campaignSlug: vi.fn(() => 'campaign-one'),
    manifestPath: vi.fn(() => '/tmp/campaign/manifest.json'),
    readJsonFile: vi.fn(),
    runWithMockFallback: vi.fn(),
    withCampaignLock: vi.fn((_: string, task: () => Promise<unknown>) => task()),
    withCampaignFileLock: vi.fn((_: string, task: () => Promise<unknown>) => task()),
  },
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/antigravity', () => mockAntigravity);
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));

describe('POST /api/campaigns/[id]/deploy', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockAntigravity.campaignSlug.mockImplementation(() => 'campaign-one');
    mockAntigravity.withCampaignLock.mockImplementation((_: string, task: () => Promise<unknown>) => task());
    mockAntigravity.withCampaignFileLock.mockImplementation((_: string, task: () => Promise<unknown>) => task());
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-1' } } as never);
    mockPrisma.campaign.findFirst.mockResolvedValue({ id: 'camp-1', name: 'Campaign One' });
    mockPrisma.campaign.update.mockResolvedValue({ id: 'camp-1', status: 'ready_for_deploy' });
  });

  const request = () => new NextRequest('http://localhost/api/campaigns/camp-1/deploy', { method: 'POST' });
  const manifest = {
    status: 'ready_for_deploy',
    deploy: {
      status: 'ready_for_deploy',
      ebook_pdf: '/tmp/ebook.pdf',
      payment_integration: { checkout_url: 'https://pay.example/mock-campaign' },
    },
  };

  it('executa o script com argumentos separados e retorna o resumo', async () => {
    mockAntigravity.readJsonFile.mockRejectedValueOnce(new Error('missing')).mockResolvedValueOnce(manifest);
    mockAntigravity.runWithMockFallback.mockResolvedValue({ ok: true, mode: 'LIVE' });

    const response = await POST(request(), { params: { id: 'camp-1' } });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(expect.objectContaining({ checkoutUrl: 'https://pay.example/mock-campaign', ebookPdf: '/tmp/ebook.pdf', mode: 'LIVE' }));
    expect(mockAntigravity.runWithMockFallback).toHaveBeenCalledWith('deploy_product.py', ['--campaign-slug', 'campaign-one']);
  });

  it('não dispara outro subprocesso quando o manifest já está pronto', async () => {
    mockAntigravity.readJsonFile.mockResolvedValue(manifest);

    const response = await POST(request(), { params: { id: 'camp-1' } });

    expect(response.status).toBe(200);
    expect((await response.json()).idempotent).toBe(true);
    expect(mockAntigravity.runWithMockFallback).not.toHaveBeenCalled();
  });
});
