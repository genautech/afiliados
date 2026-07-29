import { describe, it, expect } from 'vitest';
import { authorizeMutation } from './route-mutation-authorization';

describe('authorizeMutation', () => {
  it('blocks missing payload or false confirmation', () => {
    expect(() => authorizeMutation(null, 'SETUP_EXPERIMENT', 'res1', 'rev1', 'u1', 'u1')).toThrow(/payload inválido/);
    expect(() => authorizeMutation({ confirmed: false, operation: 'SETUP_EXPERIMENT', resourceId: 'res1', revision: 'rev1', idempotencyKey: '1234567890' }, 'SETUP_EXPERIMENT', 'res1', 'rev1', 'u1', 'u1')).toThrow(/payload inválido/);
  });

  it('authorizes valid payload', () => {
    const payload = {
      confirmed: true,
      operation: 'SETUP_EXPERIMENT',
      resourceId: 'c1',
      revision: 'r1',
      idempotencyKey: 'idemp_key_123'
    };

    const ctx = authorizeMutation(payload, 'SETUP_EXPERIMENT', 'c1', 'r1', 'u1', 'u1');
    expect(ctx.operation).toBe('SETUP_EXPERIMENT');
    expect(ctx.resourceId).toBe('c1');
  });

  it('fails if user is divergent', () => {
    const payload = {
      confirmed: true,
      operation: 'SETUP_EXPERIMENT',
      resourceId: 'c1',
      revision: 'r1',
      idempotencyKey: 'idemp_key_123'
    };

    expect(() => authorizeMutation(payload, 'SETUP_EXPERIMENT', 'c1', 'r1', 'u1', 'u2'))
      .toThrow('recurso pertence a outro usuário');
  });

  it('fails if resource or revision divergent', () => {
    const payload = {
      confirmed: true,
      operation: 'SETUP_EXPERIMENT',
      resourceId: 'c2',
      revision: 'r1',
      idempotencyKey: 'idemp_key_123'
    };

    expect(() => authorizeMutation(payload, 'SETUP_EXPERIMENT', 'c1', 'r1', 'u1', 'u1'))
      .toThrow('ID do recurso');
  });

  it('blocks invalid idempotency key', () => {
    const payloadEmptyKey = { confirmed: true, operation: 'SETUP_EXPERIMENT', resourceId: 'res1', revision: 'rev1', idempotencyKey: '' };
    expect(() => authorizeMutation(payloadEmptyKey, 'SETUP_EXPERIMENT', 'res1', 'rev1', 'u1', 'u1')).toThrow(/payload inválido/);

    const payloadShortKey = { confirmed: true, operation: 'SETUP_EXPERIMENT', resourceId: 'res1', revision: 'rev1', idempotencyKey: 'short' };
    expect(() => authorizeMutation(payloadShortKey, 'SETUP_EXPERIMENT', 'res1', 'rev1', 'u1', 'u1')).toThrow(/payload inválido/);
  });

  it('returns typed context when valid', () => {
    const payload = { confirmed: true, operation: 'SETUP_EXPERIMENT', resourceId: 'res1', revision: 'rev1', idempotencyKey: '1234567890abc' };
    const ctx = authorizeMutation(payload, 'SETUP_EXPERIMENT', 'res1', 'rev1', 'u1', 'u1');
    expect(ctx.operation).toBe('SETUP_EXPERIMENT');
    expect(ctx.resourceId).toBe('res1');
    expect(ctx.revision).toBe('rev1');
    expect(ctx.idempotencyKey).toBe('1234567890abc');
  });
});
