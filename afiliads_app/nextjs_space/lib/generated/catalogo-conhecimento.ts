// GERADO por scripts/build-subsidios.ts a partir de subsidios/catalogo/*.yaml.
// Não edite à mão: edite glossario.yaml / manual.yaml / ajuda-campos.yaml e rode `yarn subsidios:build`.

export interface TermoGlossario {
  termo: string;
  sigla: string | null;
  categoria: 'google-ads' | 'afiliados';
  definicao: string;
  por_que_importa: string;
}

export interface SecaoManual { titulo: string; conteudo: string }

export interface AjudaCampo {
  campo: string;
  agente: string;
  o_que: string;
  por_que: string;
  como: string;
  ajuda_api_key?: string;
}

export const GLOSSARIO: TermoGlossario[] = [
  {
    "termo": "Custo por Clique",
    "sigla": "CPC",
    "categoria": "google-ads",
    "definicao": "Quanto você paga cada vez que alguém clica no seu anúncio.",
    "por_que_importa": "É a variável que você controla no leilão. Se o CPC real passar do CPC máximo viável (break-even), a campanha perde dinheiro por definição."
  },
  {
    "termo": "Custo por Aquisição",
    "sigla": "CPA",
    "categoria": "google-ads",
    "definicao": "Quanto custa, em mídia, gerar uma conversão (venda/lead).",
    "por_que_importa": "A regra do 3× compara a comissão com o CPA: a comissão precisa pagar ao menos 3× o CPA estimado para o teste valer a pena."
  },
  {
    "termo": "Custo por Mil Impressões",
    "sigla": "CPM",
    "categoria": "google-ads",
    "definicao": "Custo para exibir o anúncio 1.000 vezes (comum em Display/YouTube).",
    "por_que_importa": "Em campanhas de topo de funil você compra atenção, não clique — o CPM diz se essa atenção está cara."
  },
  {
    "termo": "Taxa de Cliques",
    "sigla": "CTR",
    "categoria": "google-ads",
    "definicao": "Cliques ÷ impressões. Mede o quanto o anúncio atrai quem o vê.",
    "por_que_importa": "CTR baixo derruba o Quality Score e encarece o CPC. CTR de Search saudável em afiliados: 4–8%+."
  },
  {
    "termo": "Taxa de Conversão",
    "sigla": "CVR",
    "categoria": "google-ads",
    "definicao": "Conversões ÷ cliques. No contexto de afiliado: vendas ÷ cliques no hoplink.",
    "por_que_importa": "É o multiplicador da economia inteira: CVR 1% significa que cada venda precisa pagar 100 cliques."
  },
  {
    "termo": "Retorno sobre Investimento em Anúncios",
    "sigla": "ROAS",
    "categoria": "google-ads",
    "definicao": "Receita ÷ gasto em anúncios. ROAS 2.0 = cada R$1 vira R$2.",
    "por_que_importa": "Meta prática de afiliado: ROAS ≥ 2 no scale (o break-even é ROAS 1)."
  },
  {
    "termo": "Anúncio Responsivo de Pesquisa",
    "sigla": "RSA",
    "categoria": "google-ads",
    "definicao": "Formato do Google Search: até 15 títulos (30 caracteres) e 4 descrições (90), combinados automaticamente.",
    "por_que_importa": "É o formato que o Gerador RSA do app produz. Título espelhando a keyword aumenta relevância e reduz CPC."
  },
  {
    "termo": "Performance Max",
    "sigla": "PMax",
    "categoria": "google-ads",
    "definicao": "Tipo de campanha automatizada que roda em todas as redes do Google ao mesmo tempo.",
    "por_que_importa": "Só faz sentido com conversão confiável configurada — PMax no dia 1 sem histórico queima orçamento (erro comum nº 5)."
  },
  {
    "termo": "Demand Gen",
    "sigla": null,
    "categoria": "google-ads",
    "definicao": "Campanha de geração de demanda (YouTube, Discover, Gmail) com criativos visuais.",
    "por_que_importa": "Canal para verticais em que Search é caro ou proibido pelo produtor (ex.: LymphFlow só permite Display/YouTube)."
  },
  {
    "termo": "Índice de Qualidade",
    "sigla": "QS",
    "categoria": "google-ads",
    "definicao": "Nota 1–10 do Google por keyword: CTR esperado, relevância do anúncio e experiência da landing page.",
    "por_que_importa": "QS alto = pagar menos pelo mesmo lugar. Presell lenta ou irrelevante derruba o QS e o lucro junto."
  },
  {
    "termo": "Ad Rank",
    "sigla": null,
    "categoria": "google-ads",
    "definicao": "Posição no leilão = lance × Quality Score (+ extensões).",
    "por_que_importa": "Explica por que nem sempre quem paga mais aparece primeiro — melhorar QS é mais barato que subir lance."
  },
  {
    "termo": "Correspondência Exata",
    "sigla": "exact",
    "categoria": "google-ads",
    "definicao": "Keyword entre [colchetes]: anúncio aparece só para buscas com o mesmo significado.",
    "por_que_importa": "Máximo controle e menor volume. Use nas keywords de fundo de funil que já provaram converter."
  },
  {
    "termo": "Correspondência de Frase",
    "sigla": "phrase",
    "categoria": "google-ads",
    "definicao": "Keyword entre \"aspas\": a busca precisa conter o sentido da frase.",
    "por_que_importa": "Equilíbrio padrão para teste — controla o tema sem estrangular o volume."
  },
  {
    "termo": "Correspondência Ampla",
    "sigla": "broad",
    "categoria": "google-ads",
    "definicao": "Sem pontuação: o Google expande para tudo que considerar relacionado.",
    "por_que_importa": "Em teste de afiliado com verba curta, broad gasta rápido em busca irrelevante. Só com Smart Bidding maduro."
  },
  {
    "termo": "Palavras-chave Negativas",
    "sigla": null,
    "categoria": "google-ads",
    "definicao": "Termos para os quais o anúncio NUNCA deve aparecer (ex.: \"grátis\", \"download\").",
    "por_que_importa": "Cada clique de curioso custa o mesmo que um clique de comprador. Negativas preventivas protegem o orçamento de teste."
  },
  {
    "termo": "Termos de Pesquisa",
    "sigla": null,
    "categoria": "google-ads",
    "definicao": "Relatório do que as pessoas REALMENTE digitaram antes de clicar.",
    "por_que_importa": "É a mina de ouro da otimização: termos que convertem viram keywords exatas; lixo vira negativa."
  },
  {
    "termo": "Parcela de Impressões",
    "sigla": "IS",
    "categoria": "google-ads",
    "definicao": "Percentual dos leilões elegíveis em que seu anúncio de fato apareceu.",
    "por_que_importa": "IS baixo por orçamento = campanha estrangulada; IS baixo por rank = problema de QS/lance."
  },
  {
    "termo": "Recursos/Extensões de Anúncio",
    "sigla": "assets",
    "categoria": "google-ads",
    "definicao": "Sitelinks, frases de destaque, snippets — informações extras no anúncio.",
    "por_que_importa": "Aumentam CTR e Ad Rank de graça. Anúncio de afiliado sem extensões compete em desvantagem."
  },
  {
    "termo": "Lance Inteligente",
    "sigla": "Smart Bidding",
    "categoria": "google-ads",
    "definicao": "Estratégias automáticas de lance (Maximizar conversões, tCPA, tROAS).",
    "por_que_importa": "Precisa de dados de conversão para funcionar. Em teste frio, CPC manual limitado dá mais controle."
  },
  {
    "termo": "Tag de Conversão",
    "sigla": null,
    "categoria": "google-ads",
    "definicao": "Código que informa ao Google quando uma venda/lead aconteceu.",
    "por_que_importa": "Sem conversão rastreada não há otimização automática possível — e em afiliado exige postback da rede (S2S)."
  },
  {
    "termo": "Centro de Transparência de Anúncios",
    "sigla": null,
    "categoria": "google-ads",
    "definicao": "Ferramenta pública do Google que mostra os anúncios ativos de qualquer anunciante.",
    "por_que_importa": "Espionagem legítima: veja quantos afiliados anunciam o produto e que ângulos usam antes de entrar."
  },
  {
    "termo": "Política de Saúde Personalizada",
    "sigla": null,
    "categoria": "google-ads",
    "definicao": "Restrição do Google a anúncios que assumem condições de saúde do usuário.",
    "por_que_importa": "Vertical nutra vive no limite dela. Copy \"seu linfedema\" = reprovação; \"drenagem linfática\" genérico = ok."
  },
  {
    "termo": "Ganho por Clique",
    "sigla": "EPC",
    "categoria": "afiliados",
    "definicao": "Receita de comissão ÷ cliques enviados. O marketplace mostra o EPC médio da oferta.",
    "por_que_importa": "Se o seu CPC pago > EPC da oferta, a conta não fecha. EPC do marketplace ≠ seu EPC (erro comum nº 4)."
  },
  {
    "termo": "Gravity",
    "sigla": null,
    "categoria": "afiliados",
    "definicao": "Métrica do ClickBank: quantos afiliados distintos fizeram venda nas últimas 12 semanas (ponderado).",
    "por_que_importa": "Sweet spot 20–150: prova de que vende sem estar saturado. Gravity 300 = guerra de lances."
  },
  {
    "termo": "HopLink",
    "sigla": null,
    "categoria": "afiliados",
    "definicao": "Seu link de afiliado ClickBank (rastreia o clique até a venda).",
    "por_que_importa": "É como a comissão chega em você. Sempre teste o hoplink antes de rodar tráfego."
  },
  {
    "termo": "Presell / Página Ponte",
    "sigla": "bridge",
    "categoria": "afiliados",
    "definicao": "Página SUA entre o anúncio e a página de vendas do produtor (review, advertorial, quiz).",
    "por_que_importa": "Obrigatória na prática: aquece o clique, filtra curiosos e protege sua conta Google das claims do produtor."
  },
  {
    "termo": "Carta de Vendas em Vídeo",
    "sigla": "VSL",
    "categoria": "afiliados",
    "definicao": "Página de vendas do produtor em formato de vídeo longo.",
    "por_que_importa": "VSLs convertem bem em tráfego frio mas demoram — o visitante precisa chegar pré-vendido da sua presell."
  },
  {
    "termo": "Landing de Dois Passos",
    "sigla": "TSL",
    "categoria": "afiliados",
    "definicao": "Funil do produtor em duas etapas (ex.: texto → checkout). Alguns produtores exigem passar por ela.",
    "por_que_importa": "Pular etapas do funil oficial (direct linking ao carrinho) é proibido por muitos produtores — LymphFlow bane por isso."
  },
  {
    "termo": "Rebill / Recorrência",
    "sigla": null,
    "categoria": "afiliados",
    "definicao": "Comissão que se repete enquanto o cliente pagar (assinaturas).",
    "por_que_importa": "Rebill muda a matemática: um CPA que parece caro no mês 1 vira lucro no mês 3."
  },
  {
    "termo": "Ticket Médio",
    "sigla": "AOV",
    "categoria": "afiliados",
    "definicao": "Valor médio do pedido, incluindo upsells (Average Order Value).",
    "por_que_importa": "Oferta com upsells fortes paga comissão média maior que o preço do front-end sugere."
  },
  {
    "termo": "Taxa de Reembolso",
    "sigla": "refund %",
    "categoria": "afiliados",
    "definicao": "Percentual de vendas devolvidas (ClickBank permite reembolso em até 60 dias).",
    "por_que_importa": "Comissão líquida = comissão × (1 − refund%). Escalar no lucro do dia 1 ignorando refund é o erro comum nº 3."
  },
  {
    "termo": "Estorno de Comissão",
    "sigla": "clawback",
    "categoria": "afiliados",
    "definicao": "Comissão já paga que a rede retira depois (refund/chargeback).",
    "por_que_importa": "Mantenha reserva de caixa — o dinheiro do painel não é seu até passar a janela de reembolso."
  },
  {
    "termo": "Whitelist de Afiliado",
    "sigla": null,
    "categoria": "afiliados",
    "definicao": "Aprovação prévia do produtor para você promover a oferta (via gerente de afiliados).",
    "por_que_importa": "Ofertas boas exigem whitelist — rodar sem aprovação = comissão estornada e ban. Contato fica na página de afiliado."
  },
  {
    "termo": "Bid em Marca",
    "sigla": "brand bidding",
    "categoria": "afiliados",
    "definicao": "Anunciar usando o nome do produto/marca como keyword ou no texto do anúncio.",
    "por_que_importa": "A maioria dos produtores PROÍBE. Violar = ban imediato. Sempre conferir na página de afiliado antes."
  },
  {
    "termo": "Link Direto",
    "sigla": "direct linking",
    "categoria": "afiliados",
    "definicao": "Mandar o clique do anúncio direto para a página do produtor, sem presell.",
    "por_que_importa": "Quase sempre proibido pelo produtor e arriscado no Google (destino que você não controla pode derrubar SUA conta)."
  },
  {
    "termo": "Cloaking",
    "sigla": null,
    "categoria": "afiliados",
    "definicao": "Mostrar ao Google uma página diferente da que o usuário vê.",
    "por_que_importa": "Fraude na política do Google: suspensão permanente da conta. Nunca — não há campanha que justifique."
  },
  {
    "termo": "Página de Ferramentas do Afiliado",
    "sigla": "aff page",
    "categoria": "afiliados",
    "definicao": "Página do produtor com recursos para afiliados: comissões reais, CPA bônus, swipes, criativos, regras e contato ({domínio}/aff, /affiliates, /jv).",
    "por_que_importa": "REGRA DA CASA: analisar antes de qualquer campanha — ela valida ou mata a estratégia (canais proibidos, restrições). O Affiliate Page Analyst faz isso no app."
  },
  {
    "termo": "Postback / S2S",
    "sigla": null,
    "categoria": "afiliados",
    "definicao": "Notificação servidor-a-servidor da rede para seu tracker/Google quando a venda acontece.",
    "por_que_importa": "Único jeito confiável de levar a conversão de afiliado para dentro do Google Ads. MaxWeb sem postback é o erro comum nº 2."
  },
  {
    "termo": "Rede CPA",
    "sigla": null,
    "categoria": "afiliados",
    "definicao": "Rede que paga por ação fixa (venda/lead) em vez de percentual — ex.: MaxWeb, BuyGoods.",
    "por_que_importa": "CPA fixo simplifica o break-even: você sabe exatamente quanto vale cada conversão."
  },
  {
    "termo": "Bônus CPA do Produtor",
    "sigla": null,
    "categoria": "afiliados",
    "definicao": "Pagamento fixo extra por venda que produtores oferecem a top afiliados (ex.: LymphFlow: $180/venda após 50 vendas).",
    "por_que_importa": "Muda a economia da oferta — a comissão real pode ser bem maior que a do marketplace. Está na página de afiliado."
  },
  {
    "termo": "CPC de Break-even",
    "sigla": null,
    "categoria": "afiliados",
    "definicao": "CPC máximo que empata: comissão líquida × CVR esperada.",
    "por_que_importa": "É o teto de lance de toda campanha. CPC SCALE ≈ break-even ÷ 1,3 dá a margem de lucro."
  },
  {
    "termo": "Regra do 3×",
    "sigla": null,
    "categoria": "afiliados",
    "definicao": "A comissão média deve pagar ao menos 3× o CPA estimado do teste.",
    "por_que_importa": "Filtro de entrada do Product Hunter: sem 3× de folga, variância normal de campanha come o lucro."
  },
  {
    "termo": "Camadas de Keywords A/B/C/D",
    "sigla": null,
    "categoria": "afiliados",
    "definicao": "Organização do app: A=fundo de funil/comercial, B=comparação/review, C=problema/dor, D=informacional.",
    "por_que_importa": "Cada camada tem CPC, CVR e papel diferentes. Teste começa em A/B; C alimenta presell; D quase nunca em Search pago."
  },
  {
    "termo": "Vertical",
    "sigla": null,
    "categoria": "afiliados",
    "definicao": "Nicho de mercado da oferta: nutra/saúde, MMO (make money online), sobrevivência, beleza…",
    "por_que_importa": "Define CPC médio, regras de compliance e sazonalidade — a estratégia inteira muda por vertical."
  },
  {
    "termo": "Funil",
    "sigla": null,
    "categoria": "afiliados",
    "definicao": "Caminho do clique à venda: Bridge (anúncio→presell→oferta), Direct, Search-intent, YouTube.",
    "por_que_importa": "O naming das campanhas do app codifica o funil (CB_VERT_GEO_CANAL_FUNIL_v1) para o diário e a auditoria compararem iguais com iguais."
  },
  {
    "termo": "Kill / Scale",
    "sigla": null,
    "categoria": "afiliados",
    "definicao": "Decisão binária pós-teste: matar a campanha ou escalar orçamento.",
    "por_que_importa": "Critério objetivo ANTES do teste (ex.: 2× o gasto da comissão em 72h) evita torrar verba em esperança. O Paid Ads Auditor decide isso."
  },
  {
    "termo": "Swipe",
    "sigla": null,
    "categoria": "afiliados",
    "definicao": "Modelo pronto de email/copy fornecido pelo produtor na página de afiliado.",
    "por_que_importa": "Material validado pelo próprio produtor — base legítima para seus criativos (adaptando, nunca copiando claims proibidas)."
  },
  {
    "termo": "Temperatura da Oferta",
    "sigla": null,
    "categoria": "afiliados",
    "definicao": "Momento da oferta no mercado: subindo (gravity crescendo), estável, saturando ou morrendo.",
    "por_que_importa": "Entrar em oferta morrendo é pagar CPC de leilão cheio por conversão em queda. O Caçador de Produtos avalia isso."
  }
];

