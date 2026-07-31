import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  applyFinalUrlVariation,
  assertVariationReadyForSchedule,
  buildCreateExperimentArmsOperations,
  buildCreateExperimentOperation,
  compareFinalUrlsAfterMutation,
  createExperiment,
  createExperimentArms,
  getTreatmentInDesignCampaign,
  parseCreateExperimentArmsResponse,
  parseCreateExperimentResponse,
  parseExperimentArmRow,
  type ApplyFinalUrlVariationResult,
  type ExperimentArmInput,
} from '@/lib/google-ads/experiments';
import type { GoogleAdsCredentials } from '@/lib/google-ads/client';
import type { AdGroupAdSummary } from '@/lib/google-ads/ads';

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
    const result = await createExperiment('tok', mockCredentials(), input, { allowed: true } as any);
    expect(result.mock).toBe(true);
    expect(result.status).toBe('SETUP');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('1a. seeds completos distintos não colidem mesmo com o mesmo suffix curto', async () => {
    const first = await createExperiment('tok', mockCredentials(), {
      ...input, suffix: 'abcdefghijkl', mockIdentitySeed: 'abcdefghijkl-ONE',
    }, { allowed: true } as any);
    const second = await createExperiment('tok', mockCredentials(), {
      ...input, suffix: 'abcdefghijkl', mockIdentitySeed: 'abcdefghijkl-TWO',
    }, { allowed: true } as any);
    expect(first.googleExperimentId).not.toBe(second.googleExperimentId);
    expect(first.resourceName).not.toBe(second.resourceName);
  });

  it('1b. contraexemplo de colisão do hash polinomial gera identidades distintas', async () => {
    const first = await createExperiment('tok', mockCredentials(), {
      ...input, suffix: 'sameprefix12', mockIdentitySeed: 'sameprefix12-T_ZdEhD5woUz',
    }, { allowed: true } as any);
    const second = await createExperiment('tok', mockCredentials(), {
      ...input, suffix: 'sameprefix12', mockIdentitySeed: 'sameprefix12-h-cbelt_9Reh',
    }, { allowed: true } as any);
    expect(first.googleExperimentId).not.toBe(second.googleExperimentId);
    expect(first.googleExperimentId).toMatch(/^\d+$/);
    expect(second.googleExperimentId).toMatch(/^\d+$/);
  });

  it('2. modo real (sem GOOGLE_ADS_MUTATIONS_ENABLED) é bloqueado pelo guard — zero fetch', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    await expect(createExperiment('tok', realCredentials(), input, { allowed: true } as any)).rejects.toThrow(
      /bloqueada:/
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

// buildCreateExperimentOperation/parseCreateExperimentResponse são puros (sem rede/guard) —
// cobrem o shape do payload/resposta que createExperiment monta internamente, já que o guard
// (teste 2 acima) impede exercitar esse caminho via fetch real até a Tarefa 10 plugar
// `confirmed` de verdade.
describe('buildCreateExperimentOperation', () => {
  it('3. monta o payload com status SETUP e os campos da entrada', () => {
    const op = buildCreateExperimentOperation({
      name: 'Teste presell A/B',
      suffix: 'exp-1',
      mockIdentitySeed: 'internal-only-seed',
      startDate: '2030-01-10',
      endDate: '2030-01-20',
    });
    expect(op.create).toMatchObject({
      name: 'Teste presell A/B',
      suffix: 'exp-1',
      type: 'SEARCH_CUSTOM',
      status: 'SETUP',
      startDate: '2030-01-10',
      endDate: '2030-01-20',
    });
    expect(op.create).not.toHaveProperty('mockIdentitySeed');
  });
});

describe('parseCreateExperimentResponse', () => {
  it('4. extrai resourceName/googleExperimentId da resposta', () => {
    const result = parseCreateExperimentResponse({
      results: [{ resourceName: 'customers/1234567890/experiments/999' }],
    });
    expect(result.googleExperimentId).toBe('999');
    expect(result.resourceName).toBe('customers/1234567890/experiments/999');
    expect(result.status).toBe('SETUP');
  });

  it('5. lança erro se a API não devolver resourceName', () => {
    expect(() => parseCreateExperimentResponse({ results: [{}] })).toThrow(/resourceName/);
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
      }, { allowed: true } as any)
    ).rejects.toThrow(/campanha existente/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('5. falha sem nenhum braço de controle', async () => {
    await expect(
      createExperimentArms('tok', realCredentials(), {
        experimentResourceName: 'customers/1234567890/experiments/999',
        arms: [treatmentArm({ name: 'a' }), treatmentArm({ name: 'b' })],
      }, { allowed: true } as any)
    ).rejects.toThrow(/1 braço de controle/);
  });

  it('6. falha com 2 braços de controle', async () => {
    await expect(
      createExperimentArms('tok', realCredentials(), {
        experimentResourceName: 'customers/1234567890/experiments/999',
        arms: [controlArm(), controlArm({ name: 'control-2' })],
      }, { allowed: true } as any)
    ).rejects.toThrow(/1 braço de controle/);
  });

  it('7. falha quando a soma dos trafficSplit não é 100', async () => {
    await expect(
      createExperimentArms('tok', realCredentials(), {
        experimentResourceName: 'customers/1234567890/experiments/999',
        arms: [controlArm({ trafficSplit: 30 }), treatmentArm({ trafficSplit: 30 })],
      }, { allowed: true } as any)
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
    }, { allowed: true } as any);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(arms[0].inDesignCampaignResourceName).toBeNull();
    expect(arms[1].inDesignCampaignResourceName).toContain('MOCK-IN-DESIGN');
  });
});

describe('createExperimentArms — modo real', () => {
  it('9. sem GOOGLE_ADS_MUTATIONS_ENABLED é bloqueado pelo guard — zero fetch', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    await expect(
      createExperimentArms('tok', realCredentials(), {
        experimentResourceName: 'customers/1234567890/experiments/999',
        arms: [controlArm(), treatmentArm()],
      }, { allowed: true } as any)
    ).rejects.toThrow(/bloqueada:/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

// buildCreateExperimentArmsOperations/parseCreateExperimentArmsResponse são puros (sem
// rede/guard) — cobrem o shape do payload MUTABLE_RESOURCE que createExperimentArms monta e
// interpreta internamente, já que o guard (teste 9 acima) impede exercitar isso via fetch
// real até a Tarefa 10 plugar `confirmed` de verdade.
describe('buildCreateExperimentArmsOperations', () => {
  it('10. gera 2 operations, controle com campaigns e tratamento sem', () => {
    const ops = buildCreateExperimentArmsOperations('customers/1234567890/experiments/999', [
      controlArm(),
      treatmentArm(),
    ]);
    expect(ops).toHaveLength(2);
    expect(ops[0].create).toMatchObject({
      control: true,
      campaigns: ['customers/1234567890/campaigns/111'],
    });
    expect(ops[1].create).toMatchObject({ control: false });
    expect((ops[1].create as any).campaigns).toBeUndefined();
  });
});

describe('parseCreateExperimentArmsResponse', () => {
  const arms: ExperimentArmInput[] = [controlArm(), treatmentArm()];

  it('11. captura inDesignCampaigns do MUTABLE_RESOURCE só pro braço de tratamento', () => {
    const result = parseCreateExperimentArmsResponse(
      {
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
      },
      arms
    );

    expect(result[0].inDesignCampaignResourceName).toBeNull();
    expect(result[0].servedCampaignResourceName).toBe('customers/1234567890/campaigns/111');
    expect(result[1].inDesignCampaignResourceName).toBe('customers/1234567890/campaigns/555');
    expect(result[1].servedCampaignResourceName).toBeNull();
  });

  it('12. lança erro se a API devolver número de resultados diferente do número de braços enviados', () => {
    expect(() =>
      parseCreateExperimentArmsResponse(
        { results: [{ experimentArm: { resourceName: 'x' } }] },
        arms
      )
    ).toThrow(/resultado/);
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

  const ARM_EXPERIMENT = 'customers/1234567890/experiments/999';

  it('13. modo real NÃO envia includeDrafts (A3) e acha a in-design campaign do braço não-controle', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      jsonResponse({
        results: [
          { experimentArm: { resourceName: 'a1', experiment: ARM_EXPERIMENT, control: true, inDesignCampaigns: [] } },
          {
            experimentArm: {
              resourceName: 'a2',
              experiment: ARM_EXPERIMENT,
              control: false,
              inDesignCampaigns: ['customers/1234567890/campaigns/777'],
            },
          },
        ],
      })
    );
    vi.stubGlobal('fetch', fetchSpy);

    const result = await getTreatmentInDesignCampaign('tok', realCredentials(), ARM_EXPERIMENT);

    expect(result).toBe('customers/1234567890/campaigns/777');
    const [, requestInit] = fetchSpy.mock.calls[0];
    const body = JSON.parse(requestInit.body as string);
    expect(body).not.toHaveProperty('includeDrafts');
  });

  it('14. devolve null quando não encontra braço de tratamento na resposta', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({
          results: [
            { experimentArm: { resourceName: 'a1', experiment: ARM_EXPERIMENT, control: true, inDesignCampaigns: [] } },
          ],
        })
      )
    );
    const result = await getTreatmentInDesignCampaign('tok', realCredentials(), ARM_EXPERIMENT);
    expect(result).toBeNull();
  });
});

describe('parseExperimentArmRow', () => {
  it('14b. extrai campos de uma linha de experiment_arm válida', () => {
    const row = parseExperimentArmRow({
      experimentArm: {
        resourceName: 'customers/1234567890/experimentArms/999~2',
        experiment: 'customers/1234567890/experiments/999',
        control: false,
        inDesignCampaigns: ['customers/1234567890/campaigns/777'],
      },
    });
    expect(row).toEqual({
      resourceName: 'customers/1234567890/experimentArms/999~2',
      experimentResourceName: 'customers/1234567890/experiments/999',
      control: false,
      inDesignCampaignResourceName: 'customers/1234567890/campaigns/777',
    });
  });

  it('14c. devolve null se faltar resourceName ou experiment', () => {
    expect(parseExperimentArmRow({ experimentArm: { control: true } })).toBeNull();
  });
});

const TREATMENT_CAMPAIGN = 'customers/1234567890/campaigns/777';
const NEW_URL = 'https://example.com/presell-variante-b';
const VARIATION_EXPERIMENT = 'customers/1234567890/experiments/999';

function armSearchResponse(options: { includeTreatment?: boolean; treatmentExperiment?: string } = {}) {
  const { includeTreatment = true, treatmentExperiment = VARIATION_EXPERIMENT } = options;
  const rows: any[] = [
    { experimentArm: { resourceName: 'arm-control', experiment: VARIATION_EXPERIMENT, control: true, inDesignCampaigns: [] } },
  ];
  if (includeTreatment) {
    rows.push({
      experimentArm: {
        resourceName: 'arm-treatment',
        experiment: treatmentExperiment,
        control: false,
        inDesignCampaigns: [TREATMENT_CAMPAIGN],
      },
    });
  }
  return jsonResponse({ results: rows });
}

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
  it('15. modo mock não chama fetch, verified=true, changed=true, 1 ad modificado', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const result = await applyFinalUrlVariation(
      'tok',
      mockCredentials(),
      VARIATION_EXPERIMENT,
      NEW_URL,
      { allowed: true } as any
    );
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.verified).toBe(true);
    expect(result.changed).toBe(true);
    expect(result.alreadyApplied).toBe(false);
    expect(result.adsModified).toHaveLength(1);
    expect(result.adsModified[0].finalUrlAfter).toEqual([NEW_URL]);
    expect(result.adsModified[0].resourceName).toBe('customers/1234567890/adGroupAds/MOCK-AG~MOCK-AD');
  });

  // A6, ponto 1-2: o treatment campaign é SEMPRE derivado do experimento via experiment_arm
  // (control=false), nunca aceito como parâmetro solto.
  it('16. deriva o treatment campaign do experimento (1ª chamada é a busca de experiment_arm, sem includeDrafts)', async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(armSearchResponse())
      .mockResolvedValueOnce(jsonResponse({ results: [] }));
    vi.stubGlobal('fetch', fetchSpy);

    await expect(
      applyFinalUrlVariation('tok', realCredentials(), VARIATION_EXPERIMENT, NEW_URL, { allowed: true } as any)
    ).rejects.toThrow(/Nenhum anúncio encontrado/);
    expect(fetchSpy).toHaveBeenCalledTimes(2); // busca de arms + busca de ads, nenhum mutate tentado

    const [, firstCallInit] = fetchSpy.mock.calls[0];
    const firstBody = JSON.parse(firstCallInit.body as string);
    expect(firstBody).not.toHaveProperty('includeDrafts');
    expect(firstBody.query).toContain(VARIATION_EXPERIMENT);

    const [, secondCallInit] = fetchSpy.mock.calls[1];
    const secondBody = JSON.parse(secondCallInit.body as string);
    expect(secondBody).not.toHaveProperty('includeDrafts');
    expect(secondBody.query).toContain(TREATMENT_CAMPAIGN);
  });

  it('17. sem braço de tratamento (control=false) -> lança antes de buscar anúncios', async () => {
    const fetchSpy = vi.fn().mockResolvedValueOnce(armSearchResponse({ includeTreatment: false }));
    vi.stubGlobal('fetch', fetchSpy);

    await expect(
      applyFinalUrlVariation('tok', realCredentials(), VARIATION_EXPERIMENT, NEW_URL, { allowed: true } as any)
    ).rejects.toThrow(/Esperado exatamente 1 braço de tratamento/);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('18. braço de tratamento pertence a outro experimento -> lança por segurança (defesa contra resposta cruzada)', async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(armSearchResponse({ treatmentExperiment: 'customers/1234567890/experiments/OUTRO' }));
    vi.stubGlobal('fetch', fetchSpy);

    await expect(
      applyFinalUrlVariation('tok', realCredentials(), VARIATION_EXPERIMENT, NEW_URL, { allowed: true } as any)
    ).rejects.toThrow(/pertence a/);
  });

  it('19. achou anúncio precisando de mudança, mas mutate real é bloqueado pelo guard — 2 fetches (arms+ads), nunca mutate/releitura', async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(armSearchResponse())
      .mockResolvedValueOnce(adSearchResponse('https://example.com/url-antiga'));
    vi.stubGlobal('fetch', fetchSpy);

    await expect(
      applyFinalUrlVariation('tok', realCredentials(), VARIATION_EXPERIMENT, NEW_URL, { allowed: true } as any)
    ).rejects.toThrow(/bloqueada:/);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  // A6, ponto 3: se a URL já bate, nenhuma mutate é disparada — nem passa pelo guard.
  it('20. URL já aplicada -> alreadyApplied=true, changed=false, verified=true, SEM mutate (guard nem é chamado)', async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(armSearchResponse())
      .mockResolvedValueOnce(adSearchResponse(NEW_URL));
    vi.stubGlobal('fetch', fetchSpy);

    const result = await applyFinalUrlVariation('tok', realCredentials(), VARIATION_EXPERIMENT, NEW_URL, { allowed: true } as any);

    expect(fetchSpy).toHaveBeenCalledTimes(2); // só as 2 buscas, nenhuma mutate
    expect(result.alreadyApplied).toBe(true);
    expect(result.changed).toBe(false);
    expect(result.applied).toBe(false);
    expect(result.verified).toBe(true);
  });
});

