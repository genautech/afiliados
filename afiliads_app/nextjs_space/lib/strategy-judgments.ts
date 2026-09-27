import { choice } from '@typesafe-ai/sdk';
import type { ChoiceCriteria } from '@typesafe-ai/sdk';
import { askSystemOne, htmlToText } from './typesafe';
import { PRESELL_PAGE_TYPES } from './presell-types';

// Julgamentos de estratégia — contrapartida das heurísticas de string que hoje decidem
// classificação de sales page, escopo de proibição do vendor, normalização de texto livre do LLM
// pra enum, e camada/intenção de keyword.
//
// Todas as perguntas aqui são Choice: a resposta é UMA opção de um conjunto fechado, que é
// exatamente o que `if (s.includes('...'))` em cadeia tenta fazer — só que sem depender da ordem
// dos ifs, do idioma e de acento. Choice devolve também `confidence`, e confiança baixa cai no
// caminho determinístico atual em vez de virar decisão.

/** Abaixo disso, a escolha não é usada: quem chama mantém a heurística/valor anterior. Ver
 * docs.typesafe.ai/confidence — o número certo se mede nos dados, este é o ponto de partida. */
export const CONFIANCA_MINIMA = 0.6;

export type JudgedChoice<T extends string> = {
  value: T | null;
  raw: T;
  confidence: number;
  probabilities: Record<string, number>;
  /** false quando a confiança ficou abaixo de CONFIANCA_MINIMA — `value` vem null. */
  usable: boolean;
};

function readChoice<T extends string>(answer: { choice: string; confidence: number; probabilities: Record<string, number> }): JudgedChoice<T> {
  const usable = answer.confidence >= CONFIANCA_MINIMA;
  return {
    value: usable ? (answer.choice as T) : null,
    raw: answer.choice as T,
    confidence: answer.confidence,
    probabilities: answer.probabilities,
    usable,
  };
}

// ---------------------------------------------------------------------------
// 1. Tipo da sales page do vendor
// ---------------------------------------------------------------------------
// Substitui classifySalesPage() em lib/salesPageAnalyzer.ts, que decide por presença de tag:
// qualquer <video> ⇒ VSL, botão com o texto "Compre Agora" em português ⇒ DIRECT, classe CSS
// contendo "content-section" ⇒ advertorial. O valor vira ProductResearch.salesPageType e decide
// o tipo de bridge page e a presell inteira (deriveCampaignStrategy → recommendBridgePage).

export type SalesPageJudgment = 'VSL' | 'DIRECT' | 'QUIZ' | 'LEAD_GEN' | 'OTHER';

export const SALES_PAGE_QUESTION = {
  tipo_sales_page: choice(
    {
      question: 'Que tipo de página de vendas é `pagina.texto`?',
      focus: 'Julgue como a página vende: o que ela pede do visitante e onde está o argumento de venda.',
    },
    {
      VSL: {
        what: 'O argumento de venda está num vídeo que ocupa a página; o texto em volta só apoia o play',
        not_for: 'Página de texto longo que tem um vídeo de depoimento no meio',
        examples: ['player grande no topo com contagem de tempo e botão de compra abaixo, quase sem texto'],
      },
      DIRECT: {
        what: 'Carta de vendas direta em texto: promessa, prova, oferta e botão de compra do produto',
        not_for: 'Página que pede e-mail ou respostas antes de mostrar a oferta',
        examples: ['página longa com benefícios, depoimentos, preço e "Comprar agora"'],
      },
      QUIZ: {
        what: 'Pede respostas do visitante (perguntas de segmentação) antes de mostrar a oferta',
        not_for: 'Formulário que só pede contato, sem perguntas de qualificação',
        examples: ['"Responda 4 perguntas para ver seu plano"'],
      },
      LEAD_GEN: {
        what: 'O objetivo da página é capturar contato em troca de material gratuito',
        not_for: 'Página que vende o produto na mesma tela',
        examples: ['"Digite seu e-mail para receber o guia grátis"'],
      },
      OTHER: {
        what: 'Não é nenhuma das anteriores: conteúdo editorial, home institucional, blog, erro ou página vazia',
        examples: ['artigo de blog sem oferta', 'página de erro', 'home de loja com catálogo'],
      },
    },
  ),
} as const;

