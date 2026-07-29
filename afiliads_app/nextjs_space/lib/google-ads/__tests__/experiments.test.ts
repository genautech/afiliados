import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  applyFinalUrlVariation,
  createExperiment,
  createExperimentArms,
  getTreatmentInDesignCampaign,
  type ExperimentArmInput,
} from '@/lib/google-ads/experiments';
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

describe('createExperiment', () => {
  const input = {
    name: 'Teste presell A/B',
    suffix: 'exp-1',
    startDate: '2030-01-10',
    endDate: '2030-01-20',
  };

  it('1. modo mock não chama fetch e devolve status SETUP', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const result = await createExperiment('tok', mockCredentials(), input);
    expect(result.mock).toBe(true);
    expect(result.status).toBe('SETUP');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('2. modo real envia o payload com status SETUP e os campos da entrada', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      jsonResponse({
        results: [{ resourceName: 'customers/1234567890/experiments/999' }],
      })
    );
    vi.stubGlobal('fetch', fetchSpy);

    const result = await createExperiment('tok', realCredentials(), input);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [, requestInit] = fetchSpy.mock.calls[0];
    const body = JSON.parse(requestInit.body as string);
    expect(body.operations).toHaveLength(1);
    expect(body.operations[0].create).toMatchObject({
      name: input.name,
      suffix: input.suffix,
      type: 'SEARCH_CUSTOM',
      status: 'SETUP',
      startDate: input.startDate,
      endDate: input.endDate,
    });
    expect(result.googleExperimentId).toBe('999');
    expect(result.resourceName).toBe('customers/1234567890/experiments/999');
  });

  it('3. lança erro se a API não devolver resourceName', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ results: [{}] })));
    await expect(createExperiment('tok', realCredentials(), input)).rejects.toThrow(
      /resourceName/
    );
  });
});

function controlArm(overrides: Partial<ExperimentArmInput> = {}): ExperimentArmInput {
  return {
    name: 'control',
    isControl: true,
    trafficSplit: 50,
    campaignResourceName: 'customers/1234567890/campaigns/111',
    ...overrides,
  };
}

function treatmentArm(overrides: Partial<ExperimentArmInput> = {}): ExperimentArmInput {
  return {
    name: 'treatment',
    isControl: false,
    trafficSplit: 50,
    ...overrides,
  };
}

