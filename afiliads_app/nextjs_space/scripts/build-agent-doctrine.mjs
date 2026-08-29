#!/usr/bin/env node
// Lê frameworks/agentes-referencia/*.agent.md e gera lib/generated/agent-doctrine.ts.
// O runtime não pode ler frameworks/ (fica fora do bundle da Vercel), então a doutrina
// vira código gerado. Rode `yarn doctrine:build` depois de editar qualquer .agent.md;
// `yarn doctrine:check` falha se o gerado estiver defasado.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const SRC = join(here, '../../../frameworks/agentes-referencia');
const OUT = join(here, '../lib/generated/agent-doctrine.ts');

function parseFrontMatter(raw) {
  if (!raw.startsWith('---\n')) return { meta: {}, body: raw };
  const end = raw.indexOf('\n---\n', 4);
  if (end === -1) return { meta: {}, body: raw };
  const meta = {};
  let key = null;
  for (const line of raw.slice(4, end).split('\n')) {
    const item = line.match(/^\s+-\s+"?(.+?)"?\s*$/);
    if (item && key) { (meta[key] ||= []).push(item[1]); continue; }
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (!kv) continue;
    key = kv[1];
    const value = kv[2].trim();
    if (!value) { meta[key] = []; continue; }
    meta[key] = value.startsWith('[')
      ? value.slice(1, -1).split(',').map((s) => s.trim()).filter(Boolean)
      : value;
  }
  return { meta, body: raw.slice(end + 5) };
}

// Fatia o markdown em seções de nível 2, preservando o corpo de cada uma.
function sections(body) {
  const out = new Map();
  let title = null;
  let buffer = [];
  for (const line of body.split('\n')) {
    const h2 = line.match(/^##\s+(.+?)\s*$/);
    if (h2) {
      if (title) out.set(title, buffer.join('\n').trim());
      title = h2[1];
      buffer = [];
    } else if (title) {
      buffer.push(line);
    }
  }
  if (title) out.set(title, buffer.join('\n').trim());
  return out;
}

const agents = [];
for (const file of readdirSync(SRC).filter((f) => f.endsWith('.agent.md')).sort()) {
  const { meta, body } = parseFrontMatter(readFileSync(join(SRC, file), 'utf8'));
  if (!meta.id) throw new Error(`${file}: front-matter sem \`id\``);
  const found = sections(body);
  const wanted = Array.isArray(meta.doctrine) ? meta.doctrine : [];
  const missing = wanted.filter((t) => !found.has(t));
  if (missing.length) throw new Error(`${file}: seções declaradas e ausentes: ${missing.join(', ')}`);
  agents.push({
    id: meta.id,
    name: meta.name || meta.id,
    source: `frameworks/agentes-referencia/${file}`,
    binds: Array.isArray(meta.binds) ? meta.binds : [],
    doctrine: wanted.map((t) => ({ title: t, body: found.get(t) })),
  });
}

const banner = `// GERADO POR scripts/build-agent-doctrine.mjs — NÃO EDITE À MÃO.
// Fonte: frameworks/agentes-referencia/*.agent.md
`;
const body = `
export interface DoctrineSection {
  title: string;
  body: string;
}

export interface AgentDoctrine {
  id: string;
  name: string;
  /** Caminho do .agent.md de origem, relativo à raiz do repositório. */
  source: string;
  /** Ids de agentes de produto (lib/product-agents.ts) que herdam esta doutrina. */
  binds: string[];
  doctrine: DoctrineSection[];
}

export const AGENT_DOCTRINE: AgentDoctrine[] = ${JSON.stringify(agents, null, 2)};

/** Doutrina aplicável a um agente de produto, via \`binds\` do .agent.md. */
export function doctrineFor(agentId: string): AgentDoctrine[] {
  return AGENT_DOCTRINE.filter((d) => d.binds.includes(agentId));
}

/** Bloco pronto para concatenar num systemPrompt. Vazio quando não há doutrina ligada. */
export function doctrinePrompt(agentId: string): string {
  const parts: string[] = [];
  for (const doc of doctrineFor(agentId)) {
    for (const section of doc.doctrine) {
      parts.push(\`### \${section.title} (\${doc.name} — \${doc.source})\\n\${section.body}\`);
    }
  }
  if (!parts.length) return '';
  return \`\\n\\n## Doutrina herdada — obrigatória\\n\\nEstas regras vêm dos agentes de referência do repositório e prevalecem sobre sua própria inclinação. Se uma delas bloquear a tarefa, devolva a lacuna em \\\`gaps\\\` em vez de inventar saída.\\n\\n\${parts.join('\\n\\n')}\`;
}
`;
writeFileSync(OUT, banner + body);
console.log(`agent-doctrine.ts: ${agents.length} agentes, ${agents.reduce((n, a) => n + a.doctrine.length, 0)} seções`);
