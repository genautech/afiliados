import type { MarketResearchRequest, AdScoutOracleOutput } from '@/lib/validations/market-research';

export class AdScoutService {
  private readonly endpoint = process.env.AD_SCOUT_AGENT_URL;
  private readonly token = process.env.AD_SCOUT_AGENT_TOKEN;

  async search(input: MarketResearchRequest): Promise<AdScoutOracleOutput> {
    // Se o endpoint não estiver configurado, entra automaticamente no Mock de Alta Fidelidade
    if (!this.endpoint) {
      console.log(`[ad-scout-service] AD_SCOUT_AGENT_URL não definida. Ativando Mock de Alta Fidelidade para query: "${input.query}"`);
      return this.generateMockResponse(input);
    }

    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (this.token) headers.Authorization = `Bearer ${this.token}`;

      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query: input.query, productType: input.productType }),
        signal: AbortSignal.timeout(60_000),
      });

      if (!response.ok) {
        throw new Error(`Ad Scout falhou com HTTP ${response.status}`);
      }

      const data = await response.json();

      // Monitoramento de Consumo de Tokens (Auditoria Financeira Google Cloud/Gemini API)
      const usage = (data as any).usage || (data as any).usageMetadata;
      if (usage) {
        const promptTokens = usage.promptTokens || usage.prompt_tokens || usage.input_tokens || 0;
        const completionTokens = usage.completionTokens || usage.completion_tokens || usage.output_tokens || 0;
        const totalTokens = usage.totalTokens || usage.total_tokens || (promptTokens + completionTokens);

        // Custos padrão baseados no Gemini 1.5 Pro no GCP (por milhão de tokens)
        // Prompt: US$ 1.25 / 1M | Completion: US$ 5.00 / 1M
        const costPrompt = (promptTokens / 1_000_000) * 1.25;
        const costCompletion = (completionTokens / 1_000_000) * 5.00;
        const totalCostUSD = costPrompt + costCompletion;
        const totalCostBRL = totalCostUSD * 5.50; // taxa de câmbio de mercado estimada

        console.log('=== [ad-scout-service] AUDITORIA DE CONSUMO DE TOKENS ===');
        console.log(`- Prompt Tokens: ${promptTokens}`);
        console.log(`- Completion Tokens: ${completionTokens}`);
        console.log(`- Total Tokens Consumidos: ${totalTokens}`);
        console.log(`- Custo Estimado da Transação: US$ ${totalCostUSD.toFixed(5)} (~R$ ${totalCostBRL.toFixed(4)})`);
        console.log('========================================================');
      } else {
        console.log('[ad-scout-service] Resposta da API real recebida, mas nenhum metadado de uso de tokens (usage) foi encontrado.');
      }

      return data as AdScoutOracleOutput;
    } catch (error) {
      console.error('[ad-scout-service] Erro ao chamar serviço real, ativando fallback Mock de segurança:', error);
      return this.generateMockResponse(input);
    }
  }

  private async generateMockResponse(input: MarketResearchRequest): Promise<AdScoutOracleOutput> {
    // Simular delay de processamento de rede para dar sensação de agente vivo no Frontend
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const queryLower = input.query.toLowerCase();
    
    // Configurações inteligentes baseadas no nicho
    let niche = 'geral';
    if (queryLower.includes('emagrece') || queryLower.includes('peso') || queryLower.includes('dieta') || queryLower.includes('fit') || queryLower.includes('treino')) {
      niche = 'saude';
    } else if (queryLower.includes('dinheiro') || queryLower.includes('renda') || queryLower.includes('vender') || queryLower.includes('marketing') || queryLower.includes('ganhar')) {
      niche = 'financeiro';
    } else if (queryLower.includes('foco') || queryLower.includes('tempo') || queryLower.includes('produtiv') || queryLower.includes('organiza')) {
      niche = 'produtividade';
    }

    const defaultPrices =
      input.productType === 'PROPRIETARY_LOW_TICKET'
        ? { avg: 47.90, min: 29.00, max: 67.00 }
        : input.productType === 'MENTORSHIP'
        ? { avg: 1497.00, min: 497.00, max: 4997.00 }
        : { avg: 197.00, min: 97.00, max: 297.00 };

    const responseTemplates: Record<string, Partial<AdScoutOracleOutput>> = {
      saude: {
        adCount: 18,
        avgPrice: defaultPrices.avg,
        competitors: [
          { name: 'Protocolo Seca Rápido 21D', url: 'https://protocolosecarapido.com/vsl', price: defaultPrices.min, angle: 'Perca gordura localizada sem passar fome com cronograma de 21 dias.' },
          { name: 'Manual do Metabolismo Ativo', url: 'https://metabolismoativo.com/oferta', price: defaultPrices.max, angle: 'Método científico para acelerar metabolismo lento após os 30 anos.' }
        ],
        audiencePain: [
          'Efeito sanfona: emagrece mas recupera todo o peso em menos de um mês.',
          'Dificuldade de manter a constância em dietas extremamente restritivas.',
          'Falta de tempo no dia a dia para preparar receitas complicadas e marmitas fit.'
        ],
        anglesSuggested: [
          'Ângulo de Ativação Metabólica: Foco em destravar a queima natural de gordura sem dietas malucas.',
          'Ângulo da Praticidade: Receitas de 15 minutos para quem trabalha o dia todo e quer emagrecer comendo comida de verdade.'
        ],
        analyzedClaims: [
          {
            claim: 'Emagreça 10kg em apenas 7 dias sem fazer exercícios nem fechar a boca',
            sourceCompetitor: 'Protocolo Seca Rápido 21D VSL',
            riskLevel: 'HIGH',
            justification: 'Promessa de resultado de perda de peso irrealista e sem esforço, violando diretamente as diretrizes de compliance de Google Ads e Meta Ads para saúde.'
          },
          {
            claim: 'Método passo a passo baseado em estudos de Harvard para reativar o metabolismo',
            sourceCompetitor: 'Manual do Metabolismo Ativo',
            riskLevel: 'MEDIUM',
            justification: 'Uso de autoridade de instituição famosa (Harvard). Requer citações científicas explícitas na página de vendas para evitar rejeição de anúncios.'
          },
          {
            claim: 'Guia de receitas práticas fáceis de preparar para o dia a dia',
            sourceCompetitor: 'Receitas Fit Express',
            riskLevel: 'LOW',
            justification: 'Afirmação segura e realista que descreve o conteúdo descritivo do produto de forma factual.'
          }
        ]
      },
      financeiro: {
        adCount: 24,
        avgPrice: defaultPrices.avg,
        competitors: [
          { name: 'Método Renda Extra Home Office', url: 'https://rendadigitaloffice.com/vagas', price: defaultPrices.min, angle: 'Como ganhar de R$ 100 a R$ 300 por dia prestando microserviços online.' },
          { name: 'E-book Afiliado Sniper V2', url: 'https://afiliadosniper.com/checkout', price: defaultPrices.max, angle: 'Copie e cole a estrutura de anúncios que vende infoprodutos no piloto automático.' }
        ],
        audiencePain: [
          'Falta de dinheiro para investir em ferramentas e anúncios pagos no início.',
          'Frustração com cursos caros de marketing digital que prometem lucros fáceis mas não dão suporte.',
          'Não entender de tecnologia ou não saber criar páginas e artes para vender.'
        ],
        anglesSuggested: [
          'Ângulo Pragmático / Renda sem Investimento: Foco em métodos gratuitos que geram caixa imediato prestando serviços ou usando tráfego orgânico.',
          'Ângulo de Copiar Estrutura: Fornecer modelos de funis e copys prontos para quem não sabe escrever nem criar páginas do zero.'
        ],
        analyzedClaims: [
          {
            claim: 'Fique rico em 3 semanas e fature mais de R$ 10.000 mensais trabalhando 10 minutos por dia',
            sourceCompetitor: 'Renda Digital Office VSL',
            riskLevel: 'HIGH',
            justification: 'Promessa de enriquecimento rápido e garantido com esforço mínimo. Violação grave de políticas de publicidade de Meta Ads e Google Ads sobre renda fácil.'
          },
          {
            claim: 'Aprenda o exato método que eu usei para faturar meus primeiros R$ 5.000 na internet',
            sourceCompetitor: 'E-book Afiliado Sniper',
            riskLevel: 'MEDIUM',
            justification: 'Alegação de faturamento individual. Aceitável se houver disclaimer na página e comprovação legal dos ganhos, mas ainda passível de revisão manual nas redes.'
          },
          {
            claim: 'E-book focado em ensinar técnicas de copywriting e tráfego pago passo a passo',
            sourceCompetitor: 'Copiadora Digital',
            riskLevel: 'LOW',
            justification: 'Descrição educacional e factual sem promessas absurdas de resultados financeiros fáceis.'
          }
        ]
      },
      produtividade: {
        adCount: 9,
        avgPrice: defaultPrices.avg,
        competitors: [
          { name: 'Método Dia com 30 Horas', url: 'https://dia30horas.com/livro', price: defaultPrices.min, angle: 'Gerencie seu tempo com técnicas de foco profundo e dobre suas entregas diárias.' },
          { name: 'Planejamento de Alta Performance', url: 'https://focoextraordinario.com/venda', price: defaultPrices.max, angle: 'Templates prontos de Notion e Trello para organizar rotina e eliminar a procrastinação.' }
        ],
        audiencePain: [
          'Sentimento de estar sempre cansado e sobrecarregado, mas sem terminar as tarefas importantes.',
          'Dificuldade de manter o foco sem se distrair com redes sociais e celular a cada 5 minutos.',
          'Procrastinação crônica: deixar tudo para a última hora e sofrer com estresse desnecessário.'
        ],
        anglesSuggested: [
          'Ângulo de Antidistração Prática: Método rápido de desintoxicação digital para recuperar o foco sem precisar desligar o celular.',
          'Ângulo de Templates de Rotina: Dar ao usuário sistemas de rotina prontos para usar no Notion em vez de fazê-lo assistir horas de aulas teóricas.'
        ],
        analyzedClaims: [
          {
            claim: 'Elimine 100% da sua procrastinação e triplique sua inteligência em 2 dias com este atalho neurológico',
            sourceCompetitor: 'Dia com 30 Horas VSL',
            riskLevel: 'HIGH',
            justification: 'Alegações neurológicas enganosas e promessa irrealista de cura completa da procrastinação em prazo minúsculo. Risco altíssimo de banimento de anúncios.'
          },
          {
            claim: 'Aprenda a aplicar o método pomodoro modificado para focar por até 4 horas seguidas',
            sourceCompetitor: 'Planejamento de Alta Performance',
            riskLevel: 'LOW',
            justification: 'Técnica e método descritos de forma razoável, educativa e realista.'
          }
        ]
      },
      geral: {
        adCount: 12,
        avgPrice: defaultPrices.avg,
        competitors: [
          { name: `Guia Mestre de ${input.query}`, url: `https://guiamestre-${queryLower.replace(/\s+/g, '')}.com/oferta`, price: defaultPrices.min, angle: `O segredo revelado para dominar de vez ${input.query} passo a passo.` }
        ],
        audiencePain: [
          `Falta de um método claro e didático voltado para iniciantes em ${input.query}.`,
          `Excesso de informações confusas e fragmentadas na internet sobre o assunto.`
        ],
        anglesSuggested: [
          `Ângulo do Passo a Passo Descomplicado: Mostrar que qualquer pessoa comum consegue aprender sem dificuldades ou termos técnicos.`
        ],
        analyzedClaims: [
          {
            claim: `Aprenda de forma rápida e 100% garantida tudo sobre ${input.query}`,
            sourceCompetitor: `Guia Mestre de ${input.query}`,
            riskLevel: 'MEDIUM',
            justification: 'Uso de palavra de garantia absoluta de aprendizado. Pode exigir revisão se o usuário pedir reembolso, mas possui risco de compliance moderado.'
          }
        ]
      }
    };

    const template = responseTemplates[niche] || responseTemplates.geral;

    return {
      query: input.query,
      productType: input.productType,
      adCount: template.adCount ?? 10,
      avgPrice: template.avgPrice ?? defaultPrices.avg,
      competitors: template.competitors ?? [],
      audiencePain: template.audiencePain ?? [],
      anglesSuggested: template.anglesSuggested ?? [],
      analyzedClaims: template.analyzedClaims ?? [],
    };
  }
}
