export interface GlossaryEntry {
  term: string;
  sigla?: string;
  categoria: 'google-ads' | 'afiliados';
  definition: string;
  whyItMatters: string;
}

export const GLOSSARY: GlossaryEntry[] = [
  // ===== Google Ads =====
  { term: 'Custo por Clique', sigla: 'CPC', categoria: 'google-ads', definition: 'Quanto você paga cada vez que alguém clica no seu anúncio.', whyItMatters: 'É a variável que você controla no leilão. Se o CPC real passar do CPC máximo viável (break-even), a campanha perde dinheiro por definição.' },
  { term: 'Custo por Aquisição', sigla: 'CPA', categoria: 'google-ads', definition: 'Quanto custa, em mídia, gerar uma conversão (venda/lead).', whyItMatters: 'A regra do 3× compara a comissão com o CPA: a comissão precisa pagar ao menos 3× o CPA estimado para o teste valer a pena.' },
  { term: 'Custo por Mil Impressões', sigla: 'CPM', categoria: 'google-ads', definition: 'Custo para exibir o anúncio 1.000 vezes (comum em Display/YouTube).', whyItMatters: 'Em campanhas de topo de funil você compra atenção, não clique — o CPM diz se essa atenção está cara.' },
  { term: 'Taxa de Cliques', sigla: 'CTR', categoria: 'google-ads', definition: 'Cliques ÷ impressões. Mede o quanto o anúncio atrai quem o vê.', whyItMatters: 'CTR baixo derruba o Quality Score e encarece o CPC. CTR de Search saudável em afiliados: 4–8%+.' },
  { term: 'Taxa de Conversão', sigla: 'CVR', categoria: 'google-ads', definition: 'Conversões ÷ cliques. No contexto de afiliado: vendas ÷ cliques no hoplink.', whyItMatters: 'É o multiplicador da economia inteira: CVR 1% significa que cada venda precisa pagar 100 cliques.' },
  { term: 'Retorno sobre Investimento em Anúncios', sigla: 'ROAS', categoria: 'google-ads', definition: 'Receita ÷ gasto em anúncios. ROAS 2.0 = cada R$1 vira R$2.', whyItMatters: 'Meta prática de afiliado: ROAS ≥ 2 no scale (o break-even é ROAS 1).' },
  { term: 'Anúncio Responsivo de Pesquisa', sigla: 'RSA', categoria: 'google-ads', definition: 'Formato do Google Search: até 15 títulos (30 caracteres) e 4 descrições (90), combinados automaticamente.', whyItMatters: 'É o formato que o Gerador RSA do app produz. Título espelhando a keyword aumenta relevância e reduz CPC.' },
  { term: 'Performance Max', sigla: 'PMax', categoria: 'google-ads', definition: 'Tipo de campanha automatizada que roda em todas as redes do Google ao mesmo tempo.', whyItMatters: 'Só faz sentido com conversão confiável configurada — PMax no dia 1 sem histórico queima orçamento (erro comum nº 5).' },
  { term: 'Demand Gen', categoria: 'google-ads', definition: 'Campanha de geração de demanda (YouTube, Discover, Gmail) com criativos visuais.', whyItMatters: 'Canal para verticais em que Search é caro ou proibido pelo produtor (ex.: LymphFlow só permite Display/YouTube).' },
  { term: 'Índice de Qualidade', sigla: 'QS', categoria: 'google-ads', definition: 'Nota 1–10 do Google por keyword: CTR esperado, relevância do anúncio e experiência da landing page.', whyItMatters: 'QS alto = pagar menos pelo mesmo lugar. Presell lenta ou irrelevante derruba o QS e o lucro junto.' },
  { term: 'Ad Rank', categoria: 'google-ads', definition: 'Posição no leilão = lance × Quality Score (+ extensões).', whyItMatters: 'Explica por que nem sempre quem paga mais aparece primeiro — melhorar QS é mais barato que subir lance.' },
  { term: 'Correspondência Exata', sigla: 'exact', categoria: 'google-ads', definition: 'Keyword entre [colchetes]: anúncio aparece só para buscas com o mesmo significado.', whyItMatters: 'Máximo controle e menor volume. Use nas keywords de fundo de funil que já provaram converter.' },
  { term: 'Correspondência de Frase', sigla: 'phrase', categoria: 'google-ads', definition: 'Keyword entre "aspas": a busca precisa conter o sentido da frase.', whyItMatters: 'Equilíbrio padrão para teste — controla o tema sem estrangular o volume.' },
  { term: 'Correspondência Ampla', sigla: 'broad', categoria: 'google-ads', definition: 'Sem pontuação: o Google expande para tudo que considerar relacionado.', whyItMatters: 'Em teste de afiliado com verba curta, broad gasta rápido em busca irrelevante. Só com Smart Bidding maduro.' },
  { term: 'Palavras-chave Negativas', categoria: 'google-ads', definition: 'Termos para os quais o anúncio NUNCA deve aparecer (ex.: "grátis", "download").', whyItMatters: 'Cada clique de curioso custa o mesmo que um clique de comprador. Negativas preventivas protegem o orçamento de teste.' },
  { term: 'Termos de Pesquisa', categoria: 'google-ads', definition: 'Relatório do que as pessoas REALMENTE digitaram antes de clicar.', whyItMatters: 'É a mina de ouro da otimização: termos que convertem viram keywords exatas; lixo vira negativa.' },
  { term: 'Parcela de Impressões', sigla: 'IS', categoria: 'google-ads', definition: 'Percentual dos leilões elegíveis em que seu anúncio de fato apareceu.', whyItMatters: 'IS baixo por orçamento = campanha estrangulada; IS baixo por rank = problema de QS/lance.' },
  { term: 'Recursos/Extensões de Anúncio', sigla: 'assets', categoria: 'google-ads', definition: 'Sitelinks, frases de destaque, snippets — informações extras no anúncio.', whyItMatters: 'Aumentam CTR e Ad Rank de graça. Anúncio de afiliado sem extensões compete em desvantagem.' },
  { term: 'Lance Inteligente', sigla: 'Smart Bidding', categoria: 'google-ads', definition: 'Estratégias automáticas de lance (Maximizar conversões, tCPA, tROAS).', whyItMatters: 'Precisa de dados de conversão para funcionar. Em teste frio, CPC manual limitado dá mais controle.' },
  { term: 'Tag de Conversão', categoria: 'google-ads', definition: 'Código que informa ao Google quando uma venda/lead aconteceu.', whyItMatters: 'Sem conversão rastreada não há otimização automática possível — e em afiliado exige postback da rede (S2S).' },
  { term: 'Centro de Transparência de Anúncios', categoria: 'google-ads', definition: 'Ferramenta pública do Google que mostra os anúncios ativos de qualquer anunciante.', whyItMatters: 'Espionagem legítima: veja quantos afiliados anunciam o produto e que ângulos usam antes de entrar.' },
  { term: 'Política de Saúde Personalizada', categoria: 'google-ads', definition: 'Restrição do Google a anúncios que assumem condições de saúde do usuário.', whyItMatters: 'Vertical nutra vive no limite dela. Copy "seu linfedema" = reprovação; "drenagem linfática" genérico = ok.' },

  // ===== Afiliados =====
  { term: 'Ganho por Clique', sigla: 'EPC', categoria: 'afiliados', definition: 'Receita de comissão ÷ cliques enviados. O marketplace mostra o EPC médio da oferta.', whyItMatters: 'Se o seu CPC pago > EPC da oferta, a conta não fecha. EPC do marketplace ≠ seu EPC (erro comum nº 4).' },
  { term: 'Gravity', categoria: 'afiliados', definition: 'Métrica do ClickBank: quantos afiliados distintos fizeram venda nas últimas 12 semanas (ponderado).', whyItMatters: 'Sweet spot 20–150: prova de que vende sem estar saturado. Gravity 300 = guerra de lances.' },
  { term: 'HopLink', categoria: 'afiliados', definition: 'Seu link de afiliado ClickBank (rastreia o clique até a venda).', whyItMatters: 'É como a comissão chega em você. Sempre teste o hoplink antes de rodar tráfego.' },
  { term: 'Presell / Página Ponte', sigla: 'bridge', categoria: 'afiliados', definition: 'Página SUA entre o anúncio e a página de vendas do produtor (review, advertorial, quiz).', whyItMatters: 'Obrigatória na prática: aquece o clique, filtra curiosos e protege sua conta Google das claims do produtor.' },
  { term: 'Carta de Vendas em Vídeo', sigla: 'VSL', categoria: 'afiliados', definition: 'Página de vendas do produtor em formato de vídeo longo.', whyItMatters: 'VSLs convertem bem em tráfego frio mas demoram — o visitante precisa chegar pré-vendido da sua presell.' },
  { term: 'Landing de Dois Passos', sigla: 'TSL', categoria: 'afiliados', definition: 'Funil do produtor em duas etapas (ex.: texto → checkout). Alguns produtores exigem passar por ela.', whyItMatters: 'Pular etapas do funil oficial (direct linking ao carrinho) é proibido por muitos produtores — LymphFlow bane por isso.' },
  { term: 'Rebill / Recorrência', categoria: 'afiliados', definition: 'Comissão que se repete enquanto o cliente pagar (assinaturas).', whyItMatters: 'Rebill muda a matemática: um CPA que parece caro no mês 1 vira lucro no mês 3.' },
  { term: 'Ticket Médio', sigla: 'AOV', categoria: 'afiliados', definition: 'Valor médio do pedido, incluindo upsells (Average Order Value).', whyItMatters: 'Oferta com upsells fortes paga comissão média maior que o preço do front-end sugere.' },
  { term: 'Taxa de Reembolso', sigla: 'refund %', categoria: 'afiliados', definition: 'Percentual de vendas devolvidas (ClickBank permite reembolso em até 60 dias).', whyItMatters: 'Comissão líquida = comissão × (1 − refund%). Escalar no lucro do dia 1 ignorando refund é o erro comum nº 3.' },
  { term: 'Estorno de Comissão', sigla: 'clawback', categoria: 'afiliados', definition: 'Comissão já paga que a rede retira depois (refund/chargeback).', whyItMatters: 'Mantenha reserva de caixa — o dinheiro do painel não é seu até passar a janela de reembolso.' },
  { term: 'Whitelist de Afiliado', categoria: 'afiliados', definition: 'Aprovação prévia do produtor para você promover a oferta (via gerente de afiliados).', whyItMatters: 'Ofertas boas exigem whitelist — rodar sem aprovação = comissão estornada e ban. Contato fica na página de afiliado.' },
  { term: 'Bid em Marca', sigla: 'brand bidding', categoria: 'afiliados', definition: 'Anunciar usando o nome do produto/marca como keyword ou no texto do anúncio.', whyItMatters: 'A maioria dos produtores PROÍBE. Violar = ban imediato. Sempre conferir na página de afiliado antes.' },
  { term: 'Link Direto', sigla: 'direct linking', categoria: 'afiliados', definition: 'Mandar o clique do anúncio direto para a página do produtor, sem presell.', whyItMatters: 'Quase sempre proibido pelo produtor e arriscado no Google (destino que você não controla pode derrubar SUA conta).' },
  { term: 'Cloaking', categoria: 'afiliados', definition: 'Mostrar ao Google uma página diferente da que o usuário vê.', whyItMatters: 'Fraude na política do Google: suspensão permanente da conta. Nunca — não há campanha que justifique.' },
  { term: 'Página de Ferramentas do Afiliado', sigla: 'aff page', categoria: 'afiliados', definition: 'Página do produtor com recursos para afiliados: comissões reais, CPA bônus, swipes, criativos, regras e contato ({domínio}/aff, /affiliates, /jv).', whyItMatters: 'REGRA DA CASA: analisar antes de qualquer campanha — ela valida ou mata a estratégia (canais proibidos, restrições). O Affiliate Page Analyst faz isso no app.' },
  { term: 'Postback / S2S', categoria: 'afiliados', definition: 'Notificação servidor-a-servidor da rede para seu tracker/Google quando a venda acontece.', whyItMatters: 'Único jeito confiável de levar a conversão de afiliado para dentro do Google Ads. MaxWeb sem postback é o erro comum nº 2.' },
  { term: 'Rede CPA', categoria: 'afiliados', definition: 'Rede que paga por ação fixa (venda/lead) em vez de percentual — ex.: MaxWeb, BuyGoods.', whyItMatters: 'CPA fixo simplifica o break-even: você sabe exatamente quanto vale cada conversão.' },
  { term: 'Bônus CPA do Produtor', categoria: 'afiliados', definition: 'Pagamento fixo extra por venda que produtores oferecem a top afiliados (ex.: LymphFlow: $180/venda após 50 vendas).', whyItMatters: 'Muda a economia da oferta — a comissão real pode ser bem maior que a do marketplace. Está na página de afiliado.' },
  { term: 'CPC de Break-even', categoria: 'afiliados', definition: 'CPC máximo que empata: comissão líquida × CVR esperada.', whyItMatters: 'É o teto de lance de toda campanha. CPC SCALE ≈ break-even ÷ 1,3 dá a margem de lucro.' },
  { term: 'Regra do 3×', categoria: 'afiliados', definition: 'A comissão média deve pagar ao menos 3× o CPA estimado do teste.', whyItMatters: 'Filtro de entrada do Product Hunter: sem 3× de folga, variância normal de campanha come o lucro.' },
  { term: 'Camadas de Keywords A/B/C/D', categoria: 'afiliados', definition: 'Organização do app: A=fundo de funil/comercial, B=comparação/review, C=problema/dor, D=informacional.', whyItMatters: 'Cada camada tem CPC, CVR e papel diferentes. Teste começa em A/B; C alimenta presell; D quase nunca em Search pago.' },
  { term: 'Vertical', categoria: 'afiliados', definition: 'Nicho de mercado da oferta: nutra/saúde, MMO (make money online), sobrevivência, beleza…', whyItMatters: 'Define CPC médio, regras de compliance e sazonalidade — a estratégia inteira muda por vertical.' },
  { term: 'Funil', categoria: 'afiliados', definition: 'Caminho do clique à venda: Bridge (anúncio→presell→oferta), Direct, Search-intent, YouTube.', whyItMatters: 'O naming das campanhas do app codifica o funil (CB_VERT_GEO_CANAL_FUNIL_v1) para o diário e a auditoria compararem iguais com iguais.' },
  { term: 'Kill / Scale', categoria: 'afiliados', definition: 'Decisão binária pós-teste: matar a campanha ou escalar orçamento.', whyItMatters: 'Critério objetivo ANTES do teste (ex.: 2× o gasto da comissão em 72h) evita torrar verba em esperança. O Paid Ads Auditor decide isso.' },
  { term: 'Swipe', categoria: 'afiliados', definition: 'Modelo pronto de email/copy fornecido pelo produtor na página de afiliado.', whyItMatters: 'Material validado pelo próprio produtor — base legítima para seus criativos (adaptando, nunca copiando claims proibidas).' },
  { term: 'Temperatura da Oferta', categoria: 'afiliados', definition: 'Momento da oferta no mercado: subindo (gravity crescendo), estável, saturando ou morrendo.', whyItMatters: 'Entrar em oferta morrendo é pagar CPC de leilão cheio por conversão em queda. O Caçador de Produtos avalia isso.' },
];

