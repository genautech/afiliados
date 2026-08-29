#!/usr/bin/env node
// Lê subsidios/catalogo/*.yaml, valida contra lib/subsidios/schema.ts e gera
// lib/generated/catalogo.ts. O app nunca lê YAML em runtime: no build da Vercel
// o diretório subsidios/ está fora do bundle. O módulo gerado é o contrato.
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { z } from 'zod';
// Roda sob tsx (script subsidios:build), então o contrato vem do próprio schema TS —
// não existe uma segunda cópia dele para sair de sincronia.
import { CatalogoVerticaisSchema, CatalogoOperacaoSchema, GlossarioSchema, ManualSchema, AjudaCamposSchema, OrigemDadoSchema, PlaybooksSchema } from '../lib/subsidios/schema';

const here = dirname(fileURLToPath(import.meta.url));
const app = join(here, '..');
const catalogo = join(app, '../../subsidios/catalogo');

function load<S extends z.ZodTypeAny>(file: string, schema: S): z.infer<S> {
  const raw = parse(readFileSync(join(catalogo, file), 'utf8'));
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    console.error(`\nsubsidios/catalogo/${file} não passou no contrato:\n`);
    for (const i of parsed.error.issues) console.error(`  ${i.path.join('.')}: ${i.message}`);
    process.exit(1);
  }
  return parsed.data!;
}

const verticais = load('verticais.yaml', CatalogoVerticaisSchema);
const operacao = load('operacao.yaml', CatalogoOperacaoSchema);
const glossario = load('glossario.yaml', GlossarioSchema);
const manual = load('manual.yaml', ManualSchema);
const ajuda = load('ajuda-campos.yaml', AjudaCamposSchema);
const playbooks = load('playbooks.yaml', PlaybooksSchema);

const j = (v: unknown) => JSON.stringify(v, null, 2).replace(/\n/g, '\n');

const out = `// GERADO por scripts/build-subsidios.ts a partir de subsidios/catalogo/*.yaml.
// Não edite à mão: edite o YAML e rode \`yarn subsidios:build\`.
// Cada valor carrega a procedência que o justifica — ver subsidios/catalogo/verticais.yaml.

export type Origem = 'heuristica-interna' | 'dado-proprio' | 'fonte-externa';
export type Confianca = 'baixa' | 'media' | 'alta';

/** Benchmark público que contextualiza o número sem ser a origem dele. */
export interface ReferenciaExterna {
  url: string;
  titulo: string;
  acessado_em: string;
  metrica: string;
  valor_citado: string;
  por_que_nao_substitui: string;
}

export interface Procedencia {
  origem: Origem;
  confianca: Confianca;
  nota?: string;
  amostra?: string;
  url?: string;
  revisar_em?: string;
  referencias?: ReferenciaExterna[];
}

export interface NumeroComProcedencia extends Procedencia { valor: number; unidade: string }
export interface ListaComProcedencia extends Procedencia { termos: string[] }
export interface KeywordsComProcedencia extends Procedencia { A: string[]; B: string[]; C: string[]; D: string[] }

export interface VerticalCatalogo {
  id: string;
  label: string;
  cvr_default: NumeroComProcedencia;
  keywords?: KeywordsComProcedencia;
  negativas: ListaComProcedencia;
}

export interface PlataformaCatalogo { id: string; tipo: string; integracao: string; nota?: string }
export interface CanalCatalogo { id: string; label: string; quando_usar: string }
export interface GeoCatalogo { id: string; label: string; nota?: string }
export interface CatalogoOperacao {
  schema: 1;
  atualizado_em: string;
  plataformas: PlataformaCatalogo[];
  canais: CanalCatalogo[];
  geos: GeoCatalogo[];
}

export const CATALOGO_VERTICAIS: { schema: 1; atualizado_em: string; verticais: VerticalCatalogo[] } =
  ${j(verticais)};

export const CATALOGO_OPERACAO: CatalogoOperacao = ${j(operacao)};

export const VERTICAIS: VerticalCatalogo[] = CATALOGO_VERTICAIS.verticais;

export function verticalPorLabel(label: string): VerticalCatalogo | null {
  return VERTICAIS.find((v) => v.label === label) ?? null;
}

/** Procedência de um valor, em texto curto para a UI mostrar ao lado do número. */
export function explicaProcedencia(p: Procedencia): string {
  let base: string;
  if (p.origem === 'dado-proprio') {
    base = 'medido em campanha própria' + (p.amostra ? ' (' + p.amostra + ')' : '');
  } else if (p.origem === 'fonte-externa') {
    base = 'fonte externa' + (p.url ? ' — ' + p.url : '');
  } else {
    base = 'estimativa interna, não medida';
  }
  return base + '; confiança ' + p.confianca;
}
`;

