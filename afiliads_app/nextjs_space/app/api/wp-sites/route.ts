export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  let domains: string[] = [];
  try {
    domains = Object.keys(JSON.parse(process.env.WP_SITES_JSON ?? '{}'));
  } catch {
    domains = [];
  }
  let ftpDomains: string[] = [];
  try {
    ftpDomains = Object.keys(JSON.parse(process.env.FTP_SITES_JSON ?? '{}'));
  } catch {
    ftpDomains = [];
  }
  return NextResponse.json({ domains, ftpDomains });
}
