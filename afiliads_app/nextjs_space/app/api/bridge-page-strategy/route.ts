import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { recommendBridgePage, BridgePageType } from '@/lib/bridgePageRecommender';
import { SalesPageType } from '@/lib/salesPageAnalyzer';

export async function POST(req: NextRequest) {
  try {
    const { productId, campaignId, salesPageType: salesPageTypeString } = await req.json();

    if (!productId || !salesPageTypeString) {
      return NextResponse.json({ error: 'productId and salesPageType are required' }, { status: 400 });
    }

    // Validar salesPageTypeString para garantir que é um enum válido
    const salesPageType = salesPageTypeString as SalesPageType;
    if (!Object.values(SalesPageType).includes(salesPageType)) {
      return NextResponse.json({ error: 'Invalid salesPageType provided' }, { status: 400 });
    }

    const product = await prisma.productResearch.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    let campaign = null;
    if (campaignId) {
      campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
      });
    }

    // Chamar a função de recomendação
    const recommendation = recommendBridgePage(product, salesPageType, campaign || undefined);

    // Salvar a recomendação no banco de dados
    const savedRecommendation = await prisma.bridgePageStrategyRecommendation.create({
      data: {
        productId: product.id,
        campaignId: campaign?.id,
        recommendedType: recommendation.recommendedType,
        reasoning: recommendation.reasoning,
        confidenceScore: recommendation.confidenceScore,
      },
    });

    return NextResponse.json(savedRecommendation, { status: 200 });

  } catch (error) {
    console.error('Error in bridge page strategy API:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
