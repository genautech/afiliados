import { prisma } from './prisma';
import { callLLM } from './llm';
import { logLearningToObsidian } from './obsidianSync';
import { renderPresellHtml } from './presell';
import type { PresellContent } from './presell';
import {
  RefinedInsightsSchema,
  PresellContentSchema,
  PresellProposalSchema,
  zodIssuesToMessage,
  type RefinedInsights,
} from './validations/knowledge';

export type RefinedMarketingInsights = RefinedInsights;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function processInjectedKnowledge(injectedKnowledgeId: string): Promise<void> {
  console.log(`[proposal-service] Iniciando processamento de conhecimento injetado: ${injectedKnowledgeId}`);
  
  // 1. Obter o conhecimento bruto do banco de dados
  const knowledge = await prisma.injectedKnowledge.findUnique({
    where: { id: injectedKnowledgeId },
    include: { campaign: true },
  });

  if (!knowledge) {
    throw new Error(`Conhecimento injetado com ID ${injectedKnowledgeId} não encontrado.`);
  }

  // O claim PENDING -> PROCESSING é feito com CAS na rota, antes de chamar aqui:
  // reescrever o status neste ponto anularia aquela exclusão mútua.

  try {
    const rawContent = knowledge.rawContent || '';
    if (!rawContent.trim()) {
      throw new Error('O conteúdo bruto para análise está vazio.');
    }

    const campaignId = knowledge.campaignId || undefined;
    const userId = knowledge.userId;

    // 2. Primeira Chamada LLM: Refinar Insights de Marketing
    console.log(`[proposal-service] Extraindo insights de marketing refinados via LLM...`);
    const insightsSystemPrompt = `Você é o Diretor de Inteligência de Tráfego e Redação de Vendas do AfiliAds.
Sua missão é ler um conteúdo bruto de pesquisa (que pode ser a transcrição de um vídeo de vendas/VSL, uma landing page de concorrente ou um código-fonte) e extrair os insights de marketing mais profundos e práticos.

Regras de Saída:
- Extraia dados extremamente úteis para a escrita de copys.
- Identifique a promessa ou gancho central, as dores profundas do avatar, seus desejos inconscientes, as objeções mais difíceis de quebrar e os ângulos de vendas que melhor convertem.
- Selecione frases literais ou ideias de alto impacto para uso na copy.
- Responda APENAS um JSON válido contendo exatamente as chaves abaixo:
{
  "title": "Título sugerido e profissional para descrever este dossiê de conhecimento",
  "headline": "A headline de marketing mais poderosa e livre de promessas de cura/ganho absoluto baseada neste conteúdo",
  "dores": ["3 a 5 dores físicas/emocionais profundas identificadas no público"],
  "desejos": ["3 a 5 aspirações, objetivos e desejos inconscientes do avatar"],
  "objecoes": ["3 a 5 barreiras mentais, medos ou desculpas que impedem a compra"],
  "angulos": ["2 a 3 abordagens de vendas ou ângulos de conversão sugeridos para a presell"],
  "frases_chave": ["3 a 5 frases ou termos de altíssimo impacto identificados no texto bruto"]
}`;

    const insightsUserPrompt = `Aqui está o conteúdo bruto coletado para análise:

Fonte: ${knowledge.sourceType}
URL: ${knowledge.sourceUrl || 'Envio direto'}

CONTEÚDO BRUTO:
"""
${rawContent.slice(0, 45000)}
"""

Analise cuidadosamente e retorne as chaves JSON exatas. Não invente termos artificiais ou promessas absolutas.`;

    const insightsResponse = await callLLM(userId, {
      systemPrompt: insightsSystemPrompt,
      userPrompt: insightsUserPrompt,
      campaignTarget: campaignId
        ? { kind: 'campaign' as const, campaignId }
        : { kind: 'non-campaign' as const },
      purpose: 'refine-knowledge-insights',
      json: true,
      // O runner re-pergunta ao modelo com o erro de validação junto (lib/llm.ts),
      // em vez de persistir JSON incompleto e estourar depois no consumo.
      validate: (data: unknown) => {
        const parsed = RefinedInsightsSchema.safeParse(data);
        return parsed.success ? null : zodIssuesToMessage(parsed.error);
      },
    });
    if (insightsResponse.error) {
      throw new Error(`Chamada LLM de insights retornou erro: ${insightsResponse.error}`);
    }

    const insightsParsed = RefinedInsightsSchema.safeParse(insightsResponse.data);
    if (!insightsParsed.success) {
      throw new Error(`Insights do LLM fora do contrato: ${zodIssuesToMessage(insightsParsed.error)}`);
    }
    const insights: RefinedMarketingInsights = insightsParsed.data;

    // Atualizar os insights de marketing refinados no banco de dados
    await prisma.injectedKnowledge.update({
      where: { id: injectedKnowledgeId },
      data: {
        refinedMetadata: insights as any,
      },
    });

    console.log(`[proposal-service] Insights salvos com sucesso para ${injectedKnowledgeId}`);

    // 3. Segunda Chamada LLM: Gerar Proposta de Copy para o Presell (se aplicável)
    if (campaignId) {
      const presell = await prisma.presell.findFirst({
        where: { campaignId, userId },
      });

      if (presell) {
        console.log(`[proposal-service] Encontrada Pre-sell ativa (ID: ${presell.id}). Gerando proposta de melhoria de copy baseada nos insights...`);
        const presellContentActual = (presell.content as unknown as PresellContent) || {};

        const proposalSystemPrompt = `Você é o Redator-Chefe sênior e Consultor de Conversão do AfiliAds.
Sua tarefa é ler a estrutura atual de copy (JSON) de uma página de pré-venda (Pre-sell) e adaptá-la, refinando headlines, subheadlines, arguments, FAQ, seções científicas e ganchos utilizando os novos insights de marketing e as dores profundas recém-descobertas no conhecimento injetado.

Regras de Redação (Cruciais para aprovação no Google Ads):
- Siga estritamente o BUILDER_PROMPT de bridge pages: conteúdo editorial informativo (como um portal de notícias ou blog científico), NUNCA promessa direta ou agressiva.
- Elimine alegações de cura, eliminação de sintomas ou garantias de resultados ("cure a diabetes", "perca 10kg garantido", "acabe com a dor").
- Use linguagem empática, condicional e científica (ex: "apoia a saúde natural", "auxilia a promover conforto", "fórmula testada que atua no suporte ao metabolismo").
- Mantenha exatamente a mesma estrutura JSON do conteúdo original. Não adicione novas chaves nem remova as existentes.
- O idioma de saída DEVE ser o mesmo do pre-sell original (${presell.language || 'pt-BR'}).

Responda APENAS um JSON válido contendo exatamente este formato:
{
  "explanation": "Uma explicação curta e clara (em português brasileiro) detalhando quais alterações foram propostas na pre-sell e qual foi o embasamento baseado no conhecimento injetado.",
  "proposedContent": {
    "categoria": "Nova categoria ou mantida",
    "headline": "Nova headline adaptada aos novos insights",
    "subheadline": "Nova subheadline adaptada",
    "autor": "Nome do autor",
    "leitura_min": 5,
    "abertura": "Texto de abertura com empatia de dor",
    "secao1_titulo": "Título de seção",
    "secao1_texto": "Texto de seção",
    "secao2_titulo": "Título de seção",
    "secao2_texto": "Texto de seção",
    "beneficios": ["Lista de benefícios"],
    "prova": "Prova social adaptada",
    "cta_texto": "Texto do CTA",
    "cta_reforco": "Texto de reforço do CTA",
    "secao3_titulo": "Título de seção",
    "secao3_texto": "Texto de seção",
    "pros": ["Pós/vantagens"],
    "contras": ["Contras sinceros e reais"],
    "faq": [{"pergunta":"...", "resposta":"..."}],
    "cta_final": "Texto CTA final",
    "titulo_pagina": "Título da página SEO",
    "meta_descricao": "Meta descrição SEO",
    "nome_site": "Nome do site editorial",
    "como_funciona": [{"titulo":"...", "texto":"..."}],
    "temas_feedback": ["..."],
    "cientifico_titulo": "Opcional: título científico",
    "cientifico_texto": "Opcional: texto científico explicativo",
    "ingredientes": [{"nome":"...", "beneficio":"..."}],
    "pacotes": [{"nome":"...", "qtd":"...", "economia":"...", "badge":"..."}],
    "certificacoes": ["..."],
    "aviso_autenticidade": "Frase de alerta"
  }
}`;

        const proposalUserPrompt = `Aqui estão as informações para realizar a redação da proposta de melhoria:

CONTEÚDO DO PRE-SELL ATUAL (JSON):
"""
${JSON.stringify(presellContentActual, null, 2)}
"""

INSIGHTS DE MARKETING REFINADOS DA INGESTÃO:
"""
${JSON.stringify(insights, null, 2)}
"""

ID DO PRE-SELL: ${presell.id}
IDIOMA: ${presell.language || 'pt-BR'}

Refine toda a pre-sell para que ela se conecte perfeitamente com os insights da ingestão. Responda estritamente o JSON solicitado.`;

        const proposalResponse = await callLLM(userId, {
          systemPrompt: proposalSystemPrompt,
          userPrompt: proposalUserPrompt,
          campaignTarget: { kind: 'campaign' as const, campaignId },
          purpose: 'generate-presell-proposal',
          json: true,
          validate: (data: unknown) => {
            const parsed = PresellProposalSchema.safeParse(data);
            return parsed.success ? null : zodIssuesToMessage(parsed.error);
          },
        });
        if (proposalResponse.error) {
          throw new Error(`Chamada LLM de proposta de pre-sell retornou erro: ${proposalResponse.error}`);
        }

        const proposalParsed = PresellProposalSchema.safeParse(proposalResponse.data);
        if (!proposalParsed.success) {
          throw new Error(`Proposta do LLM fora do contrato: ${zodIssuesToMessage(proposalParsed.error)}`);
        }
        const proposalPayload = proposalParsed.data;

        // Criar o registro PresellProposal associando à pre-sell e ao conhecimento
        const proposal = await prisma.presellProposal.create({
          data: {
            injectedKnowledgeId,
            presellId: presell.id,
            proposedContent: proposalPayload.proposedContent as unknown as object,
            // Nunca código executável vindo do LLM: a entrada dele é página de concorrente
            // e transcrição de terceiro, e {{CUSTOM_CODE}} entra CRU na presell publicada
            // (lib/presell.ts). Seria injeção indireta de prompt virando XSS armazenado.
            proposedCustomCode: '',
            explanation: proposalPayload.explanation,
            applied: false,
          },
        });

        console.log(`[proposal-service] Proposta de pre-sell criada com ID ${proposal.id} para a pre-sell ${presell.id}`);
      } else {
        console.log(`[proposal-service] Nenhuma Pre-sell ativa para a campanha ${campaignId}. Pulando geração de proposta.`);
      }
    }

    // 4. Registrar insights no Obsidian Vault via outbox
    await logLearningToObsidian({
      title: `Inteligência Injetada · ${insights.title || knowledge.sourceUrl || 'Envio Direto'}`,
      tags: ['inteligencia/injetada', `origem/${knowledge.sourceType.toLowerCase()}`],
      body: `### 🎯 Gancho Central / Promessa Recomendada
> ${insights.headline}

### 💔 Dores Profundas Mapeadas
${insights.dores.map(d => `- ${d}`).join('\n')}

### 🛡️ Objeções e Barreiras Identificadas
${insights.objecoes.map(o => `- ${o}`).join('\n')}

### 📐 Ângulos de Vendas Recomendados
${insights.angulos.map(a => `- ${a}`).join('\n')}

### 💬 Frases de Alto Impacto
${insights.frases_chave.map(f => `_"${f}"_`).join('\n\n')}

---
_Processado de forma 100% real através do pipeline de conhecimento unificado do AfiliAds local._`,
    });

    // 5. Finalizar o status do conhecimento injetado
    await prisma.injectedKnowledge.update({
      where: { id: injectedKnowledgeId },
      data: {
        status: 'COMPLETED',
      },
    });

    console.log(`[proposal-service] Processamento assíncrono concluído com absoluto sucesso para: ${injectedKnowledgeId}`);

  } catch (error: unknown) {
    const message = errorMessage(error);
    console.error(`[proposal-service] Erro fatal ao processar o conhecimento injetado ${injectedKnowledgeId}:`, message);

    // Marcar como FAILED no banco de dados para feedback na UI. Re-lançamos para que o
    // chamador saiba que falhou; ele NÃO regrava o status (evita UPDATE duplicado).
    await prisma.injectedKnowledge.update({
      where: { id: injectedKnowledgeId },
      data: {
        status: 'FAILED',
        errorMessage: message.slice(0, 2000) || 'Erro desconhecido durante o processamento do LLM.',
      },
    }).catch((e: unknown) => console.error('[proposal-service] Falha ao atualizar status de erro no banco:', errorMessage(e)));

    throw error;
  }
}