export async function judgeSalesPageType(html: string): Promise<JudgedChoice<SalesPageJudgment> | null> {
  const texto = htmlToText(html);
  if (!texto) return null;
  const res = await askSystemOne({ pagina: { texto } }, SALES_PAGE_QUESTION, { label: 'judgeSalesPageType' });
  if (!res) return null;
  return readChoice<SalesPageJudgment>(res.answers.tipo_sales_page);
}

// ---------------------------------------------------------------------------
// 2. Escopo da proibição do vendor (canal inteiro × só o termo de marca)
// ---------------------------------------------------------------------------
// Substitui o /\b(bid|keyword|termo|marca|palavra)\b/ de deriveBlockedChannels()
// (lib/campaign-strategy.ts:137). Essa distinção já foi registrada errada em produção: o caso
// FemiCore foi anotado como "Google Search bloqueado" quando o vendor só proibia usar o nome da
// marca em keyword/copy (brand bidding). Errar pra mais mata um canal que era permitido; errar
// pra menos faz brand bidding proibido e derruba a parceria.

export type ProibicaoEscopo = 'canal_inteiro' | 'apenas_termo_de_marca' | 'nao_e_proibicao';
export type CanalProibido = 'SEARCH' | 'YOUTUBE' | 'DEMAND_GEN' | 'PMAX' | 'indefinido';

const ESCOPO_QUESTION = 'A regra em `regra_do_vendor` proíbe o canal de tráfego inteiro, ou só o uso de um termo/marca dentro dele?';

export function vendorProhibitionQuestions(regras: string[], produto: string) {
  const questions: Record<string, ReturnType<typeof choice>> = {};
  regras.forEach((regra, index) => {
    const contexto = { regra_do_vendor: regra, nome_do_produto: produto };
    questions[`escopo_${index}`] = choice(
      { ...contexto, question: ESCOPO_QUESTION, focus: 'Separe proibir o canal de proibir uma palavra dentro do canal.' },
      {
        canal_inteiro: {
          what: 'Proíbe anunciar naquele canal/rede, qualquer que seja a palavra usada',
          not_for: 'Proibição que se resolve não usando um termo específico',
          examples: ['No Google Search advertising allowed', 'Proibido anunciar no YouTube'],
        },
        apenas_termo_de_marca: {
          what: 'Permite o canal, mas proíbe usar o nome da marca/produto em keyword, título ou domínio (brand bidding)',
          not_for: 'Proibição do canal inteiro',
          examples: [
            'No brand bidding — do not bid on our product name',
            'Não use a marca em palavra-chave; negative match obrigatório',
            'Trademark bidding is prohibited',
          ],
        },
        nao_e_proibicao: {
          what: 'Não é uma proibição: é recomendação, exigência de aprovação, ou trata de outro assunto',
          examples: ['Pedimos que envie a criativo para aprovação', 'Use nossos banners oficiais'],
        },
      },
    );
    // Pergunta especulativa (padrão fan-out): só é lida quando o escopo deu canal_inteiro.
    // Roda em paralelo na mesma request, então não custa round trip nem latência extra.
    questions[`canal_${index}`] = choice(
      { ...contexto, question: 'Qual canal do Google Ads a regra em `regra_do_vendor` proíbe?' },
      {
        SEARCH: 'Rede de pesquisa do Google (anúncios de texto em resultado de busca)',
        YOUTUBE: 'Anúncios em vídeo no YouTube',
        DEMAND_GEN: 'Demand Gen, Discovery, display nativo ou feeds sociais',
        PMAX: 'Performance Max (campanha que cobre todo o inventário, incluindo Search)',
        indefinido: 'A regra não nomeia um canal específico, ou nomeia algo que não é canal do Google Ads',
      },
    );
  });
  return questions;
}

