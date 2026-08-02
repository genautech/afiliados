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

  it('registra o preço oficial sem cache do Kimi K2.7 Code', () => {
    expect(getModelPrice('kimi', 'kimi-k2.7-code')).toEqual({ inputPer1M: 0.95, outputPer1M: 4 });
    expect(estimateCostUsd('kimi', 'kimi-k2.7-code', 1_000_000, 1_000_000)).toBe(4.95);
  });

  it('não confunde Kimi K2.7 Code HighSpeed com a variante normal', () => {
    expect(getModelPrice('kimi', 'kimi-k2.7-code-highspeed')).toEqual({ inputPer1M: 1.9, outputPer1M: 8 });
    expect(estimateCostUsd('kimi', 'kimi-k2.7-code-highspeed', 1_000_000, 1_000_000)).toBe(9.9);
  });

  it('registra o preço oficial sem cache do Kimi K2.6', () => {
    expect(getModelPrice('kimi', 'kimi-k2.6')).toEqual({ inputPer1M: 0.95, outputPer1M: 4 });
    expect(estimateCostUsd('kimi', 'kimi-k2.6', 1_000_000, 1_000_000)).toBe(4.95);
  });
});
