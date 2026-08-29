import { z } from 'zod';
import { callAgent } from './llm';
import type { PersistFn, PersistResult } from './product-agent-persistence';
import {
  resolveScope,
  persistBrandKit,
  persistOfferDesign,
  persistClaimLedger,
  persistContentArchitecture,
  persistCopyQaReport,
  persistVisualSystem,
  persistLaunchPlan,
} from './product-agent-persistence';

/**
 * Agentes de produto próprio (e-book / low-ticket / mentoria).
 *
 * Método destilado dos frameworks importados de ~/infoprod
 * (ver docs/PROCEDENCIA_INFOPROD.md). Nenhum agente aqui carrega marca:
 * paleta, tom e fatos entram sempre pelo input (Brand Kit da campanha).
 */

const BASE_RULES = `Regras invioláveis:
1. Você é agnóstico de marca. Nunca invente nome de marca, paleta, fonte ou claim.
   Use somente o que vier no input; o que faltar, devolva como pergunta em "gaps".
2. Nunca apresente inferência como fato. Número sem fonte no input é hipótese.
3. Nunca prometa resultado garantido, cura, ganho financeiro certo ou prazo fixo.
4. Responda SOMENTE com JSON válido no schema pedido, sem texto fora do JSON.`;

export interface ProductAgentSpec<I extends z.ZodTypeAny, O extends z.ZodTypeAny> {
  agent: string;
  input: I;
  output: O;
  systemPrompt: string;
  buildUserPrompt: (input: z.infer<I>) => string;
  /** Grava a saída validada no escopo (campanha/produto) do input. Sem isso o artefato morre na tela. */
  persist?: PersistFn<z.infer<I>, z.infer<O>>;
}

const campaignScope = {
  campaignId: z.string().min(1).optional(),
  productResearchId: z.string().min(1).optional(),
};

// --------------------------------------------------------------------------
// 1. brand-dna-extractor — Brand Kit da campanha
// --------------------------------------------------------------------------

const BrandKitInput = z.object({
  brandName: z.string().min(1),
  niche: z.string().min(1),
  audience: z.string().min(1),
  references: z.array(z.string()).default([]),
  notes: z.string().optional(),
  ...campaignScope,
});

const BrandKitOutput = z.object({
  palette: z.array(z.object({
    role: z.enum(['primary', 'secondary', 'accent', 'surface', 'text']),
    hex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    usage: z.string(),
  })).min(3),
  typography: z.object({
    display: z.string(),
    text: z.string(),
    rationale: z.string(),
  }),
  tone: z.object({
    voice: z.string(),
    dos: z.array(z.string()).min(3),
    donts: z.array(z.string()).min(3),
  }),
  bannedWords: z.array(z.string()).default([]),
  positioning: z.string(),
  gaps: z.array(z.string()).default([]),
});

export const brandDnaExtractor: ProductAgentSpec<typeof BrandKitInput, typeof BrandKitOutput> = {
  agent: 'brand-dna-extractor',
  input: BrandKitInput,
  output: BrandKitOutput,
  systemPrompt: `Você é um diretor de marca. A partir de nicho, público e referências,
deriva um Brand Kit operacional: paleta com papéis definidos, par tipográfico,
tom de voz com regras acionáveis e lista de palavras proibidas para o nicho.

A paleta precisa passar em contraste AA para texto sobre superfície.
Palavras proibidas devem refletir o risco regulatório real do nicho
(saúde, finanças, apostas exigem lista mais dura).

${BASE_RULES}

Schema:
{"palette":[{"role":"primary|secondary|accent|surface|text","hex":"#RRGGBB","usage":"..."}],
 "typography":{"display":"...","text":"...","rationale":"..."},
 "tone":{"voice":"...","dos":["..."],"donts":["..."]},
 "bannedWords":["..."],"positioning":"...","gaps":["..."]}`,
  buildUserPrompt: (i) => `Marca: ${i.brandName}
Nicho: ${i.niche}
Público: ${i.audience}
Referências visuais/verbais: ${i.references.length ? i.references.join('; ') : 'nenhuma fornecida'}
Observações: ${i.notes ?? 'nenhuma'}

Derive o Brand Kit.`,
  persist: persistBrandKit,
};