export type VendorProhibitionJudgment = {
  regra: string;
  escopo: JudgedChoice<ProibicaoEscopo>;
  canal: JudgedChoice<CanalProibido>;
};

export async function judgeVendorProhibitions(
  regras: string[],
  produto: string,
): Promise<VendorProhibitionJudgment[] | null> {
  const limpas = regras.map((r) => String(r ?? '').trim()).filter(Boolean);
  if (limpas.length === 0) return [];

  const res = await askSystemOne(
    { produto: { nome: produto } },
    vendorProhibitionQuestions(limpas, produto),
    { label: 'judgeVendorProhibitions' },
  );
  if (!res) return null;

  const answers = res.answers as Record<string, any>;
  return limpas.map((regra, index) => ({
    regra,
    escopo: readChoice<ProibicaoEscopo>(answers[`escopo_${index}`]),
    canal: readChoice<CanalProibido>(answers[`canal_${index}`]),
  }));
}

// ---------------------------------------------------------------------------
// 3. Texto livre do dossiê → enum real do app
// ---------------------------------------------------------------------------
// Substitui normalizePresellTipo() e normalizeChannel() (lib/campaign-strategy.ts:56-77), duas
// cadeias de `if (s.includes(...))` sobre texto que o LLM da pesquisa de produto escreveu livre.
// A cadeia depende da ordem: 'lead' é testado antes de 'advertorial', e 'review' precisou de
// `&& !s.includes('cookie')` como remendo. Quem não casa nada vira null silencioso.
//
// As perguntas daqui rodam na MESMA request das proibições do vendor (judgeStrategyInputs), porque
// todas olham o mesmo produto: perguntas independentes sobre o mesmo estado custam um round trip só.

export type PresellTipoJudgment = (typeof PRESELL_PAGE_TYPES)[number] | 'nao_informado';
export type FunilJudgment = 'BRIDGE' | 'DIRECT' | 'REVIEW' | 'SL' | 'nao_informado';
export type CanalJudgment = 'SEARCH' | 'YOUTUBE' | 'DEMAND_GEN' | 'PMAX' | 'nao_informado';

const PRESELL_TIPO_CRITERIA: ChoiceCriteria = {
  advertorial: {
    what: 'Página editorial/matéria que pré-vende antes de mandar pra oferta',
    // Quiz e captura de lead caem aqui de propósito: o app ainda não tem template próprio pra
    // esses dois (ver bridgeTypeToPageType em lib/campaign-strategy.ts), e advertorial é o
    // fallback seguro. Sem isso explícito, o modelo não tem onde encaixar "captura de lead" e
    // espalha a probabilidade — medido em 2026-09-27, conf 0.37 nesse caso.
    examples: ['advertorial', 'artigo', 'quiz de segmentação', 'página de captura de lead', 'squeeze page'],
  },
  pogo: { what: 'Página curta de aquecimento que joga rápido pra oferta', examples: ['pogo page', 'ponte curta'] },
  vsl: { what: 'Página construída em volta de um vídeo de vendas', examples: ['vsl', 'video sales letter'] },
  interstitial: { what: 'Screenshot da sales page do vendor com popup de segmentação em cima', examples: ['interstitial', 'popup de país/idade'] },
  authority: { what: 'Página de autoridade: review aprofundado com selos, fontes e comparação', examples: ['authority', 'página de autoridade'] },
  tsl: { what: 'Carta de vendas em texto, sem vídeo', examples: ['tsl', 'text sales letter'] },
  cookie_popup: { what: 'Página com aviso de cookie/consentimento como mecanismo principal', examples: ['cookie popup', 'consent gate'] },
  review: { what: 'Review de produto único ou comparativo, formato resenha', examples: ['review', 'resenha', 'análise'] },
  nao_informado: { what: 'O texto não indica um tipo de página, ou fala de outra coisa', examples: ['", "', 'não definido', 'a definir'] },
};