describe('assertVariationReadyForSchedule', () => {
  function result(overrides: Partial<ApplyFinalUrlVariationResult> = {}): ApplyFinalUrlVariationResult {
    return {
      applied: true,
      changed: true,
      alreadyApplied: false,
      treatmentCampaignResourceName: TREATMENT_CAMPAIGN,
      adsModified: [],
      verified: true,
      warnings: [],
      ...overrides,
    };
  }

  it('21. passa quando verified=true e changed=true', () => {
    expect(() => assertVariationReadyForSchedule(result())).not.toThrow();
  });

  it('22. passa quando verified=true e alreadyApplied=true (mesmo com changed=false)', () => {
    expect(() =>
      assertVariationReadyForSchedule(result({ changed: false, alreadyApplied: true, applied: false }))
    ).not.toThrow();
  });

  it('23. lança quando verified=false', () => {
    expect(() => assertVariationReadyForSchedule(result({ verified: false }))).toThrow(/não é seguro agendar/);
  });

  it('24. lança quando nem changed nem alreadyApplied são true', () => {
    expect(() =>
      assertVariationReadyForSchedule(result({ changed: false, alreadyApplied: false }))
    ).toThrow(/não é seguro agendar/);
  });
});

// compareFinalUrlsAfterMutation é a lógica pura (sem rede/guard) que decide `verified` — o
// núcleo da garantia da Tarefa 7 (Hermes review ponto 7: "HTTP 200 não é o único critério").
// Coberta direto com fixtures, já que o guard (teste 17 acima) impede reproduzir o fluxo
// completo mutate->relê via fetch real até a Tarefa 10.
describe('compareFinalUrlsAfterMutation', () => {
  const AD = `${TREATMENT_CAMPAIGN}/adGroups/1/adGroupAds/1`;

  function ad(finalUrls: string[]): AdGroupAdSummary {
    return { resourceName: AD, adGroupResourceName: `${TREATMENT_CAMPAIGN}/adGroups/1`, finalUrls };
  }

  it('18. releitura confirma a URL esperada -> verified=true', () => {
    const result = compareFinalUrlsAfterMutation(
      [ad(['https://example.com/url-antiga'])],
      [ad([NEW_URL])],
      NEW_URL
    );
    expect(result.verified).toBe(true);
    expect(result.adsModified[0]).toEqual({
      resourceName: AD,
      finalUrlBefore: ['https://example.com/url-antiga'],
      finalUrlAfter: [NEW_URL],
    });
  });

  it('19. releitura NÃO confirma (URL antiga ainda) -> verified=false, mesmo com "sucesso" no mutate', () => {
    const result = compareFinalUrlsAfterMutation(
      [ad(['https://example.com/url-antiga'])],
      [ad(['https://example.com/url-antiga'])],
      NEW_URL
    );
    expect(result.verified).toBe(false);
  });

  it('20. anúncio sumiu na releitura (não achado no "depois") -> verified=false', () => {
    const result = compareFinalUrlsAfterMutation([ad(['https://example.com/url-antiga'])], [], NEW_URL);
    expect(result.verified).toBe(false);
    expect(result.adsModified[0].finalUrlAfter).toEqual([]);
  });
});
