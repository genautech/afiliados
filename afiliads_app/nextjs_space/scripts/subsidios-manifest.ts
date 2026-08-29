// Manifesto de procedência dos subsídios (Fase F).
//
// Todo material que sustenta a criação de campanha — método, prompt de agente,
// catálogo, dado — precisa dizer de onde veio e continuar comprovando que não
// mudou por acidente. Este script grava e confere subsidios/_manifest.yaml.
//
//   tsx scripts/subsidios-manifest.ts --write   grava hashes atuais
//   tsx scripts/subsidios-manifest.ts           confere (exit 1 em divergência)
//
// Descoberta que motivou o formato: o git de ~/infoprod rastreia apenas
// prospera-public. Todo o corpo copiado para cá era arquivo solto, sem commit.
// Não existe SHA de origem para citar — então a procedência é o hash do
// conteúdo na data da importação, e a origem viva pode ser reconferida quando
// a máquina de origem está montada.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { parse, stringify } from 'yaml';

const REPO = resolve(__dirname, '../../..');
const MANIFEST = join(REPO, 'subsidios/_manifest.yaml');
const ORIGEM_REPO = '/Users/genautech/infoprod';

interface Unidade {
  destino: string;
  origem: string;
  natureza: string;
  nivel: 'metodo' | 'prompt' | 'catalogo' | 'dado' | 'template';
  arquivos: number;
  hash: string;
}

/** Hash estável de uma árvore: caminho relativo + conteúdo, em ordem. */
function hashArvore(dir: string): { hash: string; arquivos: number } {
  const arquivos: string[] = [];
  const anda = (d: string) => {
    for (const nome of readdirSync(d).sort()) {
      if (nome === '.DS_Store' || nome === 'node_modules' || nome === '.git') continue;
      const p = join(d, nome);
      if (statSync(p).isDirectory()) anda(p);
      else arquivos.push(p);
    }
  };
  if (statSync(dir).isDirectory()) anda(dir);
  else arquivos.push(dir);

  const h = createHash('sha256');
  for (const p of arquivos.sort()) {
    h.update(relative(dir, p));
    h.update('\0');
    h.update(createHash('sha256').update(readFileSync(p)).digest('hex'));
    h.update('\n');
  }
  return { hash: `sha256:${h.digest('hex')}`, arquivos: arquivos.length };
}

/** Unidades declaradas. Acrescentar aqui é obrigatório ao importar coisa nova. */
const DECLARADAS: Array<Omit<Unidade, 'arquivos' | 'hash'>> = [
  { destino: 'frameworks/ebook-os', origem: 'infoprod/frameworks/prospera-ebook-os',
    natureza: 'Schemas de produção e validador (product-brief, claim-ledger, experiment-card, RACI)', nivel: 'metodo' },
  { destino: 'frameworks/agentes-referencia', origem: 'infoprod/.agents/agents',
    natureza: 'Definições de agente em prosa; fonte da doutrina injetada nos prompts', nivel: 'prompt' },
  { destino: 'frameworks/human-dna', origem: 'infoprod/protegido-ai-assistant/frameworks/Human DNA',
    natureza: 'Método de extração de DNA de marca a partir de fontes reais', nivel: 'metodo' },
  { destino: 'frameworks/human-carousel', origem: 'infoprod/protegido-ai-assistant/frameworks/Human Carroussel',
    natureza: 'Método de carrossel social', nivel: 'metodo' },
  { destino: 'frameworks/human-images', origem: 'infoprod/protegido-ai-assistant/frameworks/Human Images',
    natureza: 'Direção de imagem e prompt de geração', nivel: 'metodo' },
  { destino: 'frameworks/human-motion', origem: 'infoprod/protegido-ai-assistant/frameworks/Human Motion',
    natureza: 'Vídeo curto e motion', nivel: 'metodo' },
  { destino: 'frameworks/human-social', origem: 'infoprod/protegido-ai-assistant/frameworks/Human Social',
    natureza: 'Distribuição social', nivel: 'metodo' },
  { destino: 'frameworks/human-cinematic', origem: 'infoprod/protegido-ai-assistant/frameworks/Human Cinematic',
    natureza: 'Peça cinematográfica', nivel: 'metodo' },
  { destino: 'frameworks/human-skills', origem: 'infoprod/protegido-ai-assistant/frameworks/Skills',
    natureza: 'Engine de skills', nivel: 'metodo' },
  { destino: '.claude/skills', origem: 'infoprod/.agents/skills',
    natureza: 'Skills de produção de peça, com prefixo afiliads-', nivel: 'prompt' },
  { destino: 'subsidios/catalogo', origem: 'afiliados/lib/wizard-data.ts + lib/knowledge-data.ts (extração local)',
    natureza: 'Verticais, operação, glossário, manual e ajuda de campo, com procedência por valor', nivel: 'catalogo' },
  { destino: 'brandkit', origem: 'afiliados (criado aqui, em branco)',
    natureza: 'Template de identidade por campanha; nunca contém marca de terceiro', nivel: 'template' },
  { destino: 'research/youtube-lowticket-2026-08-26', origem: 'YouTube (URLs citadas no README da pasta)',
    natureza: 'Transcrições e insights de fonte externa, com âncora', nivel: 'dado' },
];

