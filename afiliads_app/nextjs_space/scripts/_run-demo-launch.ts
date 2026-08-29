import { prisma } from '../lib/prisma';
import { executeLaunch, getLaunchState } from '../lib/launch/orchestrator';

(async () => {
  const user = await prisma.user.findFirstOrThrow();
  const c = await prisma.campaign.findFirstOrThrow({ where: { userId: user.id, name: 'DEMO_PAINEL_LANCAMENTO' } });

  const r = await executeLaunch({
    userId: user.id, campaignId: c.id,
    idempotencyKey: 'demo-headless-1',
    requestMock: true, bypassReadiness: false,
  });

  console.log('--- LOGS ---');
  r.logs.forEach(l => console.log(' ', l));
  console.log('--- CANAIS ---');
  console.log(JSON.stringify(r.channels, null, 2));
  console.log('success =', r.success, '| replayed =', r.replayed, '| error =', r.error ?? '(nenhum)');

  console.log('\n--- REPLAY (mesma chave) ---');
  const again = await executeLaunch({
    userId: user.id, campaignId: c.id, idempotencyKey: 'demo-headless-1',
    requestMock: true, bypassReadiness: false,
  });
  console.log('replayed =', again.replayed, '| success =', again.success);

  console.log('\n--- GET state (o que o painel lê) ---');
  console.log(JSON.stringify(await getLaunchState(user.id, c.id), null, 2));
})().finally(() => prisma.$disconnect());
