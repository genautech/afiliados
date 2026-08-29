const FIRECRAWL_API = process.env.FIRECRAWL_API_URL || 'https://api.firecrawl.dev/v1';

function getFirecrawlApiKey(): string {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) {
    throw new Error('FIRECRAWL_API_KEY não configurada no .env. Operação indisponível devido a restrições de simulação zero.');
  }
  return key;
}

export interface CompetitorScrapedData {
  markdown: string;
  title: string;
}

export async function fetchCompetitorPage(url: string): Promise<CompetitorScrapedData> {
  const apiKey = getFirecrawlApiKey();
  console.log(`[competitor-scraper] Iniciando raspagem real com Firecrawl para: ${url}...`);

  try {
    const res = await fetch(`${FIRECRAWL_API}/scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        url,
        formats: ['markdown'],
      }),
      signal: AbortSignal.timeout(30000), // timeout de 30s para obedecer limites
    });

    if (!res.ok) {
      throw new Error(`Firecrawl respondeu com status HTTP ${res.status}`);
    }

    const data = await res.json();
    if (!data || !data.success) {
      throw new Error(data?.error || 'A raspagem falhou ou retornou um objeto de sucesso falso.');
    }

    const markdown = data.data?.markdown || '';
    const title = data.data?.metadata?.title || 'Competitor Landing Page';

    if (!markdown.trim()) {
      throw new Error('Firecrawl retornou um conteúdo markdown vazio.');
    }

    console.log(`[competitor-scraper] Raspagem de concorrente concluída com sucesso para: ${url}`);
    return { markdown, title };

  } catch (error: any) {
    console.error(`[competitor-scraper] Falha ao raspar URL com Firecrawl (${url}):`, error?.message);
    throw error;
  }
}
