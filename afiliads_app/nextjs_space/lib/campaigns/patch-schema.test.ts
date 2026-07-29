import { describe, it, expect } from 'vitest';
import { validateCampaignPatch } from './patch-schema';

describe('validateCampaignPatch', () => {
  it('rejects unknown fields', () => {
    const body = { name: 'Test', unknownField: 123 };
    expect(() => validateCampaignPatch(body, 'RASCUNHO')).toThrow(/unknownField/);
  });

  it('rejects id and userId and internal fields', () => {
    expect(() => validateCampaignPatch({ id: 'c1' }, 'RASCUNHO')).toThrow(/id/);
    expect(() => validateCampaignPatch({ userId: 'u1' }, 'RASCUNHO')).toThrow(/userId/);
    expect(() => validateCampaignPatch({ googleCampaignId: 'g1' }, 'RASCUNHO')).toThrow(/googleCampaignId/);
  });

  it('allows valid wizard fields', () => {
    const body = {
      name: 'Test',
      budgetDaily: 100,
      presellUrl: 'https://example.com',
      status: 'EM_TESTE',
    };
    const data = validateCampaignPatch(body, 'RASCUNHO');
    expect(data.name).toBe('Test');
    expect(data.budgetDaily).toBe(100);
    expect(data.presellUrl).toBe('https://example.com');
    expect(data.status).toBe('EM_TESTE');
  });

  it('enforces status transitions', () => {
    expect(() => validateCampaignPatch({ status: 'ATIVA' }, 'ARQUIVADA')).toThrow(/Transição de status inválida/);
    expect(() => validateCampaignPatch({ status: 'EM_TESTE' }, 'RASCUNHO')).not.toThrow();
  });
});
