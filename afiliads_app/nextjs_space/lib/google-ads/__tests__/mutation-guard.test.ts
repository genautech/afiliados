import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { assertMutationAllowed, type MutationGuardInput } from '@/lib/google-ads/mutation-guard';
import { isMutationCapability } from '@/lib/google-ads/client';

const ORIGINAL_ENV = { ...process.env };

function input(overrides: Partial<MutationGuardInput> = {}): MutationGuardInput {
  return {
    operation: 'createGoogleCampaign',
    customerId: '1112223333',
    isMock: false,
    confirmed: false,
    ...overrides,
  };
}

describe('assertMutationAllowed', () => {
  beforeEach(() => {
    delete process.env.GOOGLE_ADS_MUTATIONS_ENABLED;
    delete process.env.GOOGLE_ADS_MUTATION_ALLOWLIST;
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('1. mock mode é sempre permitido, independente de flag/confirmação/allowlist, e emite capability (A5)', () => {
    const result = assertMutationAllowed(input({ isMock: true, confirmed: false }));
    expect(result.allowed).toBe(true);
    if (result.allowed) {
      expect(isMutationCapability(result.capability)).toBe(true);
    }
  });

  it('2. flag ausente nega mesmo com confirmed true e conta na allowlist', () => {
    process.env.GOOGLE_ADS_MUTATION_ALLOWLIST = '1112223333';
    const result = assertMutationAllowed(input({ confirmed: true }));
    expect(result.allowed).toBe(false);
  });

  it('2b. flag false nega mesmo com confirmed true e conta na allowlist', () => {
    process.env.GOOGLE_ADS_MUTATIONS_ENABLED = 'false';
    process.env.GOOGLE_ADS_MUTATION_ALLOWLIST = '1112223333';
    const result = assertMutationAllowed(input({ confirmed: true }));
    expect(result.allowed).toBe(false);
  });

  it('3. flag true, confirmed false → negado', () => {
    process.env.GOOGLE_ADS_MUTATIONS_ENABLED = 'true';
    process.env.GOOGLE_ADS_MUTATION_ALLOWLIST = '1112223333';
    const result = assertMutationAllowed(input({ confirmed: false }));
    expect(result.allowed).toBe(false);
  });

  it('4. flag true, confirmed true, customerId fora da allowlist → negado', () => {
    process.env.GOOGLE_ADS_MUTATIONS_ENABLED = 'true';
    process.env.GOOGLE_ADS_MUTATION_ALLOWLIST = '9999999999';
    const result = assertMutationAllowed(input({ confirmed: true, customerId: '1112223333' }));
    expect(result.allowed).toBe(false);
  });

  it('5. flag true, confirmed true, allowlist vazia/indefinida → negado (fail closed)', () => {
    process.env.GOOGLE_ADS_MUTATIONS_ENABLED = 'true';
    const result = assertMutationAllowed(input({ confirmed: true }));
    expect(result.allowed).toBe(false);
  });

  it('6. flag true, confirmed true, conta na allowlist, operação desconhecida → negado', () => {
    process.env.GOOGLE_ADS_MUTATIONS_ENABLED = 'true';
    process.env.GOOGLE_ADS_MUTATION_ALLOWLIST = '1112223333';
    const result = assertMutationAllowed(input({ confirmed: true, operation: 'deleteEverything' }));
    expect(result.allowed).toBe(false);
  });

  it('7. flag true, confirmed true, conta na allowlist, operação conhecida → permitido e emite capability (A5)', () => {
    process.env.GOOGLE_ADS_MUTATIONS_ENABLED = 'true';
    process.env.GOOGLE_ADS_MUTATION_ALLOWLIST = '1112223333';
    const result = assertMutationAllowed(input({ confirmed: true }));
    expect(result.allowed).toBe(true);
    if (result.allowed) {
      expect(isMutationCapability(result.capability)).toBe(true);
      expect(result.capability.operation).toBe('createGoogleCampaign');
    }
  });

  it('7b. operações de experimento (Tarefas 6/7/8) também estão na allowlist de operações conhecidas', () => {
    process.env.GOOGLE_ADS_MUTATIONS_ENABLED = 'true';
    process.env.GOOGLE_ADS_MUTATION_ALLOWLIST = '1112223333';
    for (const operation of [
      'createExperiment',
      'createExperimentArms',
      'updateAdFinalUrls',
      'scheduleExperiment',
      'endExperiment',
      'promoteExperiment',
      'graduateExperiment',
    ]) {
      const result = assertMutationAllowed(input({ confirmed: true, operation }));
      expect(result.allowed).toBe(true);
    }
  });

  it('8. parser de allowlist trata espaços, string vazia e duplicatas', () => {
    process.env.GOOGLE_ADS_MUTATIONS_ENABLED = 'true';
    process.env.GOOGLE_ADS_MUTATION_ALLOWLIST = ' 1112223333 , , 1112223333 ,4445556666';
    const allowed = assertMutationAllowed(input({ confirmed: true, customerId: '1112223333' }));
    const alsoAllowed = assertMutationAllowed(input({ confirmed: true, customerId: '4445556666' }));
    const denied = assertMutationAllowed(input({ confirmed: true, customerId: '7778889999' }));
    expect(allowed.allowed).toBe(true);
    expect(alsoAllowed.allowed).toBe(true);
    expect(denied.allowed).toBe(false);
  });

  it('9. nunca lança exceção e reason nunca carrega segredo (input não tem segredo)', () => {
    const inputs = [
      input({ isMock: true }),
      input({ confirmed: true }),
      input({ operation: '', confirmed: true }),
      input({ customerId: '', confirmed: true }),
    ];
    for (const i of inputs) {
      expect(() => assertMutationAllowed(i)).not.toThrow();
      const result = assertMutationAllowed(i);
      if (!result.allowed && result.reason) {
        expect(result.reason).not.toMatch(/token|secret|refresh/i);
      }
    }
  });
});
