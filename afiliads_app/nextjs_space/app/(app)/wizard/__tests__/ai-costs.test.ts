import { describe, it, expect } from 'vitest';
import { normalizeAiCosts, inferStage } from '../_components/ai-cost-dashboard';

describe('inferStage', () => {
  it('respeita o stage já entregue pelo backend', () => {
    expect(inferStage('pdf_gen')).toBe('pdf_gen');
    expect(inferStage('image_gen')).toBe('image_gen');
  });

  it('deduz a etapa a partir do agente ou do objetivo', () => {
    expect(inferStage(null, 'youtube-ingestor', 'Transcrição do VSL')).toBe('video_ingest');
    expect(inferStage(null, 'anti-slop-editor', 'Reescrita da headline')).toBe('copy_gen');
    expect(inferStage(null, null, 'Renderização do PDF premium')).toBe('pdf_gen');
    expect(inferStage(null, null, 'Capa 3D do e-book')).toBe('image_gen');
    expect(inferStage(null, null, 'coisa qualquer')).toBe('other');
  });
});

describe('normalizeAiCosts', () => {
  it('deriva total e breakdown quando só vêm as linhas cruas do AgentRun', () => {
    const report = normalizeAiCosts({
      rows: [
        { id: 'a', createdAt: '2026-08-29T12:00:00Z', model: 'gemini-3.5-flash', agent: 'youtube-ingestor', costUsd: 0.2, totalTokens: 1000 },
        { id: 'b', createdAt: '2026-08-29T13:00:00Z', model: 'kimi-k2.5', agent: 'anti-slop-editor', costUsd: 0.1 },
        { id: 'c', createdAt: '2026-08-29T14:00:00Z', model: 'kimi-k2.5', agent: 'copywriter', costUsd: 0.12 },
      ],
    });
    expect(report?.runs).toBe(3);
    expect(report?.totalCostUsd).toBeCloseTo(0.42, 5);
    expect(report?.byStage).toEqual([
      { stage: 'copy_gen', costUsd: 0.22, runs: 2 },
      { stage: 'video_ingest', costUsd: 0.2, runs: 1 },
    ]);
  });

  it('ordena o histórico do mais recente para o mais antigo', () => {
    const report = normalizeAiCosts([
      { id: 'velho', createdAt: '2026-08-01T10:00:00Z', costUsd: 0.01 },
      { id: 'novo', createdAt: '2026-08-29T10:00:00Z', costUsd: 0.02 },
    ]);
    expect(report?.history.map((e) => e.id)).toEqual(['novo', 'velho']);
  });

  it('prefere os agregados do backend quando eles vêm prontos', () => {
    const report = normalizeAiCosts({
      totalCostUsd: 9.99,
      runs: 42,
      capUsd: 5,
      usdToBrl: 5.34,
      byStage: [{ stage: 'pdf_gen', costUsd: 9.99, runs: 42 }],
      history: [],
    });
    expect(report?.totalCostUsd).toBe(9.99);
    expect(report?.runs).toBe(42);
    expect(report?.capUsd).toBe(5);
    expect(report?.byStage).toEqual([{ stage: 'pdf_gen', costUsd: 9.99, runs: 42 }]);
  });

  it('aceita snake_case e usa o teto local quando o backend não manda um', () => {
    const report = normalizeAiCosts({ rows: [{ id: 'a', created_at: '2026-08-29T10:00:00Z', cost_usd: 0.5, total_tokens: 7 }] }, 2);
    expect(report?.totalCostUsd).toBe(0.5);
    expect(report?.capUsd).toBe(2);
    expect(report?.history[0].totalTokens).toBe(7);
  });

  it('não inventa câmbio quando o backend não manda cotação', () => {
    expect(normalizeAiCosts({ rows: [] })?.usdToBrl).toBeNull();
  });

  it('lê a forma real de GET /api/campaigns/[id]/ai-costs', () => {
    const report = normalizeAiCosts({
      totalCostUsd: 0.42,
      logs: [
        {
          id: 'log1', provider: 'vertex', model: 'gemini-3.5-flash', promptTokens: 1200,
          completionTokens: 300, costUsd: 0.2, purpose: 'Alinhamento DNA',
          createdAt: '2026-08-29T14:00:00.000Z',
        },
        {
          id: 'log2', provider: 'openrouter', model: 'moonshotai/kimi-k2.5', promptTokens: 800,
          completionTokens: 200, costUsd: 0.22, purpose: 'Transcrição do vídeo',
          createdAt: '2026-08-29T12:00:00.000Z',
        },
      ],
    });
    expect(report?.totalCostUsd).toBe(0.42);
    expect(report?.runs).toBe(2);
    expect(report?.history[0]).toMatchObject({
      id: 'log1', model: 'gemini-3.5-flash', purpose: 'Alinhamento DNA',
      stage: 'copy_gen', totalTokens: 1500,
    });
    expect(report?.byStage).toEqual([
      { stage: 'video_ingest', costUsd: 0.22, runs: 1 },
      { stage: 'copy_gen', costUsd: 0.2, runs: 1 },
    ]);
  });

  it('devolve relatório vazio, e não null, para uma campanha sem execução', () => {
    const report = normalizeAiCosts({ rows: [] });
    expect(report).toMatchObject({ totalCostUsd: 0, runs: 0, history: [], byStage: [] });
    expect(normalizeAiCosts(null)).toBeNull();
  });
});
