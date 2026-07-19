export function affiliateMarketplaceUrl(network?: string | null, productName?: string | null): string | null {
  const n = (network ?? '').toLowerCase();
  const q = (productName ?? '').trim();
  if (!q) return null;
  if (n.includes('clickbank') || n === 'cb') {
    return `https://accounts.clickbank.com/master/dashboard/affiliate-marketplace#/results?includeKeywords=${encodeURIComponent(q)}&sortField=relevance`;
  }
  return null;
}
