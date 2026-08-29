export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { fetchYoutubeTranscript } from '@/lib/youtubeTranscript';
import { fetchCompetitorPage } from '@/lib/competitorScraper';
import { processInjectedKnowledge } from '@/lib/landingPageProposalService';

/** Nada legítimo passa disso: acima do teto, o registro foi abandonado. */
const INGESTAO_TIMEOUT_MS = 10 * 60_000;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

const injectRequestSchema = z.object({
  sourceType: z.enum(['YOUTUBE_URL', 'CONCORRENTE_URL', 'SOURCE_CODE']),
  sourceUrl: z.string().url().max(2048).optional(),
  rawContent: z.string().max(100000).optional(),
  campaignId: z.string().min(1).max(255).optional(),
}).strict();

// Função que executa o processamento assíncrono em background
async function runBackgroundIngestion(knowledgeId: string, sourceType: string, sourceUrl?: string, initialRawContent?: string) {
  console.log(`[knowledge-api] Iniciando ingestão em background para o conhecimento: ${knowledgeId}`);
  
  try {
    let rawText = initialRawContent || '';

    // 1. Extração real conforme o sourceType
    if (sourceType === 'YOUTUBE_URL') {
      if (!sourceUrl) throw new Error('sourceUrl é obrigatório para injeção de YouTube.');
      const result = await fetchYoutubeTranscript(sourceUrl);
      rawText = result.text;
    } else if (sourceType === 'CONCORRENTE_URL') {
      if (!sourceUrl) throw new Error('sourceUrl é obrigatório para injeção de Concorrente.');
      const result = await fetchCompetitorPage(sourceUrl);
      rawText = result.markdown;
    } else if (sourceType === 'SOURCE_CODE') {
      if (!rawText.trim()) throw new Error('rawContent é obrigatório para injeção de Código-Fonte.');
    }

    // 2. Reivindicar o registro com compare-and-set. Só o worker que ganhar a transição
    //    PENDING -> PROCESSING segue; um segundo disparo para o mesmo id encontra count 0
    //    e desiste, em vez de pagar uma segunda rodada de LLM.
    const claimed = await prisma.injectedKnowledge.updateMany({
      where: { id: knowledgeId, status: 'PENDING' },
      data: {
        rawContent: rawText,
        status: 'PROCESSING',
      },
    });
    if (claimed.count === 0) {
      console.warn(`[knowledge-api] ${knowledgeId} já reivindicado por outro processamento; abortando duplicata.`);
      return;
    }

    // 3. Processar refinamento com IA + gerar propostas e logar no Obsidian
    await processInjectedKnowledge(knowledgeId);

  } catch (error: unknown) {
    const message = errorMessage(error);
    console.error(`[knowledge-api] Falha grave no processamento em background de ${knowledgeId}:`, message);

    // processInjectedKnowledge já grava FAILED antes de re-lançar; este updateMany só
    // cobre as falhas de extração (antes dele) e é no-op quando o status já é FAILED.
    await prisma.injectedKnowledge.updateMany({
      where: { id: knowledgeId, status: { in: ['PENDING', 'PROCESSING'] } },
      data: {
        status: 'FAILED',
        errorMessage: message.slice(0, 2000) || 'Falha inexplicável na extração ou processamento em background.',
      },
    }).catch((e: unknown) => console.error('[knowledge-api] Erro ao salvar falha no banco:', errorMessage(e)));
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId') || undefined;

    // Fecha registros abandonados antes de listar. Sem isto, um processo derrubado no
    // meio (restart, deploy, freeze de serverless) deixa o registro em PROCESSING para
    // sempre — e o painel fica polindo esse registro de 4 em 4 segundos, sem fim.
    await prisma.injectedKnowledge.updateMany({
      where: {
        userId,
        status: { in: ['PENDING', 'PROCESSING'] },
        updatedAt: { lt: new Date(Date.now() - INGESTAO_TIMEOUT_MS) },
      },
      data: {
        status: 'FAILED',
        errorMessage: 'Processamento interrompido (timeout ou reinício do servidor). Injete novamente.',
      },
    });

    // `rawContent` fica FORA da listagem de propósito: são até 100 KB por registro e o
    // painel busca esta rota a cada 4s só para desenhar o status.
    const knowledges = await prisma.injectedKnowledge.findMany({
      where: {
        userId,
        ...(campaignId ? { campaignId } : {}),
      },
      select: {
        id: true,
        sourceType: true,
        sourceUrl: true,
        status: true,
        errorMessage: true,
        refinedMetadata: true,
        createdAt: true,
        proposals: {
          select: {
            id: true,
            explanation: true,
            proposedContent: true,
            applied: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ knowledges });

  } catch (error: unknown) {
    console.error('[knowledge-api] Erro na listagem GET:', errorMessage(error));
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Payload JSON inválido' }, { status: 400 });
    }

    const parsed = injectRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Campos inválidos', details: parsed.error.flatten() }, { status: 400 });
    }

    const { sourceType, sourceUrl, rawContent, campaignId } = parsed.data;

    // Validações básicas de consistência antes de iniciar o background
    if (sourceType === 'YOUTUBE_URL' || sourceType === 'CONCORRENTE_URL') {
      if (!sourceUrl) {
        return NextResponse.json({ error: 'sourceUrl é obrigatório para este tipo de fonte.' }, { status: 400 });
      }
    } else if (sourceType === 'SOURCE_CODE') {
      if (!rawContent || !rawContent.trim()) {
        return NextResponse.json({ error: 'rawContent é obrigatório para envio de código-fonte.' }, { status: 400 });
      }
    }

    // Se houver campaignId, garantir que pertence ao usuário
    if (campaignId) {
      const campaign = await prisma.campaign.findFirst({
        where: { id: campaignId, userId },
      });
      if (!campaign) {
        return NextResponse.json({ error: 'Campanha não encontrada ou inválida.' }, { status: 404 });
      }
    }

    // Duplo clique no botão criaria dois registros e pagaria duas rodadas de LLM.
    // Uma ingestão da mesma fonte ainda em voo bloqueia a segunda.
    if (sourceUrl) {
      const emVoo = await prisma.injectedKnowledge.findFirst({
        where: {
          userId,
          sourceUrl,
          campaignId: campaignId || null,
          status: { in: ['PENDING', 'PROCESSING'] },
          updatedAt: { gte: new Date(Date.now() - INGESTAO_TIMEOUT_MS) },
        },
        select: { id: true },
      });
      if (emVoo) {
        return NextResponse.json(
          { error: 'Esta fonte já está sendo processada agora. Aguarde a ingestão em andamento terminar.' },
          { status: 409 },
        );
      }
    }

    // Criar o registro inicial no banco de dados como PENDING
    const knowledge = await prisma.injectedKnowledge.create({
      data: {
        userId,
        campaignId: campaignId || null,
        sourceType,
        sourceUrl: sourceUrl || null,
        rawContent: sourceType === 'SOURCE_CODE' ? rawContent : null,
        status: 'PENDING',
      },
    });

    // Disparo em background: a resposta não espera o pipeline de IA.
    // ATENÇÃO: isto só sobrevive porque o processo Node persiste (dev/VPS). Em runtime
    // serverless o processo congela ao enviar a resposta e esta Promise morre no meio —
    // o reaper do GET é o que impede o registro de ficar preso em PROCESSING.
    void runBackgroundIngestion(knowledge.id, sourceType, sourceUrl, rawContent);

    // Retorna imediatamente com o registro de conhecimento em processamento
    return NextResponse.json({
      message: 'Processamento de conhecimento iniciado em background com sucesso.',
      knowledge,
    }, { status: 201 });

  } catch (error: unknown) {
    console.error('[knowledge-api] Erro na injeção POST:', errorMessage(error));
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
