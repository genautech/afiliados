import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./typesafe', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./typesafe')>();
  return { ...actual, askSystemOne: vi.fn() };
});

const { askSystemOne } = await import('./typesafe');
const {
  judgeSalesPageType,
  judgeVendorProhibitions,
  vendorProhibitionQuestions,
  judgeKeywords,
  keywordQuestions,
  judgeStrategyInputs,
  judgeSearchIntents,
  CONFIANCA_MINIMA,
} = await import('./strategy-judgments');

const mocked = vi.mocked(askSystemOne);

const choiceAnswer = (choice: string, confidence: number, probabilities: Record<string, number> = {}) => ({
  type: 'choice',
  choice,
  confidence,
  probabilities: { [choice]: confidence, ...probabilities },
});

beforeEach(() => {
  mocked.mockReset();
});

describe('judgeSalesPageType', () => {
  it('usa a escolha quando a confiança passa do mínimo', async () => {
    mocked.mockResolvedValue({ answers: { tipo_sales_page: choiceAnswer('VSL', 0.93) } } as any);
    const r = await judgeSalesPageType('<html><body>play agora</body></html>');
    expect(r!.value).toBe('VSL');
    expect(r!.usable).toBe(true);
  });

  it('não entrega valor com confiança baixa — quem chama mantém a heurística', async () => {
    mocked.mockResolvedValue({ answers: { tipo_sales_page: choiceAnswer('QUIZ', CONFIANCA_MINIMA - 0.1) } } as any);
    const r = await judgeSalesPageType('<html><body>algo</body></html>');
    expect(r!.usable).toBe(false);
    expect(r!.value).toBeNull();
    expect(r!.raw).toBe('QUIZ');
  });

  it('devolve null sem julgamento e sem gastar request em página vazia', async () => {
    mocked.mockResolvedValue(null);
    expect(await judgeSalesPageType('<p>x</p>')).toBeNull();
    mocked.mockReset();
    expect(await judgeSalesPageType('<script>só script</script>')).toBeNull();
    expect(mocked).not.toHaveBeenCalled();
  });
});

describe('vendorProhibitionQuestions', () => {
  it('faz escopo + canal por regra, com a regra dentro das instructions', () => {
    const qs = vendorProhibitionQuestions(['No brand bidding', 'No YouTube ads'], 'FemiCore');
    expect(Object.keys(qs)).toEqual(['escopo_0', 'canal_0', 'escopo_1', 'canal_1']);
    expect((qs.escopo_1.instructions as any).regra_do_vendor).toBe('No YouTube ads');
    expect((qs.escopo_0.instructions as any).nome_do_produto).toBe('FemiCore');
    expect(Object.keys(qs.escopo_0.criteria)).toEqual(['canal_inteiro', 'apenas_termo_de_marca', 'nao_e_proibicao']);
  });
});

describe('judgeVendorProhibitions', () => {
  it('separa brand bidding de canal bloqueado (caso FemiCore)', async () => {
    mocked.mockResolvedValue({
      answers: {
        escopo_0: choiceAnswer('apenas_termo_de_marca', 0.9),
        canal_0: choiceAnswer('SEARCH', 0.7),
        escopo_1: choiceAnswer('canal_inteiro', 0.88),
        canal_1: choiceAnswer('YOUTUBE', 0.95),
      },
    } as any);

    const r = await judgeVendorProhibitions(['Do not bid on our brand name', 'No YouTube ads allowed'], 'FemiCore');
    expect(r![0].escopo.value).toBe('apenas_termo_de_marca');
    expect(r![1].escopo.value).toBe('canal_inteiro');
    expect(r![1].canal.value).toBe('YOUTUBE');
  });

  it('ignora regra vazia e não gasta request sem regra nenhuma', async () => {
    expect(await judgeVendorProhibitions(['', '   '], 'X')).toEqual([]);
    expect(mocked).not.toHaveBeenCalled();
  });

  it('devolve null quando o julgamento não está disponível', async () => {
    mocked.mockResolvedValue(null);
    expect(await judgeVendorProhibitions(['No search'], 'X')).toBeNull();
  });
});

describe('keywordQuestions', () => {
  it('faz camada + match type por keyword, com id indexado', () => {
    const qs = keywordQuestions(['comprar lymphflow', 'o que é sistema linfático']);
    expect(Object.keys(qs)).toEqual(['camada_0', 'match_0', 'camada_1', 'match_1']);
    expect((qs.camada_1.instructions as any).keyword).toBe('o que é sistema linfático');
  });

  it('mantém a taxonomia canônica A=fundo/comercial e D=informacional', () => {
    // Guarda contra reinverter A↔D: o prompt antigo do ATP dizia A=Problema/D=Comercial, e o
    // LAYER_TO_STAGE de campaign-strategy.ts lê a definição canônica. Camada errada aqui virava
    // estágio de funil errado na campanha.
    const criteria = keywordQuestions(['x']).camada_0.criteria as any;
    expect(criteria.A.what).toContain('Fundo de funil');
    expect(criteria.A.examples.join(' ')).toMatch(/comprar/);
    expect(criteria.D.what).toContain('Informacional');
    expect(criteria.C.what).toContain('Problema');
    expect(criteria.B.what).toContain('Comparação');
  });
});

