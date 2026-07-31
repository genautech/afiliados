import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildApiHeaders,
  buildApiUrl,
  getAccessToken,
  googleAdsMutateRequest,
  googleAdsRequest,
  googleAdsResourceGetRequest,
  googleAdsResourceMutateRequest,
  isMockMode,
  isMutationCapability,
  toAmountMicros,
  GOOGLE_ADS_API_VERSION,
  type GoogleAdsCredentials,
  type MutationCapability,
} from '@/lib/google-ads/client';
import { GoogleAdsApiError } from '@/lib/google-ads/errors';
import { assertMutationAllowed } from '@/lib/google-ads/mutation-guard';

function credentials(overrides: Partial<GoogleAdsCredentials> = {}): GoogleAdsCredentials {
  return {
    customerId: '1234567890',
    developerToken: 'real-token',
    clientId: 'real-client-id',
    clientSecret: 'real-secret',
    refreshToken: 'real-refresh',
    ...overrides,
  };
}

function capability(operation: string, resourceName?: string, customerId = '1234567890'): MutationCapability {
  const result = assertMutationAllowed({
    operation,
    customerId,
    resourceName,
    isMock: true,
    confirmed: true,
  });
  if (!result.allowed) throw new Error(result.reason);
  return result.capability;
}

function jsonResponse(body: unknown, init: { status?: number } = {}) {
  const status = init.status ?? 200;
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

describe('buildApiUrl / GOOGLE_ADS_API_VERSION', () => {
  it('1. monta a URL com a versão centralizada e o customerId', () => {
    const url = buildApiUrl(credentials(), 'campaigns:mutate');
    expect(url).toBe(
      `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers/1234567890/campaigns:mutate`
    );
  });
});

describe('buildApiHeaders', () => {
  it('2. inclui login-customer-id só quando presente (MCC)', () => {
    const withMcc = buildApiHeaders('tok', credentials({ loginCustomerId: '999' }));
    expect(withMcc['login-customer-id']).toBe('999');

    const withoutMcc = buildApiHeaders('tok', credentials());
    expect(withoutMcc['login-customer-id']).toBeUndefined();
  });

  it('3. sempre inclui Authorization Bearer e developer-token', () => {
    const headers = buildApiHeaders('meu-token', credentials({ developerToken: 'dev-tok' }));
    expect(headers.Authorization).toBe('Bearer meu-token');
    expect(headers['developer-token']).toBe('dev-tok');
  });
});

describe('toAmountMicros', () => {
  it('4. converte dólares em micros, múltiplo de 10.000 (1 centavo)', () => {
    expect(toAmountMicros(45)).toBe(45_000_000);
    expect(toAmountMicros(0.01)).toBe(10_000);
  });
});

describe('isMockMode', () => {
  it('5. reconhece DEV_TOKEN_MOCK, CLIENT_ID_MOCK e customerId tipo e-mail como mock', () => {
    expect(isMockMode(credentials({ developerToken: 'DEV_TOKEN_MOCK_x' }))).toBe(true);
    expect(isMockMode(credentials({ clientId: 'CLIENT_ID_MOCK_x' }))).toBe(true);
    expect(isMockMode(credentials({ customerId: 'user@example.com' }))).toBe(true);
  });

  it('6. credenciais reais não são mock', () => {
    expect(isMockMode(credentials())).toBe(false);
  });
});

describe('getAccessToken', () => {
  it('7. modo mock não chama fetch — retorna token fixo', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const token = await getAccessToken(credentials({ developerToken: 'DEV_TOKEN_MOCK' }));
    expect(token).toBe('mock_access_token_123');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('8. modo real chama o endpoint OAuth2 e devolve access_token', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ access_token: 'novo-token-123' }))
    );
    const token = await getAccessToken(credentials());
    expect(token).toBe('novo-token-123');
  });

  it('9. erro OAuth2 vira GoogleAdsApiError com corpo redigido (sem vazar client_secret)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({ error: 'invalid_grant', client_secret: 'nao-pode-vazar' }, { status: 400 })
      )
    );
    await expect(getAccessToken(credentials())).rejects.toThrow(GoogleAdsApiError);
    try {
      await getAccessToken(credentials());
    } catch (err) {
      expect((err as Error).message).not.toContain('nao-pode-vazar');
    }
  });
});