describe('createExperimentArms — validação de invariantes (antes de qualquer fetch)', () => {
  it('4. falha sem campanha de controle (campaignResourceName ausente) — não chama fetch', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    await expect(
      createExperimentArms('tok', realCredentials(), {
        experimentResourceName: 'customers/1234567890/experiments/999',
        arms: [controlArm({ campaignResourceName: undefined }), treatmentArm()],
      })
    ).rejects.toThrow(/campanha existente/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('5. falha sem nenhum braço de controle', async () => {
    await expect(
      createExperimentArms('tok', realCredentials(), {
        experimentResourceName: 'customers/1234567890/experiments/999',
        arms: [treatmentArm({ name: 'a' }), treatmentArm({ name: 'b' })],
      })
    ).rejects.toThrow(/1 braço de controle/);
  });

  it('6. falha com 2 braços de controle', async () => {
    await expect(
      createExperimentArms('tok', realCredentials(), {
        experimentResourceName: 'customers/1234567890/experiments/999',
        arms: [controlArm(), controlArm({ name: 'control-2' })],
      })
    ).rejects.toThrow(/1 braço de controle/);
  });

  it('7. falha quando a soma dos trafficSplit não é 100', async () => {
    await expect(
      createExperimentArms('tok', realCredentials(), {
        experimentResourceName: 'customers/1234567890/experiments/999',
        arms: [controlArm({ trafficSplit: 30 }), treatmentArm({ trafficSplit: 30 })],
      })
    ).rejects.toThrow(/precisa ser 100/);
  });
});

describe('createExperimentArms — modo mock', () => {
  it('8. não chama fetch e devolve in-design campaign só pro tratamento', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const arms = await createExperimentArms('tok', mockCredentials(), {
      experimentResourceName: 'customers/1234567890/experiments/999',
      arms: [controlArm(), treatmentArm()],
    });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(arms[0].inDesignCampaignResourceName).toBeNull();
    expect(arms[1].inDesignCampaignResourceName).toContain('MOCK-IN-DESIGN');
  });
});

describe('createExperimentArms — modo real', () => {
  it('9. envia os 2 braços NA MESMA request (1 única chamada fetch, 2 operations)', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      jsonResponse({
        results: [
          {
            experimentArm: {
              resourceName: 'customers/1234567890/experiments/999/experimentArms/1',
              inDesignCampaigns: [],
            },
          },
          {
            experimentArm: {
              resourceName: 'customers/1234567890/experiments/999/experimentArms/2',
              inDesignCampaigns: ['customers/1234567890/campaigns/555'],
            },
          },
        ],
      })
    );
    vi.stubGlobal('fetch', fetchSpy);

    await createExperimentArms('tok', realCredentials(), {
      experimentResourceName: 'customers/1234567890/experiments/999',
      arms: [controlArm(), treatmentArm()],
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [, requestInit] = fetchSpy.mock.calls[0];
    const body = JSON.parse(requestInit.body as string);
    expect(body.operations).toHaveLength(2);
    expect(body.partialFailure).toBe(false);
    expect(body.responseContentType).toBe('MUTABLE_RESOURCE');
  });

  it('10. captura inDesignCampaigns do MUTABLE_RESOURCE só pro braço de tratamento', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({
          results: [
            {
              experimentArm: {
                resourceName: 'customers/1234567890/experiments/999/experimentArms/1',
                inDesignCampaigns: [],
              },
            },
            {
              experimentArm: {
                resourceName: 'customers/1234567890/experiments/999/experimentArms/2',
                inDesignCampaigns: ['customers/1234567890/campaigns/555'],
              },
            },
          ],
        })
      )
    );

    const arms = await createExperimentArms('tok', realCredentials(), {
      experimentResourceName: 'customers/1234567890/experiments/999',
      arms: [controlArm(), treatmentArm()],
    });

    expect(arms[0].inDesignCampaignResourceName).toBeNull();
    expect(arms[0].servedCampaignResourceName).toBe('customers/1234567890/campaigns/111');
    expect(arms[1].inDesignCampaignResourceName).toBe('customers/1234567890/campaigns/555');
    expect(arms[1].servedCampaignResourceName).toBeNull();
  });

  it('11. lança erro se a API devolver número de resultados diferente do número de braços enviados', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ results: [{ experimentArm: { resourceName: 'x' } }] }))
    );
    await expect(
      createExperimentArms('tok', realCredentials(), {
        experimentResourceName: 'customers/1234567890/experiments/999',
        arms: [controlArm(), treatmentArm()],
      })
    ).rejects.toThrow(/resultado/);
  });
});

describe('getTreatmentInDesignCampaign', () => {
  it('12. modo mock não chama fetch e devolve valor fixo', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const result = await getTreatmentInDesignCampaign(
      'tok',
      mockCredentials(),
      'customers/1234567890/experiments/999'
    );
    expect(result).toContain('MOCK-IN-DESIGN');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('13. modo real pede includeDrafts=true e acha a in-design campaign do braço não-controle', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      jsonResponse({
        results: [
          { experimentArm: { control: true, inDesignCampaigns: [] } },
          {
            experimentArm: {
              control: false,
              inDesignCampaigns: ['customers/1234567890/campaigns/777'],
            },
          },
        ],
      })
    );
    vi.stubGlobal('fetch', fetchSpy);

    const result = await getTreatmentInDesignCampaign(
      'tok',
      realCredentials(),
      'customers/1234567890/experiments/999'
    );

    expect(result).toBe('customers/1234567890/campaigns/777');
    const [, requestInit] = fetchSpy.mock.calls[0];
    const body = JSON.parse(requestInit.body as string);
    expect(body.includeDrafts).toBe(true);
  });

  it('14. devolve null quando não encontra braço de tratamento na resposta', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({ results: [{ experimentArm: { control: true, inDesignCampaigns: [] } }] })
      )
    );
    const result = await getTreatmentInDesignCampaign(
      'tok',
      realCredentials(),
      'customers/1234567890/experiments/999'
    );
    expect(result).toBeNull();
  });
});

const TREATMENT_CAMPAIGN = 'customers/1234567890/campaigns/MOCK-IN-DESIGN-treatment';
const NEW_URL = 'https://example.com/presell-variante-b';

