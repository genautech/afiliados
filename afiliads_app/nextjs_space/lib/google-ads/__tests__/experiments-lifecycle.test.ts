import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  assertActionAllowedFromStatus,
  endExperiment,
  graduateExperiment,
  listExperimentAsyncErrors,
  parseAsyncErrorsPage,
  parseOperationHandleResponse,
  parsePollOperationResponse,
  pollExperimentOperation,
  promoteExperiment,
  scheduleExperiment,
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

const EXPERIMENT = 'customers/1234567890/experiments/999';
const OPERATION = 'customers/1234567890/experiments/999/operations/op-1';

describe('assertActionAllowedFromStatus', () => {
  it('1. END permitido a partir de SCHEDULED e RUNNING', () => {
    expect(() => assertActionAllowedFromStatus('END', 'SCHEDULED')).not.toThrow();
    expect(() => assertActionAllowedFromStatus('END', 'RUNNING')).not.toThrow();
  });

  it('2. END NÃO permitido a partir de SETUP (nunca chegou a rodar)', () => {
    expect(() => assertActionAllowedFromStatus('END', 'SETUP')).toThrow(/não permitida/);
  });

  it('3. PROMOTE e GRADUATE só permitidos a partir de RUNNING', () => {
    expect(() => assertActionAllowedFromStatus('PROMOTE', 'RUNNING')).not.toThrow();
    expect(() => assertActionAllowedFromStatus('GRADUATE', 'RUNNING')).not.toThrow();
    expect(() => assertActionAllowedFromStatus('PROMOTE', 'SCHEDULED')).toThrow(/não permitida/);
    expect(() => assertActionAllowedFromStatus('GRADUATE', 'SETUP')).toThrow(/não permitida/);
  });

  it('4. ação em estado terminal (ENDED/GRADUATED) sempre rejeitada', () => {
    expect(() => assertActionAllowedFromStatus('PROMOTE', 'ENDED')).toThrow();
    expect(() => assertActionAllowedFromStatus('END', 'GRADUATED')).toThrow();
  });
});

describe('scheduleExperiment', () => {
  it('5. rejeita agendar fora de SETUP, sem tocar mock nem rede', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    await expect(
      scheduleExperiment('tok', mockCredentials(), EXPERIMENT, 'RUNNING')
    ).rejects.toThrow(/SETUP/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('6. modo mock não chama fetch e devolve operationName determinístico (sem Date.now)', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const a = await scheduleExperiment('tok', mockCredentials(), EXPERIMENT, 'SETUP');
    const b = await scheduleExperiment('tok', mockCredentials(), EXPERIMENT, 'SETUP');
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(a.operationName).toBe(b.operationName); // determinístico, não Date.now()
  });

  it('7. modo real (sem GOOGLE_ADS_MUTATIONS_ENABLED) é bloqueado pelo guard — zero fetch', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    await expect(
      scheduleExperiment('tok', realCredentials(), EXPERIMENT, 'SETUP')
    ).rejects.toThrow(/Mutação bloqueada pelo guard/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('parseOperationHandleResponse', () => {
  it('8. extrai operationName do campo "name" (google.longrunning.Operation)', () => {
    expect(parseOperationHandleResponse({ name: OPERATION }, 'scheduleExperiment')).toEqual({
      operationName: OPERATION,
    });
  });

  it('9. lança erro se a API não devolver nome de operação', () => {
    expect(() => parseOperationHandleResponse({}, 'scheduleExperiment')).toThrow(
      /não retornou o nome/
    );
  });
});

describe('parsePollOperationResponse', () => {
  it('10. done=false -> PENDING', () => {
    expect(parsePollOperationResponse({ done: false })).toEqual({ status: 'PENDING', errors: [] });
  });

  it('11. done=true sem error -> DONE', () => {
    expect(parsePollOperationResponse({ done: true })).toEqual({ status: 'DONE', errors: [] });
  });

  it('12. done=true com error -> FAILED, captura a mensagem', () => {
    const result = parsePollOperationResponse({
      done: true,
      error: { message: 'algo deu errado' },
    });
    expect(result.status).toBe('FAILED');
    expect(result.errors).toEqual(['algo deu errado']);
  });
});

describe('pollExperimentOperation', () => {
  it('13. modo mock não chama fetch e devolve DONE', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const result = await pollExperimentOperation('tok', mockCredentials(), OPERATION);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.status).toBe('DONE');
  });

  it('14. modo real: é leitura (GET), NÃO passa pelo guard — funciona sem GOOGLE_ADS_MUTATIONS_ENABLED', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse({ done: false }));
    vi.stubGlobal('fetch', fetchSpy);
    const result = await pollExperimentOperation('tok', realCredentials(), OPERATION);
    expect(result.status).toBe('PENDING');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, requestInit] = fetchSpy.mock.calls[0];
    expect(url).toContain(OPERATION);
    expect(requestInit.method).toBe('GET');
  });
});

