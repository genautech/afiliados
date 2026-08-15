import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

const PREFIX = 'enc:v1:';
export type IntegrationSecretRolloutPhase = 'legacy-read' | 'enforced';

function resolveRolloutPhase(raw?: string): IntegrationSecretRolloutPhase {
  const phase = raw ?? process.env.INTEGRATION_SECRET_ROLLOUT_PHASE ?? 'legacy-read';
  if (phase !== 'legacy-read' && phase !== 'enforced') {
    throw new Error('INTEGRATION_SECRET_ROLLOUT_PHASE contém fase de rollout inválida');
  }
  return phase;
}

function resolveKey(raw?: string): Buffer {
  const configured = raw === undefined ? process.env.INTEGRATION_ENCRYPTION_KEY : raw;
  if (configured) {
    const key = /^[0-9a-f]{64}$/i.test(configured) ? Buffer.from(configured, 'hex') : Buffer.from(configured, 'base64');
    if (key.length !== 32) throw new Error('INTEGRATION_ENCRYPTION_KEY deve conter 32 bytes');
    return key;
  }
  const nextAuthSecret = raw === undefined ? process.env.NEXTAUTH_SECRET : undefined;
  if (nextAuthSecret && nextAuthSecret.length >= 32) {
    return createHash('sha256')
      .update('AfiliAds integration secrets v1\0', 'utf8')
      .update(nextAuthSecret, 'utf8')
      .digest();
  }
  throw new Error('INTEGRATION_ENCRYPTION_KEY não configurada');
}

function deriveLegacyNextAuthKey(secret: string): Buffer {
  if (secret.length < 32) throw new Error('NEXTAUTH_SECRET legado deve conter ao menos 32 caracteres');
  return createHash('sha256')
    .update('AfiliAds integration secrets v1\0', 'utf8')
    .update(secret, 'utf8')
    .digest();
}

function decryptWithKey(value: string, key: Buffer): string {
  const packed = Buffer.from(value.slice(PREFIX.length), 'base64');
  if (packed.length < 29) throw new Error('Segredo de integração criptografado inválido');
  const iv = packed.subarray(0, 12);
  const tag = packed.subarray(12, 28);
  const ciphertext = packed.subarray(28);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

export function isEncryptedIntegrationSecret(value: string): boolean {
  return value.startsWith(PREFIX);
}

export function isSensitiveIntegrationField(fieldName: string): boolean {
  return /(key|secret|token|password)/i.test(fieldName);
}

export function readIntegrationFieldValue(
  fieldName: string,
  value: string,
  rawKey?: string,
  rolloutPhase?: IntegrationSecretRolloutPhase,
  legacyNextAuthSecret?: string,
): string {
  if (!isSensitiveIntegrationField(fieldName)) return value;
  const phase = resolveRolloutPhase(rolloutPhase);
  if (isEncryptedIntegrationSecret(value)) {
    try {
      return decryptIntegrationSecret(value, rawKey);
    } catch (primaryError) {
      if (phase === 'enforced') throw primaryError;
      const legacySecret = legacyNextAuthSecret ?? process.env.NEXTAUTH_SECRET;
      if (!legacySecret) throw primaryError;
      return decryptWithKey(value, deriveLegacyNextAuthKey(legacySecret));
    }
  }
  if (phase === 'legacy-read') return value;
  throw new Error('Segredo de integração em plaintext legado; execute a migração antes da leitura');
}

export function encryptIntegrationSecret(value: string, rawKey?: string): string {
  if (isEncryptedIntegrationSecret(value)) return value;
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', resolveKey(rawKey), iv);
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${Buffer.concat([iv, tag, ciphertext]).toString('base64')}`;
}

export function decryptIntegrationSecret(value: string, rawKey?: string): string {
  if (!isEncryptedIntegrationSecret(value)) {
    throw new Error('Segredo de integração em plaintext legado; execute a migração antes da leitura');
  }
  return decryptWithKey(value, resolveKey(rawKey));
}