export const MANUAL: SecaoManual[] = [
  {
    "titulo": "O que é o AfiliAds",
    "conteudo": "O AfiliAds é a central de operação de marketing de afiliados: encontrar produtos (ClickBank, BuyGoods, MaxWeb, Hotmart), validar a economia e o compliance de cada oferta, pesquisar keywords, montar campanhas de Google Ads, acompanhar resultados diários e decidir kill/scale — com 9 agentes de IA fazendo o trabalho pesado e registrando cada token gasto.\n\nO princípio da casa: nenhuma campanha nasce sem passar pelos gates — produto com score aprovado, página de afiliado do produtor analisada, keyword validada pela economia (regra do 3×) e presell auditada."
  },
  {
    "titulo": "O fluxo completo (do produto ao lucro)",
    "conteudo": "1. BUSCA DE PRODUTOS — digite um produto (ou escolha do top 10) e o pipeline de 3 agentes roda: Product Hunter pontua a oferta (0–100), SEO Architect gera o mapa de keywords em camadas A–D, Compliance Sentinel define presell, funil, naming e break-even. Score < 50 = descarta.\n\n2. PÁGINA DE AFILIADO — na aba \"Pág. Afiliado\" do dossiê, informe a URL do produtor (/aff, /affiliates, /jv) e rode o Affiliate Page Analyst. Ele extrai comissão real, CPA bônus, canais PROIBIDOS e restrições. Google Search proibido? A estratégia muda aqui, antes de gastar 1 real.\n\n3. PESQUISA ATP — busque a keyword seed no AnswerThePublic (1 crédito, sempre com sua aprovação). O ATP Keyword Analyst cruza volume/CPC/intenção com a economia da campanha e recomenda a melhor keyword. Importe as aprovadas para a biblioteca.\n\n4. NOVA CAMPANHA (Wizard) — monte a campanha passo a passo com validação do Wizard Validator: naming padrão, break-even calculado, checklist de lançamento.\n\n5. GERADOR RSA — o CRO Copywriter gera títulos (≤30 chars) e descrições prontos para colar no Google Ads.\n\n6. DIÁRIO — registre gasto/cliques/conversões por dia. É o combustível da auditoria.\n\n7. AUDITORIA — o Paid Ads Auditor analisa tudo e devolve a decisão: SCALE, OTIMIZAR, PAUSAR ou KILL, com justificativa. Registre a decisão e o aprendizado."
  },
  {
    "titulo": "As telas, uma a uma",
    "conteudo": "• Dashboard — visão geral: gasto, receita, ROI e campanhas ativas.\n• Nova Campanha (Wizard) — criação guiada em etapas com checklist.\n• Agentes — sala de controle: o que cada agente faz, teste individual com tarefa real e consumo de tokens de cada um.\n• Busca de Produtos — pipeline de análise multi-agente + dossiê completo por produto (keywords, estratégia, compliance, página de afiliado) + chat contextual.\n• Campanhas — lista e detalhe de cada campanha: economia, checklist, decisões, análise de presell e auditoria.\n• Diário — lançamentos diários por campanha (gasto, cliques, hops, conversões).\n• Keywords — biblioteca de keywords por camada com match type e CPC estimado.\n• Pesquisa ATP — AnswerThePublic integrado: saldo de créditos, busca com aprovação, report por buckets e análise econômica.\n• Gerador RSA — copy de anúncios com contagem de caracteres garantida.\n• Planilhas — visão tabular de tudo (ofertas com link de marketplace, campanhas, diário, testes kill/scale, financeiro).\n• Conhecimento — esta base: estratégias, playbooks, glossário, aprendizados e este manual.\n• Configurações — chaves de API (provedores de IA, AnswerThePublic, redes de afiliados)."
  },
  {
    "titulo": "Regras de governança (não negociáveis)",
    "conteudo": "• Créditos AnswerThePublic: toda busca paga exige SUA aprovação explícita no dialog (o servidor rejeita chamadas sem confirmação). Releituras de reports são grátis e ilimitadas. Mesma keyword+idioma+região em 24h = reuso grátis.\n\n• Página de afiliado do produtor: analisar SEMPRE antes de validar campanha. Canal proibido pelo produtor (ex.: Google Search no LymphFlow) = mudar canal ou mudar de produto.\n\n• Compliance Google: sem claims de cura/renda garantida, sem brand bidding quando proibido, sem direct linking, sem cloaking (nunca). A conta do Google Ads é o ativo mais difícil de recuperar.\n\n• Economia antes de criativo: CPC máximo = comissão líquida × CVR. Se a keyword não cabe no teto, nenhuma copy salva a campanha.\n\n• Tokens de IA: cada execução de agente é registrada (agente, provedor, modelo, tokens, duração) — acompanhe na página Agentes. O roteador usa modelos leves para tarefas simples e reserva os premium para compliance e auditoria."
  },
  {
    "titulo": "Provedores de IA e roteamento",
    "conteudo": "O app aceita 4 provedores (Anthropic/Claude, OpenAI/GPT, Google/Gemini, Abacus.ai) com chaves em Configurações.\n\nO roteador automático classifica cada agente por peso da tarefa:\n• PREMIUM (Compliance Sentinel, Paid Ads Auditor, Affiliate Page Analyst) — prioriza Claude: análise de regras e restrições exige a leitura mais fiel.\n• STANDARD (Product Hunter, SEO Architect, ATP Analyst, CRO Copywriter) — usa Gemini/GPT primeiro, poupando tokens Claude.\n• LIGHT (Assistente de Análise, Wizard Validator) — modelos rápidos e baratos.\n\nSe um provedor falhar ou estourar o orçamento mensal de tokens, o próximo da cadeia assume automaticamente. Cada execução registra qual modelo respondeu de fato."
  },
  {
    "titulo": "O loop de auto-correção",
    "conteudo": "Cada campanha pode ligar o loop (Wizard ou detalhe da campanha): escolha os agentes (auditor de ads, compliance) e o intervalo (12h/24h/48h/72h).\n\nCOMO RODA\n• Scheduler interno verifica a cada 30 min quais campanhas venceram o intervalo.\n• Registrar o Diário dispara o loop na hora (dado novo = reavaliação imediata).\n• Botão \"Executar Agora\" na campanha e alertas do Dashboard rodam sob demanda.\n\nO QUE O LOOP FAZ (nesta ordem)\n1. Calcula a economia real EM CÓDIGO (zero tokens): gasto, receita, EPC/CPC/CVR reais, burn do budget.\n2. Aplica as REGRAS OFICIAIS:\n   — KILL: gasto ≥ 2× comissão líquida sem conversão, ou CPC acima do máximo por 3+ dias;\n   — PAUSAR: budget de teste 100% consumido;\n   — SCALE: EPC real ≥ 1.3× CPC real com ≥ 2 conversões (só SUGERE — escalar dinheiro exige sua aprovação);\n   — OTIMIZAR: paga a conta mas sem margem, ou compliance com alerta crítico;\n   — SEM_DADOS / CONFIG_INCOMPLETA: não gasta token de IA e aponta o que falta.\n3. Só então chama os agentes de IA com os números já calculados: o auditor diagnostica e propõe ajustes; o compliance lê a presell REAL (baixa a página).\n4. Persiste tudo: decisão com justificativa no histórico da campanha, status atualizado (KILL/PAUSAR automáticos) e registro do LoopRun com tokens gastos.\n\nAUTO-CORREÇÃO DE AGENTES\n• Saída inválida (ex.: título RSA com 31+ caracteres) é rejeitada e retentada 1× com o erro anexado ao prompt.\n• Provedor com falha/sem crédito cai para o próximo da cadeia automaticamente.\n• Falhas recorrentes aparecem no card \"Problemas detectados\" da página Agentes com a causa."
  },
  {
    "titulo": "De onde vêm os aprendizados",
    "conteudo": "A aba Aprendizados agrega automaticamente o que a operação já descobriu:\n• Testes Kill/Scale — hipótese, resultado e lição de cada teste registrado.\n• Decisões de campanha — cada SCALE/KILL com a justificativa do momento.\n• Notas do diário — observações registradas nos lançamentos diários.\n• Dossiês de produtos — resumo, dicas e restrições extraídas das páginas de afiliado.\n\nQuanto mais você registra no Diário e nos Testes, mais essa aba vira a memória institucional da operação — o que funcionou, o que não funcionou e por quê."
  }
];

