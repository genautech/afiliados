import { describe, it, expect } from 'vitest';
import { CompetitorItemSchema } from '@/lib/validations/market-research';
import {
  SCOUT_STAGES,
  adMaturity,
  toScoutCountry,
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

describe('activeDays', () => {
  const base = { name: 'Concorrente X', url: 'https://x.com/vsl', price: 47, angle: 'headline' };

  it('é aceito pelo schema como inteiro não negativo', () => {
    expect(CompetitorItemSchema.parse({ ...base, activeDays: 84 }).activeDays).toBe(84);
    expect(CompetitorItemSchema.parse({ ...base, activeDays: 0 }).activeDays).toBe(0);
  });

  it('continua opcional: fonte sem data de início não quebra o parse', () => {
    expect(CompetitorItemSchema.parse(base).activeDays).toBeUndefined();
  });

  it('recusa valor quebrado em vez de deixar a UI renderizar lixo', () => {
    expect(CompetitorItemSchema.safeParse({ ...base, activeDays: -3 }).success).toBe(false);
    expect(CompetitorItemSchema.safeParse({ ...base, activeDays: 2.5 }).success).toBe(false);
    expect(CompetitorItemSchema.safeParse({ ...base, activeDays: '84' }).success).toBe(false);
  });

  it('mantém o strict: campo desconhecido segue rejeitado', () => {
    expect(CompetitorItemSchema.safeParse({ ...base, activeDaysss: 84 }).success).toBe(false);
  });

  it('classifica a maturidade do anúncio pelo tempo no ar', () => {
    expect(adMaturity(0)).toBe('novo');
    expect(adMaturity(13)).toBe('novo');
    expect(adMaturity(14)).toBe('validando');
    expect(adMaturity(59)).toBe('validando');
    expect(adMaturity(60)).toBe('consolidado');
  });
});

describe('toScoutCountry', () => {
  it('traduz o UK do catálogo para o ISO real GB', () => {
    // O regex do schema aceita UK, mas a Meta Ads Library devolve vazio sem erro.
    expect(toScoutCountry('UK')).toBe('GB');
  });

  it('mantém os códigos que já são ISO', () => {
    expect(toScoutCountry('BR')).toBe('BR');
    expect(toScoutCountry('us')).toBe('US');
    expect(toScoutCountry(' de ')).toBe('DE');
  });

  it('preserva ALL para varredura global', () => {
    expect(toScoutCountry('ALL')).toBe('ALL');
    expect(toScoutCountry('all')).toBe('ALL');
  });

  it('cai em BR no vazio ou no que não é código de 2 letras', () => {
    expect(toScoutCountry('')).toBe('BR');
    expect(toScoutCountry(null)).toBe('BR');
    expect(toScoutCountry(undefined)).toBe('BR');
    expect(toScoutCountry('Brasil')).toBe('BR');
  });
});
