import { describe, it, expect } from 'vitest';
import { validateCompliance, autoCorrectClaims } from './complianceValidator';

describe('Compliance Validator Heuristics', () => {
  it('should pass text with LOW risk issues only', () => {
    const text = 'Este produto pode ajudar na digestão.\nResultados individuais variam.';
    const result = validateCompliance(text);
    expect(result.riskLevel).toBe('LOW');
    expect(result.passed).toBe(true);
    expect(result.score).toBe(100);
    expect(result.issues.length).toBe(0);
  });

  it('should flag MEDIUM risk issues', () => {
    const text = 'Últimas unidades disponíveis!\nResultado garantido ou seu dinheiro de volta.';
    const result = validateCompliance(text);
    expect(result.riskLevel).toBe('MEDIUM');
    expect(result.passed).toBe(true);
    expect(result.issues.some(i => i.riskLevel === 'MEDIUM')).toBe(true);
    expect(result.issues.every(i => i.riskLevel !== 'HIGH')).toBe(true);
    expect(result.score).toBeLessThan(100);
  });

  it('should flag HIGH risk for cures and medical promises', () => {
    const text = 'Esta fórmula traz a cura definitiva para o diabetes.\nCure seu diabetes hoje.';
    const result = validateCompliance(text);
    expect(result.riskLevel).toBe('HIGH');
    expect(result.passed).toBe(false);
    expect(result.issues.some(i => i.matchedPattern.includes('curar'))).toBe(true);
  });

  it('should flag HIGH risk for quick-fixes / no-effort weight loss', () => {
    const text = 'Descubra a fórmula mágica de emagrecimento rápido.\nPerca 10kg em 3 dias sem fazer dieta.';
    const result = validateCompliance(text);
    expect(result.riskLevel).toBe('HIGH');
    expect(result.passed).toBe(false);
    expect(result.issues.some(i => i.matchedPattern.includes('perca'))).toBe(true);
  });

  it('should flag HIGH risk for fake testimonials', () => {
    const text = 'Confira o depoimento real de Maria que se curou com o produto.';
    const result = validateCompliance(text);
    expect(result.riskLevel).toBe('HIGH');
    expect(result.passed).toBe(false);
    expect(result.issues.some(i => i.matchedPattern.includes('depoimento'))).toBe(true);
  });

  it('should flag HIGH risk for extreme fictive discounts', () => {
    const text = 'Adquira agora de R$999 por apenas R$29 hoje!';
    const result = validateCompliance(text);
    expect(result.riskLevel).toBe('HIGH');
    expect(result.passed).toBe(false);
    expect(result.issues.some(i => i.matchedPattern.includes('de r'))).toBe(true);
  });

  it('should auto-correct common offending claims', () => {
    const text = 'Cure sua diabetes de R$999 por R$29.';
    const corrected = autoCorrectClaims(text);
    expect(corrected).toBe('apoia o controle saudável da glicemia desconto promocional exclusivo direto da fábrica.');
  });
});
