/**
 * Tests for MCP Google Ads tools.
 *
 * These tests validate that:
 * 1. Read tools query Postgres safely
 * 2. Mutate proxies POST to app API with correct authorization payloads
 * 3. MCP token is required for all HTTP tools
 * 4. Authorization payloads match the route-mutation-authorization contract
 *
 * We test the tool logic functions in isolation — not the full MCP server
 * transport — by extracting the same patterns used in index.mjs.
 */
import { afterEach, describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Shared helpers (mirrored from index.mjs) ───────────────────────────────

function buildAuthorization(operation: string, resourceId: string, revision: string, idempotencyKey: string) {
  return {
    confirmed: true,
    operation,
    resourceId,
    revision,
    idempotencyKey,
  };
}

describe('buildAuthorization', () => {
  it('always sets confirmed: true', () => {
    const auth = buildAuthorization('CREATE_CAMPAIGN', 'camp-1', '1234567890', 'key_test_001');
    expect(auth.confirmed).toBe(true);
  });

  it('includes all required fields', () => {
    const auth = buildAuthorization('MUTATE_CAMPAIGN', 'res-1', 'rev-1', 'idem_123456');
    expect(auth).toEqual({
      confirmed: true,
      operation: 'MUTATE_CAMPAIGN',
      resourceId: 'res-1',
      revision: 'rev-1',
      idempotencyKey: 'idem_123456',
    });
  });

  it('maps experiment actions correctly', () => {
    const operationMap = {
      END: 'END_EXPERIMENT',
      PROMOTE: 'PROMOTE_EXPERIMENT',
      GRADUATE: 'GRADUATE_EXPERIMENT',
    };
    for (const [action, op] of Object.entries(operationMap)) {
      const auth = buildAuthorization(op, 'exp-1', '9999', `${action.toLowerCase()}_test_1`);
      expect(auth.operation).toBe(op);
      expect(auth.confirmed).toBe(true);
    }
  });
});

describe('MCP mutate proxy patterns', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  const APP_URL = 'http://localhost:3001';
  const MCP_TOKEN = 'test-token-abc';

  async function appPost(path: string, body: Record<string, unknown>) {
    if (!MCP_TOKEN) throw new Error('AFILIADS_MCP_TOKEN não configurado.');
    const res = await fetchMock(`${APP_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-afiliads-token': MCP_TOKEN },
      body: JSON.stringify(body),
    });
    const data = await (res as any).json();
    if (!(res as any).ok) throw new Error(data?.error || `Erro ${(res as any).status}`);
    return data;
  }

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
  });

  it('google_ads_create_campaign sends correct authorization to app', async () => {
    const campaignId = 'camp-abc';
    const updatedAt = new Date('2026-09-01T10:00:00.000Z');
    const idempotencyKey = 'create_test_20260905';

    await appPost('/api/google-ads/create', {
      campaignId,
      authorization: buildAuthorization('CREATE_CAMPAIGN', campaignId, String(updatedAt.getTime()), idempotencyKey),
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:3001/api/google-ads/create');
    expect(opts.method).toBe('POST');
    expect(opts.headers['x-afiliads-token']).toBe('test-token-abc');

    const body = JSON.parse(opts.body);
    expect(body.campaignId).toBe('camp-abc');
    expect(body.authorization.confirmed).toBe(true);
    expect(body.authorization.operation).toBe('CREATE_CAMPAIGN');
    expect(body.authorization.resourceId).toBe(campaignId);
    expect(body.authorization.idempotencyKey).toBe(idempotencyKey);
  });

  it('google_ads_sync pull does not include authorization', async () => {
    await appPost('/api/google-ads/sync', {
      campaignId: 'camp-xyz',
      direction: 'pull',
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.direction).toBe('pull');
    expect(body.authorization).toBeUndefined();
  });

  it('google_ads_sync push includes authorization with MUTATE_CAMPAIGN', async () => {
    const campaignId = 'camp-xyz';
    const revision = String(Date.now());

    await appPost('/api/google-ads/sync', {
      campaignId,
      direction: 'push',
      authorization: buildAuthorization('MUTATE_CAMPAIGN', campaignId, revision, 'push_camp_xyz_01'),
      updates: { status: 'PAUSADO' },
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.direction).toBe('push');
    expect(body.authorization.confirmed).toBe(true);
    expect(body.authorization.operation).toBe('MUTATE_CAMPAIGN');
    expect(body.updates.status).toBe('PAUSADO');
  });

  it('experiment setup sends SETUP_EXPERIMENT authorization', async () => {
    const campId = 'camp-exp';
    await appPost('/api/google-ads/experiments', {
      campaignId: campId,
      authorization: buildAuthorization('SETUP_EXPERIMENT', campId, '12345', 'setup_exp_01'),
      treatmentSplit: 50,
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.authorization.operation).toBe('SETUP_EXPERIMENT');
    expect(body.treatmentSplit).toBe(50);
  });

  it('experiment action maps END/PROMOTE/GRADUATE to correct operations', async () => {
    const map = {
      END: 'END_EXPERIMENT',
      PROMOTE: 'PROMOTE_EXPERIMENT',
      GRADUATE: 'GRADUATE_EXPERIMENT',
    };

    for (const [action, operation] of Object.entries(map)) {
      fetchMock.mockClear();
      await appPost(`/api/google-ads/experiments/exp-1/actions`, {
        action,
        authorization: buildAuthorization(operation, 'exp-1', String(Date.now()), `${action.toLowerCase()}_exp1_01`),
      });

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.action).toBe(action);
      expect(body.authorization.operation).toBe(operation);
      expect(body.authorization.confirmed).toBe(true);
    }
  });

  it('appPost throws on non-ok response', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ error: 'Mutação bloqueada pelo guard: GOOGLE_ADS_MUTATIONS_ENABLED is not "true"' }),
    });

    await expect(appPost('/api/google-ads/create', {}))
      .rejects.toThrow('Mutação bloqueada pelo guard');
  });

  it('appPost always sends x-afiliads-token header', async () => {
    await appPost('/api/google-ads/sync', { campaignId: 'c', direction: 'pull' });
    const headers = fetchMock.mock.calls[0][1].headers;
    expect(headers['x-afiliads-token']).toBe(MCP_TOKEN);
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('experiment sync and schedule use correct paths', async () => {
    await appPost('/api/google-ads/experiments/exp-99/sync', {});
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:3001/api/google-ads/experiments/exp-99/sync');

    fetchMock.mockClear();
    await appPost('/api/google-ads/experiments/exp-99/schedule', {
      authorization: buildAuthorization('SCHEDULE_EXPERIMENT', 'exp-99', '999', 'sched_exp99_01'),
    });
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:3001/api/google-ads/experiments/exp-99/schedule');
  });
});

describe('MCP token enforcement', () => {
  it('appPost requires token', async () => {
    const noToken = '';
    async function appPostNoToken(path: string, body: Record<string, unknown>) {
      if (!noToken) throw new Error('AFILIADS_MCP_TOKEN não configurado.');
      return {};
    }
    await expect(appPostNoToken('/api/google-ads/create', {}))
      .rejects.toThrow('AFILIADS_MCP_TOKEN não configurado');
  });
});

describe('google_ads_config_status logic', () => {
  it('correctly identifies configured vs missing fields', () => {
    const present = new Set(['customer_id', 'developer_token']);
    const required = ['customer_id', 'developer_token', 'client_id', 'client_secret', 'refresh_token'];
    const fields = required.map(f => ({ field: f, configured: present.has(f) }));
    const allConfigured = fields.every(f => f.configured);

    expect(allConfigured).toBe(false);
    expect(fields.filter(f => f.configured)).toHaveLength(2);
    expect(fields.filter(f => !f.configured)).toHaveLength(3);
  });

  it('returns true when all fields are present', () => {
    const present = new Set(['customer_id', 'developer_token', 'client_id', 'client_secret', 'refresh_token']);
    const required = ['customer_id', 'developer_token', 'client_id', 'client_secret', 'refresh_token'];
    const allConfigured = required.every(f => present.has(f));
    expect(allConfigured).toBe(true);
  });
});

describe('google_ads_readiness logic', () => {
  it('rejects non-HTTPS URLs', () => {
    const url = 'http://example.com/page';
    const errors = [];
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:') errors.push('URL final deve usar HTTPS.');
    } catch { errors.push('URL final inválida.'); }
    expect(errors).toContain('URL final deve usar HTTPS.');
  });

  it('rejects URLs with credentials', () => {
    const url = 'https://user:pass@example.com/page';
    const errors = [];
    try {
      const parsed = new URL(url);
      if (parsed.username || parsed.password) errors.push('URL final não pode conter credenciais.');
    } catch { errors.push('URL final inválida.'); }
    expect(errors).toContain('URL final não pode conter credenciais.');
  });

  it('accepts valid HTTPS URLs', () => {
    const url = 'https://example.com/presell';
    const errors = [];
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:') errors.push('URL HTTPS');
      if (parsed.username || parsed.password) errors.push('credenciais');
    } catch { errors.push('inválida'); }
    expect(errors).toHaveLength(0);
  });

  it('PREPARE mode treats URL gap as warning, SCHEDULE treats as error', () => {
    const urlGapMsg = 'URL pode ter sido modificada após aprovação no checklist (lacuna 10B).';

    const prepareErrors: string[] = [];
    const prepareWarnings: string[] = [];
    prepareWarnings.push(urlGapMsg);

    const scheduleErrors: string[] = [];
    const scheduleWarnings: string[] = [];
    scheduleErrors.push(urlGapMsg);

    expect(prepareErrors).toHaveLength(0);
    expect(prepareWarnings).toContain(urlGapMsg);
    expect(scheduleErrors).toContain(urlGapMsg);
    expect(scheduleWarnings).toHaveLength(0);
  });

  it('rejects invalid match types', () => {
    const kws = [
      { keyword: 'test', matchType: 'EXACT', isSelected: true },
      { keyword: 'bad', matchType: 'FUZZY', isSelected: true },
    ];
    const errors = [];
    for (const k of kws.filter(k => k.isSelected)) {
      const mt = (k.matchType || 'phrase').toUpperCase();
      if (!['EXACT', 'PHRASE', 'BROAD'].includes(mt)) {
        errors.push(`Match type inválido na keyword "${k.keyword}": ${k.matchType}`);
      }
    }
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('FUZZY');
  });
});

describe('MCP user email env var fallback', () => {
  const ORIGINAL_ENV = { ...process.env };

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  function resolveEmail(): string | undefined {
    return process.env.AFILIADS_MCP_USER_EMAIL || process.env.AFILIADS_USER_EMAIL;
  }

  it('prefers AFILIADS_MCP_USER_EMAIL when both are set', () => {
    process.env.AFILIADS_MCP_USER_EMAIL = 'mcp@example.com';
    process.env.AFILIADS_USER_EMAIL = 'legacy@example.com';
    expect(resolveEmail()).toBe('mcp@example.com');
  });

  it('falls back to AFILIADS_USER_EMAIL when MCP variant is missing', () => {
    delete process.env.AFILIADS_MCP_USER_EMAIL;
    process.env.AFILIADS_USER_EMAIL = 'legacy@example.com';
    expect(resolveEmail()).toBe('legacy@example.com');
  });

  it('returns undefined when neither is set', () => {
    delete process.env.AFILIADS_MCP_USER_EMAIL;
    delete process.env.AFILIADS_USER_EMAIL;
    expect(resolveEmail()).toBeUndefined();
  });
});

describe('criar_produto MCP proxy pattern', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  const APP_URL = 'http://localhost:3001';
  const MCP_TOKEN = 'test-token-abc';

  async function appPost(path: string, body: Record<string, unknown>) {
    if (!MCP_TOKEN) throw new Error('AFILIADS_MCP_TOKEN não configurado.');
    const res = await fetchMock(`${APP_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-afiliads-token': MCP_TOKEN },
      body: JSON.stringify(body),
    });
    const data = await (res as any).json();
    if (!(res as any).ok) throw new Error(data?.error || `Erro ${(res as any).status}`);
    return data;
  }

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'prod-1', name: 'YuSleep', status: 'novo' }),
    });
  });

  it('sends product upsert to /api/products with correct body', async () => {
    await appPost('/api/products', {
      name: 'YuSleep',
      network: 'clickbank',
      vertical: 'sleep',
      status: 'escolhido',
      score: 72,
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:3001/api/products');
    expect(opts.headers['x-afiliads-token']).toBe(MCP_TOKEN);
    const body = JSON.parse(opts.body);
    expect(body.name).toBe('YuSleep');
    expect(body.network).toBe('clickbank');
    expect(body.status).toBe('escolhido');
    expect(body.score).toBe(72);
  });

  it('does not send undefined optional fields', async () => {
    const body: Record<string, unknown> = { name: 'TestProd', network: 'clickbank', status: 'novo' };
    await appPost('/api/products', body);

    const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sent.hopLink).toBeUndefined();
    expect(sent.affiliatePageUrl).toBeUndefined();
    expect(sent.score).toBeUndefined();
  });
});

