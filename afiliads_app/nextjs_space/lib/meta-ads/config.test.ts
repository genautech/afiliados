import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({
  integration: { findMany: vi.fn() },
  read: vi.fn(),
}));
vi.mock('@/lib/prisma', () => ({ prisma: { integration: h.integration } }));
vi.mock('@/lib/integration-secrets', () => ({ readIntegrationFieldValue: h.read }));

import { getMetaAdsCredentials, isMetaMockMode, normalizeAdAccountId } from './config';

const row = (serviceName: string, fieldName: string, fieldValue: string) =>
  ({ serviceName, fieldName, fieldValue });

describe('normalizeAdAccountId', () => {
  it('adiciona o prefixo act_ que a Marketing API exige', () => {
    expect(normalizeAdAccountId('1234567890')).toBe('act_1234567890');
  });
  it('não duplica o prefixo quando já veio', () => {
    expect(normalizeAdAccountId(' act_1234567890 ')).toBe('act_1234567890');
  });
});

describe('getMetaAdsCredentials', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // por padrão o "decifrador" devolve o valor como veio
    h.read.mockImplementation((_f: string, v: string) => v);
    for (const e of ['META_ACCESS_TOKEN', 'FACEBOOK_ACCESS_TOKEN', 'META_AD_ACCOUNT_ID', 'META_PIXEL_ID', 'META_PAGE_ID', 'META_MOCK_MODE']) {
      delete process.env[e];
    }
  });

  it('descriptografa o access_token antes de devolver', async () => {
    h.integration.findMany.mockResolvedValue([
      row('meta', 'access_token', 'enc:v1:AAAA'),
      row('meta', 'ad_account_id', '999'),
    ]);
    h.read.mockImplementation((f: string, v: string) => (f === 'access_token' ? 'TOKEN-CLARO' : v));

    const check = await getMetaAdsCredentials('u1');

    expect(h.read).toHaveBeenCalledWith('access_token', 'enc:v1:AAAA');
    expect(check.credentials?.accessToken).toBe('TOKEN-CLARO');
    expect(check.credentials?.accessToken.startsWith('enc:')).toBe(false);
  });

  it('trata segredo ilegível como ausente, e não como texto válido', async () => {
    h.integration.findMany.mockResolvedValue([
      row('meta', 'access_token', 'enc:v1:CHAVE-TROCADA'),
      row('meta', 'ad_account_id', '999'),
    ]);
    h.read.mockImplementation((f: string) => {
      if (f === 'access_token') throw new Error('chave inválida');
      return '999';
    });

    const check = await getMetaAdsCredentials('u1');

    expect(check.credentials).toBeNull();
    expect(check.missing).toContain('access_token');
    expect(isMetaMockMode(check)).toBe(true);
  });

  it('herda o pixel do bloco de rastreamento quando o bloco meta não tem', async () => {
    h.integration.findMany.mockResolvedValue([
      row('meta', 'access_token', 't'),
      row('meta', 'ad_account_id', '999'),
      row('tracking', 'meta_pixel_id', '111222333'),
    ]);

    const check = await getMetaAdsCredentials('u1');

    expect(check.credentials?.pixelId).toBe('111222333');
    expect(check.missing).not.toContain('pixel_id');
  });

  it('prefere o bloco meta ao de rastreamento quando os dois têm pixel', async () => {
    h.integration.findMany.mockResolvedValue([
      row('meta', 'access_token', 't'),
      row('meta', 'ad_account_id', '999'),
      row('meta', 'pixel_id', 'CANONICO'),
      row('tracking', 'meta_pixel_id', 'FALLBACK'),
    ]);

    const check = await getMetaAdsCredentials('u1');
    expect(check.credentials?.pixelId).toBe('CANONICO');
  });

  it('sem access_token e sem ad_account não existe caminho LIVE', async () => {
    h.integration.findMany.mockResolvedValue([]);
    const check = await getMetaAdsCredentials('u1');
    expect(check.credentials).toBeNull();
    expect(check.missing).toEqual(expect.arrayContaining(['access_token', 'ad_account_id']));
    expect(isMetaMockMode(check)).toBe(true);
  });

  it('page_id e pixel_id faltando não derrubam para MOCK, só entram em missing', async () => {
    h.integration.findMany.mockResolvedValue([
      row('meta', 'access_token', 't'),
      row('meta', 'ad_account_id', 'act_999'),
    ]);
    const check = await getMetaAdsCredentials('u1');
    expect(check.credentials).not.toBeNull();
    expect(check.missing).toEqual(expect.arrayContaining(['pixel_id', 'page_id']));
    expect(isMetaMockMode(check)).toBe(false);
  });

  it('META_MOCK_MODE=true força MOCK mesmo com credencial completa', async () => {
    process.env.META_MOCK_MODE = 'true';
    h.integration.findMany.mockResolvedValue([
      row('meta', 'access_token', 't'),
      row('meta', 'ad_account_id', 'act_999'),
    ]);
    const check = await getMetaAdsCredentials('u1');
    expect(isMetaMockMode(check)).toBe(true);
  });
});
