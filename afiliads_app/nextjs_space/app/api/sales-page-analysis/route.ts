import { NextRequest, NextResponse } from 'next/server';
import { fetchPageContent, analyzeDom, classifySalesPage, SalesPageType } from '@/lib/salesPageAnalyzer';
import { prisma } from '@/lib/prisma'; // Corrigido: import named export

export async function POST(req: NextRequest) {
  try {
    const { url, productId } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const htmlContent = await fetchPageContent(url);

    if (!htmlContent) {
      return NextResponse.json({ error: 'Failed to fetch page content' }, { status: 500 });
    }

    const characteristics = analyzeDom(htmlContent);
    const salesPageType = classifySalesPage(characteristics);

    // Se um productId for fornecido, atualiza o ProductResearch
    if (productId) {
      try {
        await prisma.productResearch.update({
          where: { id: productId },
          data: { salesPageType: salesPageType },
        });
      } catch (dbError) {
        console.error(`Failed to update ProductResearch for ${productId}:`, dbError);
        // Continua mesmo se a atualização do banco falhar, para retornar a análise
      }
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
