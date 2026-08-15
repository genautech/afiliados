import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { DELETE, PATCH } from '../route';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    keyword: {
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));

function patchRequest(body: unknown) {
  return new NextRequest('http://localhost/api/keywords/keyword-1', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

function deleteRequest() {
  return new NextRequest('http://localhost/api/keywords/keyword-1', { method: 'DELETE' });
}

const context = { params: { id: 'keyword-1' } };

describe('/api/keywords/[id]', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-1' } } as never);
  });

  it('bloqueia PATCH de keyword pertencente a outro usuário', async () => {
    mockPrisma.keyword.findFirst.mockResolvedValueOnce(null);

    const response = await PATCH(patchRequest({ status: 'negativa' }), context);

    expect(response.status).toBe(404);
    expect(mockPrisma.keyword.findFirst).toHaveBeenCalledWith({
      where: { id: 'keyword-1', userId: 'user-1' },
      select: { id: true },
    });
    expect(mockPrisma.keyword.update).not.toHaveBeenCalled();
  });

  it('rejeita mass assignment no PATCH', async () => {
    const response = await PATCH(patchRequest({
      status: 'negativa',
      userId: 'attacker',
      conversions: 999999,
    }), context);

    expect(response.status).toBe(400);
    expect(mockPrisma.keyword.update).not.toHaveBeenCalled();
  });

  it('permite somente a transição de status esperada', async () => {
    mockPrisma.keyword.findFirst.mockResolvedValueOnce({ id: 'keyword-1' });
    mockPrisma.keyword.update.mockResolvedValueOnce({ id: 'keyword-1', status: 'negativa' });

    const response = await PATCH(patchRequest({ status: 'negativa' }), context);

    expect(response.status).toBe(200);
    expect(mockPrisma.keyword.update).toHaveBeenCalledWith({
      where: { id: 'keyword-1' },
      data: { status: 'negativa' },
    });
  });

  it('bloqueia DELETE de keyword pertencente a outro usuário', async () => {
    mockPrisma.keyword.findFirst.mockResolvedValueOnce(null);

    const response = await DELETE(deleteRequest(), context);

    expect(response.status).toBe(404);
    expect(mockPrisma.keyword.delete).not.toHaveBeenCalled();
  });
});
