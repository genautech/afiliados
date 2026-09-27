import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AnalyzedClaimItem } from './validations/market-research';

vi.mock('./typesafe', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./typesafe')>();
  return { ...actual, isShadowModeOn: vi.fn(() => true) };
});
vi.mock('./judgment-shadow-store', () => ({ recordShadowRows: vi.fn(async () => {}) }));
vi.mock('./compliance-judgments', () => ({
  judgeBridgeCompliance: vi.fn(),
  judgeClaimReuse: vi.fn(),
}));

const { isShadowModeOn } = await import('./typesafe');
const { judgeBridgeCompliance, judgeClaimReuse } = await import('./compliance-judgments');
const { shadowBridgeChecklist, shadowClaimReuse } = await import('./compliance-shadow');

const shadowOn = vi.mocked(isShadowModeOn);
const judgeBridge = vi.mocked(judgeBridgeCompliance);
const judgeClaims = vi.mocked(judgeClaimReuse);

const judged = (over: Partial<Record<string, { verdict: any; probability: number; note?: string }>> = {}) => ({
  disclaimer: { verdict: 'passou', probability: 0.95 },
  sem_claims: { verdict: 'passou', probability: 0.03 },
  faq: { verdict: 'passou', probability: 0.9 },
  resultados_variam: { verdict: 'passou', probability: 0.92 },
  ...over,
}) as any;

const regexOk = {
  disclaimer: { passed: true },
  sem_claims: { passed: true },
  faq: { passed: true },
  resultados_variam: { passed: true },
  privacy_policy: { passed: false },
  ga4_configurado: { passed: false },
};

const claim = (over: Partial<AnalyzedClaimItem> = {}): AnalyzedClaimItem => ({
  claim: 'Elimina a gordura abdominal em 7 dias sem dieta',
  sourceCompetitor: 'concorrente-x.com',
  riskLevel: 'HIGH',
  justification: 'Promessa de resultado com prazo definido.',
  ...over,
});

beforeEach(() => {
  shadowOn.mockReturnValue(true);
  judgeBridge.mockReset();
  judgeClaims.mockReset();
});

describe('shadowBridgeChecklist', () => {
  it('não roda nada com o modo sombra desligado', async () => {
    shadowOn.mockReturnValue(false);
    expect(await shadowBridgeChecklist('<p>x</p>', regexOk, 'camp-1')).toBeNull();
    expect(judgeBridge).not.toHaveBeenCalled();
  });

  it('compara só os 4 itens de significado (privacy/ga4 seguem determinísticos)', async () => {
    judgeBridge.mockResolvedValue(judged());
    const report = await shadowBridgeChecklist('<p>x</p>', regexOk, 'camp-1');
    expect(report!.total).toBe(4);
    expect(report!.agreements).toBe(4);
    expect(report!.divergences).toEqual([]);
  });

  it('registra divergência quando a regex reprova e o julgamento aprova', async () => {
    // Caso real de 2026-07-27: presell em inglês, regex só em português reprovava os 3 avisos.
    judgeBridge.mockResolvedValue(judged());
    const regexPtOnly = {
      ...regexOk,
      disclaimer: { passed: false, note: 'Disclosure de afiliado não encontrada no HTML' },
      resultados_variam: { passed: false },
      faq: { passed: false },
    };
    const report = await shadowBridgeChecklist('<p>affiliate disclosure ... results may vary ... FAQ</p>', regexPtOnly, 'camp-2');
    expect(report!.agreements).toBe(1);
    expect(report!.divergences.map((d) => d.item).sort()).toEqual(['disclaimer', 'faq', 'resultados_variam']);
    expect(report!.divergences[0].regex).toBe('reprovou');
    expect(report!.divergences[0].judgment).toBe('passou');
  });

  it('registra divergência quando a regex aprova e o julgamento reprova', async () => {
    judgeBridge.mockResolvedValue(judged({ sem_claims: { verdict: 'reprovou', probability: 0.83, note: 'promessa de resultado' } }));
    const report = await shadowBridgeChecklist('<p>vai emagrecer rápido</p>', regexOk);
    expect(report!.divergences).toHaveLength(1);
    expect(report!.divergences[0]).toMatchObject({ item: 'sem_claims', regex: 'passou', judgment: 'reprovou' });
  });

  it('conta incerto como divergência (é caso de revisão, não de decisão)', async () => {
    judgeBridge.mockResolvedValue(judged({ sem_claims: { verdict: 'incerto', probability: 0.44 } }));
    const report = await shadowBridgeChecklist('<p>ambíguo</p>', regexOk);
    expect(report!.divergences[0].judgment).toBe('incerto');
  });

  it('devolve null sem HTML ou sem julgamento, sem afetar o caminho da regex', async () => {
    expect(await shadowBridgeChecklist(null, regexOk)).toBeNull();
    judgeBridge.mockResolvedValue(null);
    expect(await shadowBridgeChecklist('<p>x</p>', regexOk)).toBeNull();
  });
});

describe('shadowClaimReuse', () => {
  it('acusa a paráfrase traduzida que o n-grama não pega', async () => {
    const c = claim();
    judgeClaims.mockResolvedValue([{ claim: c, probability: 0.87, verdict: 'reprovou' }]);
    // Regex não achou nada: a copy traduziu a claim pro inglês, nenhum shingle de 4 palavras casa.
    const report = await shadowClaimReuse({ headline: 'Burn belly fat in 7 days with no diet' }, [c], [], 'camp-3');
    expect(report!.divergences).toHaveLength(1);
    expect(report!.divergences[0]).toMatchObject({ regex: 'passou', judgment: 'reprovou' });
    expect(report!.divergences[0].probability).toBeCloseTo(0.87);
  });

  it('conta concordância quando os dois reprovam a mesma claim', async () => {
    const c = claim();
    judgeClaims.mockResolvedValue([{ claim: c, probability: 0.93, verdict: 'reprovou' }]);
    const report = await shadowClaimReuse({ headline: c.claim }, [c], [{ claim: c.claim }]);
    expect(report!.agreements).toBe(1);
    expect(report!.divergences).toEqual([]);
  });

  it('fica quieto quando o modo sombra está off ou não há claim julgada', async () => {
    shadowOn.mockReturnValue(false);
    expect(await shadowClaimReuse({}, [claim()], [])).toBeNull();

    shadowOn.mockReturnValue(true);
    judgeClaims.mockResolvedValue([]);
    expect(await shadowClaimReuse({}, [], [])).toBeNull();

    judgeClaims.mockResolvedValue(null);
    expect(await shadowClaimReuse({}, [claim()], [])).toBeNull();
  });
});
