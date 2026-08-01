import { describe, expect, it } from 'vitest';
import { estimateCostUsd, getModelPrice } from './llm-pricing';

describe('preços Kimi', () => {
  it('registra o preço oficial sem cache do Kimi K3', () => {
    expect(getModelPrice('kimi', 'kimi-k3')).toEqual({ inputPer1M: 3, outputPer1M: 15 });
  });

  it('registra o preço oficial sem cache do Kimi K2.5', () => {
    expect(getModelPrice('kimi', 'kimi-k2.5')).toEqual({ inputPer1M: 0.6, outputPer1M: 3 });
    expect(estimateCostUsd('kimi', 'kimi-k2.5', 1_000_000, 1_000_000)).toBe(3.6);
  });
});
