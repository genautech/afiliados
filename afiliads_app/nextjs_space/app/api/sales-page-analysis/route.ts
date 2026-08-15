import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { fetchPageContent, analyzeDom, classifySalesPage } from '@/lib/salesPageAnalyzer';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { url, productId } = await req.json();

    if (typeof url !== 'string' || !url.trim()) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    if (productId) {
      const product = await prisma.productResearch.findFirst({
        where: { id: productId, userId },
        select: { id: true },
      });
      if (!product) {
        return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
      }
    }

    const htmlContent = await fetchPageContent(url);

    if (!htmlContent) {
      return NextResponse.json({ error: 'Failed to fetch page content' }, { status: 500 });
    }

    const characteristics = analyzeDom(htmlContent);
    const salesPageType = classifySalesPage(characteristics);

    if (productId) {
      await prisma.productResearch.update({
        where: { id: productId },
        data: { salesPageType },
      });
    }

    return NextResponse.json({
      url,
      characteristics,
      salesPageType,
    }, { status: 200 });

  } catch (error) {
    console.error('Error in sales page analysis API:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