describe('parseAsyncErrorsPage', () => {
  it('15. extrai mensagens de erro e nextPageToken', () => {
    const page = parseAsyncErrorsPage({
      errors: [{ message: 'erro 1' }, { message: 'erro 2' }],
      nextPageToken: 'abc',
    });
    expect(page.errors).toEqual(['erro 1', 'erro 2']);
    expect(page.nextPageToken).toBe('abc');
  });

  it('16. sem nextPageToken -> undefined (fim da paginação)', () => {
    expect(parseAsyncErrorsPage({ errors: [] }).nextPageToken).toBeUndefined();
  });
});

describe('listExperimentAsyncErrors', () => {
  it('17. modo mock não chama fetch e devolve lista vazia', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const result = await listExperimentAsyncErrors('tok', mockCredentials(), OPERATION);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result).toEqual({ errors: [], truncated: false });
  });

  it('18. modo real: é leitura, NÃO passa pelo guard — pagina até nextPageToken acabar', async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ errors: [{ message: 'erro 1' }], nextPageToken: 'page2' })
      )
      .mockResolvedValueOnce(jsonResponse({ errors: [{ message: 'erro 2' }] }));
    vi.stubGlobal('fetch', fetchSpy);

    const result = await listExperimentAsyncErrors('tok', realCredentials(), OPERATION);

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ errors: ['erro 1', 'erro 2'], truncated: false });
  });

  it('19. respeita o limite de segurança de páginas (não entra em loop infinito)', async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValue(jsonResponse({ errors: [{ message: 'x' }], nextPageToken: 'sempre-mais' }));
    vi.stubGlobal('fetch', fetchSpy);

    const result = await listExperimentAsyncErrors('tok', realCredentials(), OPERATION);

    expect(result.truncated).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(20); // MAX_ASYNC_ERROR_PAGES
  });
});

describe('endExperiment', () => {
  it('20. rejeita fora de SCHEDULED/RUNNING, sem tocar mock nem rede', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    await expect(endExperiment('tok', mockCredentials(), EXPERIMENT, 'SETUP')).rejects.toThrow(
      /não permitida/
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('21. modo mock não chama fetch e devolve success', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const result = await endExperiment('tok', mockCredentials(), EXPERIMENT, 'RUNNING');
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result).toEqual({ success: true });
  });

  it('22. modo real (sem flag) é bloqueado pelo guard — zero fetch', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    await expect(
      endExperiment('tok', realCredentials(), EXPERIMENT, 'RUNNING')
    ).rejects.toThrow(/Mutação bloqueada pelo guard/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('promoteExperiment', () => {
  it('23. rejeita fora de RUNNING', async () => {
    await expect(
      promoteExperiment('tok', mockCredentials(), EXPERIMENT, 'SCHEDULED')
    ).rejects.toThrow(/não permitida/);
  });

  it('24. modo mock devolve operationName determinístico sem chamar fetch', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const result = await promoteExperiment('tok', mockCredentials(), EXPERIMENT, 'RUNNING');
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.operationName).toContain('mock-promote');
  });

  it('25. modo real (sem flag) é bloqueado pelo guard — zero fetch', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    await expect(
      promoteExperiment('tok', realCredentials(), EXPERIMENT, 'RUNNING')
    ).rejects.toThrow(/Mutação bloqueada pelo guard/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('graduateExperiment', () => {
  const BUDGET = 'customers/1234567890/campaignBudgets/1';

  it('26. rejeita fora de RUNNING', async () => {
    await expect(
      graduateExperiment('tok', mockCredentials(), EXPERIMENT, 'SETUP', BUDGET)
    ).rejects.toThrow(/não permitida/);
  });

  it('27. modo mock não chama fetch e devolve success', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const result = await graduateExperiment('tok', mockCredentials(), EXPERIMENT, 'RUNNING', BUDGET);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result).toEqual({ success: true });
  });

  it('28. modo real (sem flag) é bloqueado pelo guard — zero fetch', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    await expect(
      graduateExperiment('tok', realCredentials(), EXPERIMENT, 'RUNNING', BUDGET)
    ).rejects.toThrow(/Mutação bloqueada pelo guard/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