export function strategyNormalizationQuestions(presellTipoTexto: string | null, canalTexto: string | null) {
  const questions: Record<string, ReturnType<typeof choice>> = {};
  if (presellTipoTexto) {
    questions.tipo_presell = choice(
      {
        texto_do_dossie: presellTipoTexto,
        question: 'Que tipo de página de pré-venda o `texto_do_dossie` está descrevendo?',
        focus: 'Traduza a descrição para o vocabulário de pageType do app.',
      },
      PRESELL_TIPO_CRITERIA,
    );
    questions.funil_de_venda = choice(
      {
        texto_do_dossie: presellTipoTexto,
        question: 'Que formato de funil o `texto_do_dossie` implica?',
      },
      {
        BRIDGE: { what: 'Página ponte entre o anúncio e a oferta do vendor', examples: ['advertorial', 'pogo', 'vsl', 'cookie popup'] },
        DIRECT: { what: 'Manda o clique direto pra página do vendor, sem ponte', not_for: 'Qualquer formato com página intermediária', examples: ['link direto', 'direct linking'] },
        REVIEW: { what: 'Review/resenha como formato central da venda', examples: ['review', 'análise comparativa'] },
        SL: { what: 'Captura de lead antes da oferta', examples: ['lead gen', 'squeeze page', 'captura de e-mail'] },
        nao_informado: { what: 'O texto não permite dizer o formato do funil' },
      },
    );
  }
  if (canalTexto) {
    questions.canal_da_campanha = choice(
      {
        texto_do_dossie: canalTexto,
        question: 'Que canal do Google Ads o `texto_do_dossie` recomenda?',
      },
      {
        SEARCH: 'Rede de pesquisa (anúncio de texto em resultado de busca)',
        YOUTUBE: 'Anúncio em vídeo no YouTube',
        DEMAND_GEN: 'Demand Gen, Discovery, display nativo ou feeds',
        PMAX: 'Performance Max',
        nao_informado: 'O texto não nomeia canal, ou nomeia algo que não é canal do Google Ads',
      },
    );
  }
  return questions;
}

export type StrategyInputsJudgment = {
  presellTipo: JudgedChoice<PresellTipoJudgment> | null;
  funil: JudgedChoice<FunilJudgment> | null;
  canal: JudgedChoice<CanalJudgment> | null;
  prohibitions: VendorProhibitionJudgment[];
};

/**
 * Uma request para tudo que deriveCampaignStrategy() precisa julgar sobre o produto: normalização
 * do texto do dossiê e escopo de cada proibição do vendor. Perguntas independentes sobre o mesmo
 * estado — rodam em paralelo no serviço, num round trip.
 */
export async function judgeStrategyInputs(input: {
  produto: string;
  presellTipoTexto?: string | null;
  canalTexto?: string | null;
  regras?: string[];
}): Promise<StrategyInputsJudgment | null> {
  const presellTipoTexto = input.presellTipoTexto?.trim() || null;
  const canalTexto = input.canalTexto?.trim() || null;
  const regras = (input.regras ?? []).map((r) => String(r ?? '').trim()).filter(Boolean);

  const questions = {
    ...strategyNormalizationQuestions(presellTipoTexto, canalTexto),
    ...vendorProhibitionQuestions(regras, input.produto),
  };
  if (Object.keys(questions).length === 0) return null;

  const res = await askSystemOne({ produto: { nome: input.produto } }, questions, {
    label: 'judgeStrategyInputs',
    timeoutMs: 12000,
  });
  if (!res) return null;

  const answers = res.answers as Record<string, any>;
  return {
    presellTipo: presellTipoTexto ? readChoice<PresellTipoJudgment>(answers.tipo_presell) : null,
    funil: presellTipoTexto ? readChoice<FunilJudgment>(answers.funil_de_venda) : null,
    canal: canalTexto ? readChoice<CanalJudgment>(answers.canal_da_campanha) : null,
    prohibitions: regras.map((regra, index) => ({
      regra,
      escopo: readChoice<ProibicaoEscopo>(answers[`escopo_${index}`]),
      canal: readChoice<CanalProibido>(answers[`canal_${index}`]),
    })),
  };
}

