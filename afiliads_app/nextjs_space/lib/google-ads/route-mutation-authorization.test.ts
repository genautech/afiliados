import { describe, it, expect } from 'vitest';
import { authorizeMutation } from './route-mutation-authorization';

describe('authorizeMutation', () => {
  it('blocks missing payload or false confirmation', () => {
    expect(() => authorizeMutation(null, 'SETUP_EXPERIMENT', 'res1', 'rev1')).toThrow(/payload inválido/);
    expect(() => authorizeMutation({ confirmed: false, operation: 'SETUP_EXPERIMENT', resourceId: 'res1', revision: 'rev1', idempotencyKey: '1234567890' }, 'SETUP_EXPERIMENT', 'res1', 'rev1')).toThrow(/payload inválido/);
  });

  it('blocks divergent user/resource', () => {
    const payload = { confirmed: true, operation: 'SETUP_EXPERIMENT', resourceId: 'res2', revision: 'rev1', idempotencyKey: '1234567890' };
    expect(() => authorizeMutation(payload, 'SETUP_EXPERIMENT', 'res1', 'rev1')).toThrow(/ID do recurso divergente/);
  });

  it('blocks divergent operation or revision', () => {
    const payloadOp = { confirmed: true, operation: 'SCHEDULE_EXPERIMENT', resourceId: 'res1', revision: 'rev1', idempotencyKey: '1234567890' };
    expect(() => authorizeMutation(payloadOp, 'SETUP_EXPERIMENT', 'res1', 'rev1')).toThrow(/operação divergente/);

    const payloadRev = { confirmed: true, operation: 'SETUP_EXPERIMENT', resourceId: 'res1', revision: 'rev2', idempotencyKey: '1234567890' };
    expect(() => authorizeMutation(payloadRev, 'SETUP_EXPERIMENT', 'res1', 'rev1')).toThrow(/revisão do recurso divergente/);
  });

  it('blocks invalid idempotency key', () => {
    const payloadEmptyKey = { confirmed: true, operation: 'SETUP_EXPERIMENT', resourceId: 'res1', revision: 'rev1', idempotencyKey: '' };
    expect(() => authorizeMutation(payloadEmptyKey, 'SETUP_EXPERIMENT', 'res1', 'rev1')).toThrow(/payload inválido/);

    const payloadShortKey = { confirmed: true, operation: 'SETUP_EXPERIMENT', resourceId: 'res1', revision: 'rev1', idempotencyKey: 'short' };
    expect(() => authorizeMutation(payloadShortKey, 'SETUP_EXPERIMENT', 'res1', 'rev1')).toThrow(/payload inválido/);
  });

  it('returns typed context when valid', () => {
    const payload = { confirmed: true, operation: 'SETUP_EXPERIMENT', resourceId: 'res1', revision: 'rev1', idempotencyKey: '1234567890abc' };
    const ctx = authorizeMutation(payload, 'SETUP_EXPERIMENT', 'res1', 'rev1');
    expect(ctx.operation).toBe('SETUP_EXPERIMENT');
    expect(ctx.resourceId).toBe('res1');
    expect(ctx.revision).toBe('rev1');
    expect(ctx.idempotencyKey).toBe('1234567890abc');
  });
});
