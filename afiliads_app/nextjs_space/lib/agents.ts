export interface AgentDef {
  id: string;
  name: string;
  role: string;
  description: string;
  route: string;
  page: string;
  pageLabel: string;
  skills: string[];
  testTask: {
    describe: string;
    systemPrompt: string;
    userPrompt: string;
  };
}

export const AGENT_REGISTRY: AgentDef[] = [
  {
    id: 'product-hunter',
    name: 'Product Hunter',
    role: 'Caça e pontuação de ofertas',
    description: 'Fase 1 da Busca de Produtos: pesquisa a oferta (gravity, payout, comissão, funil do vendor), aplica a regra do 3× e devolve score 0–100 com tags e nível de risco. Produto reprovado aqui não segue no pipeline.',
    route: '/api/product-research',
    page: '/busca-produtos',
    pageLabel: 'Busca de Produtos',
    skills: ['Score de Oferta 0-100', 'Regra do 3×', 'Gravity & Payout'],
    testTask: {
      describe: 'Pontua uma oferta fictícia com gravity 45 e payout $85',
      systemPrompt: 'Você é o Product Hunter do AfiliAds. Avalie ofertas ClickBank pela economia (regra do 3×: comissão média deve pagar 3× o custo estimado de aquisição) e tração. Responda APENAS com JSON válido.',
      userPrompt: 'Oferta: "SleepWell Pro", vertical Sleep/Health, gravity 45, payout médio $85/venda, comissão 70%, sem rebill. CPC estimado do nicho: $1.20, CVR esperada 1%. Retorne JSON: {"score": 0-100, "viavel_3x": true|false, "risco": "baixo|medio|alto", "motivo": "1 frase"}',
    },
  },
  {
    id: 'seo-architect',
    name: 'SEO & Keyword Architect',
    role: 'Mapa de keywords em camadas',
    description: 'Fase 2 da Busca de Produtos: gera o universo de keywords do produto em camadas A (fundo de funil), B (comparação/review), C (problema) e D (informacional), com negativas preventivas e a melhor keyword única. Também é a metodologia por trás da análise ATP.',
    route: '/api/product-research',
    page: '/busca-produtos',
    pageLabel: 'Busca de Produtos',
    skills: ['Camadas A/B/C/D', 'Negativas Preventivas', 'Intenção de Busca'],
    testTask: {
      describe: 'Gera 2 keywords por camada para um produto de drenagem linfática',
      systemPrompt: 'Você é o SEO & Keyword Architect do AfiliAds. Classifique keywords em camadas: A=fundo de funil (comprar/preço), B=comparação (review/best), C=problema (dor do público), D=informacional. Responda APENAS com JSON válido.',
      userPrompt: 'Produto: suplemento de drenagem linfática (EUA, inglês). Retorne JSON: {"camada_A": ["kw1","kw2"], "camada_B": ["kw1","kw2"], "camada_C": ["kw1","kw2"], "camada_D": ["kw1","kw2"], "negativas": ["n1","n2","n3"]}',
    },
  },
  {
    id: 'compliance-sentinel',
    name: 'Compliance Sentinel',
    role: 'Compliance, presell e estratégia',
    description: 'Fase 3 da Busca de Produtos e auditor de presells: verifica claims proibidos (saúde/renda), políticas do Google Ads e regras da rede; define tipo de presell, funil de venda, naming da campanha e break-even. Também roda sozinho na análise de presell das Campanhas.',
    route: '/api/presell-analysis',
    page: '/campanhas',
    pageLabel: 'Campanhas',
    skills: ['Detecção de Claims', 'Políticas do Google', 'Break-even & Naming'],
    testTask: {
      describe: 'Audita um trecho de presell com claim arriscado',
      systemPrompt: 'Você é o Compliance Sentinel do AfiliAds. Audite textos de presell contra as políticas do Google Ads (claims de cura, garantias de resultado, urgência falsa). Responda APENAS com JSON válido.',
      userPrompt: 'Trecho: "Este suplemento CURA o inchaço em 7 dias, garantido, ou seu dinheiro de volta! Restam 3 unidades." Retorne JSON: {"aprovado": true|false, "alertas": [{"nivel": "critico|atencao", "texto": "..."}], "reescrita_sugerida": "versão compliant do trecho"}',
    },
  },
  {
    id: 'affiliate-page-analyst',
    name: 'Affiliate Page Analyst',
    role: 'Análise da página de afiliado do produtor',
    description: 'Lê a affiliate tools page do produtor (padrões /aff, /aff-th, /affiliates, /jv) e extrai comissões reais, CPA bônus, EPC, canais permitidos/PROIBIDOS, restrições e contatos. É o gate que valida ou mata a campanha — ex.: LymphFlow proíbe Google Search.',
    route: '/api/products/[id]/analyze',
    page: '/busca-produtos',
    pageLabel: 'Busca de Produtos',
    skills: ['Google Search permitido?', 'Restrições do Produtor', 'CPA Bônus & EPC'],
    testTask: {
      describe: 'Extrai restrições de um trecho de página de afiliado',
      systemPrompt: 'Você é o Affiliate Page Analyst do AfiliAds. Extraia de páginas de afiliado as regras que validam ou inviabilizam campanhas. Seja literal: só afirme o que está no texto. Responda APENAS com JSON válido.',
      userPrompt: 'Trecho: "Commission up to 60%. NO brand bidding. NO Google Search ads — Display and YouTube only. Email swipes available. Contact our affiliate manager for whitelisting." Retorne JSON: {"commission": "...", "googleSearchAllowed": true|false, "restrictions": ["..."], "resources": ["..."]}',
    },
  },
  {
    id: 'atp-keyword-analyst',
    name: 'ATP Keyword Analyst',
    role: 'Análise de keywords (AnswerThePublic)',
    description: 'Cruza o report do AnswerThePublic com a economia da campanha: filtra por CPC ≤ teto (regra do 3×), pontua intenção × volume × margem, classifica em camadas A–D com match type e recomenda a melhor keyword. Leituras do ATP são grátis; só a busca inicial consome crédito.',
    route: '/api/atp/analyze',
    page: '/pesquisa-keywords',
    pageLabel: 'Pesquisa ATP',
    skills: ['Camadas A/B/C/D', 'Regra do 3×', 'Score Econômico'],
    testTask: {
      describe: 'Classifica 4 keywords em camadas com match type',
      systemPrompt: 'Você é o ATP Keyword Analyst do AfiliAds. Classifique keywords nas camadas A=Problema, B=Solução, C=Comparação, D=Comercial e sugira matchType (exact/phrase). Responda APENAS com JSON válido.',
      userPrompt: 'Campanha: suplemento linfático, CPC teto $1.50. Keywords: "how to reduce lymphedema swelling" (cpc 0.80), "lymphflow review" (cpc 1.20), "buy lymphatic supplement" (cpc 1.90), "lymphatic drainage supplement" (cpc 1.10). Retorne JSON: {"keywords": [{"keyword": "...", "layer": "A|B|C|D", "matchType": "exact|phrase", "viavel": true|false}], "melhor": "..."}',
    },
  },
  {
    id: 'cro-copywriter',
    name: 'CRO Copywriting Specialist',
    role: 'Gerador de anúncios RSA',
    description: 'Gera títulos (máx. 30 caracteres) e descrições (máx. 90) para anúncios responsivos de busca do Google, usando frameworks PAS e BAB, respeitando compliance e espelhando a keyword no título.',
    route: '/api/rsa-generator',
    page: '/rsa',
    pageLabel: 'Gerador RSA',
    skills: ['Copywriting PAS/BAB', 'Limite de 30 Caracteres', 'Keyword no Título'],
    testTask: {
      describe: 'Gera 3 títulos RSA (≤30 chars) para "lymphatic drainage"',
      systemPrompt: 'Você é o CRO Copywriting Specialist do AfiliAds. Gere copy para RSA do Google Ads: títulos com NO MÁXIMO 30 caracteres (conte cada caractere), sem claims de cura. Responda APENAS com JSON válido.',
      userPrompt: 'Keyword: "lymphatic drainage supplement" (EUA, inglês). Retorne JSON: {"titles": ["t1 (max 30 chars)", "t2", "t3"], "chars": [n1, n2, n3]}',
    },
  },
  {
    id: 'ads-auditor',
    name: 'Paid Ads Auditor',
    role: 'Auditoria de campanha',
    description: 'Analisa a campanha completa — economia (CPC real vs break-even), estrutura, keywords, histórico do diário — e devolve diagnóstico com decisão objetiva: SCALE, OTIMIZAR, PAUSAR ou KILL, com justificativa.',
    route: '/api/campaign-audit',
    page: '/campanhas',
    pageLabel: 'Campanhas',
    skills: ['Break-even & CPC Máximo', 'Diagnóstico de Teste', 'Decisão Kill/Scale'],
    testTask: {
      describe: 'Decide kill/scale para uma campanha com números dados',
      systemPrompt: 'Você é o Paid Ads Auditor do AfiliAds. Decida o destino de campanhas de afiliados comparando gasto, cliques, conversões e break-even. Responda APENAS com JSON válido.',
      userPrompt: 'Campanha: gasto $48 de $50 de teste, 61 cliques (CPC $0.79), 0 conversões, break-even CPC $0.95, comissão $85. Retorne JSON: {"decisao": "SCALE|OTIMIZAR|PAUSAR|KILL", "confianca": "alta|media|baixa", "motivo": "2 frases", "proximo_passo": "1 ação concreta"}',
    },
  },
  {
    id: 'analysis-assistant',
    name: 'Assistente de Análise',
    role: 'Chat contextual da Busca de Produtos',
    description: 'Chat lateral da Busca de Produtos: responde perguntas sobre o produto em análise (CPC ideal, ângulos de presell, riscos, comparações) usando o dossiê salvo como contexto.',
    route: '/api/product-chat',
    page: '/busca-produtos',
    pageLabel: 'Busca de Produtos',
    skills: ['Contexto do Dossiê', 'Q&A de Estratégia', 'Streaming'],
    testTask: {
      describe: 'Responde uma pergunta de estratégia em 2 frases',
      systemPrompt: 'Você é o Assistente de Análise do AfiliAds, especialista em marketing de afiliados. Responda de forma direta e prática, em português, no máximo 2 frases.',
      userPrompt: 'Produto com break-even CPC $0.95 e keyword com CPC estimado $1.40: vale testar mesmo assim?',
    },
  },
  {
    id: 'wizard-validator',
    name: 'Wizard Validator',
    role: 'Validação de campos da nova campanha',
    description: 'Valida em tempo real os campos preenchidos no Wizard de Nova Campanha (URLs, comissões, nomes, UTMs), apontando erros e sugerindo correções antes de salvar.',
    route: '/api/wizard-field-check',
    page: '/wizard',
    pageLabel: 'Nova Campanha',
    skills: ['Validação de URLs/UTMs', 'Checagem de Economia', 'Sugestões de Correção'],
    testTask: {
      describe: 'Valida um nome de campanha fora do padrão',
      systemPrompt: 'Você é o Wizard Validator do AfiliAds. Valide campos de campanha contra o padrão de naming CB_<VERTICAL>_<GEO>_<CANAL>_<FUNIL>_v<N>. Responda APENAS com JSON válido.',
      userPrompt: 'Nome informado: "minha campanha lymphflow teste". Retorne JSON: {"valido": true|false, "problema": "...", "sugestao": "nome corrigido no padrão"}',
    },
  },
];

export function getAgent(id: string): AgentDef | undefined {
  return AGENT_REGISTRY.find((a) => a.id === id);
}
