import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAutocompleteIntentMap } from '../autocompleteService';

describe('Google Search Autocomplete Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch combinatronics and group results by search intent map', async () => {
    // Mock global fetch for suggestqueries
    const globalFetch = global.fetch;
    global.fetch = vi.fn().mockImplementation((url: string) => {
      let suggestions: string[] = [];
      if (url.includes('como%20diet%20caps') || url.includes('diet%20caps%20como')) {
        suggestions = ['como usar diet caps', 'como funciona diet caps'];
      } else if (url.includes('pre%C3%A7o%20diet%20caps') || url.includes('diet%20caps%20pre%C3%A7o')) {
        suggestions = ['diet caps preço', 'onde comprar diet caps com desconto'];
      } else {
        suggestions = ['diet caps funciona', 'diet caps vale a pena'];
      }

      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(['diet caps', suggestions]),
      });
    }) as any;

    try {
      const result = await getAutocompleteIntentMap('diet caps', 'pt');
      expect(result.keyword).toBe('diet caps');
      expect(result.intentMap.questions).toContain('como usar diet caps');
      expect(result.intentMap.commercial).toContain('diet caps preço');
      expect(result.intentMap.all.length).toBeGreaterThan(0);
    } finally {
      global.fetch = globalFetch;
    }
  });
});
