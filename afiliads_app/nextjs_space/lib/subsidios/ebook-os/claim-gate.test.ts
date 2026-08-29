import { describe, expect, it } from 'vitest';
import { evaluateClaimGate, type ClaimGateRow } from './claim-gate';

const fato = (over: Partial<ClaimGateRow> = {}): ClaimGateRow => ({
  claim: 'O método foi testado com 40 alunos',
  status: 'FATO',
  source: 'https://exemplo.com/estudo',
  allowedChannels: ['landing', 'google-ads'],
  ...over,
});

describe('evaluateClaimGate', () => {
  it('aprova ledger com claim verificada e fonte', () => {
    expect(evaluateClaimGate([fato()])).toEqual({ allowed: true, issues: [] });
  });

  it('aprova ledger vazio', () => {
    expect(evaluateClaimGate([]).allowed).toBe(true);
  });

  it('bloqueia claim PROIBIDO autorizada em qualquer canal', () => {
    const result = evaluateClaimGate([
      fato({ status: 'PROIBIDO', source: null, allowedChannels: ['organico'] }),
    ]);
    expect(result.allowed).toBe(false);
    expect(result.issues.map((i) => i.code)).toContain('CLAIM_PROIBIDA_EM_COPY');
  });

  it('aceita claim PROIBIDO sem canal nenhum', () => {
    const result = evaluateClaimGate([
      fato({ status: 'PROIBIDO', source: null, allowedChannels: [] }),
    ]);
    expect(result.allowed).toBe(true);
  });

  it('bloqueia INFERENCIA em midia paga', () => {
    const result = evaluateClaimGate([
      fato({ status: 'INFERENCIA', source: null, allowedChannels: ['google-ads'] }),
    ]);
    expect(result.issues.map((i) => i.code)).toEqual(['CLAIM_PAGA_NAO_VERIFICADA']);
  });

  it('permite INFERENCIA em canal organico', () => {
    const result = evaluateClaimGate([
      fato({ status: 'INFERENCIA', source: null, allowedChannels: ['organico', 'email'] }),
    ]);
    expect(result.allowed).toBe(true);
  });

  it('bloqueia FATO sem fonte', () => {
    expect(evaluateClaimGate([fato({ source: null })]).issues.map((i) => i.code))
      .toContain('FONTE_SEM_ORIGEM');
    expect(evaluateClaimGate([fato({ source: '   ' })]).issues.map((i) => i.code))
      .toContain('FONTE_SEM_ORIGEM');
  });

  it('bloqueia canal fora do contrato do fact-steward', () => {
    const result = evaluateClaimGate([fato({ allowedChannels: ['tiktok-ads'] })]);
    expect(result.issues.map((i) => i.code)).toEqual(['CANAL_DESCONHECIDO']);
  });

  it('ignora allowedChannels que não é array', () => {
    expect(evaluateClaimGate([fato({ allowedChannels: null })]).allowed).toBe(true);
    expect(evaluateClaimGate([fato({ allowedChannels: 'google-ads' })]).allowed).toBe(true);
  });

  it('acumula problemas de várias claims', () => {
    const result = evaluateClaimGate([
      fato({ source: null }),
      fato({ status: 'PROIBIDO', source: null, allowedChannels: ['landing'] }),
    ]);
    expect(result.issues).toHaveLength(2);
  });
});
