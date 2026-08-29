import { describe, it, expect } from 'vitest';
import {
  SCOUT_STAGES,
  trendPresentation,
  deriveSourceReport,
  normalizeTrendSlope,
  describeScoutFailure,
  normalizeProductIdea,
  IDEA_STAGES,
} from '../_components/step-product-search';

describe('trendPresentation', () => {
  it('mapeia cada slope para ícone, cor e label', () => {
    expect(trendPresentation('positive').label).toBe('Nicho em forte crescimento no Google Trends');
    expect(trendPresentation('positive').tone).toContain('emerald');
    expect(trendPresentation('stable').tone).toContain('amber');
    expect(trendPresentation('negative').tone).toContain('rose');
  });

  it('null vira estado desconhecido em cinza, nunca otimista por omissão', () => {
    expect(trendPresentation(null).label).toBe('Dados de tendência indisponíveis no momento');
    expect(trendPresentation(null).tone).toContain('muted-foreground');
  });
});

describe('normalizeTrendSlope', () => {
  it('lê o slope real do payload', () => {
    expect(normalizeTrendSlope({ trendSlope: 'negative' })).toBe('negative');
    expect(normalizeTrendSlope({ trendSlope: 'stable' })).toBe('stable');
  });

  it('null quando o Google Trends falhou', () => {
    expect(normalizeTrendSlope({ trendSlope: null })).toBeNull();
    expect(normalizeTrendSlope({})).toBeNull();
  });

  it('mock nunca produz tendência, mesmo se vier slope no payload', () => {
    expect(normalizeTrendSlope({ trendSlope: 'positive', isMockMode: true })).toBeNull();
  });

  it('recusa slope fora do enum em vez de deixar passar', () => {
    expect(normalizeTrendSlope({ trendSlope: 'subindo muito' })).toBeNull();
  });
});

describe('deriveSourceReport', () => {
  it('marca Meta e Trends como ativos quando o slope é real', () => {
    const report = deriveSourceReport({ isMockMode: false, trendSlope: 'positive' });
    expect(report.metaAdsLibrary).toBe('live');
    expect(report.googleTrends).toBe('live');
  });

  it('Trends indisponível quando o slope voltou null', () => {
    const report = deriveSourceReport({ isMockMode: false, trendSlope: null });
    expect(report.metaAdsLibrary).toBe('live');
    expect(report.googleTrends).toBe('unavailable');
  });

  it('nunca declara Google Ads Transparency ativo: nenhuma rota consulta essa fonte', () => {
    expect(deriveSourceReport({ isMockMode: false, trendSlope: 'positive' }).googleAdsTransparency).toBe('unavailable');
  });

  it('mock derruba todas as fontes: selo de transparência não cobre dado fabricado', () => {
    const report = deriveSourceReport({ isMockMode: true, trendSlope: 'positive' });
    expect(report).toEqual({
      metaAdsLibrary: 'unavailable',
      googleTrends: 'unavailable',
      googleAdsTransparency: 'unavailable',
    });
  });

  it('respeita o campo sources explícito quando o backend mandar', () => {
    const report = deriveSourceReport({
      isMockMode: false,
      trendSlope: null,
      sources: { googleAdsTransparency: 'live', metaAdsLibrary: false },
    });
    expect(report.googleAdsTransparency).toBe('live');
    expect(report.metaAdsLibrary).toBe('unavailable');
  });
});