export async function applyPresellProposal(proposalId: string, userId: string): Promise<void> {
  console.log(`[proposal-service] Aplicando proposta de pre-sell: ${proposalId}...`);

  const proposal = await prisma.presellProposal.findUnique({
    where: { id: proposalId },
    include: {
      knowledge: true,
    },
  });

  if (!proposal) {
    throw new Error('Proposta não encontrada.');
  }

  const presell = await prisma.presell.findFirst({
    where: { id: proposal.presellId, userId },
  });

  if (!presell) {
    throw new Error('Pre-sell associado à proposta não foi encontrado ou pertence a outro usuário.');
  }

  if (proposal.applied) {
    throw new Error('Esta proposta já foi aplicada a esta pre-sell.');
  }

  // O JSON no banco pode ter sido gravado por uma versão anterior, sem validação.
  // Renderizar conteúdo fora do contrato produziria HTML com "undefined" na página.
  const contentParsed = PresellContentSchema.safeParse(proposal.proposedContent);
  if (!contentParsed.success) {
    throw new Error(`Conteúdo da proposta fora do contrato: ${zodIssuesToMessage(contentParsed.error)}`);
  }
  const proposedContent: PresellContent = contentParsed.data;
  
  // Renderizar o novo HTML real da pre-sell a partir do novo content e das configurações originais
  const isHealth = /health|sa[uú]de|nutra|beauty|beleza/i.test(`${presell.pageType} ${presell.productName}`);
  
  const updatedHtml = renderPresellHtml(proposedContent, {
    productName: presell.productName,
    hopLink: presell.hopLink,
    googleAdsId: presell.googleAdsId || undefined,
    pageType: presell.pageType,
    popupGate: presell.popupGate,
    videoUrl: presell.videoUrl || undefined,
    // Preserva o customCode escrito pelo operador: a proposta não injeta código.
    customCode: presell.customCode,
    isHealthNiche: isHealth,
    language: presell.language,
    presellId: presell.id,
  });

  // Atualizar a pre-sell com a proposta aplicada
  await prisma.$transaction([
    prisma.presell.update({
      where: { id: presell.id },
      data: {
        content: proposedContent as unknown as object,
        html: updatedHtml,
      },
    }),
    prisma.presellProposal.update({
      where: { id: proposalId },
      data: {
        applied: true,
      },
    })
  ]);

  console.log(`[proposal-service] Proposta ${proposalId} aplicada com sucesso ao pre-sell ${presell.id}! HTML regenerado.`);
}
