import { beforeEach, describe, expect, it, vi } from 'vitest';
import { callAgent } from './llm';
import {
  antiSlopEditor,
  brandDnaExtractor,
  factSteward,
  launchStrategist,
  runProductAgent,
} from './product-agents';

vi.mock('./llm', () => ({ callAgent: vi.fn() }));

// Contrato dos agentes é uma coisa; gravar no banco é outra. A persistência tem teste
// próprio em product-agent-persistence.test.ts — aqui ela vira no-op para o teste não
// depender de Postgres.
vi.mock('./product-agent-persistence', async () => {
  const actual = await vi.importActual<typeof import('./product-agent-persistence')>(
    './product-agent-persistence'
  );
  const noop = vi.fn(async () => ({ recordId: 'rec-1', version: 1 }));
  return {
    ...actual,
    resolveScope: vi.fn(async (_userId: string, input: any) => ({
      campaignId: input.campaignId ?? null,
      productResearchId: input.productResearchId ?? null,
    })),
    persistBrandKit: noop,
    persistOfferDesign: noop,
    persistClaimLedger: noop,
    persistContentArchitecture: noop,
    persistCopyQaReport: noop,
    persistVisualSystem: noop,
    persistLaunchPlan: noop,
  };
});

const brandKit = {
  palette: [
    { role: 'primary', hex: '#1D4ED8', usage: 'CTA' },
    { role: 'surface', hex: '#0F172A', usage: 'fundo' },
    { role: 'text', hex: '#F8FAFC', usage: 'corpo' },
  ],
  typography: { display: 'Inter Tight', text: 'Inter', rationale: 'legibilidade' },
  tone: {
    voice: 'direto',
    dos: ['falar em primeira pessoa', 'usar números verificáveis', 'nomear o problema'],
    donts: ['prometer cura', 'garantir ganho', 'usar urgência falsa'],
  },
  bannedWords: ['cura'],
  positioning: 'guia prático para iniciantes',
  gaps: [],
};

function mockAgent(data: unknown) {
  vi.mocked(callAgent).mockResolvedValue({
    text: JSON.stringify(data),
    data,
    usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
    durationMs: 1,
    provider: 'openrouter',
    model: 'moonshotai/kimi-k2.5',
  } as any);
}

describe('runProductAgent', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('valida entrada antes de chamar o LLM', async () => {
    await expect(
      runProductAgent('user-1', brandDnaExtractor, { brandName: '', niche: 'fit', audience: 'x' })
    ).rejects.toThrow();
    expect(callAgent).not.toHaveBeenCalled();
  });

  it('retorna dados tipados e usage quando a saída respeita o contrato', async () => {
    mockAgent(brandKit);

    const run = await runProductAgent('user-1', brandDnaExtractor, {
      brandName: 'Doce Lucro',
      niche: 'receitas fit',
      audience: 'mulheres 30-45 que querem sobremesa sem culpa',
    });

    expect(run.ok).toBe(true);
    expect(run.agent).toBe('brand-dna-extractor');
    expect(run.data.palette).toHaveLength(3);
    expect(run.usage.totalTokens).toBe(30);
    expect(run.provider).toBe('openrouter');
  });

  it('usa escopo non-campaign quando não há campaignId', async () => {
    mockAgent(brandKit);
    await runProductAgent('user-1', brandDnaExtractor, {
      brandName: 'X',
      niche: 'y',
      audience: 'z',
    });

    const opts = vi.mocked(callAgent).mock.calls[0][1] as any;
    expect(opts.campaignTarget).toEqual({ kind: 'non-campaign' });
    expect(opts.campaignId).toBeUndefined();
    expect(opts.json).toBe(true);
  });

  it('propaga campaignId para o guard de campanha', async () => {
    mockAgent(brandKit);
    await runProductAgent('user-1', brandDnaExtractor, {
      brandName: 'X',
      niche: 'y',
      audience: 'z',
      campaignId: 'camp-9',
    });

    const opts = vi.mocked(callAgent).mock.calls[0][1] as any;
    expect(opts.campaignId).toBe('camp-9');
    expect(opts.campaignTarget).toEqual({ kind: 'campaign', campaignId: 'camp-9' });
  });

  it('rejeita saída fora do contrato', async () => {
    mockAgent({ ...brandKit, palette: [{ role: 'primary', hex: 'azul', usage: 'CTA' }] });

    await expect(
      runProductAgent('user-1', brandDnaExtractor, { brandName: 'X', niche: 'y', audience: 'z' })
    ).rejects.toThrow(/fora do contrato/);
  });

  it('entrega o validate ao callAgent para permitir retry no provider', async () => {
    mockAgent(brandKit);
    await runProductAgent('user-1', brandDnaExtractor, {
      brandName: 'X',
      niche: 'y',
      audience: 'z',
    });

    const opts = vi.mocked(callAgent).mock.calls[0][1] as any;
    expect(typeof opts.validate).toBe('function');
    expect(opts.validate(brandKit)).toBeNull();
    expect(opts.validate({ palette: [] })).toMatch(/palette/);
  });
});

