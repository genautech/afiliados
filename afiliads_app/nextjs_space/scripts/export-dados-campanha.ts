// Ciclo de aprendizagem (Fase G): o resultado medido volta para os subsídios.
//
//   tsx scripts/export-dados-campanha.ts [--min-conv 30] [--dias 90]
//
// Lê DailyLog, agrega por vertical e grava subsidios/dados/cvr-por-vertical.yaml
// com o .origem.yaml exigido pelo gate de procedência. Não escreve no catálogo:
// promover um valor de heuristica-interna para dado-proprio é decisão revisada,
// e o script imprime o trecho exato a colar em subsidios/catalogo/verticais.yaml.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stringify } from 'yaml';
import { prisma } from '../lib/prisma';

const here = dirname(fileURLToPath(import.meta.url));
const dados = join(here, '../../../subsidios/dados');

const arg = (nome: string, padrao: number) => {
  const i = process.argv.indexOf(`--${nome}`);
  return i >= 0 ? Number(process.argv[i + 1]) : padrao;
};
const minConv = arg('min-conv', 30);
const dias = arg('dias', 90);

async function main() {
  const desde = new Date(Date.now() - dias * 86400_000);
  const logs = await prisma.dailyLog.groupBy({
    by: ['vertical'],
    where: { logDate: { gte: desde }, vertical: { not: null } },
    _sum: { clicks: true, conversions: true, spend: true, revenue: true },
    _count: { _all: true },
  });

  const linhas = logs
    .map((l) => {
      const clicks = l._sum.clicks ?? 0;
      const conv = l._sum.conversions ?? 0;
      const spend = l._sum.spend ?? 0;
      return {
        vertical: l.vertical as string,
        cvr_pct: clicks > 0 ? Number(((conv / clicks) * 100).toFixed(2)) : 0,
        cpc_real: clicks > 0 ? Number((spend / clicks).toFixed(2)) : 0,
        clicks,
        conversoes: conv,
        dias_com_dado: l._count._all,
        suficiente: conv >= minConv,
      };
    })
    .sort((a, b) => b.conversoes - a.conversoes);

  if (linhas.length === 0) {
    console.log('Nenhum DailyLog com vertical na janela. Nada a exportar.');
    return;
  }

  mkdirSync(dados, { recursive: true });
  const total = linhas.reduce((a, l) => a + l.conversoes, 0);
  const fim = new Date().toISOString().slice(0, 10);
  const ini = desde.toISOString().slice(0, 10);

  writeFileSync(join(dados, 'cvr-por-vertical.yaml'), stringify({
    schema: 1,
    janela: `${ini}..${fim}`,
    min_conversoes_para_promover: minConv,
    verticais: linhas,
  }));

  writeFileSync(join(dados, 'cvr-por-vertical.origem.yaml'), stringify({
    schema: 1,
    fonte: 'dado-proprio',
    conta: 'AfiliAds — DailyLog de todas as campanhas do banco',
    periodo: `${ini}..${fim}`,
    amostra: `${linhas.length} verticais, ${total} conversões`,
    responsavel: 'genau@yoobe.co',
    nota: `Gerado por scripts/export-dados-campanha.ts em ${fim}.`,
  }));

  console.log(`cvr-por-vertical.yaml gravado: ${linhas.length} verticais, ${total} conversões.\n`);

  const prontos = linhas.filter((l) => l.suficiente);
  if (prontos.length === 0) {
    console.log(`Nenhuma vertical alcançou ${minConv} conversões — o catálogo continua na heurística.`);
    return;
  }
  console.log(`Prontas para promover em subsidios/catalogo/verticais.yaml (≥ ${minConv} conversões):\n`);
  for (const l of prontos) {
    console.log(`  # ${l.vertical}`);
    console.log(`  cvr_default:`);
    console.log(`    valor: ${l.cvr_pct}`);
    console.log(`    origem: dado-proprio`);
    console.log(`    amostra: "${l.clicks} cliques, ${l.conversoes} conversões, ${ini}..${fim}"`);
    console.log(`    nota: "Medido em campanha própria; substitui a heurística inicial."\n`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
