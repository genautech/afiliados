import { beforeEach, describe, expect, it, vi } from 'vitest';

const { userFindUnique } = vi.hoisted(() => ({ userFindUnique: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ prisma: { user: { findUnique: userFindUnique } } }));
vi.mock('@next-auth/prisma-adapter', () => ({ PrismaAdapter: vi.fn(() => ({})) }));
vi.mock('next-auth/providers/credentials', () => ({ default: vi.fn((options) => options) }));

import { authOptions } from './auth';

describe('auth JWT revocation', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('invalida token já emitido quando usuário foi desativado', async () => {
    userFindUnique.mockResolvedValueOnce({
      id: 'user-1', email: 'user@example.com', role: 'USER', isActive: false,
    });
    const jwt = authOptions.callbacks?.jwt as any;

    const token = await jwt({ token: { id: 'user-1', role: 'USER' }, user: undefined });

    expect(token.active).toBe(false);
    expect(token.id).toBeUndefined();
  });

  it('remove user da sessão quando o token foi invalidado', async () => {
    const sessionCallback = authOptions.callbacks?.session as any;

    const session = await sessionCallback({
      session: { user: { email: 'user@example.com' } },
      token: { active: false },
    });

    expect(session.user).toBeUndefined();
  });

  it('atualiza role e mantém sessão ativa após releitura do usuário', async () => {
    userFindUnique.mockResolvedValueOnce({
      id: 'user-1', email: 'user@example.com', role: 'ADMIN', isActive: true,
    });
    const jwt = authOptions.callbacks?.jwt as any;

    const token = await jwt({ token: { id: 'user-1', role: 'USER' }, user: undefined });

    expect(token).toMatchObject({ id: 'user-1', role: 'ADMIN', active: true });
  });
});