// --------------------------------------------------------------------------
// 2. offer-architect — desenho da oferta low-ticket
// --------------------------------------------------------------------------

const OfferInput = z.object({
  productName: z.string().min(1),
  productType: z.enum(['EBOOK', 'MINI_CURSO', 'TEMPLATE', 'MENTORIA', 'OUTRO']).default('EBOOK'),
  audience: z.string().min(1),
  mainPain: z.string().min(1),
  priceHint: z.number().positive().optional(),
  currency: z.string().default('BRL'),
  ...campaignScope,
});

const OfferOutput = z.object({
  promise: z.string(),
  deliverables: z.array(z.object({ name: z.string(), why: z.string() })).min(2),
  price: z.object({ value: z.number(), currency: z.string(), rationale: z.string() }),
  bump: z.object({ name: z.string(), value: z.number(), rationale: z.string() }).nullable(),
  upsell: z.object({ name: z.string(), value: z.number(), rationale: z.string() }).nullable(),
  guarantee: z.string(),
  reasonToBuyNow: z.string(),
  objections: z.array(z.object({ objection: z.string(), answer: z.string() })).min(3),
  gaps: z.array(z.string()).default([]),
});

export const offerArchitect: ProductAgentSpec<typeof OfferInput, typeof OfferOutput> = {
  agent: 'offer-architect',
  input: OfferInput,
  output: OfferOutput,
  systemPrompt: `Você é um arquiteto de oferta low-ticket. Desenha promessa, entregáveis,
preço, order bump, upsell, garantia e razão para comprar agora.

Princípios: a promessa nomeia a transformação e o prazo realista, nunca o resultado garantido.
O preço low-ticket vive entre impulso e percepção de valor — justifique com o custo de
oportunidade do público, não com desconto fictício. Bump só existe se completar a mesma
jornada; upsell só existe se for o passo seguinte natural. Garantia é incondicional e curta.

${BASE_RULES}

Schema:
{"promise":"...","deliverables":[{"name":"...","why":"..."}],
 "price":{"value":0,"currency":"BRL","rationale":"..."},
 "bump":{"name":"...","value":0,"rationale":"..."}|null,
 "upsell":{"name":"...","value":0,"rationale":"..."}|null,
 "guarantee":"...","reasonToBuyNow":"...",
 "objections":[{"objection":"...","answer":"..."}],"gaps":["..."]}`,
  buildUserPrompt: (i) => `Produto: ${i.productName} (${i.productType})
Público: ${i.audience}
Dor principal: ${i.mainPain}
Preço sugerido pelo operador: ${i.priceHint ?? 'não definido'} ${i.currency}

Desenhe a oferta.`,
  persist: persistOfferDesign,
};

// --------------------------------------------------------------------------
// 3. fact-steward — claim ledger
// --------------------------------------------------------------------------

const ClaimsInput = z.object({
  claims: z.array(z.string().min(1)).min(1),
  productName: z.string().optional(),
  niche: z.string().optional(),
  sources: z.array(z.object({
    claim: z.string(),
    url: z.string(),
    accessedAt: z.string().optional(),
  })).default([]),
  ...campaignScope,
});

const ClaimsOutput = z.object({
  ledger: z.array(z.object({
    claim: z.string(),
    status: z.enum(['FATO', 'INFERENCIA', 'PROIBIDO']),
    source: z.string().nullable(),
    rewrite: z.string(),
    allowedChannels: z.array(z.string()).default([]),
    reason: z.string(),
  })).min(1),
  blocked: z.array(z.string()).default([]),
});

