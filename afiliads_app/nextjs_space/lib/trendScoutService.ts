import * as googleTrends from 'google-trends-api';
import { z } from 'zod';

export const TrendScoutOutputSchema = z.object({
  name: z.string().trim().min(2).max(200),
  vertical: z.enum(['Saúde', 'Finanças', 'Produtividade']),
  potentialScore: z.number().int().min(0).max(100),
  pricing: z.object({
    suggestedPrice: z.number().finite().nonnegative(),
    suggestedAov: z.number().finite().nonnegative(),
    upsells: z.array(z.string().min(1).max(200)).max(10),
  }).strict(),
  vslHook: z.string().min(1).max(2_000),
  leadMagnet: z.string().min(1).max(1_000),
  bonusSuggested: z.array(z.string().min(1).max(300)).max(10),
}).strict();

export type TrendScoutOutput = z.infer<typeof TrendScoutOutputSchema>;
export type TrendSlope = 'positive' | 'stable' | 'negative';
export type TrendScoutResult = { idea: TrendScoutOutput; trendSlope: TrendSlope | null; source: string };

type TimelinePoint = { time?: string | number; value?: number[] };
type TrendsPayload = { default?: { timelineData?: TimelinePoint[] }; timelineData?: TimelinePoint[] };
type SourceData = { firecrawl: string; trends: string; trendSlope: TrendSlope | null };

const MAX_SOURCE_CHARS = 100_000;
const MUSE_MODEL = 'meta/muse-spark-1.2';

function missingCredentials(): string[] {
  return ['FIRECRAWL_API_KEY', 'OPENROUTER_API_KEY'].filter((key) => !process.env[key]);
}

async function fetchFirecrawl(niche: string, country: string): Promise<string> {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) throw new Error('Credencial ausente: FIRECRAWL_API_KEY');
  const base = (process.env.FIRECRAWL_API_URL || 'https://api.firecrawl.dev/v1').replace(/\/$/, '');
  const url = new URL('https://www.facebook.com/ads/library/');
  url.searchParams.set('active_status', 'active');
  url.searchParams.set('ad_type', 'all');
  url.searchParams.set('country', country);
  url.searchParams.set('q', niche);
  url.searchParams.set('media_type', 'all');
  const response = await fetch(`${base}/scrape`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: url.toString(), formats: ['markdown', 'html'], actions: [
      { type: 'wait', selector: 'div[role="article"]', timeout: 15_000 },
      { type: 'scroll', direction: 'down', amount: 3_000 },
    ] }),
    signal: AbortSignal.timeout(35_000),
  });
  if (!response.ok) throw new Error(`Firecrawl falhou com HTTP ${response.status}`);
  const payload = await response.json() as { data?: { markdown?: unknown; html?: unknown }; markdown?: unknown; html?: unknown };
  const data = payload.data ?? payload;
  const markdown = typeof data.markdown === 'string' ? data.markdown : '';
  const html = typeof data.html === 'string' ? data.html : '';
  if (!markdown && !html) throw new Error('Firecrawl não retornou conteúdo');
  return `MARKDOWN:\n${markdown}\n\nHTML:\n${html}`.slice(0, MAX_SOURCE_CHARS);
}

function calculateTrendSlope(points: TimelinePoint[]): TrendSlope {
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1_000;
  const values = points.map((point) => {
    const time = typeof point.time === 'number' ? point.time * 1_000 : Date.parse(String(point.time ?? ''));
    const value = Array.isArray(point.value) ? point.value[0] : undefined;
    return { time, value };
  }).filter((point): point is { time: number; value: number } => Number.isFinite(point.time) && typeof point.value === 'number' && Number.isFinite(point.value));
  const recent = values.filter((point) => point.time >= thirtyDaysAgo).map((point) => point.value);
  const previous = values.filter((point) => point.time < thirtyDaysAgo).map((point) => point.value);
  if (!recent.length || !previous.length) throw new Error('Google Trends não retornou pontos suficientes para calcular 90 dias');
  const average = (items: number[]) => items.reduce((sum, value) => sum + value, 0) / items.length;
  const previousAverage = average(previous);
  if (previousAverage === 0) return average(recent) > 0 ? 'positive' : 'stable';
  const growth = (average(recent) - previousAverage) / previousAverage;
  return growth > 0.05 ? 'positive' : growth < -0.05 ? 'negative' : 'stable';
}

async function fetchGoogleTrends(niche: string, country: string): Promise<{ trends: string; trendSlope: TrendSlope | null }> {
  try {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 90 * 24 * 60 * 60 * 1_000);
    const raw = await googleTrends.interestOverTime({ keyword: niche, startTime, endTime, geo: country === 'ALL' ? '' : country });
    const payload = JSON.parse(raw) as TrendsPayload;
    const timelineData = payload.default?.timelineData ?? payload.timelineData ?? [];
    const trendSlope = calculateTrendSlope(timelineData);
    return { trends: `Google Trends (${country}, últimos 90 dias): ${JSON.stringify(timelineData).slice(0, 20_000)}`, trendSlope };
  } catch (error) {
    console.error('[trend-scout] Google Trends indisponível; trendSlope=null:', error instanceof Error ? error.message : error);
    return { trends: 'Google Trends não disponível para esta consulta.', trendSlope: null };
  }
}

async function generateIdea(source: SourceData, niche: string, country: string): Promise<TrendScoutOutput> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error('Credencial ausente: OPENROUTER_API_KEY');
  const contract = '{"name":"string","vertical":"Saúde | Finanças | Produtividade","potentialScore":0,"pricing":{"suggestedPrice":47.90,"suggestedAov":97.00,"upsells":["string"]},"vslHook":"string","leadMagnet":"string","bonusSuggested":["string"]}';
  const system = `Você é uma Diretora de Lançamentos Low-Ticket. Sintetize uma oportunidade original e viável usando somente os dados fornecidos. Responda SOMENTE JSON válido, sem markdown, exatamente neste contrato: ${contract}. Não invente dados de tendência nem copie claims concorrentes.`;
  const user = `Nicho: ${niche}\nPaís: ${country}\nTrend slope: ${source.trendSlope ?? 'null'}\nDados unificados:\n${source.firecrawl}\n\n${source.trends}`.slice(0, MAX_SOURCE_CHARS + 1_000);
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://afiliads.app', 'X-Title': 'AfiliAds Trend Scout' },
    body: JSON.stringify({ model: MUSE_MODEL, messages: [{ role: 'system', content: system }, { role: 'user', content: user }], temperature: 0.2, max_tokens: 2_000, response_format: { type: 'json_object' } }),
    signal: AbortSignal.timeout(40_000),
  });
  if (!response.ok) throw new Error(`OpenRouter falhou com HTTP ${response.status}`);
  const payload = await response.json() as { choices?: Array<{ message?: { content?: unknown } }> };
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) throw new Error('OpenRouter retornou conteúdo vazio');
  return TrendScoutOutputSchema.parse(JSON.parse(content.trim().replace(/^```json\s*/i, '').replace(/\s*```$/, '')));
}

export async function generateTrendScout(niche: string, country: string): Promise<TrendScoutResult> {
  const missing = missingCredentials();
  if (missing.length) throw new Error(`Credenciais ausentes: ${missing.join(', ')}`);
  const [firecrawl, trends] = await Promise.all([fetchFirecrawl(niche, country), fetchGoogleTrends(niche, country)]);
  const source = { firecrawl, trends: trends.trends, trendSlope: trends.trendSlope };
  const idea = await generateIdea(source, niche, country);
  return { idea, trendSlope: trends.trendSlope, source: `${firecrawl}\n\n${trends.trends}` };
}
