import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PATCH } from '../route';
import { NextRequest } from 'next/server';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    campaign: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    productResearch: {
      findFirst: vi.fn(),
    },
  }
}));

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}));

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));
import { getServerSession } from 'next-auth';

describe('PATCH /api/campaigns/[id]', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  const createRequest = (body: any) => {
    return new NextRequest('http://localhost/api/campaigns/c1', {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  };

  it('returns 401 if missing auth', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);
    const req = createRequest({});
    const res = await PATCH(req, { params: { id: 'c1' } });
    expect(res.status).toBe(401);
  });

  it('returns 404 if campaign belongs to another user', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: { id: 'u1' } } as any);
    mockPrisma.campaign.findFirst.mockResolvedValueOnce(null); // not found or other user

    const req = createRequest({});
    const res = await PATCH(req, { params: { id: 'c1' } });
    expect(res.status).toBe(404);
    expect(mockPrisma.campaign.update).not.toHaveBeenCalled();
  });

  it('returns 400 on invalid payload', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: { id: 'u1' } } as any);
    mockPrisma.campaign.findFirst.mockResolvedValueOnce({ id: 'c1', userId: 'u1', status: 'RASCUNHO' });

    const req = createRequest({ unknownField: 123 });
    const res = await PATCH(req, { params: { id: 'c1' } });
    expect(res.status).toBe(400);
    expect(mockPrisma.campaign.update).not.toHaveBeenCalled();
  });

  it('returns 404 if productResearch belongs to another user', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: { id: 'u1' } } as any);
    mockPrisma.campaign.findFirst.mockResolvedValueOnce({ id: 'c1', userId: 'u1', status: 'RASCUNHO' });
    mockPrisma.productResearch.findFirst.mockResolvedValueOnce(null); // product not found for this user

    const req = createRequest({ productResearchId: 'p1' });
    const res = await PATCH(req, { params: { id: 'c1' } });
    expect(res.status).toBe(404);
    expect(mockPrisma.campaign.update).not.toHaveBeenCalled();
  });

  it('updates campaign with valid payload', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: { id: 'u1' } } as any);
    mockPrisma.campaign.findFirst.mockResolvedValueOnce({ id: 'c1', userId: 'u1', status: 'RASCUNHO' });
    mockPrisma.productResearch.findFirst.mockResolvedValueOnce({ id: 'p1', userId: 'u1' });
    mockPrisma.campaign.update.mockResolvedValueOnce({ id: 'c1', name: 'New Name' });

    const req = createRequest({ name: 'New Name', productResearchId: 'p1' });
    const res = await PATCH(req, { params: { id: 'c1' } });
    expect(res.status).toBe(200);
    
    expect(mockPrisma.campaign.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: {
        name: 'New Name',
        productResearch: { connect: { id: 'p1' } }
      }
    });
  });
});
