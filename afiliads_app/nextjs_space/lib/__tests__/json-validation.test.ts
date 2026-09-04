import { describe, it, expect } from 'vitest';
import { parseAgentJson, validateJson } from '../json-validation';

describe('parseAgentJson', () => {
  it('parses plain JSON', () => {
    expect(parseAgentJson('{"a":1}')).toEqual({ a: 1 });
  });

  it('parses JSON dentro de cerca ```json', () => {
    expect(parseAgentJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it('parses JSON dentro de cerca sem linguagem', () => {
    expect(parseAgentJson('```\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it('parses JSON com texto ao redor', () => {
    expect(parseAgentJson('Claro! Segue:\n{"a":1}\nQualquer dúvida, avise.')).toEqual({ a: 1 });
  });

  it('parses array com texto ao redor', () => {
    expect(parseAgentJson('resultado: [1,2,3]')).toEqual([1, 2, 3]);
  });

  it('retorna null quando não há JSON', () => {
    expect(parseAgentJson('sem json aqui')).toBeNull();
  });
});

describe('validateJson', () => {
  it('aceita JSON em cerca (mesmo saneamento do parseAgentJson)', () => {
    expect(validateJson('```json\n{"a":1}\n```')).toBeNull();
  });

  it('reporta erro quando não é JSON', () => {
    expect(validateJson('texto solto')).toBeTruthy();
  });

  it('propaga erro do validate customizado', () => {
    expect(validateJson('{"a":1}', (d) => (d.b ? null : 'falta b'))).toBe('falta b');
  });
});