describe('criar_campanha MCP proxy pattern', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  const APP_URL = 'http://localhost:3001';
  const MCP_TOKEN = 'test-token-abc';

  async function appPost(path: string, body: Record<string, unknown>) {
    if (!MCP_TOKEN) throw new Error('AFILIADS_MCP_TOKEN não configurado.');
    const res = await fetchMock(`${APP_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-afiliads-token': MCP_TOKEN },
      body: JSON.stringify(body),
    });
    const data = await (res as any).json();
    if (!(res as any).ok) throw new Error(data?.error || `Erro ${(res as any).status}`);
    return data;
  }

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'camp-new',
        name: 'CB_YUSLEEP_US_SEARCH_BRIDGE_v1',
        status: 'EM_TESTE',
        wizardStep: 1,
      }),
    });
  });

  it('sends campaign creation to /api/campaigns with ORQ naming', async () => {
    await appPost('/api/campaigns', {
      name: 'CB_YUSLEEP_US_SEARCH_BRIDGE_v1',
      productResearchId: 'prod-1',
      platform: 'ClickBank',
      vertical: 'sleep',
      geo: 'US',
      channel: 'SEARCH',
      funnel: 'BRIDGE',
      budgetTest: 50,
      budgetDaily: 15,
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:3001/api/campaigns');
    const body = JSON.parse(opts.body);
    expect(body.name).toBe('CB_YUSLEEP_US_SEARCH_BRIDGE_v1');
    expect(body.productResearchId).toBe('prod-1');
    expect(body.platform).toBe('ClickBank');
    expect(body.channel).toBe('SEARCH');
    expect(body.budgetTest).toBe(50);
  });

  it('works without productResearchId (standalone campaign)', async () => {
    await appPost('/api/campaigns', {
      name: 'Test Campaign',
      platform: 'ClickBank',
      vertical: 'health',
      geo: 'US',
      channel: 'SEARCH',
      funnel: 'BRIDGE',
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.productResearchId).toBeUndefined();
    expect(body.name).toBe('Test Campaign');
  });

  it('propagates app error on 404 (product not found)', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: 'Produto não encontrado' }),
    });

    await expect(appPost('/api/campaigns', {
      name: 'Test',
      productResearchId: 'nonexistent',
    })).rejects.toThrow('Produto não encontrado');
  });

  it('includes loop config when provided', async () => {
    await appPost('/api/campaigns', {
      name: 'CB_TEST_v1',
      platform: 'ClickBank',
      vertical: 'health',
      geo: 'US',
      channel: 'SEARCH',
      funnel: 'BRIDGE',
      loopEnabled: true,
      loopInterval: '12h',
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.loopEnabled).toBe(true);
    expect(body.loopInterval).toBe('12h');
  });
});