export const factSteward: ProductAgentSpec<typeof ClaimsInput, typeof ClaimsOutput> = {
  agent: 'fact-steward',
  input: ClaimsInput,
  output: ClaimsOutput,
  systemPrompt: `Você é o Fact Steward. Recebe uma lista de afirmações e classifica cada uma:

- FATO: sustentada por fonte no input (url + data de acesso). Só então pode ser dita como fato.
- INFERENCIA: plausível mas sem fonte. Precisa de reescrita em linguagem condicional.
- PROIBIDO: promessa de cura, resultado garantido, ganho financeiro certo, prazo fixo,
  comparação depreciativa de concorrente, ou claim que viola política de mídia paga.

Para toda afirmação devolva uma reescrita segura — inclusive para FATO, indicando como citar a fonte.
"allowedChannels" lista onde a versão reescrita pode rodar: "organico", "email", "landing",
"google-ads", "meta-ads". Claim PROIBIDO tem allowedChannels vazio e entra em "blocked".

${BASE_RULES}

Schema:
{"ledger":[{"claim":"...","status":"FATO|INFERENCIA|PROIBIDO","source":"url"|null,
 "rewrite":"...","allowedChannels":["..."],"reason":"..."}],"blocked":["..."]}`,
  buildUserPrompt: (i) => `Produto: ${i.productName ?? 'não informado'}
Nicho: ${i.niche ?? 'não informado'}

Fontes disponíveis:
${i.sources.length
    ? i.sources.map((s) => `- "${s.claim}" → ${s.url} (acesso: ${s.accessedAt ?? 'sem data'})`).join('\n')
    : '- nenhuma fonte fornecida'}

Afirmações a classificar:
${i.claims.map((c, n) => `${n + 1}. ${c}`).join('\n')}`,
  persist: persistClaimLedger,
};

// --------------------------------------------------------------------------
// 4. content-architect — matriz editorial
// --------------------------------------------------------------------------

const ContentInput = z.object({
  productName: z.string().min(1),
  audience: z.string().min(1),
  promise: z.string().min(1),
  modules: z.number().int().min(3).max(20).default(7),
  format: z.enum(['EBOOK', 'MINI_CURSO', 'CHECKLIST', 'TEMPLATE']).default('EBOOK'),
  ...campaignScope,
});

const ContentOutput = z.object({
  modules: z.array(z.object({
    order: z.number().int(),
    title: z.string(),
    promise: z.string(),
    artifact: z.string(),
    outcome: z.string(),
  })).min(3),
  sequenceRationale: z.string(),
  gaps: z.array(z.string()).default([]),
});

export const contentArchitect: ProductAgentSpec<typeof ContentInput, typeof ContentOutput> = {
  agent: 'content-architect',
  input: ContentInput,
  output: ContentOutput,
  systemPrompt: `Você é arquiteto de conteúdo. Transforma uma promessa em matriz editorial:
cada módulo tem promessa própria, um artefato concreto que o leitor termina com ele
(checklist, template, script, planilha) e um resultado observável.

Um módulo sem artefato é teoria e deve ser fundido com outro. A sequência precisa de
razão explícita: por que este módulo antes daquele.

${BASE_RULES}

Schema:
{"modules":[{"order":1,"title":"...","promise":"...","artifact":"...","outcome":"..."}],
 "sequenceRationale":"...","gaps":["..."]}`,
  buildUserPrompt: (i) => `Produto: ${i.productName} (formato ${i.format})
Público: ${i.audience}
Promessa: ${i.promise}
Número de módulos desejado: ${i.modules}

Monte a matriz editorial.`,
  persist: persistContentArchitecture,
};

// --------------------------------------------------------------------------
// 5. anti-slop-editor — QA de copy
// --------------------------------------------------------------------------

const CopyQaInput = z.object({
  text: z.string().min(1),
  context: z.string().optional(),
  ...campaignScope,
});

const CopyQaOutput = z.object({
  score: z.number().min(0).max(100),
  issues: z.array(z.object({
    excerpt: z.string(),
    type: z.enum(['CLICHE_IA', 'VAGO', 'HYPE', 'REDUNDANTE', 'CLAIM_SEM_FONTE', 'JARGAO']),
    why: z.string(),
    rewrite: z.string(),
  })).default([]),
  rewritten: z.string(),
});

export const antiSlopEditor: ProductAgentSpec<typeof CopyQaInput, typeof CopyQaOutput> = {
  agent: 'anti-slop-editor',
  input: CopyQaInput,
  output: CopyQaOutput,
  systemPrompt: `Você é editor anti-slop. Recebe um texto e corta tudo que soa a IA genérica.

Caça: abertura com "No mundo de hoje", "Em um cenário cada vez mais", listas de três
adjetivos sem substância, "não é apenas X, é Y", "mergulhe", "desbloqueie", "revolucionário",
"game-changer", superlativo sem número, promessa sem sujeito, transição vazia
("além disso", "por outro lado" ligando nada), e claim sem fonte.

"score" é a densidade de informação de 0 a 100: quanto do texto sobreviveria a um leitor
que já conhece o assunto. "rewritten" devolve o texto inteiro reescrito, mesmo comprimento
ou menor, mantendo a voz do original.

${BASE_RULES}

Schema:
{"score":0,"issues":[{"excerpt":"...","type":"CLICHE_IA|VAGO|HYPE|REDUNDANTE|CLAIM_SEM_FONTE|JARGAO",
 "why":"...","rewrite":"..."}],"rewritten":"..."}`,
  buildUserPrompt: (i) => `Contexto: ${i.context ?? 'não informado'}

Texto a auditar:
"""
${i.text}
"""`,
  persist: persistCopyQaReport,
};

