// M01 — TEST_SALE/TEST_BILL não podem virar receita real no diário.
import { describe, expect, it } from 'vitest';
import { isTestTransaction, TEST_TXN_TYPES } from './clickbank';

describe('M01 — transações de teste do ClickBank', () => {
  it('reconhece os tipos de teste documentados', () => {
    for (const t of ['TEST_SALE', 'TEST_BILL', 'TEST_REBILL', 'TEST_RFND']) {
      expect(isTestTransaction(t), t).toBe(true);
      expect(TEST_TXN_TYPES.has(t)).toBe(true);
    }
  });

  it('reconhece qualquer TEST_* futuro pelo prefixo', () => {
    expect(isTestTransaction('TEST_UPSELL')).toBe(true);
  });

  it('não confunde transação real com teste', () => {
    for (const t of ['SALE', 'BILL', 'RFND', 'CGBK', 'INSF', 'REBILL']) {
      expect(isTestTransaction(t), t).toBe(false);
    }
  });
});