export interface ManualSection {
  title: string;
  content: string;
}

export const SYSTEM_MANUAL: ManualSection[] = [
  {
    title: 'O que é o AfiliAds',
    content: `O AfiliAds é a central de operação de marketing de afiliados: encontrar produtos (ClickBank, BuyGoods, MaxWeb, Hotmart), validar a economia e o compliance de cada oferta, pesquisar keywords, montar campanhas de Google Ads, acompanhar resultados diários e decidir kill/scale — com 9 agentes de IA fazendo o trabalho pesado e registrando cada token gasto.

O princípio da casa: nenhuma campanha nasce sem passar pelos gates — produto com score aprovado, página de afiliado do produtor analisada, keyword validada pela economia (regra do 3×) e presell auditada.`,
  },
  {
    title: 'O fluxo completo (do produto ao lucro)',
    content: `1. BUSCA DE PRODUTOS — digite um produto (ou escolha do top 10) e o pipeline de 3 agentes roda: Product Hunter pontua a oferta (0–100), SEO Architect gera o mapa de keywords em camadas A–D, Compliance Sentinel define presell, funil, naming e break-even. Score < 50 = descarta.

2. PÁGINA DE AFILIADO — na aba "Pág. Afiliado" do dossiê, informe a URL do produtor (/aff, /affiliates, /jv) e rode o Affiliate Page Analyst. Ele extrai comissão real, CPA bônus, canais PROIBIDOS e restrições. Google Search proibido? A estratégia muda aqui, antes de gastar 1 real.

3. PESQUISA ATP — busque a keyword seed no AnswerThePublic (1 crédito, sempre com sua aprovação). O ATP Keyword Analyst cruza volume/CPC/intenção com a economia da campanha e recomenda a melhor keyword. Importe as aprovadas para a biblioteca.

4. NOVA CAMPANHA (Wizard) — monte a campanha passo a passo com validação do Wizard Validator: naming padrão, break-even calculado, checklist de lançamento.

5. GERADOR RSA — o CRO Copywriter gera títulos (≤30 chars) e descrições prontos para colar no Google Ads.

6. DIÁRIO — registre gasto/cliques/conversões por dia. É o combustível da auditoria.

7. AUDITORIA — o Paid Ads Auditor analisa tudo e devolve a decisão: SCALE, OTIMIZAR, PAUSAR ou KILL, com justificativa. Registre a decisão e o aprendizado.`,
  },
  {
    title: 'As telas, uma a uma',
    content: `• Dashboard — visão geral: gasto, receita, ROI e campanhas ativas.
• Nova Campanha (Wizard) — criação guiada em etapas com checklist.
• Agentes — sala de controle: o que cada agente faz, teste individual com tarefa real e consumo de tokens de cada um.
• Busca de Produtos — pipeline de análise multi-agente + dossiê completo por produto (keywords, estratégia, compliance, página de afiliado) + chat contextual.
• Campanhas — lista e detalhe de cada campanha: economia, checklist, decisões, análise de presell e auditoria.
• Diário — lançamentos diários por campanha (gasto, cliques, hops, conversões).
• Keywords — biblioteca de keywords por camada com match type e CPC estimado.
• Pesquisa ATP — AnswerThePublic integrado: saldo de créditos, busca com aprovação, report por buckets e análise econômica.
• Gerador RSA — copy de anúncios com contagem de caracteres garantida.
• Planilhas — visão tabular de tudo (ofertas com link de marketplace, campanhas, diário, testes kill/scale, financeiro).
• Conhecimento — esta base: estratégias, playbooks, glossário, aprendizados e este manual.
• Configurações — chaves de API (provedores de IA, AnswerThePublic, redes de afiliados).`,
  },
  {
    title: 'Regras de governança (não negociáveis)',
    content: `• Créditos AnswerThePublic: toda busca paga exige SUA aprovação explícita no dialog (o servidor rejeita chamadas sem confirmação). Releituras de reports são grátis e ilimitadas. Mesma keyword+idioma+região em 24h = reuso grátis.

• Página de afiliado do produtor: analisar SEMPRE antes de validar campanha. Canal proibido pelo produtor (ex.: Google Search no LymphFlow) = mudar canal ou mudar de produto.

• Compliance Google: sem claims de cura/renda garantida, sem brand bidding quando proibido, sem direct linking, sem cloaking (nunca). A conta do Google Ads é o ativo mais difícil de recuperar.

• Economia antes de criativo: CPC máximo = comissão líquida × CVR. Se a keyword não cabe no teto, nenhuma copy salva a campanha.

• Tokens de IA: cada execução de agente é registrada (agente, provedor, modelo, tokens, duração) — acompanhe na página Agentes. O roteador usa modelos leves para tarefas simples e reserva os premium para compliance e auditoria.`,
  },
  {
    title: 'Provedores de IA e roteamento',
    content: `O app aceita 4 provedores (Anthropic/Claude, OpenAI/GPT, Google/Gemini, Abacus.ai) com chaves em Configurações.

O roteador automático classifica cada agente por peso da tarefa:
• PREMIUM (Compliance Sentinel, Paid Ads Auditor, Affiliate Page Analyst) — prioriza Claude: análise de regras e restrições exige a leitura mais fiel.
• STANDARD (Product Hunter, SEO Architect, ATP Analyst, CRO Copywriter) — usa Gemini/GPT primeiro, poupando tokens Claude.
• LIGHT (Assistente de Análise, Wizard Validator) — modelos rápidos e baratos.

Se um provedor falhar ou estourar o orçamento mensal de tokens, o próximo da cadeia assume automaticamente. Cada execução registra qual modelo respondeu de fato.`,
  },
  {
    title: 'O loop de auto-correção',
    content: `Cada campanha pode ligar o loop (Wizard ou detalhe da campanha): escolha os agentes (auditor de ads, compliance) e o intervalo (12h/24h/48h/72h).

COMO RODA
• Scheduler interno verifica a cada 30 min quais campanhas venceram o intervalo.
• Registrar o Diário dispara o loop na hora (dado novo = reavaliação imediata).
• Botão "Executar Agora" na campanha e alertas do Dashboard rodam sob demanda.

O QUE O LOOP FAZ (nesta ordem)
1. Calcula a economia real EM CÓDIGO (zero tokens): gasto, receita, EPC/CPC/CVR reais, burn do budget.
2. Aplica as REGRAS OFICIAIS:
   — KILL: gasto ≥ 2× comissão líquida sem conversão, ou CPC acima do máximo por 3+ dias;
   — PAUSAR: budget de teste 100% consumido;
   — SCALE: EPC real ≥ 1.3× CPC real com ≥ 2 conversões (só SUGERE — escalar dinheiro exige sua aprovação);
   — OTIMIZAR: paga a conta mas sem margem, ou compliance com alerta crítico;
   — SEM_DADOS / CONFIG_INCOMPLETA: não gasta token de IA e aponta o que falta.
3. Só então chama os agentes de IA com os números já calculados: o auditor diagnostica e propõe ajustes; o compliance lê a presell REAL (baixa a página).
4. Persiste tudo: decisão com justificativa no histórico da campanha, status atualizado (KILL/PAUSAR automáticos) e registro do LoopRun com tokens gastos.

AUTO-CORREÇÃO DE AGENTES
• Saída inválida (ex.: título RSA com 31+ caracteres) é rejeitada e retentada 1× com o erro anexado ao prompt.
• Provedor com falha/sem crédito cai para o próximo da cadeia automaticamente.
• Falhas recorrentes aparecem no card "Problemas detectados" da página Agentes com a causa.`,
  },
  {
    title: 'De onde vêm os aprendizados',
    content: `A aba Aprendizados agrega automaticamente o que a operação já descobriu:
• Testes Kill/Scale — hipótese, resultado e lição de cada teste registrado.
• Decisões de campanha — cada SCALE/KILL com a justificativa do momento.
• Notas do diário — observações registradas nos lançamentos diários.
• Dossiês de produtos — resumo, dicas e restrições extraídas das páginas de afiliado.

Quanto mais você registra no Diário e nos Testes, mais essa aba vira a memória institucional da operação — o que funcionou, o que não funcionou e por quê.`,
  },
];
