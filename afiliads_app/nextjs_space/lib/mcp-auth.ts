import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * Resolves the authenticated userId from either:
 * 1. x-afiliads-token header (MCP server path)
 * 2. NextAuth session (browser/app path)
 *
 * Accepts both AFILIADS_MCP_USER_EMAIL (app convention) and
 * AFILIADS_USER_EMAIL (MCP server convention) for the MCP path.
 *
 * Returns null if neither auth method succeeds.
 */
export async function resolveUserId(request: NextRequest): Promise<string | null> {
  const mcpToken = request.headers.get('x-afiliads-token');
  if (mcpToken && process.env.AFILIADS_MCP_TOKEN && mcpToken === process.env.AFILIADS_MCP_TOKEN) {
    const email = process.env.AFILIADS_MCP_USER_EMAIL || process.env.AFILIADS_USER_EMAIL;
    const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
    return user?.id ?? null;
  }
  const session = await getServerSession(authOptions);
  return session?.user ? (session.user as any)?.id ?? null : null;
}
