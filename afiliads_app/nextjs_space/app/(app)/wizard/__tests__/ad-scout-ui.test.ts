import { describe, it, expect } from 'vitest';
import {
  SCOUT_STAGES,
  scoutStageIndex,
  saturationFromAdCount,
  isHighRisk,
  riskTone,
  RISK_TONE,
} from '../_components/step-product-search';

describe('estágios do Ad Scout', () => {
  it('cobre as quatro fases reais do pipeline', () => {
    expect(SCOUT_STAGES).toEqual([
      'Raspando anúncios...',
      'Interagindo com a biblioteca...',
      'Orquestrando IA da Meta...',
      'Validando Compliance...',
    ]);
  });

  it('mapeia o rótulo para o índice do stepper', () => {
    expect(scoutStageIndex('Raspando anúncios...')).toBe(0);
    expect(scoutStageIndex('Validando Compliance...')).toBe(3);
  });

  it('devolve -1 para rótulo desconhecido, para o stepper cair no primeiro passo', () => {
    expect(scoutStageIndex('')).toBe(-1);
    expect(scoutStageIndex('Acessando Google Search API oficial...')).toBe(-1);
  });
});

describe('saturationFromAdCount', () => {
  it('classifica pelas faixas de anúncios ativos', () => {
    expect(saturationFromAdCount(0)).toBe('baixa');
    expect(saturationFromAdCount(4)).toBe('baixa');
    expect(saturationFromAdCount(5)).toBe('moderada');
    expect(saturationFromAdCount(14)).toBe('moderada');
    expect(saturationFromAdCount(15)).toBe('alta');
    expect(saturationFromAdCount(29)).toBe('alta');
    expect(saturationFromAdCount(30)).toBe('saturado');
  });

  it('não quebra com valor inválido vindo da API', () => {
    expect(saturationFromAdCount(Number.NaN)).toBe('baixa');
  });
});

describe('classificação de risco de claim', () => {
  it('reconhece HIGH do schema e o rótulo PT legado', () => {
    expect(isHighRisk({ riskLevel: 'HIGH' })).toBe(true);
    expect(isHighRisk({ riskLevel: 'alto' })).toBe(true);
    expect(isHighRisk({ riskLevel: 'MEDIUM' })).toBe(false);
    expect(isHighRisk({ riskLevel: 'LOW' })).toBe(false);
  });

  it('dá tom vermelho só para alto risco e cai em LOW no desconhecido', () => {
    expect(riskTone('HIGH')).toBe(RISK_TONE.HIGH);
    expect(riskTone('MEDIUM')).toBe(RISK_TONE.MEDIUM);
    expect(riskTone('qualquer coisa')).toBe(RISK_TONE.LOW);
  });
});
