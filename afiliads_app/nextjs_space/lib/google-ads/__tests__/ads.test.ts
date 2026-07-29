import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildUpdateAdFinalUrlsOperation,
  findAdGroupAdsInCampaign,
  parseUpdateAdFinalUrlsResponse,
  updateAdFinalUrls,
} from '@/lib/google-ads/ads';
import type { GoogleAdsCredentials } from '@/lib/google-ads/client';

function realCredentials(overrides: Partial<GoogleAdsCredentials> = {}): GoogleAdsCredentials {
  return {
    customerId: '1234567890',
    developerToken: 'real-token',
    clientId: 'real-client-id',
    clientSecret: 'real-secret',
    refreshToken: 'real-refresh',
    ...overrides,
  };
}

function mockCredentials(): GoogleAdsCredentials {
  return realCredentials({ developerToken: 'DEV_TOKEN_MOCK' });
}

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const CAMPAIGN = 'customers/1234567890/campaigns/999';

describe('findAdGroupAdsInCampaign', () => {
  it('1. modo mock não chama fetch e devolve 1 ad determinístico', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const ads = await findAdGroupAdsInCampaign('tok', mockCredentials(), CAMPAIGN);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(ads).toHaveLength(1);
  });

  it('2. modo real pede includeDrafts=true quando passado explicitamente', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse({ results: [] }));
    vi.stubGlobal('fetch', fetchSpy);
    await findAdGroupAdsInCampaign('tok', realCredentials(), CAMPAIGN, { includeDrafts: true });
    const [, requestInit] = fetchSpy.mock.calls[0];
    const body = JSON.parse(requestInit.body as string);
    expect(body.includeDrafts).toBe(true);
    expect(body.query).toContain(CAMPAIGN);
  });

  it('3. includeDrafts default é false quando não informado', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse({ results: [] }));
    vi.stubGlobal('fetch', fetchSpy);
    await findAdGroupAdsInCampaign('tok', realCredentials(), CAMPAIGN);
    const [, requestInit] = fetchSpy.mock.calls[0];
    const body = JSON.parse(requestInit.body as string);
    expect(body.includeDrafts).toBe(false);
  });

  it('4. parseia resourceName/finalUrls das linhas retornadas', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({
          results: [
            {
              adGroupAd: {
                resourceName: `${CAMPAIGN}/adGroups/1/adGroupAds/1`,
                ad: { finalUrls: ['https://example.com/a'] },
              },
              adGroup: { resourceName: `${CAMPAIGN}/adGroups/1` },
            },
          ],
        })
      )
    );
    const ads = await findAdGroupAdsInCampaign('tok', realCredentials(), CAMPAIGN, {
      includeDrafts: true,
    });
    expect(ads).toEqual([
      {
        resourceName: `${CAMPAIGN}/adGroups/1/adGroupAds/1`,
        adGroupResourceName: `${CAMPAIGN}/adGroups/1`,
        finalUrls: ['https://example.com/a'],
      },
    ]);
  });

  it('5. descarta linhas incompletas (sem resourceName ou adGroup)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({
          results: [{ adGroupAd: { ad: { finalUrls: [] } } }],
        })
      )
    );
    const ads = await findAdGroupAdsInCampaign('tok', realCredentials(), CAMPAIGN);
    expect(ads).toHaveLength(0);
  });
});

describe('updateAdFinalUrls', () => {
  it('6. modo mock não chama fetch e ecoa a URL pedida', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const result = await updateAdFinalUrls('tok', mockCredentials(), 'ad/1', [
      'https://example.com/nova',
    ]);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.finalUrls).toEqual(['https://example.com/nova']);
  });

  it('7. modo real (sem GOOGLE_ADS_MUTATIONS_ENABLED) é bloqueado pelo guard — zero fetch', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    await expect(
      updateAdFinalUrls('tok', realCredentials(), 'ad/1', ['https://example.com/nova'])
    ).rejects.toThrow(/Mutação bloqueada pelo guard/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

// buildUpdateAdFinalUrlsOperation/parseUpdateAdFinalUrlsResponse são puros (sem rede/guard) —
// cobrem o shape do payload/resposta que updateAdFinalUrls monta internamente, já que o guard
// (teste 7 acima) impede exercitar esse caminho via fetch real até a Tarefa 10 plugar
// `confirmed` de verdade.
describe('buildUpdateAdFinalUrlsOperation', () => {
  it('8. monta updateMask restrito a ad.final_urls, sem tocar outros campos', () => {
    const op = buildUpdateAdFinalUrlsOperation('ad/1', ['https://example.com/nova']);
    expect(op).toEqual({
      update: { resourceName: 'ad/1', ad: { finalUrls: ['https://example.com/nova'] } },
      updateMask: 'ad.final_urls',
    });
  });
});

describe('parseUpdateAdFinalUrlsResponse', () => {
  it('9. devolve resourceName + finalUrls quando a API confirma', () => {
    const result = parseUpdateAdFinalUrlsResponse(
      { results: [{ resourceName: 'ad/1' }] },
      'ad/1',
      ['https://example.com/nova']
    );
    expect(result).toEqual({ resourceName: 'ad/1', finalUrls: ['https://example.com/nova'] });
  });

  it('10. lança erro se a API não confirmar resourceName na resposta', () => {
    expect(() =>
      parseUpdateAdFinalUrlsResponse({ results: [{}] }, 'ad/1', ['https://example.com/nova'])
    ).toThrow(/não confirmou/);
  });
});
