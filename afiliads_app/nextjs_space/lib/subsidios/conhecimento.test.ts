import { describe, expect, it } from 'vitest';
import { GLOSSARIO, MANUAL, AJUDA_CAMPOS } from '@/lib/generated/catalogo-conhecimento';
import { GLOSSARY, SYSTEM_MANUAL } from '@/lib/knowledge-data';
import { FIELD_HELP } from '@/app/(app)/wizard/_components/agent-help';

describe('catálogo de conhecimento', () => {
  it('o glossário exposto ao usuário vem do catálogo, sem perder termo', () => {
    expect(GLOSSARY).toHaveLength(GLOSSARIO.length);
    expect(GLOSSARY.map((g) => g.term).sort()).toEqual(GLOSSARIO.map((t) => t.termo).sort());
  });

  it('todo termo tem definição e motivo — glossário sem "por que importa" não ajuda ninguém', () => {
    for (const t of GLOSSARIO) {
      expect(t.definicao.length, `${t.termo} sem definição`).toBeGreaterThan(20);
      expect(t.por_que_importa.length, `${t.termo} sem por_que_importa`).toBeGreaterThan(20);
    }
  });

  it('o manual do sistema chega íntegro na página /conhecimento', () => {
    expect(SYSTEM_MANUAL).toHaveLength(MANUAL.length);
    expect(SYSTEM_MANUAL.map((s) => s.title)).toEqual(MANUAL.map((s) => s.titulo));
  });

  it('a ajuda de campo do wizard cobre os mesmos campos do catálogo', () => {
    expect(Object.keys(FIELD_HELP).sort()).toEqual(Object.keys(AJUDA_CAMPOS).sort());
  });

  it('cada campo de ajuda nomeia o agente responsável', () => {
    for (const [campo, a] of Object.entries(AJUDA_CAMPOS)) {
      expect(a.agente.length, `${campo} sem agente`).toBeGreaterThan(0);
      expect(a.como.length, `${campo} sem passo a passo`).toBeGreaterThan(20);
    }
  });
});
