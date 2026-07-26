export const dynamic = 'force-dynamic';
export const maxDuration = 180;
import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generatePresell } from '@/lib/presell';

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

export async function POST(request: NextRequest) {
  try {
    const userId = await resolveUserId(request);
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const body = await request.json();
    const productName = String(body?.productName ?? '').trim();
    const hopLink = String(body?.hopLink ?? '').trim();
    if (!productName) return NextResponse.json({ error: 'productName é obrigatório' }, { status: 400 });
    if (!hopLink || !/^https?:\/\//.test(hopLink)) {
      return NextResponse.json({ error: 'hopLink válido (https://...) é obrigatório — pegue na página de afiliado do produtor' }, { status: 422 });
    }

    const videoUrl = typeof body?.videoUrl === 'string' ? body.videoUrl.trim() : '';
    const baseAngle = body?.angle || 'review';
    const variantGroupId = randomUUID();

    // 3 opções: advertorial (ângulo pedido) + pogo (curiosidade) + terceira só é VSL se o
    // usuário já tiver um vídeo do vendor; sem vídeo, vira um 2º ângulo de advertorial (comparação),
    // pra não travar a geração pedindo um asset que a maioria dos produtos ainda não tem.
    const variantSpecs = videoUrl
      ? [
          { pageType: 'advertorial', angle: baseAngle },
          { pageType: 'pogo', angle: 'curiosidade' },
          { pageType: 'vsl', angle: baseAngle, videoUrl },
        ]
      : [
          { pageType: 'advertorial', angle: baseAngle },
          { pageType: 'pogo', angle: 'curiosidade' },
          { pageType: 'advertorial', angle: 'comparativo' },
        ];

    const commonArgs = {
      productName,
      hopLink,
      trackingId: body?.trackingId,
      geo: body?.geo,
      language: body?.language,
      productId: body?.productId,
      googleAdsId: body?.googleAdsId,
      context: body?.context,
      popupGate: !!body?.popupGate,
      publicar: false as const,
      variantGroupId,
    };

    const results = await Promise.allSettled(
      variantSpecs.map(spec => generatePresell(userId, { ...commonArgs, ...spec }))
    );

    const variants = results.map((r, i) => {
      if (r.status === 'fulfilled') {
        const { presell } = r.value;
        return {
          ok: true,
          id: presell.id,
          slug: presell.slug,
          title: presell.title,
          pageType: presell.pageType,
          angle: presell.angle,
          previewUrl: `/p/${presell.slug}`,
        };
      }
      return { ok: false, pageType: variantSpecs[i].pageType, angle: variantSpecs[i].angle, error: (r.reason as any)?.message ?? 'Erro ao gerar variante' };
    });

    if (!variants.some(v => v.ok)) {
      return NextResponse.json({ error: 'Nenhuma variante pôde ser gerada', variants }, { status: 500 });
    }

    return NextResponse.json({ variantGroupId, variants }, { status: 201 });
  } catch (err: any) {
    console.error('POST presells/variants error:', err);
    return NextResponse.json({ error: err?.message ?? 'Erro ao gerar variantes' }, { status: 500 });
  }
}