function coletar(): Unidade[] {
  return DECLARADAS.map((d) => {
    const abs = join(REPO, d.destino);
    if (!existsSync(abs)) {
      console.error(`✗ unidade declarada não existe no disco: ${d.destino}`);
      process.exit(1);
    }
    const { hash, arquivos } = hashArvore(abs);
    return { ...d, arquivos, hash };
  });
}

const escrever = process.argv.includes('--write');
const unidades = coletar();

if (escrever) {
  const doc = {
    schema: 1,
    gerado_em: new Date().toISOString().slice(0, 10),
    origem_repo: {
      path: ORIGEM_REPO,
      versionado: false,
      nota: 'O git de ~/infoprod rastreia apenas prospera-public. O corpo copiado era arquivo solto, sem commit — não há SHA de origem. A procedência é o hash do conteúdo abaixo.',
    },
    regra: 'Toda unidade precisa estar declarada em scripts/subsidios-manifest.ts. Mudou o conteúdo? rode `yarn subsidios:manifest` e revise o diff do hash no PR.',
    unidades,
  };
  writeFileSync(MANIFEST, stringify(doc));
  console.log(`_manifest.yaml gravado: ${unidades.length} unidades, ${unidades.reduce((a, u) => a + u.arquivos, 0)} arquivos`);
  process.exit(0);
}

if (!existsSync(MANIFEST)) {
  console.error('✗ subsidios/_manifest.yaml não existe. Rode `yarn subsidios:manifest`.');
  process.exit(1);
}

const atual = parse(readFileSync(MANIFEST, 'utf8')) as { unidades: Unidade[] };
const porDestino = new Map(atual.unidades.map((u) => [u.destino, u]));
let falhas = 0;

for (const u of unidades) {
  const gravada = porDestino.get(u.destino);
  if (!gravada) {
    console.error(`✗ ${u.destino}: não está no manifesto gravado`);
    falhas++;
    continue;
  }
  if (gravada.hash !== u.hash) {
    console.error(`✗ ${u.destino}: conteúdo mudou sem atualizar o manifesto`);
    console.error(`  gravado: ${gravada.hash}`);
    console.error(`  disco:   ${u.hash}`);
    falhas++;
  }
  porDestino.delete(u.destino);
}
for (const orfa of porDestino.keys()) {
  console.error(`✗ ${orfa}: está no manifesto mas não é mais declarada no script`);
  falhas++;
}

if (falhas > 0) {
  console.error(`\n${falhas} divergência(s). Se a mudança é intencional, rode \`yarn subsidios:manifest\` e commite o diff.`);
  process.exit(1);
}
console.log(`✓ manifesto confere: ${unidades.length} unidades, ${unidades.reduce((a, u) => a + u.arquivos, 0)} arquivos`);
