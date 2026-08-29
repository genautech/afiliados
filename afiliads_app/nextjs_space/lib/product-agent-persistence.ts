import { prisma } from '@/lib/prisma';

// Fase A do plano de consolidação: o Estúdio de Produto rodava os sete agentes e devolvia
// JSON direto pra tela — fechar a aba perdia o resultado, e nada do que o agente produziu
// chegava na campanha. Aqui cada saída já validada vira linha no banco, no mesmo escopo
// (campanha e/ou produto) que a campanha usa, com versão crescente em vez de sobrescrita.

export interface AgentTelemetry {
  provider: string;
  model: string;
  totalTokens: number;
  durationMs: number;
}

export interface PersistContext<Input, Output> {
  userId: string;
  input: Input;
  output: Output;
  telemetry: AgentTelemetry;
  /** Escopo já validado antes da chamada do LLM — o persistidor não re-resolve. */
  scope: StudioScope;
}

export interface PersistResult {
  recordId: string;
  version: number;
}

export type PersistFn<Input, Output> = (ctx: PersistContext<Input, Output>) => Promise<PersistResult>;

/** Escopo em que um artefato do estúdio vive. Ao menos um dos dois costuma vir preenchido. */
export interface StudioScope {
  campaignId: string | null;
  productResearchId: string | null;
}

/** Erro de escopo: id existe mas não é do usuário, ou não existe. A rota traduz em 404. */
export class StudioScopeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StudioScopeError';
  }
}

/**
 * Confirma que campanha e produto referenciados pertencem ao usuário antes de gravar.
 * Mesmo padrão de `findFirst({ where: { id, userId } })` já usado nas rotas de campanha —
 * sem isso, um `campaignId` adivinhado escreveria artefato na campanha de outro usuário.
 */
export async function resolveScope(
  userId: string,
  input: { campaignId?: string; productResearchId?: string },
): Promise<StudioScope> {
  const campaignId = input.campaignId ?? null;
  const productResearchId = input.productResearchId ?? null;

  if (campaignId) {
    const campaign = await prisma.campaign.findFirst({ where: { id: campaignId, userId }, select: { id: true } });
    if (!campaign) throw new StudioScopeError('Campanha não encontrada');
  }
  if (productResearchId) {
    const product = await prisma.productResearch.findFirst({
      where: { id: productResearchId, userId },
      select: { id: true },
    });
    if (!product) throw new StudioScopeError('Produto não encontrado');
  }

  return { campaignId, productResearchId };
}

/**
 * Próxima versão do artefato dentro do escopo. Não sobrescreve: o histórico do estúdio é
 * o que permite comparar a oferta que rodou com a que foi descartada.
 */
async function nextVersion(delegate: any, userId: string, scope: StudioScope): Promise<number> {
  const last = await delegate.findFirst({
    where: { userId, campaignId: scope.campaignId, productResearchId: scope.productResearchId },
    orderBy: { version: 'desc' },
    select: { version: true },
  });
  return (last?.version ?? 0) + 1;
}

/** Colunas comuns a todo artefato do estúdio. */
function baseData(userId: string, scope: StudioScope, version: number, input: unknown, telemetry: AgentTelemetry) {
  return {
    userId,
    campaignId: scope.campaignId,
    productResearchId: scope.productResearchId,
    version,
    input: input as any,
    provider: telemetry.provider,
    model: telemetry.model,
    totalTokens: telemetry.totalTokens,
    durationMs: telemetry.durationMs,
  };
}

/** Fábrica dos persistidores de artefato único (todos menos o ledger de claims). */
function singleRecordPersister<Input extends { campaignId?: string; productResearchId?: string }, Output>(
  delegateName:
    | 'brandKit'
    | 'offerDesign'
    | 'contentArchitecture'
    | 'copyQaReport'
    | 'visualSystem'
    | 'launchPlan',
  mapOutput: (output: Output) => Record<string, unknown>,
): PersistFn<Input, Output> {
  return async ({ userId, input, output, telemetry, scope }) => {
    const delegate = (prisma as any)[delegateName];
    const version = await nextVersion(delegate, userId, scope);
    const created = await delegate.create({
      data: { ...baseData(userId, scope, version, input, telemetry), ...mapOutput(output) },
      select: { id: true, version: true },
    });
    return { recordId: created.id, version: created.version };
  };
}

export const persistBrandKit = singleRecordPersister<any, any>('brandKit', (o) => ({
  palette: o.palette,
  typography: o.typography,
  tone: o.tone,
  bannedWords: o.bannedWords ?? [],
  positioning: o.positioning,
  gaps: o.gaps ?? [],
}));

export const persistOfferDesign = singleRecordPersister<any, any>('offerDesign', (o) => ({
  promise: o.promise,
  deliverables: o.deliverables ?? [],
  price: o.price,
  bump: o.bump ?? null,
  upsell: o.upsell ?? null,
  guarantee: o.guarantee,
  reasonToBuyNow: o.reasonToBuyNow,
  objections: o.objections ?? [],
  gaps: o.gaps ?? [],
}));

export const persistContentArchitecture = singleRecordPersister<any, any>('contentArchitecture', (o) => ({
  modules: o.modules ?? [],
  sequenceRationale: o.sequenceRationale,
  gaps: o.gaps ?? [],
}));

export const persistCopyQaReport = singleRecordPersister<any, any>('copyQaReport', (o) => ({
  score: o.score,
  issues: o.issues ?? [],
  rewritten: o.rewritten,
}));

export const persistVisualSystem = singleRecordPersister<any, any>('visualSystem', (o) => ({
  typeScale: o.typeScale,
  spacing: o.spacing,
  grid: o.grid,
  coverDirection: o.coverDirection,
  contrastChecks: o.contrastChecks ?? [],
  gaps: o.gaps ?? [],
}));

export const persistLaunchPlan = singleRecordPersister<any, any>('launchPlan', (o) => ({
  organicProof: o.organicProof ?? [],
  experimentCard: o.experimentCard,
  scaleGates: o.scaleGates ?? [],
  testBudget: o.testBudget,
  gaps: o.gaps ?? [],
}));

/**
 * O ledger de claims é o único que grava uma linha por item, e não um blob: o gate de
 * compliance precisa perguntar "existe claim PROIBIDO nessa campanha?" sem abrir JSON.
 * `recordId` devolvido é o da primeira linha do lote — o lote inteiro é identificado
 * pelo par (escopo, version).
 */
export const persistClaimLedger: PersistFn<any, any> = async ({ userId, input, output, telemetry, scope }) => {
  const version = await nextVersion(prisma.claimLedgerEntry, userId, scope);

  const rows = (output.ledger ?? []).map((entry: any) => ({
    userId,
    campaignId: scope.campaignId,
    productResearchId: scope.productResearchId,
    version,
    claim: entry.claim,
    status: entry.status,
    source: entry.source ?? null,
    rewrite: entry.rewrite,
    allowedChannels: entry.allowedChannels ?? [],
    reason: entry.reason,
    provider: telemetry.provider,
    model: telemetry.model,
  }));

  if (rows.length === 0) {
    throw new Error('fact-steward devolveu ledger vazio; nada a persistir');
  }

  await prisma.claimLedgerEntry.createMany({ data: rows });
  const first = await prisma.claimLedgerEntry.findFirst({
    where: { userId, campaignId: scope.campaignId, productResearchId: scope.productResearchId, version },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });

  return { recordId: first?.id ?? '', version };
};
