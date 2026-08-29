import { describe, it, expect } from 'vitest';
import { enforceCompliance } from './complianceVerifier';
import type { AnalyzedClaimItem } from './validations/market-research';

const claim = (over: Partial<AnalyzedClaimItem> = {}): AnalyzedClaimItem => ({
  claim: 'Elimina a gordura abdominal em 7 dias sem dieta',
  sourceCompetitor: 'concorrente-x.com',
  riskLevel: 'HIGH',
  justification: 'Promessa de resultado com prazo definido.',
  ...over,
});

describe('enforceCompliance', () => {
  it('aprova texto limpo sem claims', () => {
    const r = enforceCompliance('Entenda como o suplemento funciona. Resultados individuais podem variar.', []);
    expect(r.passed).toBe(true);
    expect(r.violations).toEqual([]);
    expect(r.bannedTerm).toBeNull();
    expect(r.guidance).toBe('');
  });

  it('reprova cópia literal de claim HIGH', () => {
    const r = enforceCompliance('Elimina a gordura abdominal em 7 dias sem dieta!', [claim()]);
    expect(r.passed).toBe(false);
    expect(r.violations).toHaveLength(1);
    expect(r.violations[0].sourceCompetitor).toBe('concorrente-x.com');
  });

  it('pega a claim mesmo com acento, caixa e pontuação diferentes', () => {
    const r = enforceCompliance('ELIMINA A GORDURA ABDOMINAL EM 7 DIAS, SEM DIETA.', [claim()]);
    expect(r.passed).toBe(false);
  });

  it('pega paráfrase parcial via n-grama de 4 palavras', () => {
    const r = enforceCompliance(
      'O método promete que você vai eliminar a gordura abdominal em 7 dias de forma natural.',
      [claim({ claim: 'eliminar a gordura abdominal em 7 dias' })],
    );
    expect(r.passed).toBe(false);
    expect(r.violations[0].matched).toContain('gordura abdominal em 7');
  });

  it('ignora claims MEDIUM e LOW', () => {
    const copy = 'Elimina a gordura abdominal em 7 dias sem dieta';
    expect(enforceCompliance(copy, [claim({ riskLevel: 'MEDIUM', claim: copy })]).violations).toEqual([]);
    expect(enforceCompliance(copy, [claim({ riskLevel: 'LOW', claim: copy })]).violations).toEqual([]);
  });

  it('não reprova por coincidência de conectivos', () => {
    const r = enforceCompliance(
      'Veja o que o produto pode fazer por você e para o seu dia a dia.',
      [claim({ claim: 'para o seu corpo e para o seu bem estar' })],
    );
    expect(r.passed).toBe(true);
  });

  it('claim curta (menos de 4 palavras) só bloqueia por cópia literal', () => {
    const short = claim({ claim: 'cura definitiva' });
    expect(enforceCompliance('promete cura definitiva do problema', [short]).passed).toBe(false);
    expect(enforceCompliance('entenda como o processo funciona', [short]).passed).toBe(true);
  });

  it('reprova termo banido genérico mesmo sem dossiê de claims', () => {
    const r = enforceCompliance('Perca 10kg em duas semanas com este ritual.', []);
    expect(r.passed).toBe(false);
    expect(r.bannedTerm).toBeTruthy();
    expect(r.guidance).toContain('termo banido');
  });

  it('não reprova disclaimer com termo negado', () => {
    const r = enforceCompliance(
      'Este produto não é uma cura para nenhuma doença. Resultados individuais podem variar.',
      [],
    );
    expect(r.passed).toBe(true);
  });

  it('guidance lista as claims proibidas para a regeneração', () => {
    const r = enforceCompliance('Elimina a gordura abdominal em 7 dias sem dieta', [claim()]);
    expect(r.guidance).toContain('BLOQUEIO DE COMPLIANCE');
    expect(r.guidance).toContain('Elimina a gordura abdominal em 7 dias sem dieta');
    expect(r.guidance).toContain('concorrente-x.com');
    expect(r.guidance).toContain('resultados individuais variam');
  });

  it('acumula violações de múltiplas claims HIGH', () => {
    const r = enforceCompliance(
      'Elimina a gordura abdominal em 7 dias sem dieta e reverte o diabetes tipo 2 naturalmente.',
      [claim(), claim({ claim: 'reverte o diabetes tipo 2 naturalmente', sourceCompetitor: 'concorrente-y.com' })],
    );
    expect(r.violations).toHaveLength(2);
  });
});
