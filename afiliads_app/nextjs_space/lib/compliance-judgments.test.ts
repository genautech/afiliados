import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AnalyzedClaimItem } from './validations/market-research';

// askSystemOne é o único ponto de rede: mockado aqui pra testar a política que fica em código
// (thresholds, combinação dos nouls, mapeamento de volta pelas claims) sem chamar a API.
vi.mock('./typesafe', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./typesafe')>();
  return { ...actual, askSystemOne: vi.fn() };
});

const { askSystemOne } = await import('./typesafe');
const { judgeBridgeCompliance, judgeClaimReuse, claimReuseQuestions } = await import('./compliance-judgments');

const mocked = vi.mocked(askSystemOne);

const bridgeAnswers = (over: Partial<Record<string, number>> = {}) => ({
  model: 'jev-1.13.0',
  answers: {
    promete_resultado_garantido: { type: 'noul', noul: over.promete_resultado_garantido ?? 0.02 },
    promete_cura_ou_tratamento: { type: 'noul', noul: over.promete_cura_ou_tratamento ?? 0.03 },
    tem_disclosure_afiliado: { type: 'noul', noul: over.tem_disclosure_afiliado ?? 0.95 },
    tem_faq: { type: 'noul', noul: over.tem_faq ?? 0.9 },
    avisa_resultados_variam: { type: 'noul', noul: over.avisa_resultados_variam ?? 0.92 },
  },
  usage: { input_tokens: 1, output_tokens: 1 },
}) as any;

const claim = (over: Partial<AnalyzedClaimItem> = {}): AnalyzedClaimItem => ({
  claim: 'Elimina a gordura abdominal em 7 dias sem dieta',
  sourceCompetitor: 'concorrente-x.com',
  riskLevel: 'HIGH',
  justification: 'Promessa de resultado com prazo definido.',
  ...over,
});

beforeEach(() => {
  mocked.mockReset();
});

describe('judgeBridgeCompliance', () => {
  it('aprova presell limpa e completa', async () => {
    mocked.mockResolvedValue(bridgeAnswers());
    const r = await judgeBridgeCompliance('<p>Entenda como funciona. Individual results may vary. FAQ...</p>');
    expect(r).not.toBeNull();
    expect(r!.disclaimer.verdict).toBe('passou');
    expect(r!.faq.verdict).toBe('passou');
    expect(r!.resultados_variam.verdict).toBe('passou');
    expect(r!.sem_claims.verdict).toBe('passou');
  });

  it('reprova quando só a pergunta de cura está alta (regra "qualquer violação grave")', async () => {
    mocked.mockResolvedValue(bridgeAnswers({ promete_cura_ou_tratamento: 0.88, promete_resultado_garantido: 0.05 }));
    const r = await judgeBridgeCompliance('<p>Este suplemento cura o inchaço.</p>');
    expect(r!.sem_claims.verdict).toBe('reprovou');
    expect(r!.sem_claims.note).toContain('cura');
    expect(r!.sem_claims.probability).toBeCloseTo(0.88);
  });

  it('marca incerto na faixa do meio em vez de inventar booleano', async () => {
    mocked.mockResolvedValue(bridgeAnswers({ promete_resultado_garantido: 0.45, tem_faq: 0.5 }));
    const r = await judgeBridgeCompliance('<p>texto ambíguo</p>');
    expect(r!.sem_claims.verdict).toBe('incerto');
    expect(r!.faq.verdict).toBe('incerto');
    expect(r!.faq.note).toContain('inconclusivo');
  });

  it('reprova ausência de disclosure com nota acionável', async () => {
    mocked.mockResolvedValue(bridgeAnswers({ tem_disclosure_afiliado: 0.04 }));
    const r = await judgeBridgeCompliance('<p>sem aviso de afiliado</p>');
    expect(r!.disclaimer.verdict).toBe('reprovou');
    expect(r!.disclaimer.note).toContain('Disclosure de afiliado');
  });

  it('julga o texto visível, não o markup', async () => {
    mocked.mockResolvedValue(bridgeAnswers());
    await judgeBridgeCompliance('<script>var cura = "garantido";</script><p>Olá</p>');
    const state = mocked.mock.calls[0][0] as any;
    expect(state.presell.texto).toBe('Olá');
  });

  it('devolve null sem julgamento disponível (chave ausente ou serviço fora)', async () => {
    mocked.mockResolvedValue(null);
    expect(await judgeBridgeCompliance('<p>qualquer</p>')).toBeNull();
  });

  it('devolve null com HTML vazio, sem gastar request', async () => {
    expect(await judgeBridgeCompliance('   ')).toBeNull();
    expect(mocked).not.toHaveBeenCalled();
  });
});