describe('googleAdsRequest', () => {
  it('10. sucesso simples retorna o JSON da resposta', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ results: [] })));
    const data = await googleAdsRequest('tok', credentials(), 'googleAds:search', {
      body: { query: 'SELECT campaign.id FROM campaign' },
    });
    expect(data).toEqual({ results: [] });
  });

  it('11. sem retry, um único 500 já lança GoogleAdsApiError imediatamente (1 chamada)', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse({ error: 'boom' }, { status: 500 }));
    vi.stubGlobal('fetch', fetchSpy);
    await expect(
      googleAdsRequest('tok', credentials(), 'googleAds:search', { body: {} })
    ).rejects.toThrow(GoogleAdsApiError);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('12. com retry, 500 transiente se recupera em tentativa seguinte', async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: 'transient' }, { status: 500 }))
      .mockResolvedValueOnce(jsonResponse({ results: ['ok'] }));
    vi.stubGlobal('fetch', fetchSpy);

    const data = await googleAdsRequest('tok', credentials(), 'googleAds:search', {
      body: {},
      retry: { attempts: 3, delayMs: 1 },
    });
    expect(data).toEqual({ results: ['ok'] });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('13. com retry, erro 4xx (ex.: PERMISSION_DENIED) NUNCA re-tenta — falha rápido', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse({ error: 'denied' }, { status: 403 }));
    vi.stubGlobal('fetch', fetchSpy);

    await expect(
      googleAdsRequest('tok', credentials(), 'googleAds:search', {
        body: {},
        retry: { attempts: 5, delayMs: 1 },
      })
    ).rejects.toThrow(GoogleAdsApiError);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('14. esgotadas as tentativas de retry, propaga o último erro', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse({ error: 'still down' }, { status: 503 }));
    vi.stubGlobal('fetch', fetchSpy);

    await expect(
      googleAdsRequest('tok', credentials(), 'googleAds:search', {
        body: {},
        retry: { attempts: 2, delayMs: 1 },
      })
    ).rejects.toThrow(GoogleAdsApiError);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('15. erro de rede (fetch rejeita) sem retry propaga direto, sem retry re-tenta', async () => {
    const networkError = new Error('fetch failed: ECONNRESET');
    const fetchSpyNoRetry = vi.fn().mockRejectedValue(networkError);
    vi.stubGlobal('fetch', fetchSpyNoRetry);
    await expect(
      googleAdsRequest('tok', credentials(), 'googleAds:search', { body: {} })
    ).rejects.toThrow('ECONNRESET');
    expect(fetchSpyNoRetry).toHaveBeenCalledTimes(1);
  });

  it('16. mensagem de erro final não expõe o token usado na chamada', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({ 'developer-token': 'meu-dev-token-secreto' }, { status: 500 })
      )
    );
    try {
      await googleAdsRequest('meu-access-token-secreto', credentials(), 'googleAds:search', {
        body: {},
      });
      throw new Error('deveria ter lançado');
    } catch (err) {
      expect((err as Error).message).not.toContain('meu-dev-token-secreto');
    }
  });
});

