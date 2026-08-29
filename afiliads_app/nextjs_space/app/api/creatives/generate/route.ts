export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { callAgent } from '@/lib/llm';
import { validateCompliance } from '@/lib/validators/complianceValidator';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    const userId = (session.user as any)?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const {
      campaignId,
      productType,
      productName,
      productNiche,
      intentQueries = [],
      competitorDores = [],
      tone = 'alert',
    } = body;

    if (!campaignId || !productType || !productName || !productNiche) {
      return NextResponse.json(
        { error: 'Parâmetros obrigatórios ausentes: campaignId, productType, productName, productNiche' },
        { status: 400 }
      );
    }

    // Verificar se a campanha pertence ao usuário
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, userId },
    });
    if (!campaign) {
      return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 });
    }

    // Atualizar updatedAt da campanha para estender o tempo limite de inatividade do CampaignGuard
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { updatedAt: new Date() },
    });

    // Dynamic prompt engineering
    const systemPrompt = `Você é um redator publicitário de elite (CRO Copywriter) especializado em tráfego pago para afiliados e infoprodutos.
Sua missão é criar um anúncio persuasivo, ético e 100% complacente com as políticas do Google Ads e Meta Ads (sem falsas promessas de cura, emagrecimento milagroso ou descontos fictícios de 90%).

Você DEVE estruturar sua resposta exclusivamente em formato JSON com o seguinte schema exato:
{
  "angle": "Descrição do ângulo persuasivo escolhido",
  "headline": "Título curto e chamativo para o anúncio",
  "primaryText": "Texto principal persuasivo focado na dor real do cliente",
  "description": "Descrição curta complementar"
}

Diretrizes cruciais:
1. Baseie-se APENAS nas dores reais fornecidas e objeções de autocomplete. NÃO invente depoimentos falsos.
2. Use tom condicional e linguagem sutil ("pode ajudar", "auxilia", "entenda como funciona").
3. Mantenha os disclaimers obrigatórios.
`;

    const userPrompt = `Gere uma copy altamente persuasiva para o produto "${productName}".
Tipo de Produto: ${productType}
Nicho: ${productNiche}
Tom de voz: ${tone}

Objeções do Autocomplete (focar nelas):
${intentQueries.map((q: string) => `- ${q}`).join('\n')}

Dores Reais Coletadas (Reddit/Ad Scout):
${competitorDores.map((d: string) => `- ${d}`).join('\n')}

Crie o anúncio em português, focando em quebrar essas objeções de forma ética e profissional.`;

    let generatedData: any = null;
    let attempts = 0;
    const maxAttempts = 3;
    let complianceResult: any = null;
    let extraInstruction = '';

    while (attempts < maxAttempts) {
      attempts++;
      const currentPrompt = extraInstruction
        ? `${userPrompt}\n\nRE-GENERAÇÃO DE COMPLIANCE (Tentativa ${attempts}):\n${extraInstruction}`
        : userPrompt;

      const response = await callAgent(userId, {
        agent: 'cro-copywriter',
        systemPrompt,
        userPrompt: currentPrompt,
        json: true,
        campaignId,
        campaignTarget: { kind: 'campaign', campaignId },
      });

      generatedData = response.data;
      if (!generatedData || typeof generatedData !== 'object') {
        throw new Error('Retorno do LLM não é um objeto válido');
      }

      // Concatenar textos para validação de compliance
      const fullCopyText = `${generatedData.headline || ''}\n${generatedData.primaryText || ''}\n${generatedData.description || ''}`;
      complianceResult = validateCompliance(fullCopyText);

      if (complianceResult.passed) {
        break; // Passou na conformidade, sai do loop
      }

      // Se falhou (riskLevel === 'HIGH'), preparamos instrução extra de segurança para a re-geração
      const violations = complianceResult.issues
        .filter((i: any) => i.riskLevel === 'HIGH')
        .map((i: any) => `- Linha com erro: "${i.text}"\n  Motivo: ${i.explanation}\n  Sugestão: ${i.suggestion}`)
        .join('\n');

      extraInstruction = `ATENÇÃO: A geração anterior continha violações graves de compliance (HIGH RISK) e foi REJEITADA.
Corrija imediatamente removendo qualquer alegação de cura, promessas irreais de ganho/desconto ou falsos depoimentos.
Violações detectadas:\n${violations}`;
    }

    // Se mesmo após todas as tentativas ainda houver risco HIGH, rejeitamos ou retornamos com erro indicando compliance
    if (complianceResult && !complianceResult.passed) {
      return NextResponse.json(
        {
          error: 'Geração bloqueada pelo Compliance Sentinel devido a múltiplos riscos altos de conformidade',
          compliance: complianceResult,
          creative: generatedData,
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      attempts,
      creative: generatedData,
      compliance: complianceResult,
    });

  } catch (err: any) {
    console.error('Error generating creatives:', err);
    return NextResponse.json(
      { error: err?.message || 'Erro interno do servidor ao gerar criativos' },
      { status: 500 }
    );
  }
}
