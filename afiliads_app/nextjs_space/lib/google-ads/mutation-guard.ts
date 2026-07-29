// Guard default-deny para qualquer mutate real na Google Ads API.
// Falha fechado: qualquer camada ausente ou malformada nega, nunca permite por omissão.
// Nunca lança exceção — quem chama decide o que fazer com { allowed: false, reason }.

const KNOWN_OPERATIONS = [
  'createGoogleCampaign',
  'mutateGoogleCampaign.status',
  'mutateGoogleCampaign.budget',
  'createExperiment',
  'createExperimentArms',
  'updateAdFinalUrls',
] as const;

export type MutationGuardOperation = (typeof KNOWN_OPERATIONS)[number];

export interface MutationGuardInput {
  operation: string;
  customerId: string;
  isMock: boolean;
  confirmed: boolean; // deve vir explícito do chamador, nunca inferido
}

export interface MutationGuardResult {
  allowed: boolean;
  reason?: string;
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
  if (input.isMock) {
    return { allowed: true };
  }

  if (process.env.GOOGLE_ADS_MUTATIONS_ENABLED !== 'true') {
    return { allowed: false, reason: 'GOOGLE_ADS_MUTATIONS_ENABLED is not "true"' };
  }

  if (input.confirmed !== true) {
    return { allowed: false, reason: 'mutation not explicitly confirmed by caller' };
  }

  if (!KNOWN_OPERATIONS.includes(input.operation as MutationGuardOperation)) {
    return { allowed: false, reason: `unknown operation "${input.operation}"` };
  }

  const allowlist = parseAllowlist(process.env.GOOGLE_ADS_MUTATION_ALLOWLIST);
  if (!allowlist.has(input.customerId)) {
    return { allowed: false, reason: `customerId "${input.customerId}" is not in GOOGLE_ADS_MUTATION_ALLOWLIST` };
  }

  return { allowed: true };
}
