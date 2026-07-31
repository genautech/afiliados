// Guard default-deny para qualquer mutate real na Google Ads API.
// A capability é emitida somente por este módulo e validada por identidade runtime (WeakSet),
// além de operação/customer/escopo. Objetos estruturalmente iguais não são aceitos.

const KNOWN_OPERATIONS = [
  'createGoogleCampaign',
  'mutateGoogleCampaign.status',
  'mutateGoogleCampaign.budget',
  'createExperiment',
  'createExperimentArms',
  'updateAdFinalUrls',
  'scheduleExperiment',
  'endExperiment',
  'promoteExperiment',
  'graduateExperiment',
] as const;

export type MutationGuardOperation = (typeof KNOWN_OPERATIONS)[number];

export interface MutationCapability {
  readonly operation: string;
  readonly customerId: string;
  readonly resourceScope?: string;
}

export interface MutationGuardInput {
  operation: string;
  customerId: string;
  isMock: boolean;
  confirmed: boolean;
  resourceName?: string;
}

export type MutationGuardResult =
  | { allowed: true; capability: MutationCapability }
  | { allowed: false; reason: string };

const ISSUED_CAPABILITIES = new WeakSet<object>();

function issueMutationCapability(input: MutationGuardInput): MutationCapability {
  const capability = Object.freeze({
    operation: input.operation,
    customerId: input.customerId,
    ...(input.resourceName ? { resourceScope: input.resourceName } : {}),
  });
  ISSUED_CAPABILITIES.add(capability);
  return capability;
}

export function isMutationCapability(value: unknown): value is MutationCapability {
  return typeof value === 'object' && value !== null && ISSUED_CAPABILITIES.has(value);
}

export function assertMutationCapability(
  value: unknown,
  expectedOperation?: string,
  expectedCustomerId?: string,
  expectedResourceName?: string
): asserts value is MutationCapability {
  if (!isMutationCapability(value)) {
    throw new Error('MutationCapability inválida ou não emitida pelo mutation guard');
  }
  if (expectedOperation && value.operation !== expectedOperation) {
    throw new Error(`MutationCapability inválida para ${expectedOperation}`);
  }
  if (expectedCustomerId && value.customerId !== expectedCustomerId) {
    throw new Error('MutationCapability pertence a outro customer');
  }
  if (expectedResourceName && value.resourceScope !== expectedResourceName) {
    throw new Error('MutationCapability pertence a outro recurso');
  }
}

function parseAllowlist(raw: string | undefined): Set<string> {
  if (!raw) return new Set();
  return new Set(
    raw
      .split(',')
      .map((id) => id.trim())
      .filter((id) => id.length > 0)
  );
}

export function assertMutationAllowed(input: MutationGuardInput): MutationGuardResult {
  if (!KNOWN_OPERATIONS.includes(input.operation as MutationGuardOperation)) {
    return { allowed: false, reason: `unknown operation "${input.operation}"` };
  }

  if (!/^\d{10}$/.test(input.customerId)) {
    return { allowed: false, reason: 'customerId inválido para emissão de capability' };
  }

  if (input.resourceName) {
    const resourceCustomer = /^customers\/(\d+)\//.exec(input.resourceName)?.[1];
    if (!resourceCustomer || resourceCustomer !== input.customerId) {
      return { allowed: false, reason: 'resourceName inválido ou divergente do customerId' };
    }
  }

  if (input.isMock) {
    return { allowed: true, capability: issueMutationCapability(input) };
  }

  if (process.env.GOOGLE_ADS_MUTATIONS_ENABLED !== 'true') {
    return { allowed: false, reason: 'GOOGLE_ADS_MUTATIONS_ENABLED is not "true"' };
  }

  if (input.confirmed !== true) {
    return { allowed: false, reason: 'mutation not explicitly confirmed by caller' };
  }

  const allowlist = parseAllowlist(process.env.GOOGLE_ADS_MUTATION_ALLOWLIST);
  if (!allowlist.has(input.customerId)) {
    return { allowed: false, reason: `customerId "${input.customerId}" is not in GOOGLE_ADS_MUTATION_ALLOWLIST` };
  }

  return { allowed: true, capability: issueMutationCapability(input) };
}
