import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export interface AdminSession {
  userId: string;
  email: string;
}

// Retorna a sessão se o usuário logado for ADMIN; senão null (rota deve responder 403).
export async function requireAdmin(): Promise<AdminSession | null> {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user?.id || user.role !== 'ADMIN') return null;
  return { userId: user.id, email: user.email ?? '' };
}
