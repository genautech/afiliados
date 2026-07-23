// Setup da plataforma multiusuário. Rode uma vez após `prisma db push`:
//   npx tsx --require dotenv/config scripts/setup-multiuser.ts
//
// 1. Promove o dono da plataforma (ADMIN_EMAIL ou genaujunior@gmail.com) a ADMIN.
// 2. Backfill de costUsd nos AgentRun antigos usando a tabela de preços atual.
//    keySource fica no default 'platform' — o histórico é todo do dono, então
//    não há cobrança retroativa a calcular entre usuários.
import { prisma } from '../lib/prisma';
import { estimateCostUsd } from '../lib/llm-pricing';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'genaujunior@gmail.com';

async function main() {
  const admin = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (admin) {
    await prisma.user.update({ where: { id: admin.id }, data: { role: 'ADMIN' } });
    console.log(`✔ ${ADMIN_EMAIL} promovido a ADMIN`);
  } else {
    console.warn(`⚠ Usuário ${ADMIN_EMAIL} não encontrado — crie a conta e rode de novo`);
  }

  const runs = await prisma.agentRun.findMany({
    where: { costUsd: 0, totalTokens: { gt: 0 } },
    select: { id: true, provider: true, model: true, promptTokens: true, completionTokens: true },
  });
  let updated = 0;
  for (const run of runs) {
    const costUsd = estimateCostUsd(run.provider, run.model, run.promptTokens, run.completionTokens);
    if (costUsd > 0) {
      await prisma.agentRun.update({ where: { id: run.id }, data: { costUsd } });
      updated++;
    }
  }
  console.log(`✔ Backfill de custo: ${updated}/${runs.length} execuções atualizadas`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
