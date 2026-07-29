// Guard default-deny para qualquer mutate real na Google Ads API.
// Falha fechado: qualquer camada ausente ou malformada nega, nunca permite por omissão.
// Nunca lança exceção — quem chama decide o que fazer com { allowed: false, reason }.
//
// A5 (checkpoint pós-Tarefa 8): quando allowed:true, também emite um `MutationCapability`
// (lib/google-ads/client.ts) — só esse objeto destrava `googleAdsMutateRequest`/
// `googleAdsResourceMutateRequest`. Isso fecha o bypass onde qualquer código podia chamar o
// transporte genérico direto num path `:mutate` sem nunca ter passado por este guard.

import { createMutationCapability, type MutationCapability } from './client';

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

export interface MutationGuardInput {
  operation: string;
  customerId: string;
  isMock: boolean;
  confirmed: boolean; // deve vir explícito do chamador, nunca inferido
}

export type MutationGuardResult =
  | { allowed: true; capability: MutationCapability }
  | { allowed: false; reason: string };

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
    return { allowed: true, capability: createMutationCapability(input.operation) };
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

  return { allowed: true, capability: createMutationCapability(input.operation) };
}
