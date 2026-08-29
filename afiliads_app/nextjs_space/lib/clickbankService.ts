import { prisma } from './prisma';
import { readIntegrationFieldValue } from './integration-secrets';

export interface ClickBankOffer {
  id: string;
  name: string;
  title: string;
  description: string;
  gravity: number;
  avgPayout: number;
  niche: string;
  promoteUrl?: string;
}

export interface ClickBankServiceOptions {
  userId?: string;
  isMockMode?: boolean;
}

const MOCK_OFFERS: ClickBankOffer[] = [
  {
    id: "prostadine",
    name: "prostadine",
    title: "Prostadine - Prostate Health Support",
    description: "Cold-pressed prostate support supplement with over 9 therapeutic ingredients.",
    gravity: 345.5,
    avgPayout: 120.5,
    niche: "Health & Fitness",
    promoteUrl: "https://prostadine.com"
  },
  {
    id: "livpure",
    name: "livpure",
    title: "Liv Pure - Weight Loss Formula",
    description: "Highly effective weight loss formulation targeting liver health.",
    gravity: 289.4,
    avgPayout: 145.0,
    niche: "Health & Fitness",
    promoteUrl: "https://livpure.com"
  },
  {
    id: "alpilean",
    name: "alpilean",
    title: "Alpilean - Alpine Weight Loss",
    description: "Metabolism-boosting formula based on Alpine ice hack secret.",
    gravity: 412.1,
    avgPayout: 135.2,
    niche: "Health & Fitness",
    promoteUrl: "https://alpilean.com"
  },
  {
    id: "dentitox",
    name: "dentitox",
    title: "Dentitox Pro - Dental Health",
    description: "A natural oral spray targeting tooth decay and gum disease.",
    gravity: 95.3,
    avgPayout: 80.0,
    niche: "Health & Fitness",
    promoteUrl: "https://dentitox.com"
  },
  {
    id: "neurodrine",
    name: "neurodrine",
    title: "Neurodrine - Brain Health Support",
    description: "Advanced brain support and cognitive enhancer.",
    gravity: 74.2,
    avgPayout: 110.0,
    niche: "Self-Help",
    promoteUrl: "https://neurodrine.com"
  },
  {
    id: "fast_wealth",
    name: "fast_wealth",
    title: "The Fast Wealth Manifestation Program",
    description: "Unlocking hidden financial prosperity through subconscious retraining.",
    gravity: 120.6,
    avgPayout: 65.4,
    niche: "Spirituality",
    promoteUrl: "https://fastwealth.com"
  }
];

export async function searchClickBankOffers(
  niche?: string,
  options: ClickBankServiceOptions = {}
): Promise<ClickBankOffer[]> {
  const userId = options.userId;
  let isMock = options.isMockMode ?? process.env.CLICKBANK_MOCK_MODE === 'true';

  if (userId && !options.isMockMode) {
    try {
      const rows = await prisma.integration.findMany({ where: { userId, serviceName: 'clickbank' } });
      const mockModeRow = rows.find(r => r.fieldName === 'is_mock_mode');
      if (mockModeRow?.fieldValue === 'true') {
        isMock = true;
      }
      const apiKeyRow = rows.find(r => r.fieldName === 'api_key');
      const apiKey = apiKeyRow?.fieldValue
        ? readIntegrationFieldValue(apiKeyRow.fieldName, apiKeyRow.fieldValue)
        : '';
      if (!apiKey || apiKey.includes('MOCK')) {
        isMock = true;
      }
    } catch {
      isMock = true;
    }
  }

  if (isMock) {
    let filtered = [...MOCK_OFFERS];
    if (niche) {
      filtered = filtered.filter(o => o.niche.toLowerCase().includes(niche.toLowerCase()));
    }
    // Default sorting: gravity DESC
    return filtered.sort((a, b) => b.gravity - a.gravity);
  }

  // Real fetch from ClickBank Marketplace API or feed
  try {
    let apiKey = '';
    if (userId) {
      const rows = await prisma.integration.findMany({ where: { userId, serviceName: 'clickbank' } });
      const apiKeyRow = rows.find(r => r.fieldName === 'api_key');
      apiKey = apiKeyRow?.fieldValue ? readIntegrationFieldValue(apiKeyRow.fieldName, apiKeyRow.fieldValue) : '';
    }

    if (!apiKey) {
      throw new Error('API key not configured');
    }

    const res = await fetch(`https://api.clickbank.com/rest/1.3/products/list?includeNiche=${niche || ''}`, {
      headers: {
        Authorization: `sha256 ${apiKey}`,
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`ClickBank Marketplace API Error ${res.status}`);
    }

    const data = await res.json();
    const products: any[] = data?.products || [];

    const mapped: ClickBankOffer[] = products.map(p => ({
      id: p.id || p.sku || '',
      name: p.id || p.sku || '',
      title: p.title || '',
      description: p.description || '',
      gravity: Number(p.gravity || 0),
      avgPayout: Number(p.avgPayout || p.averageEarningsPerSale || 0),
      niche: p.niche || p.category || 'General',
      promoteUrl: p.promoteUrl || `https://clickbank.com/product/${p.id}`,
    }));

    if (niche) {
      return mapped.filter(o => o.niche.toLowerCase().includes(niche.toLowerCase()))
                   .sort((a, b) => b.gravity - a.gravity);
    }

    return mapped.sort((a, b) => b.gravity - a.gravity);
  } catch (err) {
    console.warn('ClickBank real API failed, falling back to mock:', err);
    let filtered = [...MOCK_OFFERS];
    if (niche) {
      filtered = filtered.filter(o => o.niche.toLowerCase().includes(niche.toLowerCase()));
    }
    return filtered.sort((a, b) => b.gravity - a.gravity);
  }
}
