import { NextRequest, NextResponse } from 'next/server';
import { BridgePageType } from '@/lib/bridgePageRecommender';

export async function POST(req: NextRequest) {
  try {
    const { bridgePageType, context, productId, campaignId } = await req.json();

    if (!bridgePageType || !context || !productId) {
      return NextResponse.json({ error: 'bridgePageType, context, and productId are required' }, { status: 400 });
    }

    let agentResponse: string = '';

    switch (bridgePageType) {
      case BridgePageType.POGO:
      case BridgePageType.ADVERTORIAL:
        // Idealmente, aqui chamaria o Codex CLI via delegate_task
        agentResponse = `Agente Codex CLI acionado para criar uma ${bridgePageType}. Contexto: ${context}, Produto: ${productId}, Campanha: ${campaignId || 'N/A'}`;
        break;
      case BridgePageType.QUIZ_FUNNEL:
        // Idealmente, aqui chamaria o Codex CLI para a estrutura do quiz
        agentResponse = `Agente Codex CLI acionado para criar um Quiz Funnel. Contexto: ${context}, Produto: ${productId}, Campanha: ${campaignId || 'N/A'}`;
        break;
      case BridgePageType.LEAD_GEN_PAGE:
        // Idealmente, aqui chamaria um agente para criar uma Lead Gen Page
        agentResponse = `Agente acionado para criar uma Lead Gen Page. Contexto: ${context}, Produto: ${productId}, Campanha: ${campaignId || 'N/A'}`;
        break;
      case BridgePageType.OTHER:
      default:
        agentResponse = `Nenhum agente específico acionado para ${bridgePageType}. Contexto: ${context}, Produto: ${productId}, Campanha: ${campaignId || 'N/A'}`;
        break;
    }

    // Em um cenário real com Hermes orquestrando, aqui você chamaria:
    // await delegate_task(goal: agentResponse, context: { productId, campaignId, bridgePageType, ... });
    // Mas como este é um endpoint Next.js, estamos simulando a resposta.

    return NextResponse.json({
      success: true,
      message: agentResponse,
      dispatchedAgent: bridgePageType === BridgePageType.POGO || bridgePageType === BridgePageType.ADVERTORIAL || bridgePageType === BridgePageType.QUIZ_FUNNEL ? 'Codex CLI' : 'Generico',
    }, { status: 200 });

  } catch (error) {
    console.error('Error orchestrating agent task:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
