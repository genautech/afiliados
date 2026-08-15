import { describe, expect, it } from 'vitest';
import { createHash } from 'crypto';
import {
  decryptIntegrationSecret,
  encryptIntegrationSecret,
  isEncryptedIntegrationSecret,
  readIntegrationFieldValue,
} from './integration-secrets';

const KEY = Buffer.alloc(32, 7).toString('base64');

describe('integration secrets', () => {
  it('persiste ciphertext autenticado e recupera somente com a chave correta', () => {
    const encrypted = encryptIntegrationSecret('sentinel-secret', KEY);
    expect(isEncryptedIntegrationSecret(encrypted)).toBe(true);
    expect(encrypted).not.toContain('sentinel-secret');
    expect(decryptIntegrationSecret(encrypted, KEY)).toBe('sentinel-secret');
    expect(() => decryptIntegrationSecret(encrypted, Buffer.alloc(32, 8).toString('base64'))).toThrow();
  });

  it('falha fechado ao encontrar valor legado em plaintext', () => {
    expect(() => decryptIntegrationSecret('legacy-plaintext', KEY)).toThrow('plaintext legado');
  });

  it('falha fechado ao gravar sem chave de runtime', () => {
    expect(() => encryptIntegrationSecret('secret', '')).toThrow('INTEGRATION_ENCRYPTION_KEY não configurada');
  });

  it('aceita plaintext legado somente durante a fase explícita legacy-read', () => {
    expect(readIntegrationFieldValue('api_key_kimi', 'legacy-plaintext', KEY, 'legacy-read'))
      .toBe('legacy-plaintext');
    expect(() => readIntegrationFieldValue('api_key_kimi', 'legacy-plaintext', KEY, 'enforced'))
      .toThrow('plaintext legado');
  });

  it('rejeita fase de rollout inválida', () => {
    expect(() => readIntegrationFieldValue('api_key_kimi', 'legacy-plaintext', KEY, 'typo' as any))
      .toThrow('fase de rollout inválida');
  });

  it('legacy-read recupera ciphertext da chave NEXTAUTH anterior, mas enforced não', () => {
    const legacyNextAuthSecret = 'legacy-nextauth-secret-with-at-least-32-bytes';
    const legacyKey = createHash('sha256')
      .update('AfiliAds integration secrets v1\0', 'utf8')
      .update(legacyNextAuthSecret, 'utf8')
      .digest('base64');
    const encryptedWithLegacyKey = encryptIntegrationSecret('legacy-ciphertext-secret', legacyKey);

    expect(readIntegrationFieldValue(
      'api_key_kimi', encryptedWithLegacyKey, KEY, 'legacy-read', legacyNextAuthSecret,
    )).toBe('legacy-ciphertext-secret');
    expect(() => readIntegrationFieldValue(
      'api_key_kimi', encryptedWithLegacyKey, KEY, 'enforced', legacyNextAuthSecret,
    )).toThrow();
  });
});
