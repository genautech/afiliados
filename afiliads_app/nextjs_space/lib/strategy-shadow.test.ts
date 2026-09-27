import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./typesafe', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./typesafe')>();
  return { ...actual, isShadowModeOn: vi.fn(() => true) };
});
vi.mock('./judgment-shadow-store', () => ({ recordShadowRows: vi.fn(async () => {}) }));
vi.mock('./strategy-judgments', () => ({
  judgeSalesPageType: vi.fn(),
  judgeVendorProhibitions: vi.fn(),
}));

const { isShadowModeOn } = await import('./typesafe');
const { judgeSalesPageType, judgeVendorProhibitions } = await import('./strategy-judgments');
const { shadowSalesPageType, shadowVendorProhibitions } = await import('./strategy-shadow');

const shadowOn = vi.mocked(isShadowModeOn);
const judgeSales = vi.mocked(judgeSalesPageType);
const judgeVendor = vi.mocked(judgeVendorProhibitions);

const judgedChoice = (value: string, confidence: number, usable = confidence >= 0.6) => ({
  value: usable ? value : null,
  raw: value,
  confidence,
  probabilities: { [value]: confidence },
  usable,
}) as any;

beforeEach(() => {
  shadowOn.mockReturnValue(true);
  judgeSales.mockReset();
  judgeVendor.mockReset();
});

describe('shadowSalesPageType', () => {
  it('fica quieto com modo sombra desligado', async () => {
    shadowOn.mockReturnValue(false);
    expect(await shadowSalesPageType('<p>x</p>', 'VSL')).toBeNull();
    expect(judgeSales).not.toHaveBeenCalled();
  });

  it('marca concordância', async () => {
    judgeSales.mockResolvedValue(judgedChoice('DIRECT', 0.9));
    const r = await shadowSalesPageType('<p>carta de vendas</p>', 'DIRECT', 'prod-1');
    expect(r!.concorda).toBe(true);
  });

  it('acusa o falso VSL do "qualquer <video> ⇒ VSL"', async () => {
    // Página de texto com um depoimento em vídeo: a heurística diz VSL, o julgamento diz DIRECT.
    judgeSales.mockResolvedValue(judgedChoice('DIRECT', 0.88));
    const r = await shadowSalesPageType('<p>carta longa com vídeo de depoimento</p>', 'VSL', 'prod-2');
    expect(r).toMatchObject({ heuristica: 'VSL', julgamento: 'DIRECT', concorda: false });
  });

  it('confiança baixa não conta como concordância', async () => {
    judgeSales.mockResolvedValue(judgedChoice('VSL', 0.4));
    const r = await shadowSalesPageType('<p>x</p>', 'VSL');
    expect(r!.concorda).toBe(false);
    expect(r!.julgamento).toContain('confiança baixa');
  });

  it('devolve null sem HTML ou sem julgamento', async () => {
    expect(await shadowSalesPageType(null, 'VSL')).toBeNull();
    judgeSales.mockResolvedValue(null);
    expect(await shadowSalesPageType('<p>x</p>', 'VSL')).toBeNull();
  });
});

describe('shadowVendorProhibitions', () => {
  it('acusa a regra de brand bidding que a regex trata como canal bloqueado', async () => {
    // "Do not bid on our product name" não contém bid|keyword|termo|marca|palavra como token
    // isolado em português... contém "bid", então a regex acerta. O caso que ela erra é o que
    // descreve a proibição sem essas palavras:
    const regra = 'Our trademark must never appear in your ad copy or search terms';
    judgeVendor.mockResolvedValue([
      { regra, escopo: judgedChoice('apenas_termo_de_marca', 0.91), canal: judgedChoice('SEARCH', 0.7) },
    ] as any);

    const r = await shadowVendorProhibitions([regra], 'FemiCore', ['canal_inteiro'], 'prod-3');
    expect(r![0]).toMatchObject({ heuristica: 'canal_inteiro', julgamento: 'apenas_termo_de_marca', concorda: false });
  });

  it('conta concordância quando os dois dizem a mesma coisa', async () => {
    const regra = 'No Google Search advertising allowed';
    judgeVendor.mockResolvedValue([
      { regra, escopo: judgedChoice('canal_inteiro', 0.95), canal: judgedChoice('SEARCH', 0.93) },
    ] as any);
    const r = await shadowVendorProhibitions([regra], 'X', ['canal_inteiro']);
    expect(r![0].concorda).toBe(true);
  });

  it('não roda sem regras, sem modo sombra ou sem julgamento', async () => {
    expect(await shadowVendorProhibitions([], 'X', [])).toBeNull();
    shadowOn.mockReturnValue(false);
    expect(await shadowVendorProhibitions(['r'], 'X', ['canal_inteiro'])).toBeNull();
    shadowOn.mockReturnValue(true);
    judgeVendor.mockResolvedValue(null);
    expect(await shadowVendorProhibitions(['r'], 'X', ['canal_inteiro'])).toBeNull();
  });
});
