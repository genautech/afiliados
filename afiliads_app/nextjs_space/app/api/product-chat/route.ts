export const dynamic = 'force-dynamic';
export const maxDuration = 120;
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { callLLM } from '@/lib/llm';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }
  const userId = (session.user as any)?.id;
  const body = await request.json();
  const { productId, messages } = body ?? {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: 'messages é obrigatório' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  let productCtx = '';
  if (productId) {
    const p = await prisma.productResearch.findFirst({ where: { id: productId, userId } });
    if (p) {
      productCtx = `\n\nCONTEXTO DO PRODUTO EM ANÁLISE (use como fonte principal):\n${JSON.stringify({
        nome: p.name, network: p.network, vertical: p.vertical, gravity: p.gravity,
        avgPayout: p.avgPayout, comissao: p.commissionPct, score: p.score, risco: p.riskLevel,
        resumo: p.summary, tags: p.tags, keywords: p.keywords, estrategia: p.strategy, compliance: p.compliance,
        keywordEscolhida: p.chosenKeyword,
      })}`;
    }
  }

  const systemPrompt = `Você é o Assistente de Análise de Produtos do AfiliAds, especialista em afiliados ClickBank + Google Ads.
Você trabalha em conjunto com os agentes Product Hunter, SEO & Keyword Architect, Compliance Sentinel e CRO Copywriter.
Responda em PT-BR, direto ao ponto, com números quando possível (CPC, EPC, break-even, regra do 3×).
Nunca prometa resultados garantidos; mantenha compliance Google Ads (sem claims absolutos de saúde/renda).
Se o usuário pedir algo que exige pesquisa ATP paga, avise que a busca deve ser aprovada na área Pesquisa ATP.${productCtx}`;

  const history = messages
    .slice(-12)
    .map((m: any) => `${m?.role === 'user' ? 'Usuário' : 'Assistente'}: ${m?.content ?? ''}`)
    .join('\n');

  const fullText = await callLLM(userId, {
    agent: 'analysis-assistant',
    systemPrompt,
    userPrompt: `Conversa até aqui:\n${history}\n\nResponda à última mensagem do usuário.`,
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const words = fullText.split(/(\s+)/);
      const chunkSize = 6;
      for (let i = 0; i < words.length; i += chunkSize) {
        const chunk = words.slice(i, i + chunkSize).join('');
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: 'chunk', content: chunk })}\n\n`));
        await new Promise((r) => setTimeout(r, 25));
      }
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: 'completed' })}\n\n`));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
  });
}