describe('judgeKeywords', () => {
  it('liga camada e match type à keyword pelo índice do id', async () => {
    mocked.mockResolvedValue({
      answers: {
        camada_0: choiceAnswer('A', 0.94),
        match_0: choiceAnswer('exact', 0.8),
        camada_1: choiceAnswer('D', 0.85),
        match_1: choiceAnswer('phrase', 0.75),
      },
    } as any);

    const r = await judgeKeywords(['comprar lymphflow', 'o que é sistema linfático'], { vertical: 'saude' });
    expect(r![0]).toMatchObject({ keyword: 'comprar lymphflow' });
    expect(r![0].layer.value).toBe('A');
    expect(r![0].matchType.value).toBe('exact');
    expect(r![1].layer.value).toBe('D');
  });

  it('camada com confiança baixa vem null pra cair no fallback do chamador', async () => {
    mocked.mockResolvedValue({
      answers: { camada_0: choiceAnswer('B', 0.4), match_0: choiceAnswer('phrase', 0.9) },
    } as any);
    const r = await judgeKeywords(['termo ambíguo']);
    expect(r![0].layer.value).toBeNull();
    expect(r![0].layer.usable).toBe(false);
    expect(r![0].matchType.value).toBe('phrase');
  });

  it('manda tudo numa request só', async () => {
    mocked.mockResolvedValue({
      answers: Object.fromEntries(
        Array.from({ length: 6 }, (_, i) => [i % 2 === 0 ? `camada_${i / 2}` : `match_${(i - 1) / 2}`, choiceAnswer('B', 0.9)]),
      ),
    } as any);
    await judgeKeywords(['a', 'b', 'c']);
    expect(mocked).toHaveBeenCalledTimes(1);
    expect(Object.keys(mocked.mock.calls[0][1] as object)).toHaveLength(6);
  });

  it('lista vazia não gasta request', async () => {
    expect(await judgeKeywords([])).toEqual([]);
    expect(mocked).not.toHaveBeenCalled();
  });
});

describe('judgeStrategyInputs', () => {
  it('normalização e proibições do vendor numa request só', async () => {
    mocked.mockResolvedValue({
      answers: {
        tipo_presell: choiceAnswer('review', 0.92),
        funil_de_venda: choiceAnswer('REVIEW', 0.9),
        canal_da_campanha: choiceAnswer('SEARCH', 0.95),
        escopo_0: choiceAnswer('apenas_termo_de_marca', 0.93),
        canal_0: choiceAnswer('SEARCH', 0.8),
      },
    } as any);

    const r = await judgeStrategyInputs({
      produto: 'FemiCore',
      presellTipoTexto: 'página de resenha comparando opções',
      canalTexto: 'rede de pesquisa do google',
      regras: ['Our trademark must never appear in your ad copy'],
    });

    expect(mocked).toHaveBeenCalledTimes(1);
    expect(r!.presellTipo!.value).toBe('review');
    expect(r!.funil!.value).toBe('REVIEW');
    expect(r!.canal!.value).toBe('SEARCH');
    expect(r!.prohibitions[0].escopo.value).toBe('apenas_termo_de_marca');
  });

  it('só pergunta o que foi informado', async () => {
    mocked.mockResolvedValue({ answers: { canal_da_campanha: choiceAnswer('YOUTUBE', 0.9) } } as any);
    const r = await judgeStrategyInputs({ produto: 'X', canalTexto: 'vídeo no youtube' });
    expect(Object.keys(mocked.mock.calls[0][1] as object)).toEqual(['canal_da_campanha']);
    expect(r!.presellTipo).toBeNull();
    expect(r!.funil).toBeNull();
    expect(r!.prohibitions).toEqual([]);
  });

  it('sem nada pra julgar não gasta request', async () => {
    expect(await judgeStrategyInputs({ produto: 'X' })).toBeNull();
    expect(mocked).not.toHaveBeenCalled();
  });

  it("'nao_informado' vem como valor explícito pra quem chama tratar", async () => {
    mocked.mockResolvedValue({
      answers: { tipo_presell: choiceAnswer('nao_informado', 0.97), funil_de_venda: choiceAnswer('nao_informado', 0.95) },
    } as any);
    const r = await judgeStrategyInputs({ produto: 'X', presellTipoTexto: 'a definir' });
    expect(r!.presellTipo!.value).toBe('nao_informado');
  });
});

describe('judgeSearchIntents', () => {
  it('classifica cada sugestão pela intenção, por índice', async () => {
    mocked.mockResolvedValue({
      answers: {
        intencao_0: choiceAnswer('commercial', 0.94),
        intencao_1: choiceAnswer('informational', 0.9),
        intencao_2: choiceAnswer('brand', 0.88),
      },
    } as any);
    const r = await judgeSearchIntents(['diet caps 3 potes', 'diet caps faz mal', 'diet caps site do fabricante']);
    expect(r!.map((j) => j.value)).toEqual(['commercial', 'informational', 'brand']);
  });

  it('lista vazia não gasta request e falha devolve null', async () => {
    expect(await judgeSearchIntents([])).toEqual([]);
    expect(mocked).not.toHaveBeenCalled();
    mocked.mockResolvedValue(null);
    expect(await judgeSearchIntents(['x'])).toBeNull();
  });
});