describe('claimReuseQuestions', () => {
  it('cria uma pergunta por claim, com a frase dentro das instructions', () => {
    const qs = claimReuseQuestions([claim(), claim({ claim: 'Renda garantida de R$5.000 por mês' })]);
    expect(Object.keys(qs)).toEqual(['reusa_claim_0', 'reusa_claim_1']);
    expect((qs.reusa_claim_1.instructions as any).claim_proibida.frase).toBe('Renda garantida de R$5.000 por mês');
    expect(qs.reusa_claim_0.type).toBe('noul');
  });
});

describe('judgeClaimReuse', () => {
  it('liga cada resposta à claim pelo índice do id, sem rebuscar por string', async () => {
    mocked.mockResolvedValue({
      model: 'jev-1.13.0',
      answers: {
        reusa_claim_0: { type: 'noul', noul: 0.91 },
        reusa_claim_1: { type: 'noul', noul: 0.04 },
      },
      usage: { input_tokens: 1, output_tokens: 1 },
    } as any);

    const claims = [claim(), claim({ claim: 'Renda garantida de R$5.000 por mês' })];
    const r = await judgeClaimReuse({ headline: 'Elimine a gordura da barriga em uma semana' }, claims);

    expect(r).toHaveLength(2);
    expect(r![0].claim.claim).toBe(claims[0].claim);
    expect(r![0].verdict).toBe('reprovou');
    expect(r![1].verdict).toBe('passou');
  });

  it('só pergunta sobre claims HIGH', async () => {
    mocked.mockResolvedValue({
      model: 'jev-1.13.0',
      answers: { reusa_claim_0: { type: 'noul', noul: 0.8 } },
      usage: { input_tokens: 1, output_tokens: 1 },
    } as any);

    await judgeClaimReuse({ headline: 'x' }, [claim(), claim({ riskLevel: 'MEDIUM' }), claim({ riskLevel: 'LOW' })]);
    const questions = mocked.mock.calls[0][1] as Record<string, unknown>;
    expect(Object.keys(questions)).toEqual(['reusa_claim_0']);
  });

  it('não gasta request quando não há claim HIGH', async () => {
    expect(await judgeClaimReuse({ headline: 'x' }, [claim({ riskLevel: 'LOW' })])).toEqual([]);
    expect(mocked).not.toHaveBeenCalled();
  });

  it('devolve null quando o julgamento não está disponível', async () => {
    mocked.mockResolvedValue(null);
    expect(await judgeClaimReuse({ headline: 'x' }, [claim()])).toBeNull();
  });

  it('passa o conteúdo estruturado como estado, não uma string', async () => {
    mocked.mockResolvedValue({
      model: 'jev-1.13.0',
      answers: { reusa_claim_0: { type: 'noul', noul: 0.1 } },
      usage: { input_tokens: 1, output_tokens: 1 },
    } as any);
    await judgeClaimReuse({ headline: 'Título', secao1_texto: 'Corpo' }, [claim()]);
    const state = mocked.mock.calls[0][0] as any;
    expect(state.copy_gerada).toEqual({ headline: 'Título', secao1_texto: 'Corpo' });
  });
});
