export const dynamic = 'force-dynamic';
export const maxDuration = 60;
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { publishToWordPress, publishToFtp } from '@/lib/presell';

async function resolveUserId(request: NextRequest): Promise<string | null> {
  const token = request.headers.get('x-afiliads-token');
  if (token && process.env.AFILIADS_MCP_TOKEN && token === process.env.AFILIADS_MCP_TOKEN) {
    const email = process.env.AFILIADS_MCP_USER_EMAIL;
    const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
    return user?.id ?? null;
  }
  const session = await getServerSession(authOptions);
  return session?.user ? (session.user as any)?.id ?? null : null;
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await resolveUserId(request);
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const presell = await prisma.presell.findFirst({ where: { id: params.id, userId } });
    if (!presell) return NextResponse.json({ error: 'Presell não encontrada' }, { status: 404 });
    if (presell.status === 'publicada') {
      return NextResponse.json({ error: 'Esta presell já está publicada' }, { status: 409 });
    }

    const body = await request.json().catch(() => ({}));
    const destino = body?.destino === 'wordpress' ? 'wordpress' : body?.destino === 'ftp' ? 'ftp' : 'railway';
    const dominio = typeof body?.dominio === 'string' ? body.dominio.trim() : '';

    let publishedUrl = '';
    if (destino === 'wordpress') {
      if (!dominio) return NextResponse.json({ error: 'dominio é obrigatório para destino=wordpress' }, { status: 422 });
      publishedUrl = await publishToWordPress(presell.html, { domain: dominio, title: presell.title, slug: presell.slug });
    } else if (destino === 'ftp') {
      if (!dominio) return NextResponse.json({ error: 'dominio é obrigatório para destino=ftp' }, { status: 422 });
      publishedUrl = await publishToFtp(presell.html, { domain: dominio, slug: presell.slug });
    }

    const promoted = await prisma.presell.update({
      where: { id: presell.id },
      data: {
        status: 'publicada',
        publishTarget: destino,
        wpDomain: destino === 'wordpress' || destino === 'ftp' ? dominio : '',
        publishedUrl,
      },
    });

    let discardedCount = 0;
    if (presell.variantGroupId) {
      const discarded = await prisma.presell.updateMany({
        where: { userId, variantGroupId: presell.variantGroupId, id: { not: presell.id }, status: { not: 'publicada' } },
        data: { status: 'descartada' },
      });
      discardedCount = discarded.count;
    }

    return NextResponse.json({
      presell: {
        id: promoted.id,
        slug: promoted.slug,
        status: promoted.status,
        publishTarget: promoted.publishTarget,
        url: (promoted.publishTarget === 'wordpress' || promoted.publishTarget === 'ftp') ? promoted.publishedUrl : `/p/${promoted.slug}`,
      },
      discardedCount,
    });
  } catch (err: any) {
    console.error('POST presells/[id]/promote error:', err);
    return NextResponse.json({ error: err?.message ?? 'Erro ao promover presell' }, { status: 500 });
  }
}
