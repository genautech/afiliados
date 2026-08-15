import {
  decryptIntegrationSecret,
  encryptIntegrationSecret,
  isEncryptedIntegrationSecret,
  isSensitiveIntegrationField,
  readIntegrationFieldValue,
} from './integration-secrets';

type IntegrationRow = { id: string; fieldName: string; fieldValue: string };
type MigrationClient = {
  integration: {
    findMany: (args: { select: { id: true; fieldName: true; fieldValue: true } }) => Promise<IntegrationRow[]>;
    updateMany: (args: {
      where: { id: string; fieldValue: string };
      data: { fieldValue: string };
    }) => Promise<{ count: number }>;
  };
};

export type SecretMigrationReport = { found: number; migrated: number; conflicts: number };

export function assertSecretMigrationReadyForEnforcement(report: SecretMigrationReport): void {
  if (report.found > 0) throw new Error(`Migração incompleta: ${report.found} segredos legados ainda presentes`);
  if (report.conflicts > 0) throw new Error(`Migração incompleta: ${report.conflicts} conflitos CAS pendentes`);
}

export async function migrateLegacyIntegrationSecrets(
  client: MigrationClient,
  options: { apply: boolean; rawKey?: string; legacyNextAuthSecret?: string },
): Promise<SecretMigrationReport> {
  const rows = await client.integration.findMany({
    select: { id: true, fieldName: true, fieldValue: true },
  });
  const legacy: Array<{ row: IntegrationRow; plaintext: string }> = [];
  for (const row of rows) {
    if (row.fieldValue.length === 0 || !isSensitiveIntegrationField(row.fieldName)) continue;
    if (!isEncryptedIntegrationSecret(row.fieldValue)) {
      legacy.push({ row, plaintext: row.fieldValue });
      continue;
    }
    if (!options.rawKey || !options.legacyNextAuthSecret) continue;
    try {
      decryptIntegrationSecret(row.fieldValue, options.rawKey);
    } catch {
      const plaintext = readIntegrationFieldValue(
        row.fieldName,
        row.fieldValue,
        options.rawKey,
        'legacy-read',
        options.legacyNextAuthSecret,
      );
      legacy.push({ row, plaintext });
    }
  }
  if (!options.apply) return { found: legacy.length, migrated: 0, conflicts: 0 };

  let migrated = 0;
  let conflicts = 0;
  for (const candidate of legacy) {
    const { row, plaintext } = candidate;
    const encrypted = encryptIntegrationSecret(plaintext, options.rawKey);
    const result = await client.integration.updateMany({
      where: { id: row.id, fieldValue: row.fieldValue },
      data: { fieldValue: encrypted },
    });
    if (result.count === 1) migrated += 1;
    else conflicts += 1;
  }
  return { found: legacy.length, migrated, conflicts };
}
