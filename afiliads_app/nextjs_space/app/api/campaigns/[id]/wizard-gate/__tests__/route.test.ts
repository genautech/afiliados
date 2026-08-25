import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { runFullChecklistVerify } from '@/lib/complianceVerifier';

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/complianceVerifier', () => ({ runFullChecklistVerify: vi.fn() }));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    campaign: { findFirst: vi.fn() },
    campaignChecklist: { findMany: vi.fn() },
  },
}));

const campaign = { id: 'c1', userId: 'u1', platform: 'ClickBank', keywords: [] };
const request = (body: unknown) => new NextRequest('http://localhost/api/campaigns/c1/wizard-gate', {
  method: 'POST', body: JSON.stringify(body),
});

describe('POST /api/campaigns/[id]/wizard-gate', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u1' } } as never);
    vi.mocked(prisma.campaign.findFirst).mockResolvedValue(campaign as never);
    vi.mocked(runFullChecklistVerify).mockResolvedValue([] as never);
  });

  it('rejeita sessão ausente', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const response = await POST(request({ step: 7 }), { params: { id: 'c1' } });
    expect(response.status).toBe(401);
  });

  it('rejeita campanha de outro usuário', async () => {
    vi.mocked(prisma.campaign.findFirst).mockResolvedValue(null);
    const response = await POST(request({ step: 7 }), { params: { id: 'c1' } });
    expect(response.status).toBe(404);
    expect(runFullChecklistVerify).not.toHaveBeenCalled();
  });

  it('bloqueia o avanço quando o passo 7 tem pendências', async () => {
    vi.mocked(prisma.campaignChecklist.findMany).mockResolvedValue([
      { itemKey: 'search_on', itemLabel: 'Search ON', isCritical: true, isChecked: true, checkedAt: new Date() },
    ] as never);
    const response = await POST(request({ step: 7 }), { params: { id: 'c1' } });
    const body = await response.json();
    expect(response.status).toBe(409);
    expect(body.allowed).toBe(false);
    expect(body.pending.length).toBeGreaterThan(0);
  });

  it('permite o passo 8 ClickBank quando hop stats está confirmado', async () => {
    vi.mocked(prisma.campaign.findFirst).mockResolvedValue({ ...campaign, platform: 'ClickBank' } as never);
    vi.mocked(prisma.campaignChecklist.findMany).mockResolvedValue([
      { itemKey: 'hop_stats', itemLabel: 'Hop stats', isCritical: true, isChecked: true, checkedAt: new Date() },
    ] as never);
    const response = await POST(request({ step: 8 }), { params: { id: 'c1' } });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ allowed: true, step: 8, pending: [] });
    expect(runFullChecklistVerify).toHaveBeenCalledTimes(1);
  });
});
