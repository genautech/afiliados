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

    // 2. Salvar o conteúdo bruto extraído
    await prisma.injectedKnowledge.update({
      where: { id: knowledgeId },
      data: {
        rawContent: rawText,
        status: 'PROCESSING',
      },
    });

    // 3. Processar refinamento com IA + gerar propostas e logar no Obsidian
    await processInjectedKnowledge(knowledgeId);

  } catch (error: any) {
    console.error(`[knowledge-api] Falha grave no processamento em background de ${knowledgeId}:`, error?.message);
    
    // Atualizar registro para FAILED
    await prisma.injectedKnowledge.update({
      where: { id: knowledgeId },
      data: {
        status: 'FAILED',
        errorMessage: error?.message || 'Falha inexplicável na extração ou processamento em background.',
      },
    }).catch(e => console.error('[knowledge-api] Erro ao salvar falha no banco:', e?.message));
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

    // Buscar conhecimentos injetados pelo usuário
    const knowledges = await prisma.injectedKnowledge.findMany({
      where: {
        userId,
        ...(campaignId ? { campaignId } : {}),
      },
      include: {
        proposals: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ knowledges });

  } catch (error: any) {
    console.error('[knowledge-api] Erro na listagem GET:', error?.message);
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

    // Disparar o processo em background assíncrono (sem dar await para retornar logo!)
    runBackgroundIngestion(knowledge.id, sourceType, sourceUrl, rawContent);

    // Retorna imediatamente com o registro de conhecimento em processamento
    return NextResponse.json({
      message: 'Processamento de conhecimento iniciado em background com sucesso.',
      knowledge,
    }, { status: 201 });

  } catch (error: any) {
    console.error('[knowledge-api] Erro na injeção POST:', error?.message);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
