// Adaptador: o glossário e o manual do sistema vivem em
// subsidios/catalogo/glossario.yaml e subsidios/catalogo/manual.yaml, e são
// compilados para lib/generated/catalogo-conhecimento.ts por `yarn subsidios:build`.
// Este arquivo existe só para manter os nomes que a página /conhecimento já usa.
import { GLOSSARIO, MANUAL } from '@/lib/generated/catalogo-conhecimento';

export interface GlossaryEntry {
  term: string;
  sigla?: string;
  categoria: 'google-ads' | 'afiliados';
  definition: string;
  whyItMatters: string;
}

export interface ManualSection {
  title: string;
  content: string;
}

export const GLOSSARY: GlossaryEntry[] = GLOSSARIO.map((t) => ({
  term: t.termo,
  ...(t.sigla ? { sigla: t.sigla } : {}),
  categoria: t.categoria,
  definition: t.definicao,
  whyItMatters: t.por_que_importa,
}));

export const SYSTEM_MANUAL: ManualSection[] = MANUAL.map((s) => ({
  title: s.titulo,
  content: s.conteudo,
}));