function adSearchResponse(finalUrl: string) {
  return jsonResponse({
    results: [
      {
        adGroupAd: {
          resourceName: `${TREATMENT_CAMPAIGN}/adGroups/1/adGroupAds/1`,
          ad: { finalUrls: [finalUrl] },
        },
        adGroup: { resourceName: `${TREATMENT_CAMPAIGN}/adGroups/1` },
      },
    ],
  });
}

describe('applyFinalUrlVariation', () => {
  it('15. modo mock não chama fetch, verified=true, 1 ad modificado', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const result = await applyFinalUrlVariation(
      'tok',
      mockCredentials(),
      TREATMENT_CAMPAIGN,
      NEW_URL
    );
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.verified).toBe(true);
    expect(result.adsModified).toHaveLength(1);
    expect(result.adsModified[0].finalUrlAfter).toEqual([NEW_URL]);
  });

  it('16. modo real: acha ad -> muta -> relê, e confirma finalUrls igual à variação (verified=true)', async () => {
    const fetchSpy = vi
      .fn()
      // 1ª chamada: find (antes)
      .mockResolvedValueOnce(adSearchResponse('https://example.com/url-antiga'))
      // 2ª chamada: mutate
      .mockResolvedValueOnce(
        jsonResponse({ results: [{ resourceName: `${TREATMENT_CAMPAIGN}/adGroups/1/adGroupAds/1` }] })
      )
      // 3ª chamada: find (depois, releitura)
      .mockResolvedValueOnce(adSearchResponse(NEW_URL));
    vi.stubGlobal('fetch', fetchSpy);

    const result = await applyFinalUrlVariation(
      'tok',
      realCredentials(),
      TREATMENT_CAMPAIGN,
      NEW_URL
    );

    expect(fetchSpy).toHaveBeenCalledTimes(3);
    expect(result.verified).toBe(true);
    expect(result.warnings).toHaveLength(0);
    expect(result.adsModified[0]).toEqual({
      resourceName: `${TREATMENT_CAMPAIGN}/adGroups/1/adGroupAds/1`,
      finalUrlBefore: ['https://example.com/url-antiga'],
      finalUrlAfter: [NEW_URL],
    });
  });

  it('17. releitura NÃO confirma a mudança -> verified=false com warning (não confia só no HTTP 200)', async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(adSearchResponse('https://example.com/url-antiga'))
      .mockResolvedValueOnce(
        jsonResponse({ results: [{ resourceName: `${TREATMENT_CAMPAIGN}/adGroups/1/adGroupAds/1` }] })
      )
      // releitura devolve a URL ANTIGA ainda — mutate "funcionou" (200) mas não vingou de verdade
      .mockResolvedValueOnce(adSearchResponse('https://example.com/url-antiga'));
    vi.stubGlobal('fetch', fetchSpy);

    const result = await applyFinalUrlVariation(
      'tok',
      realCredentials(),
      TREATMENT_CAMPAIGN,
      NEW_URL
    );

    expect(result.verified).toBe(false);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('18. nenhum anúncio encontrado no treatment -> lança erro, nunca chega a mutar nada', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse({ results: [] }));
    vi.stubGlobal('fetch', fetchSpy);

    await expect(
      applyFinalUrlVariation('tok', realCredentials(), TREATMENT_CAMPAIGN, NEW_URL)
    ).rejects.toThrow(/Nenhum anúncio encontrado/);
    expect(fetchSpy).toHaveBeenCalledTimes(1); // só a busca, nenhum mutate tentado
  });

  it('19. a busca de anúncios usa includeDrafts=true (campanha em design só aparece assim)', async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(adSearchResponse('https://example.com/url-antiga'))
      .mockResolvedValueOnce(
        jsonResponse({ results: [{ resourceName: `${TREATMENT_CAMPAIGN}/adGroups/1/adGroupAds/1` }] })
      )
      .mockResolvedValueOnce(adSearchResponse(NEW_URL));
    vi.stubGlobal('fetch', fetchSpy);

    await applyFinalUrlVariation('tok', realCredentials(), TREATMENT_CAMPAIGN, NEW_URL);

    const [, firstCallInit] = fetchSpy.mock.calls[0];
    const firstBody = JSON.parse(firstCallInit.body as string);
    expect(firstBody.includeDrafts).toBe(true);
    expect(firstBody.query).toContain(TREATMENT_CAMPAIGN);
  });
});
