import { AdScoutOracleOutputSchema, type AdScoutOracleOutput, type MarketResearchRequest } from '@/lib/validations/market-research';
import { recordAICostLog } from '@/lib/costEstimator';
import { getModelPrice } from '@/lib/llm-pricing';

const MUSE_MODEL = 'meta/muse-spark-1.2';
const MAX_SOURCE_CHARS = 120_000;

type Usage = { promptTokens: number; completionTokens: number; totalTokens: number };
type FirecrawlPayload = { data?: { markdown?: unknown; html?: unknown }; markdown?: unknown; html?: unknown };

function credentials(): { firecrawl: string; openrouter: string } {
  const missing = ['FIRECRAWL_API_KEY', 'OPENROUTER_API_KEY'].filter((key) => !process.env[key]);
  if (missing.length) throw new Error(`Credenciais ausentes: ${missing.join(', ')}`);
  return { firecrawl: process.env.FIRECRAWL_API_KEY as string, openrouter: process.env.OPENROUTER_API_KEY as string };
}

function parseUsage(payload: { usage?: Record<string, unknown> }): Usage {
  const usage = payload.usage ?? {};
  const number = (...values: unknown[]) => values.find((value): value is number => typeof value === 'number' && Number.isFinite(value)) ?? 0;
  const promptTokens = number(usage.prompt_tokens, usage.promptTokens, usage.input_tokens);
  const completionTokens = number(usage.completion_tokens, usage.completionTokens, usage.output_tokens);
  return { promptTokens, completionTokens, totalTokens: number(usage.total_tokens, usage.totalTokens, promptTokens + completionTokens) };
}

async function scrapeMetaAds(query: string, country: string, apiKey: string): Promise<string> {
  const base = (process.env.FIRECRAWL_API_URL || 'https://api.firecrawl.dev/v1').replace(/\/$/, '');
  const target = new URL('https://www.facebook.com/ads/library/');
  target.searchParams.set('active_status', 'active');
  target.searchParams.set('ad_type', 'all');
  target.searchParams.set('country', country);
  target.searchParams.set('q', query);
  target.searchParams.set('media_type', 'all');
  const response = await fetch(`${base}/scrape`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: target.toString(), formats: ['markdown', 'html'], actions: [
      { type: 'wait', selector: 'div[role="article"]', timeout: 15_000 },
      { type: 'scroll', direction: 'down', amount: 3_000 },
    ] }),
    signal: AbortSignal.timeout(35_000),
  });
  if (!response.ok) throw new Error(`Firecrawl falhou com HTTP ${response.status}`);
  const payload = await response.json() as FirecrawlPayload;
  const data = payload.data ?? payload;
  const markdown = typeof data.markdown === 'string' ? data.markdown : '';
  const html = typeof data.html === 'string' ? data.html : '';
  if (!markdown && !html) throw new Error('Firecrawl não retornou conteúdo');
  return `MARKDOWN:\n${markdown}\n\nHTML:\n${html}`.slice(0, MAX_SOURCE_CHARS);
}

async function reasonWithMuse(input: MarketResearchRequest, source: string, apiKey: string): Promise<{ output: AdScoutOracleOutput; usage: Usage; model: string }> {
  const contract = '{"query":"string","productType":"AFFILIATE | PROPRIETARY_LOW_TICKET | MENTORSHIP","adCount":0,"avgPrice":0,"competitors":[{"name":"string","url":"valid absolute URL","price":0,"angle":"string","activeDays":"number, optional (omit when unknown)"}],"audiencePain":["string"],"anglesSuggested":["string"],"analyzedClaims":[{"claim":"string","sourceCompetitor":"string","riskLevel":"LOW | MEDIUM | HIGH","justification":"string"}]}';
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://afiliads.app', 'X-Title': 'AfiliAds Ad Scout' },
    body: JSON.stringify({ model: MUSE_MODEL, messages: [
      { role: 'system', content: `Você é o Ad Scout Oracle V2. Responda SOMENTE JSON válido, sem markdown, exatamente neste contrato: ${contract}. Analise somente os dados fornecidos e não invente concorrentes, URLs ou claims.` },
      { role: 'user', content: `Consulta: ${input.query}\nTipo: ${input.productType}\nPaís: ${input.country}\nDados reais da Meta Ads Library:\n${source}` },
    ], temperature: 0.1, max_tokens: 4_000, response_format: { type: 'json_object' } }),
    signal: AbortSignal.timeout(40_000),
  });
  if (!response.ok) throw new Error(`OpenRouter falhou com HTTP ${response.status}`);
  const payload = await response.json() as { choices?: Array<{ message?: { content?: unknown } }>; usage?: Record<string, unknown>; model?: unknown };
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) throw new Error('OpenRouter retornou conteúdo vazio');
  const normalized = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  return { output: AdScoutOracleOutputSchema.parse(JSON.parse(normalized)), usage: parseUsage(payload), model: typeof payload.model === 'string' ? payload.model : MUSE_MODEL };
}

export class AdScoutService {
  async search(input: MarketResearchRequest): Promise<AdScoutOracleOutput> {
    const keys = credentials();
    const source = await scrapeMetaAds(input.query, input.country, keys.firecrawl);
    const result = await reasonWithMuse(input, source, keys.openrouter);
    const price = getModelPrice('openrouter', result.model);
    const costUsd = result.usage.promptTokens / 1_000_000 * price.inputPer1M + result.usage.completionTokens / 1_000_000 * price.outputPer1M;
    console.log(`[ad-scout-service] tokens input=${result.usage.promptTokens} output=${result.usage.completionTokens} custo=US$ ${costUsd.toFixed(6)}`);
    await recordAICostLog({ campaignId: input.campaignId, provider: 'openrouter', model: result.model, usage: result.usage, purpose: 'market-scout' }).catch((error) => console.error('[ad-scout-service] falha ao persistir custo:', error));
    return result.output;
  }
}
