import { describe, expect, it, vi } from 'vitest';
import { createHash } from 'crypto';
import { decryptIntegrationSecret, encryptIntegrationSecret, isEncryptedIntegrationSecret } from './integration-secrets';
import { assertSecretMigrationReadyForEnforcement, migrateLegacyIntegrationSecrets } from './integration-secret-migration';

const KEY = Buffer.alloc(32, 9).toString('base64');

function client(rows = [
  { id: 'legacy', fieldName: 'api_key_kimi', fieldValue: 'legacy-secret' },
  { id: 'safe', fieldName: 'model_kimi', fieldValue: 'kimi-k3' },
]) {
  return {
    integration: {
      findMany: vi.fn().mockResolvedValue(rows),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  };
}

describe('migrateLegacyIntegrationSecrets', () => {
  it('dry-run contabiliza sem escrever', async () => {
    const prisma = client();
    await expect(migrateLegacyIntegrationSecrets(prisma, { apply: false, rawKey: KEY }))
      .resolves.toEqual({ found: 1, migrated: 0, conflicts: 0 });
    expect(prisma.integration.updateMany).not.toHaveBeenCalled();
  });

  it('apply cifra e usa compare-and-swap no valor legado', async () => {
    const prisma = client();
    await expect(migrateLegacyIntegrationSecrets(prisma, { apply: true, rawKey: KEY }))
      .resolves.toEqual({ found: 1, migrated: 1, conflicts: 0 });
    const call = prisma.integration.updateMany.mock.calls[0][0];
    expect(call.where).toEqual({ id: 'legacy', fieldValue: 'legacy-secret' });
    expect(isEncryptedIntegrationSecret(call.data.fieldValue)).toBe(true);
    expect(call.data.fieldValue).not.toContain('legacy-secret');
  });

  it('recriptografa ciphertext derivado do NEXTAUTH para a chave dedicada', async () => {
    const legacyNextAuthSecret = 'legacy-nextauth-secret-with-at-least-32-bytes';
    const legacyKey = createHash('sha256')
      .update('AfiliAds integration secrets v1\0', 'utf8')
      .update(legacyNextAuthSecret, 'utf8')
      .digest('base64');
    const legacyCiphertext = encryptIntegrationSecret('rotated-secret', legacyKey);
    const prisma = client([{ id: 'old-cipher', fieldName: 'api_key_kimi', fieldValue: legacyCiphertext }]);

    await expect(migrateLegacyIntegrationSecrets(prisma, {
      apply: true,
      rawKey: KEY,
      legacyNextAuthSecret,
    })).resolves.toEqual({ found: 1, migrated: 1, conflicts: 0 });
    const call = prisma.integration.updateMany.mock.calls[0][0];
    expect(call.where.fieldValue).toBe(legacyCiphertext);
    expect(decryptIntegrationSecret(call.data.fieldValue, KEY)).toBe('rotated-secret');
  });

  it('só libera enforcement após verificação sem legados nem conflitos', () => {
    expect(() => assertSecretMigrationReadyForEnforcement({ found: 1, migrated: 1, conflicts: 0 }))
      .toThrow('segredos legados');
    expect(() => assertSecretMigrationReadyForEnforcement({ found: 0, migrated: 0, conflicts: 1 }))
      .toThrow('conflitos');
    expect(assertSecretMigrationReadyForEnforcement({ found: 0, migrated: 0, conflicts: 0 }))
      .toBeUndefined();
  });
});
