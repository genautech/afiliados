import { prisma } from './prisma';

export interface AutocompleteIntentGroup {
  questions: string[];
  commercial: string[];
  informational: string[];
  brand: string[];
  all: string[];
}

export interface AutocompleteResult {
  keyword: string;
  intentMap: AutocompleteIntentGroup;
  timestamp: string;
}

const PORTUGUESE_MODIFIERS = {
  questions: ["como", "qual", "onde", "por que", "quem", "quando"],
  commercial: ["onde comprar", "preço", "valor", "comprar", "cupom", "desconto", "frete", "garantia"],
  informational: ["vale a pena", "funciona", "depoimentos", "efeitos colaterais", "antes e depois", "bula", "reclame aqui", "resenha"],
  brand: ["oficial", "site oficial", "original", "fabricante"]
};

const ENGLISH_MODIFIERS = {
  questions: ["how to", "what is", "where is", "why", "who", "when"],
  commercial: ["where to buy", "price", "cost", "buy", "coupon", "discount", "order", "shipping", "guarantee"],
  informational: ["is it worth it", "does it work", "reviews", "side effects", "before and after", "ingredients", "complaints", "scam"],
  brand: ["official", "official website", "original", "manufacturer"]
};

/**
 * Normalizes and cleans suggestions
 */
function cleanSuggestions(suggestions: string[], keyword: string): string[] {
  return Array.from(new Set(
    suggestions
      .map(s => s.trim().toLowerCase())
      .filter(s => s.length > 0 && s !== keyword.toLowerCase())
  ));
}

/**
 * Fetch Google Search Autocomplete suggestions for a query
 */
export async function fetchGoogleSuggestions(query: string, lang = 'pt'): Promise<string[]> {
  try {
    const url = `http://suggestqueries.google.com/complete/search?client=chrome&hl=${lang}&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
      },
      signal: AbortSignal.timeout(5000) // 5 seconds timeout
    });

    if (!res.ok) {
      throw new Error(`Google Autocomplete returned status ${res.status}`);
    }

    const data = await res.json();
    // suggestqueries JSON format: [query, [suggestion1, suggestion2, ...], ...]
    if (Array.isArray(data) && Array.isArray(data[1])) {
      return data[1].map((s: any) => String(s));
    }
    return [];
  } catch (err) {
    console.warn(`Autocomplete fetch failed for query "${query}":`, err);
    return [];
  }
}

/**
 * Run recursive and combinatorial Google Search Autocomplete queries grouped by intent map
 */
export async function getAutocompleteIntentMap(
  keyword: string,
  lang: 'pt' | 'en' = 'pt'
): Promise<AutocompleteResult> {
  const normalizedKeyword = keyword.trim();
  const modifiers = lang === 'pt' ? PORTUGUESE_MODIFIERS : ENGLISH_MODIFIERS;

  const resultGroups: AutocompleteIntentGroup = {
    questions: [],
    commercial: [],
    informational: [],
    brand: [],
    all: []
  };

  const allSuggestionsSet = new Set<string>();

  // 1. Get baseline suggestions for the raw keyword
  const baseline = await fetchGoogleSuggestions(normalizedKeyword, lang);
  for (const sug of baseline) {
    allSuggestionsSet.add(sug);
  }

  // Helper for batch/concurrent fetching with rate limit respect
  const fetchGroup = async (groupModifiers: string[], category: keyof Omit<AutocompleteIntentGroup, 'all'>) => {
    // Construct combinatorial search phrases: "modifier keyword" and "keyword modifier"
    const queries = groupModifiers.flatMap(mod => [
      `${mod} ${normalizedKeyword}`,
      `${normalizedKeyword} ${mod}`
    ]);

    // Fetch in parallel
    const promises = queries.map(q => fetchGoogleSuggestions(q, lang));
    const lists = await Promise.all(promises);

    for (const list of lists) {
      for (const sug of list) {
        if (!allSuggestionsSet.has(sug)) {
          allSuggestionsSet.add(sug);
          resultGroups[category].push(sug);
        }
      }
    }

    resultGroups[category] = cleanSuggestions(resultGroups[category], normalizedKeyword);
  };

  // Run intent groupings fetching
  await Promise.all([
    fetchGroup(modifiers.questions, 'questions'),
    fetchGroup(modifiers.commercial, 'commercial'),
    fetchGroup(modifiers.informational, 'informational'),
    fetchGroup(modifiers.brand, 'brand')
  ]);

  // Include baseline results that are not categorised into questions/commercial/etc.
  const baselineClean = cleanSuggestions(baseline, normalizedKeyword);
  for (const s of baselineClean) {
    const alreadyGrouped = [
      ...resultGroups.questions,
      ...resultGroups.commercial,
      ...resultGroups.informational,
      ...resultGroups.brand
    ].includes(s);

    if (!alreadyGrouped) {
      // Intelligently put baseline suggestions into default categories
      if (modifiers.questions.some(q => s.includes(q))) {
        resultGroups.questions.push(s);
      } else if (modifiers.commercial.some(c => s.includes(c))) {
        resultGroups.commercial.push(s);
      } else if (modifiers.informational.some(i => s.includes(i))) {
        resultGroups.informational.push(s);
      } else if (modifiers.brand.some(b => s.includes(b))) {
        resultGroups.brand.push(s);
      } else {
        // Default to informational if unclassified
        resultGroups.informational.push(s);
      }
    }
  }

  // Deduplicate and clean everything finally
  resultGroups.questions = cleanSuggestions(resultGroups.questions, normalizedKeyword);
  resultGroups.commercial = cleanSuggestions(resultGroups.commercial, normalizedKeyword);
  resultGroups.informational = cleanSuggestions(resultGroups.informational, normalizedKeyword);
  resultGroups.brand = cleanSuggestions(resultGroups.brand, normalizedKeyword);

  resultGroups.all = Array.from(new Set([
    ...resultGroups.questions,
    ...resultGroups.commercial,
    ...resultGroups.informational,
    ...resultGroups.brand
  ]));

  return {
    keyword: normalizedKeyword,
    intentMap: resultGroups,
    timestamp: new Date().toISOString()
  };
}