describe('contratos dos agentes de produto', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('fact-steward classifica cada claim no ledger com status e reescrita', async () => {
    mockAgent({
      ledger: [
        {
          claim: 'perde 5kg em 30 dias',
          status: 'PROIBIDO',
          source: null,
          rewrite: 'resultados variam conforme rotina e adesão',
          allowedChannels: [],
          reason: 'promessa de resultado sem estudo próprio',
        },
      ],
      blocked: ['perde 5kg em 30 dias'],
    });

    const run = await runProductAgent('u', factSteward, {
      productName: 'E-book fit',
      niche: 'emagrecimento',
      claims: ['perde 5kg em 30 dias'],
    });

    expect(run.data.ledger[0].status).toBe('PROIBIDO');
    expect(run.data.ledger[0].source).toBeNull();
    expect(run.data.blocked).toContain('perde 5kg em 30 dias');
  });

  it('anti-slop-editor devolve score, issues tipadas e texto reescrito', async () => {
    mockAgent({
      score: 62,
      issues: [
        {
          excerpt: 'nesta era digital',
          type: 'CLICHE_IA',
          why: 'abertura genérica que não diz nada',
          rewrite: 'corta a frase e começa pelo problema',
        },
      ],
      rewritten: 'Você abre a geladeira às 21h e não tem nada que caiba na dieta.',
    });

    const run = await runProductAgent('u', antiSlopEditor, {
      text: 'Nesta era digital, é importante notar que...',
      context: 'landing',
    });

    expect(run.data.score).toBe(62);
    expect(run.data.issues[0].type).toBe('CLICHE_IA');
  });

  it('launch-strategist exige prova orgânica e gates antes de escalar', async () => {
    mockAgent({
      organicProof: ['2 posts com salvamento acima da média', '1 lista de espera com 80 e-mails'],
      experimentCard: {
        hypothesis: 'público de receitas fit compra a R$ 47',
        metric: 'CPA',
        threshold: 'CPA <= R$ 18 em 7 dias',
        durationDays: 7,
        budget: 350,
      },
      scaleGates: [
        { gate: 'CPA', condition: 'CPA <= R$ 18 por 3 dias seguidos', action: 'sobe 20% do orçamento' },
        { gate: 'Reembolso', condition: 'reembolso > 8%', action: 'pausa e revisa a entrega' },
      ],
      testBudget: { daily: 50, total: 350, currency: 'BRL' },
      gaps: ['sem histórico de CPA no nicho'],
    });

    const run = await runProductAgent('u', launchStrategist, {
      productName: 'E-book',
      price: 47,
      channels: ['e-mail'],
    });

    expect(run.data.organicProof.length).toBeGreaterThanOrEqual(2);
    expect(run.data.scaleGates.length).toBeGreaterThanOrEqual(2);
    expect(run.data.testBudget.currency).toBe('BRL');
  });
});