describe('describeScoutFailure', () => {
  it('chave ausente vira instrução acionável, não erro genérico', () => {
    const f = describeScoutFailure(500, 'Credenciais ausentes: FIRECRAWL_API_KEY');
    expect(f.kind).toBe('missing_keys');
    expect(f.detail).toContain('.env');
  });

  it('503 convida a tentar de novo ou mudar o nicho', () => {
    const f = describeScoutFailure(503, null);
    expect(f.kind).toBe('unavailable');
    expect(f.detail).toContain('nicho');
  });

  it('401 sem menção a chave é sessão expirada', () => {
    expect(describeScoutFailure(401, 'Não autorizado').kind).toBe('unauthorized');
  });

  it('401 mencionando chave é configuração, não login', () => {
    expect(describeScoutFailure(401, 'OPENROUTER_API_KEY inválida').kind).toBe('missing_keys');
  });

  it('lê a causa de details, que é onde o trend-scout coloca', () => {
    // A rota devolve { error: 'Erro ao gerar produto Trend-Scout', details: '<causa>' }.
    const f = describeScoutFailure(503, 'Erro ao gerar produto Trend-Scout', 'Credenciais ausentes: FIRECRAWL_API_KEY');
    expect(f.kind).toBe('missing_keys');
  });

  it('credencial ausente vinda como 503 nao vira "tente de novo mais tarde"', () => {
    // O trend-scout mapeia credencial ausente para 503; retry nunca resolve .env.
    const f = describeScoutFailure(503, 'Erro ao gerar produto Trend-Scout', 'Credenciais ausentes: OPENROUTER_API_KEY');
    expect(f.kind).not.toBe('unavailable');
    expect(f.detail).toContain('.env');
  });

  it('502 de Firecrawl/OpenRouter continua sendo indisponibilidade', () => {
    const f = describeScoutFailure(502, 'Erro ao gerar produto Trend-Scout', 'Firecrawl falhou com HTTP 503');
    expect(f.kind).toBe('unavailable');
  });

  it('sem details, cai para a mensagem de error', () => {
    const f = describeScoutFailure(500, 'Erro ao processar pesquisa de mercado', undefined);
    expect(f.kind).toBe('generic');
    expect(f.detail).toBe('Erro ao processar pesquisa de mercado');
  });

  it('genérico preserva a mensagem real do servidor', () => {
    const f = describeScoutFailure(500, 'Erro ao gerar produto Trend-Scout');
    expect(f.kind).toBe('generic');
    expect(f.detail).toBe('Erro ao gerar produto Trend-Scout');
  });
});

describe('IDEA_STAGES', () => {
  it('não contém termo que sugira simulação', () => {
    const joined = IDEA_STAGES.join(' ').toLowerCase();
    for (const banned of ['virtual', 'simula', 'mock', 'fake']) {
      expect(joined).not.toContain(banned);
    }
  });

  it('nomeia as fontes reais do pipeline', () => {
    expect(IDEA_STAGES[0]).toContain('Meta Ads Library');
    expect(IDEA_STAGES[1]).toContain('Google Trends');
    expect(IDEA_STAGES[2]).toContain('OpenRouter');
  });
});

describe('normalizeProductIdea com a resposta real do trend-scout', () => {
  const routeResponse = {
    success: true,
    trendSlope: 'positive',
    isMockMode: false,
    product: {
      id: 'pr_trend_1',
      name: 'Jejum Sem Sofrimento',
      vertical: 'Saúde',
      score: 84,
      summary: 'Protocolo de 14 dias sem contar caloria.',
      strategy: {
        pricing: { suggestedPrice: 47.9, suggestedAov: 97, upsells: ['Mentoria em grupo', 'Planilha de macros'] },
        vslHook: 'Protocolo de 14 dias sem contar caloria.',
        leadMagnet: 'Checklist das 7 primeiras refeições',
        trendSlope: 'positive',
      },
    },
  };

  it('lê preço, AOV, isca e upsells de dentro de strategy.pricing', () => {
    expect(normalizeProductIdea(routeResponse)).toEqual({
      id: 'pr_trend_1',
      name: 'Jejum Sem Sofrimento',
      vertical: 'Saúde',
      summary: 'Protocolo de 14 dias sem contar caloria.',
      revenueScore: 84,
      suggestedPrice: 47.9,
      suggestedAov: 97,
      leadMagnet: 'Checklist das 7 primeiras refeições',
      upsells: ['Mentoria em grupo', 'Planilha de macros'],
    });
  });

  it('usa potentialScore quando a ideia vem sem passar pelo banco', () => {
    expect(normalizeProductIdea({ idea: { name: 'X', potentialScore: 73 } })?.revenueScore).toBe(73);
  });
});

describe('vocabulário do loading', () => {
  it('nenhum estágio do scout sugere simulação ou agente virtual', () => {
    const joined = SCOUT_STAGES.join(' ').toLowerCase();
    for (const banned of ['virtual', 'simula', 'mock', 'fake']) {
      expect(joined).not.toContain(banned);
    }
  });
});