export const AJUDA_CAMPOS: Record<string, AjudaCampo> = {
  "name": {
    "campo": "name",
    "agente": "Paid Ads Strategist",
    "o_que": "Nome de controle interno da campanha no painel AfiliAds.",
    "por_que": "Ajuda a rastrear e encontrar suas campanhas de forma organizada no seu dashboard.",
    "como": "1. Digite um nome contendo Rede, Vertical, Geo, Canal e Funil (ex: \"CB_WL_US_SEARCH_BRIDGE_v1\").\n2. Alinhe o nome interno com a UTM de campanha para facilitar a leitura no Analytics.\n3. Salve a campanha e mantenha o mesmo padrão no Google Ads."
  },
  "platform": {
    "campo": "platform",
    "agente": "Affiliate Network Specialist",
    "o_que": "A rede de afiliados que hospeda a oferta escolhida.",
    "por_que": "Diferentes plataformas possuem diferentes termos, moedas de pagamento e dinâmicas de rastreamento (postbacks/webhooks).",
    "como": "1. Selecione a plataforma onde a oferta está hospedada.\n2. Verifique os termos de pagamento e se as comissões são em dólar (USD).\n3. Confira se a plataforma requer aprovação prévia para promover a oferta."
  },
  "vertical": {
    "campo": "vertical",
    "agente": "Niche Intelligence Agent",
    "o_que": "O nicho/categoria ao qual o produto pertence (ex: Emagrecimento, Finanças, Cursos).",
    "por_que": "Ajuda a carregar as sugestões de palavras-chave, estimativas de taxa de conversão (CVR) e listas padrão de negativas recomendadas.",
    "como": "1. Escolha a vertical correspondente ao nicho do produto.\n2. Note que a vertical define as sugestões de CVR e a lista-mestra de negativas.\n3. Se o produto pertencer a sub-nichos específicos, ajuste as palavras-chave manualmente."
  },
  "geo": {
    "campo": "geo",
    "agente": "Paid Ads Strategist",
    "o_que": "O país ou região geográfica onde os anúncios serão exibidos.",
    "por_que": "Os custos de clique (CPC) e conversão variam radicalmente por localização (Tier 1 vs Tier 3). Além disso, ofertas possuem restrições geográficas de entrega.",
    "como": "1. Verifique nos termos da oferta quais países (GEOS) são permitidos.\n2. Escolha o país onde seus anúncios serão veiculados.\n3. Certifique-se de configurar a segmentação de local como \"presença apenas\" no Google Ads."
  },
  "channel": {
    "campo": "channel",
    "agente": "Traffic Acquisition Strategist",
    "o_que": "A rede de anúncios específica do Google Ads (Pesquisa, Vídeo/YouTube, Demand Gen, Performance Max).",
    "por_que": "Cada canal requer criativos e landing pages adaptados. Iniciantes devem focar em Pesquisa (SEARCH) para tráfego com alta intenção.",
    "como": "1. Selecione o canal de tráfego do Google Ads (ex: SEARCH, YOUTUBE).\n2. Use SEARCH para iniciar com tráfego qualificado de intenção.\n3. Use YOUTUBE ou DEMAND GEN para escalar volume com anúncios gráficos e vídeo."
  },
  "funnel": {
    "campo": "funnel",
    "agente": "CRO & Conversion Specialist",
    "o_que": "O tipo de página de destino que o usuário visitará após clicar no anúncio (Bridge Page, Review Page, Link Direto).",
    "por_que": "O Google Ads reprova links de afiliado direto na maioria das vezes. Bridge pages (artigo review ou pré-sell) são o padrão recomendado para evitar suspensões.",
    "como": "1. Defina o tipo de destino: BRIDGE, DIRECT, REVIEW ou SMARTLINK.\n2. Use BRIDGE (página ponte) para produtos físicos e verticais sensíveis para evitar reprovações.\n3. O link direto (DIRECT) é aceito em poucas ofertas e pode resultar em suspensão."
  },
  "pageType": {
    "campo": "pageType",
    "agente": "Compliance Sentinel",
    "o_que": "A estrutura da presell gerada: advertorial, pogo, vsl, interstitial, authority, tsl, cookie_popup, review.",
    "por_que": "Cada canal aceita estruturas diferentes — interstitial só é seguro em YouTube/Demand Gen, nunca em Search, onde reprova revisão por falta de conteúdo editorial. Authority costuma converter melhor em nutra/saúde/beleza por reforçar credibilidade. Cookie/Popup e TSL são eficazes para fundo de funil.",
    "como": "1. Para Search, prefira Cookie/Popup, TSL ou Review para produtos com marca já estabelecida. Para produtos novos, use advertorial ou authority.\n2. VSL exige um vídeo real do vendor. TSL exige texto longo persuasivo. Review exige conteúdo de análise detalhada.\n3. Interstitial só em canais fora de Search/PMax — o Compliance Sentinel bloqueia a geração se o canal não permitir. Cookie/Popup é recomendado para iniciantes no fundo de funil, pois maximiza o rastreamento do clique."
  },
  "popupGate": {
    "campo": "popupGate",
    "agente": "CRO & Conversion Specialist",
    "o_que": "Pop-up de retenção \"pressione e segure\" opcional antes de revelar o conteúdo da presell.",
    "por_que": "Adiciona um passo de interação real (mesma experiência pra todo visitante, não é cloaking) que pode aumentar percepção de valor antes do CTA — mas também pode reduzir conversão se usado sem necessidade.",
    "como": "1. Ative só se fizer sentido pro ângulo/oferta (ex.: conteúdo \"exclusivo\").\n2. Teste com e sem pra ver o efeito real na sua vertical.\n3. Nunca combine com dark patterns — é só um delay de interação, não uma barreira enganosa."
  },
  "videoUrl": {
    "campo": "videoUrl",
    "agente": "Presell Builder",
    "o_que": "Link do vídeo (YouTube, Vimeo ou .mp4 direto) usado como VSL na presell.",
    "por_que": "pageType \"vsl\" exige um vídeo real — sem isso a geração falha.",
    "como": "1. Cole a URL pública do vídeo (YouTube/Vimeo/.mp4).\n2. Use um vídeo do próprio vendor ou um review em vídeo genuíno.\n3. Confirme que o vídeo carrega antes de publicar a campanha."
  },
  "commission": {
    "campo": "commission",
    "agente": "Affiliate Finance Broker",
    "o_que": "O valor estimado pago pela rede de afiliados por cada conversão (venda/lead).",
    "por_que": "Esse valor é a base para o cálculo da comissão líquida, EPC de break-even e definição do seu lance máximo de CPC.",
    "como": "1. Insira o valor médio pago pela plataforma por conversão.\n2. Consulte a aba Marketplace da rede para obter o valor médio histórico.\n3. Utilize essa métrica para guiar seus cálculos de break-even."
  },
  "refundPct": {
    "campo": "refundPct",
    "agente": "Risk Assessment Agent",
    "o_que": "A taxa média de reembolsos (refund) ou cancelamentos históricos da oferta.",
    "por_que": "O ClickBank e redes semelhantes possuem taxas de reembolso de 5% a 15% em produtos físicos. Ignorar isso distorce a margem de lucro real.",
    "como": "1. Estime a taxa de reembolso com base no produto (geralmente 5% a 15%).\n2. Para produtos físicos nos EUA, considere usar 10% como padrão conservador.\n3. Esse valor deduzirá a comissão bruta para calcular seu lucro líquido real."
  },
  "aov": {
    "campo": "aov",
    "agente": "Affiliate Finance Broker",
    "o_que": "Valor Médio do Pedido (Average Order Value) que o cliente gasta, incluindo upsells.",
    "por_que": "Ofertas com forte funil de upsell geram comissões adicionais elevadas por clique.",
    "como": "1. Insira o valor médio do carrinho de compras da oferta.\n2. Considere os upsells recorrentes oferecidos pelo produtor no funil.\n3. Um AOV alto indica maior tolerância a CPCs mais caros durante a escala."
  },
  "offerUrl": {
    "campo": "offerUrl",
    "agente": "Tracking & Analytics Engineer",
    "o_que": "O seu link de afiliado oficial (HopLink ou Smartlink) gerado na plataforma.",
    "por_que": "Esse link direciona o comprador para a página oficial do produto, garantindo que a sua comissão seja rastreada.",
    "como": "1. Acesse a rede de afiliados (ex: ClickBank), clique em \"Promover\" (Promote) e insira seu nickname para gerar o HopLink.\n2. Copie o link e certifique-se de adicionar os parâmetros de tracking necessários (como subid/clickid).\n3. Use este link no botão de chamada para ação (CTA) da sua pré-sell/bridge page.",
    "ajuda_api_key": "Acesse o Marketplace do ClickBank, clique em \"Promote\" no produto escolhido e copie o link. Para MaxWeb, acesse a oferta aprovada e copie o link."
  },
  "cvrExpected": {
    "campo": "cvrExpected",
    "agente": "CRO & Conversion Specialist",
    "o_que": "A taxa de conversão estimada da pré-sell para a venda (conversão por cliques).",
    "por_que": "Utilizada para calcular o EPC de break-even. Superestimar a CVR fará você pagar CPCs mais caros do que deveria.",
    "como": "1. Insira a taxa de conversão (cliques para vendas) esperada.\n2. Use de 1% a 2% como padrão conservador para tráfego frio em Search/YouTube.\n3. Não infle a CVR ou seus CPCs de break-even ficarão irrealisticamente altos."
  },
  "presellUrl": {
    "campo": "presellUrl",
    "agente": "Compliance Sentinel",
    "o_que": "A URL pública onde sua pré-sell ou bridge page está hospedada.",
    "por_que": "Usado para auditoria e teste de carregamento rápido. O Google Ads exige que o domínio do anúncio corresponda ao destino.",
    "como": "1. Digite a URL final onde sua pré-sell ou bridge page foi publicada.\n2. O domínio deve ser idêntico ao que será usado na URL final dos anúncios do Google.\n3. Certifique-se de que a página carregue em menos de 3 segundos no mobile."
  },
  "flowpageUrl": {
    "campo": "flowpageUrl",
    "agente": "CRO & Conversion Specialist",
    "o_que": "Link alternativo da sua FlowPage de tráfego rápido.",
    "por_que": "Útil para testes imediatos sem domínio próprio.",
    "como": "1. Crie ou configure sua página rápida no Flowpage.com.\n2. Insira os links de afiliado nos botões e publique a página.\n3. Cole o link final gerado neste campo para referência rápida."
  },
  "hostingerDomain": {
    "campo": "hostingerDomain",
    "agente": "Hosting & Domain Specialist",
    "o_que": "O domínio do site hospedado na Hostinger.",
    "por_que": "Domínio próprio dá autoridade e qualidade ao anúncio do Google Ads.",
    "como": "1. Acesse seu painel da Hostinger para gerenciar domínios.\n2. Certifique-se de que o certificado SSL esteja ativo e configurado.\n3. Cole o domínio principal que você usará para criar as páginas ponte."
  },
  "presellHtml": {
    "campo": "presellHtml",
    "agente": "Compliance & SEO Auditor",
    "o_que": "O código-fonte HTML completo da sua pré-sell.",
    "por_que": "O analisador de compliance do app lê esse HTML em milissegundos para identificar alegações proibidas antes de você subir no Google.",
    "como": "1. Desenvolva o HTML da sua pré-sell ou use o gerador de template.\n2. Cole o código HTML completo neste campo.\n3. Use o botão \"Analisar com IA\" para auditar possíveis alegações agressivas e claims de compliance."
  },
  "postbackUrl": {
    "campo": "postbackUrl",
    "agente": "Tracking & Analytics Engineer",
    "o_que": "O endpoint URL que notificará a rede MaxWeb ou outra de cada conversão.",
    "por_que": "O rastreamento via postback envia conversões diretas de volta do servidor da rede, essencial para que o Google Ads otimize os lances inteligentes.",
    "como": "1. Copie a URL de postback do seu rastreador de conversões.\n2. Configure a URL no painel da rede de afiliados (ex: MaxWeb).\n3. Teste o disparo gerando uma conversão manual de simulação.",
    "ajuda_api_key": "Acesse seu painel MaxWeb -> Pixels & Postbacks. Copie o postback para sua oferta e insira aqui. Para ClickBank, configure no menu Vendor Settings -> My Site."
  },
  "clickidToken": {
    "campo": "clickidToken",
    "agente": "Tracking & Analytics Engineer",
    "o_que": "O nome do parâmetro que armazena o identificador exclusivo do clique no link.",
    "por_que": "Permite bater a conversão de volta com o clique exato no Google Ads.",
    "como": "1. Escolha o token que a rede utiliza para registrar a identificação do clique.\n2. Use \"clickid\" no MaxWeb e \"subid\" no ClickBank.\n3. Garanta que o token esteja mapeado no link final do redirecionamento."
  },
  "budgetTest": {
    "campo": "budgetTest",
    "agente": "Paid Ads Finance Broker",
    "o_que": "O orçamento total alocado para testar e validar esta oferta.",
    "por_que": "Campanhas de afiliados devem ter limite de perda controlado. Recomendamos $50 a $80 para validação inicial de 48-72h.",
    "como": "1. Insira o orçamento de teste total alocado para esta oferta.\n2. Recomendamos usar o equivalente a pelo menos 1x a 2x o valor da comissão da oferta.\n3. Distribua o orçamento diário igualmente durante o período de testes de 72 horas."
  },
  "testDuration": {
    "campo": "testDuration",
    "agente": "Paid Ads Finance Broker",
    "o_que": "O tempo limite de duração do teste da campanha (ex: 48h, 72h).",
    "por_que": "Fase de validação inicial. Campanhas sem conversão nesse período devem ser desativadas.",
    "como": "1. Escolha o período que a campanha ficará ativa em fase de validação.\n2. Use 72 horas (3 dias) como padrão ideal para coletar cliques suficientes.\n3. Pause a campanha imediatamente se atingir o orçamento sem conversões."
  },
  "budgetScale": {
    "campo": "budgetScale",
    "agente": "Paid Ads Finance Broker",
    "o_que": "O orçamento diário real a aplicar no Google Ads quando a campanha for confirmada para SCALE (depois de validada no teste).",
    "por_que": "Separa a etapa de risco controlado (teste) da etapa de investimento sério — evita escalar orçamento por engano e dá ao agente um número pra planejar CPC de scale e cobertura de keywords.",
    "como": "1. Só defina depois (ou junto) de ver os resultados do teste.\n2. Regra prática: 3x a 5x o budget diário de teste, se o EPC/CPC estiver saudável.\n3. Ao clicar \"Scale\" na página da campanha, esse valor é aplicado automaticamente como orçamento diário real no Google Ads."
  }
};