// ---------------------------------------------------------------------------
// 4. Intenção de uma sugestão do autocomplete
// ---------------------------------------------------------------------------
// Grupos do mapa de intenção de lib/autocompleteService.ts. A origem da sugestão (qual modificador
// a trouxe) continua sendo código — é procedência, não julgamento. Isto aqui é só para a sugestão
// que veio do baseline e não tem procedência nenhuma.

export type SearchIntentGroup = 'questions' | 'commercial' | 'informational' | 'brand';

export function searchIntentQuestions(sugestoes: string[]) {
  const questions: Record<string, ReturnType<typeof choice>> = {};
  sugestoes.forEach((sugestao, index) => {
    questions[`intencao_${index}`] = choice(
      { sugestao, question: 'Qual a intenção da busca em `sugestao`?' },
      {
        questions: {
          what: 'Pergunta direta: quem busca quer uma explicação, formulada como pergunta',
          examples: ['como tomar lymphflow', 'por que minhas pernas incham', 'qual o melhor horário'],
        },
        commercial: {
          what: 'Intenção de compra: preço, onde comprar, cupom, frete, garantia',
          not_for: 'Avaliar se vale a pena antes de decidir',
          examples: ['lymphflow preço', 'onde comprar lymphflow', 'cupom de desconto'],
        },
        informational: {
          what: 'Quer avaliar ou entender: review, funciona, efeitos colaterais, depoimento, comparação',
          examples: ['lymphflow funciona', 'efeitos colaterais', 'lymphflow reclame aqui', 'antes e depois'],
        },
        brand: {
          what: 'Busca a marca ou a fonte oficial em si',
          examples: ['lymphflow site oficial', 'lymphflow original', 'fabricante lymphflow'],
        },
      },
    );
  });
  return questions;
}

/** Uma request para todas as sugestões sem procedência. */
export async function judgeSearchIntents(
  sugestoes: string[],
  contexto: Record<string, string | number | null> = {},
): Promise<Array<JudgedChoice<SearchIntentGroup>> | null> {
  const limpas = sugestoes.map((s) => String(s ?? '').trim()).filter(Boolean);
  if (limpas.length === 0) return [];

  const res = await askSystemOne({ pesquisa: contexto }, searchIntentQuestions(limpas), {
    label: 'judgeSearchIntents',
    timeoutMs: 15000,
  });
  if (!res) return null;

  const answers = res.answers as Record<string, any>;
  return limpas.map((_, index) => readChoice<SearchIntentGroup>(answers[`intencao_${index}`]));
}

// ---------------------------------------------------------------------------
// 5. Camada e match type de keyword
// ---------------------------------------------------------------------------
// Substitui inferIntent() + fallbackLayer() + o prompt-and-parse de app/api/atp/analyze/route.ts,
// onde um LLM generativo devolve JSON com as 40 keywords repetidas de volta e o código as
// reencontra por string.
//
// ATENÇÃO — taxonomia canônica: A = fundo de funil/comercial, B = comparação/review,
// C = problema/dor, D = informacional. É a definição do SEO & Keyword Architect (lib/agents.ts:44),
// do catálogo de subsídios (lib/generated/catalogo.ts) e é a que LAYER_TO_STAGE em
// lib/campaign-strategy.ts usa pra derivar o estágio de funil. O prompt do ATP Keyword Analyst
// usava A e D invertidos (A=Problema, D=Comercial), o que fazia keyword comercial virar estágio
// TOPO na campanha. Aqui existe uma definição só.