// --------------------------------------------------------------------------
// 6. visual-system-designer — sistema visual da peça
// --------------------------------------------------------------------------

const VisualInput = z.object({
  surface: z.enum(['EBOOK', 'LANDING', 'CRIATIVO', 'CARROSSEL']).default('EBOOK'),
  palette: z.array(z.object({ role: z.string(), hex: z.string() })).min(2),
  typography: z.object({ display: z.string(), text: z.string() }),
  mood: z.string().optional(),
  ...campaignScope,
});

const VisualOutput = z.object({
  typeScale: z.array(z.object({
    role: z.string(),
    sizePx: z.number(),
    weight: z.number(),
    lineHeight: z.number(),
  })).min(4),
  spacing: z.array(z.object({ token: z.string(), px: z.number() })).min(4),
  grid: z.string(),
  coverDirection: z.string(),
  contrastChecks: z.array(z.object({
    pair: z.string(),
    ratio: z.number(),
    passesAA: z.boolean(),
  })).default([]),
  gaps: z.array(z.string()).default([]),
});

export const visualSystemDesigner: ProductAgentSpec<typeof VisualInput, typeof VisualOutput> = {
  agent: 'visual-system-designer',
  input: VisualInput,
  output: VisualOutput,
  systemPrompt: `Você é designer de sistema visual. A partir de paleta e par tipográfico
recebidos, deriva escala tipográfica, escala de espaçamento, grid, direção de capa
e a checagem de contraste dos pares texto/fundo.

A escala tipográfica usa razão constante e no máximo 6 degraus. O espaçamento é múltiplo
de uma base única. Todo par de cor usado para texto precisa de razão de contraste calculada
e do veredito AA (4.5 para corpo, 3.0 para display acima de 24px).

Não invente cor nem fonte fora do que veio no input.

${BASE_RULES}

Schema:
{"typeScale":[{"role":"...","sizePx":0,"weight":400,"lineHeight":1.5}],
 "spacing":[{"token":"...","px":0}],"grid":"...","coverDirection":"...",
 "contrastChecks":[{"pair":"texto sobre surface","ratio":0,"passesAA":true}],"gaps":["..."]}`,
  buildUserPrompt: (i) => `Superfície: ${i.surface}
Paleta: ${i.palette.map((p) => `${p.role}=${p.hex}`).join(', ')}
Tipografia: display=${i.typography.display}, texto=${i.typography.text}
Mood: ${i.mood ?? 'não informado'}

Derive o sistema visual.`,
  persist: persistVisualSystem,
};

// --------------------------------------------------------------------------
// 7. launch-strategist — plano de lançamento
// --------------------------------------------------------------------------

const LaunchInput = z.object({
  productName: z.string().min(1),
  productType: z.enum(['EBOOK', 'MINI_CURSO', 'MENTORIA', 'OUTRO']).default('EBOOK'),
  price: z.number().positive(),
  currency: z.string().default('BRL'),
  budgetTotal: z.number().positive().optional(),
  channels: z.array(z.string()).default([]),
  ...campaignScope,
});

const LaunchOutput = z.object({
  organicProof: z.array(z.string()).min(2),
  experimentCard: z.object({
    hypothesis: z.string(),
    metric: z.string(),
    threshold: z.string(),
    durationDays: z.number().int().positive(),
    budget: z.number(),
  }),
  scaleGates: z.array(z.object({
    gate: z.string(),
    condition: z.string(),
    action: z.string(),
  })).min(2),
  testBudget: z.object({ daily: z.number(), total: z.number(), currency: z.string() }),
  gaps: z.array(z.string()).default([]),
});

