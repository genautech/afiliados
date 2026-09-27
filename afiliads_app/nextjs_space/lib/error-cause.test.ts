import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./typesafe', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./typesafe')>();
  return { ...actual, askSystemOne: vi.fn() };
});

const { askSystemOne } = await import('./typesafe');
const { resolveErrorCauses, classifyErrorCauseHeuristic, errorCauseQuestions, CAUSE_LABEL } = await import('./error-cause');

const mocked = vi.mocked(askSystemOne);

const answer = (choice: string, confidence = 0.95) => ({ type: 'choice', choice, confidence, probabilities: { [choice]: confidence } });

beforeEach(() => {
  mocked.mockReset();
});

describe('classifyErrorCauseHeuristic', () => {
  it('mantém o que a cadeia de includes() já acertava', () => {
    expect(classifyErrorCauseHeuristic('insufficient_quota')).toBe('sem_credito');
    expect(classifyErrorCauseHeuristic('HTTP 429 Too Many Requests')).toBe('rate_limit');
    expect(classifyErrorCauseHeuristic('HTTP 401 invalid API Key')).toBe('chave_invalida');
    expect(classifyErrorCauseHeuristic('falha de validação de output')).toBe('validacao_de_output');
  });

  it('devolve null em vez de virar a própria mensagem de erro', () => {
    expect(classifyErrorCauseHeuristic('socket hang up')).toBeNull();
    expect(classifyErrorCauseHeuristic('kimi-k2.6 is not a valid model ID')).toBeNull();
  });
});

describe('resolveErrorCauses', () => {
  it('deduplica as mensagens antes de perguntar', async () => {
    mocked.mockResolvedValue({ answers: { causa_0: answer('rate_limit') } } as any);
    const r = await resolveErrorCauses(['HTTP 429', 'HTTP 429', ' HTTP 429 ']);
    expect(Object.keys(mocked.mock.calls[0][1] as object)).toEqual(['causa_0']);
    expect(r.get('HTTP 429')).toBe('rate_limit');
  });

  it('classifica o que a heurística não pegava', async () => {
    mocked.mockResolvedValue({
      answers: {
        causa_0: answer('timeout_ou_rede'),
        causa_1: answer('modelo_ou_payload_invalido'),
      },
    } as any);
    const r = await resolveErrorCauses(['socket hang up', 'kimi-k2.6 is not a valid model ID']);
    expect(r.get('socket hang up')).toBe('timeout_ou_rede');
    expect(r.get('kimi-k2.6 is not a valid model ID')).toBe('modelo_ou_payload_invalido');
  });

  it('cai na heurística quando o julgamento não está disponível', async () => {
    mocked.mockResolvedValue(null);
    const r = await resolveErrorCauses(['insufficient_quota', 'socket hang up']);
    expect(r.get('insufficient_quota')).toBe('sem_credito');
    expect(r.get('socket hang up')).toBe('outro');
  });

  it('confiança baixa também cai na heurística', async () => {
    mocked.mockResolvedValue({ answers: { causa_0: answer('sem_credito', 0.4) } } as any);
    const r = await resolveErrorCauses(['HTTP 429 rate limited']);
    expect(r.get('HTTP 429 rate limited')).toBe('rate_limit');
  });

  it('ignora escolha fora do conjunto fechado', async () => {
    mocked.mockResolvedValue({ answers: { causa_0: answer('provedor_explodiu') } } as any);
    const r = await resolveErrorCauses(['algo estranho']);
    expect(r.get('algo estranho')).toBe('outro');
  });

  it('acima de 25 mensagens distintas, o excedente usa a heurística', async () => {
    const mensagens = Array.from({ length: 30 }, (_, i) => `erro ${i} HTTP 429`);
    mocked.mockResolvedValue({
      answers: Object.fromEntries(Array.from({ length: 25 }, (_, i) => [`causa_${i}`, answer('sem_credito')])),
    } as any);
    const r = await resolveErrorCauses(mensagens);
    expect(Object.keys(mocked.mock.calls[0][1] as object)).toHaveLength(25);
    expect(r.get('erro 0 HTTP 429')).toBe('sem_credito');
    expect(r.get('erro 29 HTTP 429')).toBe('rate_limit');
  });

  it('lista vazia não gasta request', async () => {
    const r = await resolveErrorCauses(['', '  ']);
    expect(r.size).toBe(0);
    expect(mocked).not.toHaveBeenCalled();
  });
});

describe('errorCauseQuestions', () => {
  it('carrega a mensagem nas instructions e as 7 causas fechadas nos criteria', () => {
    const qs = errorCauseQuestions(['socket hang up']);
    expect((qs.causa_0.instructions as any).mensagem_de_erro).toBe('socket hang up');
    expect(Object.keys(qs.causa_0.criteria)).toHaveLength(7);
  });
});

describe('CAUSE_LABEL', () => {
  it('a apresentação fica em código, não no julgamento', () => {
    expect(CAUSE_LABEL.sem_credito).toBe('Provedor sem crédito');
    expect(CAUSE_LABEL.outro).toBe('Outra falha');
  });
});