mkdirSync(join(app, 'lib/generated'), { recursive: true });
writeFileSync(join(app, 'lib/generated/catalogo.ts'), out);
console.log(`catalogo.ts gerado: ${verticais.verticais.length} verticais, ${operacao.plataformas.length} plataformas, ${operacao.canais.length} canais, ${operacao.geos.length} geos`);

// --- Segundo artefato: conhecimento exibido ao usuário. -----------------------
// Fica em arquivo separado porque o /conhecimento e o popover do wizard carregam
// muito texto e não precisam puxar o catálogo numérico junto.

const outConhecimento = `// GERADO por scripts/build-subsidios.ts a partir de subsidios/catalogo/*.yaml.
// Não edite à mão: edite glossario.yaml / manual.yaml / ajuda-campos.yaml e rode \`yarn subsidios:build\`.

export interface TermoGlossario {
  termo: string;
  sigla: string | null;
  categoria: 'google-ads' | 'afiliados';
  definicao: string;
  por_que_importa: string;
}

export interface SecaoManual { titulo: string; conteudo: string }

export interface AjudaCampo {
  campo: string;
  agente: string;
  o_que: string;
  por_que: string;
  como: string;
  ajuda_api_key?: string;
}

export const GLOSSARIO: TermoGlossario[] = ${j(glossario.termos)};

export const MANUAL: SecaoManual[] = ${j(manual.secoes)};

export const AJUDA_CAMPOS: Record<string, AjudaCampo> = ${j(
  Object.fromEntries(ajuda.campos.map((c) => [c.campo, c])),
)};

export type IconePlaybook = 'target' | 'grafico' | 'documento' | 'ideia' | 'checklist';

export interface SecaoPlaybook { titulo: string; conteudo: string }

export interface GrupoPlaybook {
  id: string;
  titulo: string;
  icone: IconePlaybook;
  secoes: SecaoPlaybook[];
}

export const PLAYBOOKS: GrupoPlaybook[] = ${j(playbooks.grupos)};

export const ERROS_COMUNS: string[] = ${j(playbooks.erros_comuns)};

export const PLAYBOOKS_ATUALIZADO_EM = ${JSON.stringify(playbooks.atualizado_em)};
`;

writeFileSync(join(app, 'lib/generated/catalogo-conhecimento.ts'), outConhecimento);
console.log(
  `catalogo-conhecimento.ts gerado: ${glossario.termos.length} termos, ` +
  `${manual.secoes.length} seções de manual, ${ajuda.campos.length} campos de ajuda, ` +
  `${playbooks.grupos.length} grupos de playbook (${playbooks.grupos.reduce((n, g) => n + g.secoes.length, 0)} seções), ` +
  `${playbooks.erros_comuns.length} erros comuns`,
);

// --- Gate de procedência dos dados de campanha (subsidios/dados/**). ---
const dadosDir = join(app, '../../subsidios/dados');
if (existsSync(dadosDir)) {
  const pendentes: string[] = [];
  const anda = (d: string) => {
    for (const nome of readdirSync(d)) {
      const p = join(d, nome);
      if (statSync(p).isDirectory()) { anda(p); continue; }
      if (!nome.endsWith('.yaml') || nome.endsWith('.origem.yaml')) continue;
      const irmao = p.replace(/\.yaml$/, '.origem.yaml');
      if (!existsSync(irmao)) { pendentes.push(`${p}: falta ${nome.replace(/\.yaml$/, '.origem.yaml')}`); continue; }
      const r = OrigemDadoSchema.safeParse(parse(readFileSync(irmao, 'utf8')));
      if (!r.success) {
        for (const i of r.error.issues) pendentes.push(`${irmao}: ${i.path.join('.') || '(raiz)'} — ${i.message}`);
      }
    }
  };
  anda(dadosDir);
  if (pendentes.length) {
    console.error('✗ dado sem procedência:');
    for (const p of pendentes) console.error('  ' + p);
    process.exit(1);
  }
}
