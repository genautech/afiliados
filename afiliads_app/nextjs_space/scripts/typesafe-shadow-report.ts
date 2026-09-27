/**
 * Relatório do modo sombra acumulado em produção (tabela JudgmentShadow).
 *
 * É este número — e não a medição em caso sintético dos outros três scripts — que autoriza
 * promover o julgamento de sombra para autoridade em cada escopo.
 *
 * Uso: npm run typesafe:report            (últimos 30 dias)
 *      npm run typesafe:report -- 7       (últimos 7 dias)
 */
import { prisma } from '../lib/prisma';

const dias = Number(process.argv[2] ?? 30);

type Row = {
  scope: string;
  item: string;
  heuristic: string;
  judgment: string;
  agrees: boolean;
  probability: number | null;
  contextId: string | null;
  note: string | null;
  createdAt: Date;
};

function pct(n: number, d: number) {
  return d === 0 ? '-' : `${((n / d) * 100).toFixed(0)}%`;
}

async function main() {
  const desde = new Date(Date.now() - dias * 24 * 3600_000);
  const rows = (await prisma.judgmentShadow.findMany({
    where: { createdAt: { gte: desde } },
    orderBy: { createdAt: 'desc' },
  })) as Row[];

  if (rows.length === 0) {
    console.log(`\nNenhuma comparação registrada nos últimos ${dias} dias.`);
    console.log('Confira se TYPESAFE_SHADOW=1 e TYPESAFE_API_KEY estão no ambiente e se houve');
    console.log('verificação de checklist, geração de presell ou análise de sales page no período.\n');
    return;
  }

  // Por escopo+item: onde o julgamento e a heurística discordam, e quanto.
  const porItem = new Map<string, { total: number; agrees: number; incertos: number }>();
  for (const r of rows) {
    const key = `${r.scope} / ${r.item}`;
    const acc = porItem.get(key) ?? { total: 0, agrees: 0, incertos: 0 };
    acc.total++;
    if (r.agrees) acc.agrees++;
    if (r.judgment === 'incerto' || r.judgment.includes('confiança baixa') || r.judgment.includes('conf.baixa')) acc.incertos++;
    porItem.set(key, acc);
  }

  console.log(`\n=== Modo sombra — últimos ${dias} dias (${rows.length} comparações) ===\n`);
  console.log(`${'escopo / item'.padEnd(42)} ${'n'.padStart(5)} ${'concorda'.padStart(9)} ${'incerto'.padStart(8)}`);
  console.log('-'.repeat(70));
  for (const [key, v] of [...porItem.entries()].sort((a, b) => b[1].total - a[1].total)) {
    console.log(`${key.padEnd(42)} ${String(v.total).padStart(5)} ${pct(v.agrees, v.total).padStart(9)} ${pct(v.incertos, v.total).padStart(8)}`);
  }

  // As divergências são o material de revisão: é aqui que se decide quem estava certo.
  const divergentes = rows.filter((r) => !r.agrees);
  console.log(`\n=== Divergências (${divergentes.length}) — revisar caso a caso ===\n`);
  for (const d of divergentes.slice(0, 40)) {
    const p = d.probability === null ? '' : ` p=${d.probability.toFixed(2)}`;
    console.log(`• [${d.scope}/${d.item}] heuristica=${d.heuristic} jev=${d.judgment}${p}`);
    if (d.contextId) console.log(`  ctx=${d.contextId}`);
    if (d.note) console.log(`  ${d.note.slice(0, 160)}`);
  }
  if (divergentes.length > 40) console.log(`  ... e mais ${divergentes.length - 40}.`);

  console.log('\n=== Leitura ===');
  console.log('  Concordância alta + zero incerto num item = candidato a promover o julgamento a');
  console.log('  autoridade nesse item. Divergência é onde a decisão muda: leia a amostra acima e');
  console.log('  veja quem acertou antes de trocar. Amostra pequena (n < 20) não decide nada.\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
