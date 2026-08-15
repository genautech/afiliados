import { loadEnvConfig } from '@next/env';
import {
  assertSecretMigrationReadyForEnforcement,
  migrateLegacyIntegrationSecrets,
} from '../lib/integration-secret-migration';

async function main() {
  loadEnvConfig(process.cwd());
  const { prisma } = await import('../lib/prisma');
  try {
    const apply = process.argv.includes('--apply');
    const rawKey = process.env.INTEGRATION_ENCRYPTION_KEY;
    const legacyNextAuthSecret = process.env.NEXTAUTH_SECRET;
    if (apply && !rawKey) {
      throw new Error('INTEGRATION_ENCRYPTION_KEY dedicada é obrigatória para aplicar a migração');
    }
    const result = await migrateLegacyIntegrationSecrets(prisma, { apply, rawKey, legacyNextAuthSecret });
    if (!apply) {
      console.log(JSON.stringify({ mode: 'dry-run', ...result }));
      return;
    }
    const verification = await migrateLegacyIntegrationSecrets(prisma, { apply: false, rawKey, legacyNextAuthSecret });
    assertSecretMigrationReadyForEnforcement(verification);
    console.log(JSON.stringify({ mode: 'apply', ...result, verification }));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Falha na migração de segredos');
  process.exitCode = 1;
});
