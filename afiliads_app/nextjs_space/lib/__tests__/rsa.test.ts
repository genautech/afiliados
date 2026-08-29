import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/llm', () => ({ callAgent: vi.fn() }));
vi.mock('../llm', () => ({ callAgent: vi.fn() }));

import { generateRsaCopy } from '../rsa';
import { callAgent } from '../llm';

const payload = {
  titles: ['Título curto'],
  descriptions: ['Uma descrição dentro do limite de noventa caracteres.'],
  warnings: [],
};

describe('generateRsaCopy', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('pede JSON ao callAgent — sem isso data volta como texto cru', async () => {
    (callAgent as any).mockResolvedValue({ data: payload, text: JSON.stringify(payload) });
    await generateRsaCopy('u1', { keyword: 'kw' });
    expect(callAgent).toHaveBeenCalledWith('u1', expect.objectContaining({ json: true }));
  });

  it('devolve objeto com arrays, não string', async () => {
    (callAgent as any).mockResolvedValue({ data: payload, text: '' });
    const r = await generateRsaCopy('u1', { keyword: 'kw' });
    expect(Array.isArray(r.titles)).toBe(true);
    expect(r.titles[0]).toBe('Título curto');
  });

  it('parseia se o provider ainda devolver string', async () => {
    (callAgent as any).mockResolvedValue({ data: JSON.stringify(payload), text: '' });
    const r = await generateRsaCopy('u1', { keyword: 'kw' });
    expect(r.descriptions).toHaveLength(1);
  });

  it('erro do LLM vira warnings com o motivo, e listas vazias', async () => {
    (callAgent as any).mockRejectedValue(new Error('quota estourada'));
    const r = await generateRsaCopy('u1', { keyword: 'kw' });
    expect(r.titles).toEqual([]);
    expect(r.warnings?.join()).toContain('quota estourada');
  });

  it('trunca título acima de 30 chars e avisa', async () => {
    (callAgent as any).mockResolvedValue({
      data: { titles: ['x'.repeat(40)], descriptions: ['d'] }, text: '',
    });
    const r = await generateRsaCopy('u1', { keyword: 'kw' });
    expect(r.titles[0]).toHaveLength(30);
    expect(r.warnings?.join()).toContain('truncado');
  });
});