export type KeywordLayerJudgment = 'A' | 'B' | 'C' | 'D';
export type MatchTypeJudgment = 'exact' | 'phrase';

const LAYER_CRITERIA: ChoiceCriteria = {
  A: {
    what: 'Fundo de funil: quem busca já quer comprar ou procura a marca/produto pelo nome',
    not_for: 'Comparar opções antes de decidir',
    examples: ['comprar lymphflow', 'lymphflow preço', 'onde comprar suplemento linfático', 'lymphflow official site'],
  },
  B: {
    what: 'Comparação e avaliação: escolhe entre opções, procura review, opinião ou se funciona',
    not_for: 'Termo de compra direta, ou dúvida sobre a condição em si',
    examples: ['lymphflow review', 'melhor suplemento linfático', 'lymphflow funciona', 'x vs y'],
  },
  C: {
    what: 'Problema ou dor: descreve o sintoma/situação, sem citar categoria de produto nem marca',
    not_for: 'Buscar produto ou solução pelo nome',
    examples: ['pernas inchadas o tempo todo', 'como reduzir retenção de líquido', 'lymphedema swelling relief'],
  },
  D: {
    what: 'Informacional amplo: quer entender o assunto, sem intenção de resolver uma compra agora',
    not_for: 'Dor específica que a pessoa quer aliviar, ou comparação de produtos',
    examples: ['o que é sistema linfático', 'how does lymphatic drainage work', 'anatomia do sistema linfático'],
  },
};

export function keywordQuestions(keywords: string[]) {
  const questions: Record<string, ReturnType<typeof choice>> = {};
  keywords.forEach((keyword, index) => {
    questions[`camada_${index}`] = choice(
      {
        keyword,
        question: 'Em que camada de intenção está a busca em `keyword`?',
        focus: 'Julgue a intenção de quem digita a busca, não o assunto do produto.',
      },
      LAYER_CRITERIA,
    );
    questions[`match_${index}`] = choice(
      {
        keyword,
        question: 'Que match type do Google Ads serve melhor para `keyword` numa campanha de afiliado?',
      },
      {
        exact: {
          what: 'Termo específico e de intenção clara, onde variações trariam tráfego irrelevante',
          examples: ['comprar lymphflow', 'lymphflow review'],
        },
        phrase: {
          what: 'Termo amplo ou descritivo, que se beneficia de variações próximas',
          examples: ['suplemento para retenção de líquido', 'pernas inchadas'],
        },
      },
    );
  });
  return questions;
}

export type KeywordJudgment = {
  keyword: string;
  layer: JudgedChoice<KeywordLayerJudgment>;
  matchType: JudgedChoice<MatchTypeJudgment>;
};

/** Uma request para todas as keywords: cada pergunta é independente e roda em paralelo. O id
 * carrega o índice, então a resposta volta ligada à keyword certa — sem reencontrar por string. */
export async function judgeKeywords(
  keywords: string[],
  contexto: Record<string, string | number | null> = {},
): Promise<KeywordJudgment[] | null> {
  const limpas = keywords.map((k) => String(k ?? '').trim()).filter(Boolean);
  if (limpas.length === 0) return [];

  const res = await askSystemOne({ campanha: contexto }, keywordQuestions(limpas), {
    label: 'judgeKeywords',
    // 40 keywords = 80 perguntas numa request; o padrão de 8s é curto pra esse lote.
    timeoutMs: 20000,
  });
  if (!res) return null;

  const answers = res.answers as Record<string, any>;
  return limpas.map((keyword, index) => ({
    keyword,
    layer: readChoice<KeywordLayerJudgment>(answers[`camada_${index}`]),
    matchType: readChoice<MatchTypeJudgment>(answers[`match_${index}`]),
  }));
}
