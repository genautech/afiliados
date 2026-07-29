export const dynamic = 'force-dynamic';
export const maxDuration = 120;
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generatePresell } from '@/lib/presell';
import { runAgentSequence } from '@/lib/agentSequence';

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

export async function GET(request: NextRequest) {
  try {
    const userId = await resolveUserId(request);
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const presells = await prisma.presell.findMany({
      where: { userId },
      select: { id: true, slug: true, title: true, productName: true, angle: true, geo: true, language: true, status: true, views: true, ctaClicks: true, trackingId: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(presells);
  } catch (err) {
    console.error('GET presells error:', err);
    return NextResponse.json({ error: 'Erro ao listar presells' }, { status: 500 });
  }
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
    const { presell, usage, provider, model } = await generatePresell(userId, {
      productName,
      hopLink,
      trackingId: body?.trackingId,
      angle: body?.angle,
      geo: body?.geo,
      language: body?.language,
      productId: body?.productId,
      googleAdsId: body?.googleAdsId,
      context: body?.context,
      destino: body?.destino === 'wordpress' ? 'wordpress' : 'railway',
      dominio: body?.dominio,
      pageType: body?.pageType,
      popupGate: !!body?.popupGate,
      videoUrl: body?.videoUrl,
      channel: body?.channel,
      salesPageUrl: body?.salesPageUrl,
      segmentRoutes: body?.segmentRoutes,
      campaignId: body?.campaignId,
      customCode: body?.customCode,
    });

    // Encadeamento real: o compliance-sentinel roda automaticamente logo após o presell-builder
    // gerar a página, lendo o HTML de verdade que acabou de sair (não uma URL solta) — antes o
    // usuário só descobria problema de compliance clicando manualmente em "/api/presell-analysis"
    // depois. Falha aqui não derruba a criação da presell (já foi salva), só fica sem o score.
    let complianceScore: number | null = null;
    let complianceAlerts: any[] = [];
    try {
      const strippedHtml = presell.html
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .slice(0, 10000);
      // Data real informada explicitamente: sem isso, o agente (com conhecimento até uma data de
      // corte anterior) confunde o ano corrente da página gerada com uma data futura fabricada e
      // sinaliza falso-positivo crítico de "conteúdo enganoso" (visto em teste real 2026-07-28).
      const dataAtual = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
      const seq = await runAgentSequence(
        userId,
        `Presell "${presell.title}" gerada para o produto "${productName}" (ângulo: ${presell.angle}, geo: ${presell.geo}, tipo: ${presell.pageType}). Data real de hoje: ${dataAtual} — não é data futura fictícia, é a data corrente; não sinalize datas/anos na página como enganosos só por parecerem posteriores ao seu conhecimento.`,
        [{
          agent: 'compliance-sentinel',
          systemPrompt: 'Você é o Compliance Sentinel do AfiliAds, chamado logo após o Presell Builder gerar uma página nova. Audite o texto real gerado contra políticas do Google Ads (claims de cura/renda, urgência falsa, depoimentos proibidos, disclaimers obrigatórios ausentes). Responda APENAS JSON válido.',
          buildUserPrompt: ({ baseContext }) => `${baseContext}\n\nTexto real da página gerada:\n"""${strippedHtml}"""\n\nRetorne JSON: {"score": number (0-100), "alertas": [{"nivel": "critico|atencao", "texto": "..."}]}`,
        }],
      );
      const step = seq.steps[0];
      if (!step.error && step.data) {
        complianceScore = typeof step.data.score === 'number' ? step.data.score : null;
        complianceAlerts = Array.isArray(step.data.alertas) ? step.data.alertas : [];
        await prisma.presell.update({
          where: { id: presell.id },
          data: { complianceScore, complianceIssues: complianceAlerts },
        });
      }
    } catch (e) {
      console.error('Compliance-sentinel encadeado (presell-builder) falhou, presell mantida sem score:', e);
    }

    return NextResponse.json({
      id: presell.id, slug: presell.slug, title: presell.title,
      url: presell.publishTarget === 'wordpress' ? presell.publishedUrl : `/p/${presell.slug}`,
      publishTarget: presell.publishTarget,
      pageType: presell.pageType, popupGate: presell.popupGate,
      usage, provider, model,
      complianceScore, complianceAlerts,
    }, { status: 201 });
  } catch (err: any) {
    console.error('POST presells error:', err);
    return NextResponse.json({ error: err?.message ?? 'Erro ao gerar presell' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = await resolveUserId(request);
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });
    await prisma.presell.delete({ where: { id, userId } as any });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: 'Erro ao excluir' }, { status: 500 });
  }
}
