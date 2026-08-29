import { prisma } from './prisma';
import { readIntegrationFieldValue } from './integration-secrets';

export interface MaxWebOffer {
  id: string;
  name: string;
  title: string;
  description: string;
  payout: number;
  cpaModel: string; // CPA | CPL | RevShare
  niche: string;
  gravityOrRating: number;
  epc: number;
  promoteUrl?: string;
  geoAllowed: string[];
}

export interface MaxWebServiceOptions {
  userId?: string;
  isMockMode?: boolean;
}

const MOCK_MAXWEB_OFFERS: MaxWebOffer[] = [
  {
    id: "mw-sugar-defender",
    name: "sugar-defender",
    title: "Sugar Defender - Blood Sugar Support",
    description: "High converting physical supplement targeting type-2 diabetes and general blood sugar health.",
    payout: 135.0,
    cpaModel: "CPA",
    niche: "Health & Fitness",
    gravityOrRating: 4.8,
    epc: 3.45,
    promoteUrl: "https://maxweb.com/offer/sugar-defender",
    geoAllowed: ["US", "CA", "GB", "AU"]
  },
  {
    id: "mw-prodentim",
    name: "prodentim",
    title: "ProDentim - Advanced Oral Probiotics",
    description: "A physical dental health supplement that reconstructs healthy gums and teeth.",
    payout: 125.0,
    cpaModel: "CPA",
    niche: "Health & Fitness",
    gravityOrRating: 4.7,
    epc: 2.95,
    promoteUrl: "https://maxweb.com/offer/prodentim",
    geoAllowed: ["US", "CA"]
  },
  {
    id: "mw-puravive",
    name: "puravive",
    title: "Puravive - Exotic Rice Weight Loss",
    description: "Highly converting fat burner physical offer focused on brown adipose tissue.",
    payout: 140.0,
    cpaModel: "CPA",
    niche: "Health & Fitness",
    gravityOrRating: 4.9,
    epc: 4.10,
    promoteUrl: "https://maxweb.com/offer/puravive",
    geoAllowed: ["US", "UK", "CA", "NZ"]
  },
  {
    id: "mw-wealth-dna",
    name: "wealth-dna",
    title: "Wealth DNA Code - Mindset Physical Package",
    description: "Physical manifestation/audio set package with incredibly high conversion rates.",
    payout: 75.0,
    cpaModel: "CPA",
    niche: "Self-Help",
    gravityOrRating: 4.2,
    epc: 1.85,
    promoteUrl: "https://maxweb.com/offer/wealth-dna",
    geoAllowed: ["US", "CA", "AU", "GB", "ZA"]
  }
];

export async function searchMaxWebOffers(
  niche?: string,
  options: MaxWebServiceOptions = {}
): Promise<MaxWebOffer[]> {
  const userId = options.userId;
  let isMock = options.isMockMode ?? process.env.MAXWEB_MOCK_MODE === 'true';

  if (userId && !options.isMockMode) {
    try {
      const rows = await prisma.integration.findMany({ where: { userId, serviceName: 'maxweb' } });
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
    let filtered = [...MOCK_MAXWEB_OFFERS];
    if (niche) {
      filtered = filtered.filter(o => o.niche.toLowerCase().includes(niche.toLowerCase()));
    }
    return filtered.sort((a, b) => b.epc - a.epc);
  }

  // Real fetch from MaxWeb Affiliate API
  try {
    let apiKey = '';
    if (userId) {
      const rows = await prisma.integration.findMany({ where: { userId, serviceName: 'maxweb' } });
      const apiKeyRow = rows.find(r => r.fieldName === 'api_key');
      apiKey = apiKeyRow?.fieldValue ? readIntegrationFieldValue(apiKeyRow.fieldName, apiKeyRow.fieldValue) : '';
    }

    if (!apiKey) {
      throw new Error('API key not configured');
    }

    // Call MaxWeb REST API for offers
    const res = await fetch(`https://api.maxweb.com/v1/offers?niche=${niche || ''}`, {
      headers: {
        'X-API-KEY': apiKey,
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`MaxWeb API Error ${res.status}`);
    }

    const data = await res.json();
    const offers: any[] = data?.offers || [];

    const mapped: MaxWebOffer[] = offers.map(o => ({
      id: o.id || o.offer_id || '',
      name: o.slug || o.name || '',
      title: o.name || '',
      description: o.description || '',
      payout: Number(o.payout || o.commission || 0),
      cpaModel: o.model || 'CPA',
      niche: o.category || 'General',
      gravityOrRating: Number(o.rating || o.gravity || 0),
      epc: Number(o.epc || 0),
      promoteUrl: o.link || o.promote_url || `https://maxweb.com/offer/${o.id}`,
      geoAllowed: Array.isArray(o.geos) ? o.geos : [o.geos || 'US'],
    }));

    return mapped.sort((a, b) => b.epc - a.epc);
  } catch (err) {
    console.warn('MaxWeb real API failed, falling back to mock:', err);
    let filtered = [...MOCK_MAXWEB_OFFERS];
    if (niche) {
      filtered = filtered.filter(o => o.niche.toLowerCase().includes(niche.toLowerCase()));
    }
    return filtered.sort((a, b) => b.epc - a.epc);
  }
}
