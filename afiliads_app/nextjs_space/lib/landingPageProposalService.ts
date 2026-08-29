import { prisma } from './prisma';
import { callLLM } from './llm';
import { logLearningToObsidian } from './obsidianSync';
import { renderPresellHtml } from './presell';
import type { PresellContent } from './presell';

export interface RefinedMarketingInsights {
  title: string;
  headline: string;
  dores: string[];
  desejos: string[];
  objecoes: string[];
  angulos: string[];
  frases_chave: string[];
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

  // Atualizar para PROCESSING se ainda não estiver
  await prisma.injectedKnowledge.update({
    where: { id: injectedKnowledgeId },
    data: { status: 'PROCESSING' },
  });

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

    const insightsLmlOptions = {
      systemPrompt: insightsSystemPrompt,
      userPrompt: insightsUserPrompt,
      campaignTarget: campaignId 
        ? { kind: 'campaign' as const, campaignId } 
        : { kind: 'non-campaign' as const },
      purpose: 'refine-knowledge-insights',
    };

    const insightsResponse = await callLLM(userId, insightsLmlOptions);
    if (insightsResponse.error) {
      throw new Error(`Chamada LLM de insights retornou erro: ${insightsResponse.error}`);
    }

    const insightsResponseText = insightsResponse.text;
    
    // Parse e validação básica do JSON retornado pela IA
    let insights: RefinedMarketingInsights;
    try {
      const cleanJsonStr = insightsResponseText.substring(
        insightsResponseText.indexOf('{'),
        insightsResponseText.lastIndexOf('}') + 1
      );
      insights = JSON.parse(cleanJsonStr);
    } catch (e: any) {
      console.error('[proposal-service] Falha ao fazer parse do JSON de insights refinados do LLM:', insightsResponseText);
      throw new Error(`Resposta do LLM de insights não era um JSON válido: ${e?.message}`);
    }

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
  },
  "proposedCustomCode": "Opcional: um bloco de código CSS customizado (dentro de uma tag <style>) ou JS se você quiser ajustar o estilo/fonte para dar um tom mais profissional ou focado (por exemplo, destacar seções, mudar cores para um tom médico/científico). Retorne string vazia se não for propor alteração visual."
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

        const proposalLmlOptions = {
          systemPrompt: proposalSystemPrompt,
          userPrompt: proposalUserPrompt,
          campaignTarget: { kind: 'campaign' as const, campaignId },
          purpose: 'generate-presell-proposal',
        };

        const proposalResponse = await callLLM(userId, proposalLmlOptions);
        if (proposalResponse.error) {
          throw new Error(`Chamada LLM de proposta de pre-sell retornou erro: ${proposalResponse.error}`);
        }

        const proposalResponseText = proposalResponse.text;
        
        let proposalPayload: {
          explanation: string;
          proposedContent: PresellContent;
          proposedCustomCode?: string;
        };

        try {
          const cleanJsonStr = proposalResponseText.substring(
            proposalResponseText.indexOf('{'),
            proposalResponseText.lastIndexOf('}') + 1
          );
          proposalPayload = JSON.parse(cleanJsonStr);
        } catch (e: any) {
          console.error('[proposal-service] Falha ao fazer parse do JSON da proposta do LLM:', proposalResponseText);
          throw new Error(`Resposta do LLM de proposta não era um JSON válido: ${e?.message}`);
        }

        // Criar o registro PresellProposal associando à pre-sell e ao conhecimento
        const proposal = await prisma.presellProposal.create({
          data: {
            injectedKnowledgeId,
            presellId: presell.id,
            proposedContent: proposalPayload.proposedContent as any,
            proposedCustomCode: proposalPayload.proposedCustomCode || '',
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

  } catch (error: any) {
    console.error(`[proposal-service] Erro fatal ao processar o conhecimento injetado ${injectedKnowledgeId}:`, error?.message);
    
    // Marcar como FAILED no banco de dados para feedback na UI
    await prisma.injectedKnowledge.update({
      where: { id: injectedKnowledgeId },
      data: {
        status: 'FAILED',
        errorMessage: error?.message || 'Erro desconhecido durante o processamento do LLM.',
      },
    }).catch(e => console.error('[proposal-service] Falha ao atualizar status de erro no banco:', e?.message));

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

  const proposedContent = proposal.proposedContent as unknown as PresellContent;
  
  // Renderizar o novo HTML real da pre-sell a partir do novo content e das configurações originais
  const isHealth = /health|sa[uú]de|nutra|beauty|beleza/i.test(`${presell.pageType} ${presell.productName}`);
  
  const updatedHtml = renderPresellHtml(proposedContent, {
    productName: presell.productName,
    hopLink: presell.hopLink,
    googleAdsId: presell.googleAdsId || undefined,
    pageType: presell.pageType,
    popupGate: presell.popupGate,
    videoUrl: presell.videoUrl || undefined,
    customCode: proposal.proposedCustomCode || presell.customCode,
    isHealthNiche: isHealth,
    language: presell.language,
    presellId: presell.id,
  });

  // Atualizar a pre-sell com a proposta aplicada
  await prisma.$transaction([
    prisma.presell.update({
      where: { id: presell.id },
      data: {
        content: proposedContent as any,
        customCode: proposal.proposedCustomCode || presell.customCode,
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
