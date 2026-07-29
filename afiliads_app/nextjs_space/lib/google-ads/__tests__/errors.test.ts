import { describe, expect, it } from 'vitest';
import { GoogleAdsApiError, redactSensitive } from '@/lib/google-ads/errors';

describe('redactSensitive', () => {
  it('1. redige token Bearer em header Authorization', () => {
    const out = redactSensitive('Authorization: Bearer ya29.a0AfH6SMC_super_secreto_123');
    expect(out).not.toContain('ya29.a0AfH6SMC_super_secreto_123');
    expect(out).toContain('[REDACTED]');
  });

  it('2. redige developer-token em corpo tipo header/log', () => {
    const out = redactSensitive('developer-token: dEv-t0k3n-real-abc123');
    expect(out).not.toContain('dEv-t0k3n-real-abc123');
  });

  it('3. redige refresh_token/access_token/client_secret em JSON', () => {
    const body = JSON.stringify({
      refresh_token: 'refresh-secreto',
      access_token: 'access-secreto',
      client_secret: 'client-secreto',
    });
    const out = redactSensitive(body);
    expect(out).not.toContain('refresh-secreto');
    expect(out).not.toContain('access-secreto');
    expect(out).not.toContain('client-secreto');
  });

  it('4. não mexe em texto sem segredo (erro genérico da API)', () => {
    const out = redactSensitive('{"error":{"code":400,"message":"INVALID_ARGUMENT"}}');
    expect(out).toContain('INVALID_ARGUMENT');
  });
});

describe('GoogleAdsApiError', () => {
  it('5. mensagem final nunca contém o token bruto, mesmo vindo no rawBody', () => {
    const err = new GoogleAdsApiError(
      'campaigns:mutate',
      500,
      'Authorization: Bearer super-secreto-nao-pode-vazar'
    );
    expect(err.message).not.toContain('super-secreto-nao-pode-vazar');
  });

  it('6. carrega status e resource pra quem for tratar o erro por tipo', () => {
    const err = new GoogleAdsApiError('googleAds:search', 403, 'PERMISSION_DENIED');
    expect(err.status).toBe(403);
    expect(err.resource).toBe('googleAds:search');
    expect(err.name).toBe('GoogleAdsApiError');
  });
});