describe('googleAdsRequest — bloqueio de :mutate (A5)', () => {
  it('17. rejeita QUALQUER path :mutate antes de qualquer fetch, mesmo sem guard', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    await expect(
      googleAdsRequest('tok', credentials(), 'campaigns:mutate', { body: {} })
    ).rejects.toThrow(/não permite paths de mutate/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('googleAdsMutateRequest (A5)', () => {
  it('18. sem capability válida, lança antes de qualquer fetch', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    await expect(
      googleAdsMutateRequest('tok', credentials(), 'campaigns:mutate', undefined as any, { body: {} })
    ).rejects.toThrow(/MutationCapability/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('19. com capability válida (emitida por createMutationCapability), chama fetch normalmente', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ results: [] })));
    const data = await googleAdsMutateRequest(
      'tok',
      credentials(),
      'campaigns:mutate',
      capability('createGoogleCampaign'),
      { body: { operations: [] } }
    );
    expect(data).toEqual({ results: [] });
  });

  it('20. nunca aceita retry — 500 falha na primeira tentativa mesmo com muitas tentativas possíveis', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse({ error: 'boom' }, { status: 500 }));
    vi.stubGlobal('fetch', fetchSpy);
    await expect(
      googleAdsMutateRequest(
        'tok',
        credentials(),
        'campaigns:mutate',
        capability('createGoogleCampaign'),
        { body: {} }
      )
    ).rejects.toThrow(GoogleAdsApiError);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});

describe('googleAdsResourceMutateRequest (A5)', () => {
  it('21. sem capability válida, lança antes de qualquer fetch', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    await expect(
      googleAdsResourceMutateRequest(
        'tok',
        credentials(),
        'customers/1234567890/experiments/999',
        'scheduleExperiment',
        { brand: 'forjado' } as any
      )
    ).rejects.toThrow(/MutationCapability/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('22. com capability válida, faz POST no resource:método', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse({ name: 'op-1' }));
    vi.stubGlobal('fetch', fetchSpy);
    await googleAdsResourceMutateRequest(
      'tok',
      credentials(),
      'customers/1234567890/experiments/999',
      'scheduleExperiment',
      capability('scheduleExperiment', 'customers/1234567890/experiments/999')
    );
    const [url, requestInit] = fetchSpy.mock.calls[0];
    expect(url).toContain('experiments/999:scheduleExperiment');
    expect(requestInit.method).toBe('POST');
  });

  it.each([
    ['operação', capability('endExperiment', 'customers/1234567890/experiments/999')],
    ['recurso', capability('scheduleExperiment', 'customers/1234567890/experiments/998')],
    ['customer', capability('scheduleExperiment', 'customers/9999999999/experiments/999', '9999999999')],
  ])('22B. rejeita capability vinculada a outro(a) %s sem fetch', async (_label, wrongCapability) => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    await expect(googleAdsResourceMutateRequest(
      'tok',
      credentials(),
      'customers/1234567890/experiments/999',
      'scheduleExperiment',
      wrongCapability
    )).rejects.toThrow(/MutationCapability|outro|outra/i);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('googleAdsResourceGetRequest (A1)', () => {
  it('23. GET com pageToken na query string, sem guard, com retry', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse({ errors: [] }));
    vi.stubGlobal('fetch', fetchSpy);
    await googleAdsResourceGetRequest(
      'tok',
      credentials(),
      'customers/1234567890/experiments/999',
      'listAsyncErrors',
      { pageToken: 'abc' }
    );
    const [url, requestInit] = fetchSpy.mock.calls[0];
    expect(url).toContain('experiments/999:listAsyncErrors');
    expect(url).toContain('pageToken=abc');
    expect(requestInit.method).toBe('GET');
    expect(requestInit.body).toBeUndefined();
  });

  it('24. sem pageToken, não adiciona query string', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse({ errors: [] }));
    vi.stubGlobal('fetch', fetchSpy);
    await googleAdsResourceGetRequest(
      'tok',
      credentials(),
      'customers/1234567890/experiments/999',
      'listAsyncErrors'
    );
    const [url] = fetchSpy.mock.calls[0];
    expect(url).not.toContain('?');
  });
});

describe('isMutationCapability', () => {
  it('25. reconhece só objetos emitidos pelo mutation guard', () => {
    expect(isMutationCapability(capability('createGoogleCampaign'))).toBe(true);
    expect(isMutationCapability({ operation: 'createGoogleCampaign', customerId: '1234567890' })).toBe(false);
    expect(isMutationCapability(undefined)).toBe(false);
    expect(isMutationCapability(null)).toBe(false);
  });
});