export const launchStrategist: ProductAgentSpec<typeof LaunchInput, typeof LaunchOutput> = {
  agent: 'launch-strategist',
  input: LaunchInput,
  output: LaunchOutput,
  systemPrompt: `Você é estrategista de lançamento low-ticket. Antes de mídia paga,
exige prova orgânica: o que precisa converter sem tráfego pago para o teste fazer sentido.

Depois desenha um experiment card único (hipótese, métrica, limiar, duração, orçamento)
e os gates de escala: condição observável e ação correspondente, incluindo o gate de matar.
O orçamento de teste é derivado do preço: um teste que não consegue comprar conversões
suficientes para ler o resultado não é um teste.

${BASE_RULES}

Schema:
{"organicProof":["..."],
 "experimentCard":{"hypothesis":"...","metric":"...","threshold":"...","durationDays":7,"budget":0},
 "scaleGates":[{"gate":"...","condition":"...","action":"..."}],
 "testBudget":{"daily":0,"total":0,"currency":"BRL"},"gaps":["..."]}`,
  buildUserPrompt: (i) => `Produto: ${i.productName} (${i.productType})
Preço: ${i.price} ${i.currency}
Orçamento total disponível: ${i.budgetTotal ?? 'não informado'} ${i.currency}
Canais pretendidos: ${i.channels.length ? i.channels.join(', ') : 'não informado'}

Monte o plano de lançamento.`,
  persist: persistLaunchPlan,
};

// --------------------------------------------------------------------------
// Runner compartilhado
// --------------------------------------------------------------------------

export interface ProductAgentRun<O> {
  ok: true;
  agent: string;
  data: O;
  usage: { promptTokens: number; completionTokens: number; totalTokens: number };
  provider: string;
  model: string;
  /** id do artefato gravado (null quando o agente não persiste). */
  recordId: string | null;
  /** versão do artefato dentro do escopo (campanha/produto). */
  version: number | null;
}

export async function runProductAgent<I extends z.ZodTypeAny, O extends z.ZodTypeAny>(
  userId: string,
  spec: ProductAgentSpec<I, O>,
  rawInput: unknown
): Promise<ProductAgentRun<z.infer<O>>> {
  const input = spec.input.parse(rawInput) as z.infer<I> & { campaignId?: string; productResearchId?: string };
  const campaignId = input.campaignId;

  // Escopo antes do LLM: um campaignId de outro usuário tem que virar 404 sem gastar token.
  const scope = spec.persist ? await resolveScope(userId, input) : null;

  const res = await callAgent(userId, {
    agent: spec.agent,
    systemPrompt: spec.systemPrompt,
    userPrompt: spec.buildUserPrompt(input),
    json: true,
    campaignId,
    campaignTarget: campaignId ? { kind: 'campaign', campaignId } : { kind: 'non-campaign' },
    validate: (data) => {
      const parsed = spec.output.safeParse(data);
      return parsed.success ? null : parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
    },
  });

  const parsed = spec.output.safeParse(res.data);
  if (!parsed.success) {
    throw new Error(`Saída do agente ${spec.agent} fora do contrato: ${parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')}`);
  }

  const usage = {
    promptTokens: res.usage?.promptTokens ?? 0,
    completionTokens: res.usage?.completionTokens ?? 0,
    totalTokens: res.usage?.totalTokens ?? 0,
  };

  // A escrita não pode derrubar a resposta: se o banco falhar depois do LLM ter respondido,
  // o usuário ainda recebe o artefato (com version null, que a UI mostra como "não salvo").
  let persisted: PersistResult | null = null;
  if (spec.persist && scope) {
    try {
      persisted = await spec.persist({
        userId,
        input,
        output: parsed.data,
        scope,
        telemetry: {
          provider: res.provider,
          model: res.model,
          totalTokens: usage.totalTokens,
          durationMs: res.durationMs ?? 0,
        },
      });
    } catch (err) {
      console.error(`[product-agents] falha ao persistir ${spec.agent}:`, err);
    }
  }

  return {
    ok: true,
    agent: spec.agent,
    data: parsed.data,
    usage,
    provider: res.provider,
    model: res.model,
    recordId: persisted?.recordId ?? null,
    version: persisted?.version ?? null,
  };
}
