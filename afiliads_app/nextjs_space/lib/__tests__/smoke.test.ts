import { describe, expect, it } from 'vitest';
import { isMockMode, type GoogleAdsCredentials } from '@/lib/google-ads';

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

describe('vitest harness', () => {
  it('roda testes TypeScript com paths @/*', () => {
    expect(isMockMode(credentials({ developerToken: 'DEV_TOKEN_MOCK_abc' }))).toBe(true);
  });

  it('reconhece credenciais reais como não-mock', () => {
    expect(isMockMode(credentials())).toBe(false);
  });
});
