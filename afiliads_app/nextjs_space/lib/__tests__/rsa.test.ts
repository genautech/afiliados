import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/llm', () => ({ callAgent: vi.fn() }));
vi.mock('../llm', () => ({ callAgent: vi.fn() }));
vi.mock('../compliance-judgments', () => ({ judgeAdCopyBrandBidding: vi.fn() }));

import { generateRsaCopy } from '../rsa';
import { callAgent } from '../llm';
import { judgeAdCopyBrandBidding } from '../compliance-judgments';

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

  it('não chama o gate de marca quando o vendor não proíbe termo nenhum', async () => {
    (callAgent as any).mockResolvedValue({ data: payload, text: '' });
    await generateRsaCopy('u1', { keyword: 'kw' });
    expect(judgeAdCopyBrandBidding).not.toHaveBeenCalled();
  });

  it('remove título que cita a marca proibida em variação de grafia', async () => {
    (callAgent as any).mockResolvedValue({
      data: { titles: ['Marca X Original', 'Compare Alternativas'], descriptions: ['Entenda como funciona.'] },
      text: '',
    });
    // Substring exata não pega "Marca X" quando o termo é "MarcaX" — o gate do adapter de
    // lançamento passaria batido; o julgamento pega.
    (judgeAdCopyBrandBidding as any).mockResolvedValue([
      { texto: 'Marca X Original', probability: 0.93, verdict: 'reprovou' },
      { texto: 'Compare Alternativas', probability: 0.02, verdict: 'passou' },
      { texto: 'Entenda como funciona.', probability: 0.01, verdict: 'passou' },
    ]);

    const r = await generateRsaCopy('u1', { keyword: 'kw', forbiddenTerms: ['MarcaX'] });
    expect(r.titles).toEqual(['Compare Alternativas']);
    expect(r.blockedByBrandGate).toEqual(['Marca X Original']);
    expect(r.warnings?.join()).toContain('brand bidding proibido');
    expect(r.descriptions).toEqual(['Entenda como funciona.']);
  });

  it("'incerto' também sai da lista (assimetria proposital)", async () => {
    (callAgent as any).mockResolvedValue({ data: { titles: ['Talvez Marca'], descriptions: ['d'] }, text: '' });
    (judgeAdCopyBrandBidding as any).mockResolvedValue([
      { texto: 'Talvez Marca', probability: 0.42, verdict: 'incerto' },
      { texto: 'd', probability: 0.01, verdict: 'passou' },
    ]);
    const r = await generateRsaCopy('u1', { keyword: 'kw', forbiddenTerms: ['Marca'] });
    expect(r.titles).toEqual([]);
    expect(r.blockedByBrandGate).toEqual(['Talvez Marca']);
  });

  it('sem julgamento disponível não remove nada — o gate do lançamento segue como barreira', async () => {
    (callAgent as any).mockResolvedValue({ data: { titles: ['MarcaX Oficial'], descriptions: ['d'] }, text: '' });
    (judgeAdCopyBrandBidding as any).mockResolvedValue(null);
    const r = await generateRsaCopy('u1', { keyword: 'kw', forbiddenTerms: ['MarcaX'] });
    expect(r.titles).toEqual(['MarcaX Oficial']);
    expect(r.blockedByBrandGate).toBeUndefined();
  });
});
