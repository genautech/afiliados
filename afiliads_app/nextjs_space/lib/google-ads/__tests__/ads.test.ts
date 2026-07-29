import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildUpdateAdFinalUrlsBatchOperations,
  buildUpdateAdFinalUrlsOperation,
  findAdGroupAdsInCampaign,
  parseUpdateAdFinalUrlsBatchResponse,
  updateAdFinalUrlsBatch,
} from '@/lib/google-ads/ads';
import { createMutationCapability, type GoogleAdsCredentials } from '@/lib/google-ads/client';

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
  it('1. modo mock não chama fetch e devolve 1 ad determinístico com resource name flat (A7)', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const ads = await findAdGroupAdsInCampaign('tok', mockCredentials(), CAMPAIGN);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(ads).toHaveLength(1);
    expect(ads[0].resourceName).toBe('customers/1234567890/adGroupAds/MOCK-AG~MOCK-AD');
  });

  it('2. modo real NÃO envia includeDrafts no body (A3 — campo não existe em SearchGoogleAdsRequest v25)', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse({ results: [] }));
    vi.stubGlobal('fetch', fetchSpy);
    await findAdGroupAdsInCampaign('tok', realCredentials(), CAMPAIGN);
    const [, requestInit] = fetchSpy.mock.calls[0];
    const body = JSON.parse(requestInit.body as string);
    expect(body).not.toHaveProperty('includeDrafts');
    expect(body.query).toContain(CAMPAIGN);
  });

  it('3. parseia resourceName/finalUrls das linhas retornadas', async () => {
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
    const ads = await findAdGroupAdsInCampaign('tok', realCredentials(), CAMPAIGN);
    expect(ads).toEqual([
      {
        resourceName: `${CAMPAIGN}/adGroups/1/adGroupAds/1`,
        adGroupResourceName: `${CAMPAIGN}/adGroups/1`,
        finalUrls: ['https://example.com/a'],
      },
    ]);
  });

  it('4. descarta linhas incompletas (sem resourceName ou adGroup)', async () => {
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

describe('updateAdFinalUrlsBatch', () => {
  it('5. modo mock não chama fetch e ecoa a URL pedida pra todos os anúncios', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const capability = createMutationCapability('updateAdFinalUrls');
    const result = await updateAdFinalUrlsBatch(
      'tok',
      mockCredentials(),
      ['ad/1', 'ad/2'],
      ['https://example.com/nova'],
      capability
    );
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result).toEqual([
      { resourceName: 'ad/1', finalUrls: ['https://example.com/nova'] },
      { resourceName: 'ad/2', finalUrls: ['https://example.com/nova'] },
    ]);
  });

  it('6. lista vazia de anúncios não chama fetch e devolve []', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const result = await updateAdFinalUrlsBatch(
      'tok',
      realCredentials(),
      [],
      ['https://example.com/nova'],
      createMutationCapability('updateAdFinalUrls')
    );
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it('7. A5: capability inválida/ausente bloqueia ANTES de qualquer fetch, mesmo em modo real', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    await expect(
      updateAdFinalUrlsBatch(
        'tok',
        realCredentials(),
        ['ad/1'],
        ['https://example.com/nova'],
        { brand: 'nao-e-uma-capability-de-verdade' } as any
      )
    ).rejects.toThrow(/bloqueada.*MutationCapability|MutationCapability.*bloqueada/i);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('8. A6: com capability válida, envia TODOS os anúncios numa ÚNICA mutate (partialFailure:false)', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      jsonResponse({ results: [{ resourceName: 'ad/1' }, { resourceName: 'ad/2' }] })
    );
    vi.stubGlobal('fetch', fetchSpy);

    const result = await updateAdFinalUrlsBatch(
      'tok',
      realCredentials(),
      ['ad/1', 'ad/2'],
      ['https://example.com/nova'],
      createMutationCapability('updateAdFinalUrls')
    );

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [, requestInit] = fetchSpy.mock.calls[0];
    const body = JSON.parse(requestInit.body as string);
    expect(body.operations).toHaveLength(2);
    expect(body.partialFailure).toBe(false);
    expect(result).toEqual([
      { resourceName: 'ad/1', finalUrls: ['https://example.com/nova'] },
      { resourceName: 'ad/2', finalUrls: ['https://example.com/nova'] },
    ]);
  });
});

describe('buildUpdateAdFinalUrlsOperation', () => {
  it('9. monta updateMask restrito a ad.final_urls, sem tocar outros campos', () => {
    const op = buildUpdateAdFinalUrlsOperation('ad/1', ['https://example.com/nova']);
    expect(op).toEqual({
      update: { resourceName: 'ad/1', ad: { finalUrls: ['https://example.com/nova'] } },
      updateMask: 'ad.final_urls',
    });
  });
});

describe('buildUpdateAdFinalUrlsBatchOperations', () => {
  it('10. gera 1 operation por resourceName, todas com a mesma finalUrls', () => {
    const ops = buildUpdateAdFinalUrlsBatchOperations(['ad/1', 'ad/2'], ['https://example.com/nova']);
    expect(ops).toHaveLength(2);
    expect(ops[0].update.resourceName).toBe('ad/1');
    expect(ops[1].update.resourceName).toBe('ad/2');
    expect(ops.every((op) => op.updateMask === 'ad.final_urls')).toBe(true);
  });
});

describe('parseUpdateAdFinalUrlsBatchResponse', () => {
  it('11. devolve resourceName + finalUrls pra cada resultado confirmado', () => {
    const result = parseUpdateAdFinalUrlsBatchResponse(
      { results: [{ resourceName: 'ad/1' }, { resourceName: 'ad/2' }] },
      ['ad/1', 'ad/2'],
      ['https://example.com/nova']
    );
    expect(result).toEqual([
      { resourceName: 'ad/1', finalUrls: ['https://example.com/nova'] },
      { resourceName: 'ad/2', finalUrls: ['https://example.com/nova'] },
    ]);
  });

  it('12. lança erro se o número de resultados não bater com o de anúncios enviados', () => {
    expect(() =>
      parseUpdateAdFinalUrlsBatchResponse({ results: [{ resourceName: 'ad/1' }] }, ['ad/1', 'ad/2'], [
        'https://example.com/nova',
      ])
    ).toThrow(/retornou.*resultado/i);
  });

  it('13. lança erro se algum resultado não confirmar resourceName', () => {
    expect(() =>
      parseUpdateAdFinalUrlsBatchResponse({ results: [{}] }, ['ad/1'], ['https://example.com/nova'])
    ).toThrow(/não confirmou/);
  });
});
