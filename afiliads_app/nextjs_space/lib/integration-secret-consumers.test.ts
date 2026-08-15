import { beforeEach, describe, expect, it, vi } from 'vitest';
import { encryptIntegrationSecret } from './integration-secrets';

const { findMany, findFirst, campaignFindMany, integrationUpsert, dailyLogUpsert } = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  campaignFindMany: vi.fn(),
  integrationUpsert: vi.fn(),
  dailyLogUpsert: vi.fn(),
}));

vi.mock('./prisma', () => ({
  prisma: {
    integration: { findMany, findFirst, upsert: integrationUpsert },
    campaign: { findMany: campaignFindMany },
    dailyLog: { upsert: dailyLogUpsert },
  },
}));

import { getGoogleAdsConfig } from './google-ads';
import { getAtpKey } from './atp';
import { syncClickbank } from './clickbank';

const KEY = Buffer.alloc(32, 9).toString('base64');
const encrypted = (value: string) => encryptIntegrationSecret(value, KEY);

describe('consumidores de segredos de integração', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.INTEGRATION_ENCRYPTION_KEY = KEY;
    campaignFindMany.mockResolvedValue([]);
    integrationUpsert.mockResolvedValue({});
    dailyLogUpsert.mockResolvedValue({});
  });

  it('descriptografa credenciais Google Ads sensíveis e preserva IDs públicos', async () => {
    findMany.mockResolvedValue([
      { fieldName: 'customer_id', fieldValue: '123-456' },
      { fieldName: 'developer_token', fieldValue: encrypted('developer-plain') },
      { fieldName: 'client_id', fieldValue: 'client-public' },
      { fieldName: 'client_secret', fieldValue: encrypted('client-secret-plain') },
      { fieldName: 'refresh_token', fieldValue: encrypted('refresh-plain') },
    ]);
    await expect(getGoogleAdsConfig('u1')).resolves.toEqual(expect.objectContaining({
      customerId: '123456',
      developerToken: 'developer-plain',
      clientId: 'client-public',
      clientSecret: 'client-secret-plain',
      refreshToken: 'refresh-plain',
    }));
  });

  it('descriptografa a API key do AnswerThePublic', async () => {
    findFirst.mockResolvedValue({ fieldName: 'api_key', fieldValue: encrypted('atp-plain') });
    await expect(getAtpKey('u1')).resolves.toBe('atp-plain');
  });

  it('envia ao ClickBank a credencial descriptografada', async () => {
    findMany.mockResolvedValue([
      { fieldName: 'api_key', fieldValue: encrypted('clickbank-plain') },
      { fieldName: 'account_nickname', fieldValue: 'nick' },
    ]);
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ status: 204, ok: true } as Response);
    await expect(syncClickbank('u1', 1)).resolves.toEqual(expect.objectContaining({ ok: true }));
    const headers = fetchSpy.mock.calls[0][1]?.headers as Record<string, string>;
    expect(headers.Authorization).toContain('clickbank-plain');
  });
});
