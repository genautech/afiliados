import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AdScoutService } from '@/lib/adScoutService';
import {
  AdScoutOracleOutputSchema,
  MarketResearchRequestSchema,
} from '@/lib/validations/market-research';
import { logLearningToObsidian } from '@/lib/obsidianSync';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 90;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Erro interno ao processar pesquisa de mercado';
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
    }

    const requestResult = MarketResearchRequestSchema.safeParse(rawBody);
    if (!requestResult.success) {
      return NextResponse.json(
        { error: 'Payload inválido', details: requestResult.error.flatten() },
        { status: 400 },
      );
    }
    const input = requestResult.data;

    const scoutResponse = await new AdScoutService().search(input);
    const outputResult = AdScoutOracleOutputSchema.safeParse(scoutResponse);
    if (!outputResult.success) {
      console.error('[market-scout] resposta inválida do Ad Scout:', outputResult.error.flatten());
      return NextResponse.json({ error: 'Resposta inválida do Ad Scout' }, { status: 502 });
    }
    const output = outputResult.data;

    const saved = await prisma.$transaction(async (tx) => {
      if (input.productResearchId) {
        const product = await tx.productResearch.findFirst({
          where: { id: input.productResearchId, userId },
          select: { id: true },
        });
        if (!product) throw new Error('Produto não encontrado');
      }

      if (input.campaignId) {
        const campaign = await tx.campaign.findFirst({
          where: { id: input.campaignId, userId },
          select: { id: true },
        });
        if (!campaign) throw new Error('Campanha não encontrada');
      }

      const data = {
        userId,
        productId: input.productResearchId ?? null,
        campaignId: input.campaignId ?? null,
        query: output.query,
        productType: output.productType,
        adCount: output.adCount,
        avgPrice: output.avgPrice,
        competitors: output.competitors,
        audiencePain: output.audiencePain,
        anglesSuggested: output.anglesSuggested,
        analyzedClaims: output.analyzedClaims,
      };

      if (input.productResearchId) {
        return tx.marketResearch.upsert({
          where: { productId: input.productResearchId },
          create: data,
          update: data,
        });
      }

      return tx.marketResearch.create({ data });
    });

    // Geração de relatório detalhado e estruturado para o Obsidian Vault
    const competitorsMarkdown = output.competitors.length > 0
      ? output.competitors.map(c => `| ${c.name} | [Link](${c.url}) | R$ ${c.price.toFixed(2)} | ${c.angle} |`).join('\n')
      : '| *Nenhum concorrente cadastrado* | - | - | - |';

    const claimsMarkdown = output.analyzedClaims.length > 0
      ? output.analyzedClaims.map(c => `| **${c.riskLevel}** | "${c.claim}" | ${c.sourceCompetitor} | ${c.justification} |`).join('\n')
      : '| *Nenhuma claim analisada* | - | - | - |';

    const obsidianBody = [
      `Pesquisa de mercado detalhada para o termo de busca **"${output.query}"** (${output.productType === 'AFFILIATE' ? 'Afiliação tradicional' : 'Produto próprio Low-Ticket'}).`,
      '',
      `### 📊 Métricas de Leilão`,
      `- **Temperatura de Leilão:** ${output.adCount} anúncios concorrentes ativos mapeados na SERP.`,
      `- **Preço Médio Praticado:** R$ ${output.avgPrice.toFixed(2)}`,
      '',
      `### 👥 Concorrentes Mapeados`,
      `| Concorrente | URL | Preço | Ângulo de Vendas / Headline |`,
      `| :--- | :--- | :--- | :--- |`,
      competitorsMarkdown,
      '',
      `### 🧠 Psicologia Comportamental (Fóruns e Reddit)`,
      output.audiencePain.map(p => `- ${p}`).join('\n'),
      '',
      `### 🎯 Ângulos de Copy Sugeridos`,
      output.anglesSuggested.map(a => `- ${a}`).join('\n'),
      '',
      `### 🛡️ Dossiê de Compliance & Níveis de Risco (Claims de Concorrentes)`,
      `| Nível de Risco | Declaração / Claim | Concorrente / Fonte | Justificativa Técnica |`,
      `| :--- | :--- | :--- | :--- |`,
      claimsMarkdown,
      '',
      `---`,
      `**Nota de Compliance:** As claims mapeadas com risco **HIGH** ativarão o *Compliance Kill-switch* de forma fail-closed durante a geração automática de pré-sells neste projeto, evitando multas e banimentos na plataforma de anúncios.`
    ].join('\n');

    await logLearningToObsidian({
      title: `market-scout-${output.query}`,
      tags: ['market-research', 'ad-scout-oracle'],
      body: obsidianBody,
    });

    return NextResponse.json(AdScoutOracleOutputSchema.parse({
      query: saved.query,
      productType: saved.productType,
      adCount: saved.adCount,
      avgPrice: saved.avgPrice,
      competitors: saved.competitors,
      audiencePain: saved.audiencePain,
      anglesSuggested: saved.anglesSuggested,
      analyzedClaims: saved.analyzedClaims,
    }), { status: 200 });
  } catch (error) {
    const message = errorMessage(error);
    if (message === 'Produto não encontrado' || message === 'Campanha não encontrada') {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    console.error('[market-scout] POST error:', message);
    return NextResponse.json({ error: 'Erro ao processar pesquisa de mercado' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId');
    const productId = searchParams.get('productId') || searchParams.get('productResearchId');

    if (!campaignId && !productId) {
      return NextResponse.json({ error: 'campaignId ou productId é obrigatório' }, { status: 400 });
    }

    const research = await prisma.marketResearch.findFirst({
      where: {
        userId,
        OR: [
          campaignId ? { campaignId } : null,
          productId ? { productId } : null,
        ].filter(Boolean) as any,
      },
    });

    if (!research) {
      return NextResponse.json({ found: false }, { status: 200 });
    }

    return NextResponse.json({
      found: true,
      data: AdScoutOracleOutputSchema.parse({
        query: research.query,
        productType: research.productType,
        adCount: research.adCount,
        avgPrice: research.avgPrice,
        competitors: research.competitors,
        audiencePain: research.audiencePain,
        anglesSuggested: research.anglesSuggested,
        analyzedClaims: research.analyzedClaims,
      }),
    }, { status: 200 });
  } catch (error) {
    console.error('[market-scout] GET error:', errorMessage(error));
    return NextResponse.json({ error: 'Erro ao buscar pesquisa de mercado' }, { status: 500 });
  }
}
