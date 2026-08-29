// Guard default-deny para qualquer mutação real na Marketing API do Meta.
//
// Espelha lib/google-ads/mutation-guard.ts de propósito: mesma emissão por
// identidade (WeakSet), mesma validação de operação/conta/escopo. O canal Meta
// não pode ter um portão mais frouxo que o do Google só porque chegou depois.
//
// Nesta fase o caminho LIVE existe mas permanece fechado: não há tela que
// capture ad account e token de sistema, então nenhuma conta entra na
// allowlist e todo lançamento Meta sai declarado como MOCK. Abrir o LIVE é
// preencher a credencial e ligar META_ADS_MUTATIONS_ENABLED — não é mexer
// nesta lógica.

const KNOWN_OPERATIONS = [
  'createMetaCampaign',
  'createMetaAdSet',
  'createMetaAd',
  'pauseMetaCampaign',
] as const;

export type MetaMutationOperation = (typeof KNOWN_OPERATIONS)[number];

export interface MetaMutationCapability {
  readonly operation: string;
  readonly adAccountId: string;
  readonly resourceScope?: string;
}

export interface MetaMutationGuardInput {
  operation: string;
  adAccountId: string;
  isMock: boolean;
  confirmed: boolean;
  resourceId?: string;
}

export type MetaMutationGuardResult =
  | { allowed: true; capability: MetaMutationCapability }
  | { allowed: false; reason: string };

const ISSUED_CAPABILITIES = new WeakSet<object>();

function issueCapability(input: MetaMutationGuardInput): MetaMutationCapability {
  const capability = Object.freeze({
    operation: input.operation,
    adAccountId: input.adAccountId,
    ...(input.resourceId ? { resourceScope: input.resourceId } : {}),
  });
  ISSUED_CAPABILITIES.add(capability);
  return capability;
}

export function isMetaMutationCapability(value: unknown): value is MetaMutationCapability {
  return typeof value === 'object' && value !== null && ISSUED_CAPABILITIES.has(value);
}

export function assertMetaMutationCapability(
  value: unknown,
  expectedOperation?: string,
  expectedAdAccountId?: string
): asserts value is MetaMutationCapability {
  if (!isMetaMutationCapability(value)) {
    throw new Error('MetaMutationCapability inválida ou não emitida pelo mutation guard');
  }
  if (expectedOperation && value.operation !== expectedOperation) {
    throw new Error(`MetaMutationCapability inválida para ${expectedOperation}`);
  }
  if (expectedAdAccountId && value.adAccountId !== expectedAdAccountId) {
    throw new Error('MetaMutationCapability pertence a outra ad account');
  }
}

function parseAllowlist(raw: string | undefined): Set<string> {
  if (!raw) return new Set();
  return new Set(raw.split(',').map((id) => id.trim()).filter((id) => id.length > 0));
}

// Ad account do Meta é numérica; o prefixo act_ é da URL, não do id.
export function normalizeAdAccountId(raw: string): string {
  return raw.trim().replace(/^act_/, '');
}

export function assertMetaMutationAllowed(input: MetaMutationGuardInput): MetaMutationGuardResult {
  if (!KNOWN_OPERATIONS.includes(input.operation as MetaMutationOperation)) {
    return { allowed: false, reason: `unknown operation "${input.operation}"` };
  }

  if (!/^\d{6,20}$/.test(input.adAccountId)) {
    return { allowed: false, reason: 'adAccountId inválido para emissão de capability' };
  }

  if (input.isMock) {
    return { allowed: true, capability: issueCapability(input) };
  }

  if (process.env.META_ADS_MUTATIONS_ENABLED !== 'true') {
    return { allowed: false, reason: 'META_ADS_MUTATIONS_ENABLED is not "true"' };
  }

  if (input.confirmed !== true) {
    return { allowed: false, reason: 'mutation not explicitly confirmed by caller' };
  }

  const allowlist = parseAllowlist(process.env.META_ADS_MUTATION_ALLOWLIST);
  if (!allowlist.has(input.adAccountId)) {
    return { allowed: false, reason: `adAccountId "${input.adAccountId}" is not in META_ADS_MUTATION_ALLOWLIST` };
  }

  return { allowed: true, capability: issueCapability(input) };
}
