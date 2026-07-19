export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (process.env.LOOP_SCHEDULER !== 'on') {
    console.log('[loop-scheduler] desligado (LOOP_SCHEDULER != on)');
    return;
  }
  // Cadência adaptativa: com campanha ATIVA roda de hora em hora; sem nenhuma
  // ativa (pré-lançamento) roda só 2×/dia para não gastar token à toa.
  const ACTIVE_INTERVAL_MIN = 60;
  const IDLE_INTERVAL_MIN = 720;
  const CHECK_MS = 15 * 60 * 1000;

  const g = globalThis as any;
  if (g.__afiliadsLoopTimer) return;
  g.__afiliadsLoopLastRun = 0;

  const tick = async () => {
    try {
      const { prisma } = await import('./lib/prisma');
      const activeCampaigns = await prisma.campaign.count({ where: { status: 'ATIVA' } });
      const intervalMin = activeCampaigns > 0 ? ACTIVE_INTERVAL_MIN : IDLE_INTERVAL_MIN;

      const override = await prisma.integration.findFirst({
        where: { serviceName: 'llm', fieldName: 'loop_interval_minutes' },
      });
      const effectiveMin = override?.fieldValue && !Number.isNaN(Number(override.fieldValue))
        ? Math.max(15, Number(override.fieldValue))
        : intervalMin;

      if (Date.now() - g.__afiliadsLoopLastRun < effectiveMin * 60 * 1000) return;
      g.__afiliadsLoopLastRun = Date.now();

      // 1) Puxa vendas reais do ClickBank para os DailyLogs (barato, sem LLM)
      try {
        const { syncClickbank } = await import('./lib/clickbank');
        const users = await prisma.user.findMany({ select: { id: true, email: true } });
        for (const u of users) {
          const r = await syncClickbank(u.id, 3);
          if (r.ok && r.matched.length > 0) {
            console.log(`[loop-scheduler] ClickBank sync ${u.email}: ${r.matched.length} dia(s)/campanha(s) atualizados`);
          }
        }
      } catch (e: any) {
        console.error('[loop-scheduler] ClickBank sync falhou:', e?.message);
      }

      // 2) Roda o loop de decisão nas campanhas devidas
      const { runDueLoops } = await import('./lib/loop-engine');
      const results = await runDueLoops('cron');
      if (results.length > 0) {
        console.log(`[loop-scheduler] ${results.length} campanha(s) processada(s):`, results.map(r => `${r.campaignName}→${r.decision}`).join(', '));
      }
      console.log(`[loop-scheduler] tick ok — próximo em ~${effectiveMin}min (${activeCampaigns} campanha(s) ativa(s))`);
    } catch (e: any) {
      console.error('[loop-scheduler] erro no tick:', e?.message);
    }
  };

  g.__afiliadsLoopTimer = setInterval(tick, CHECK_MS);
  console.log('[loop-scheduler] ligado — adaptativo (60min com campanha ativa, 12h pré-lançamento)');
  setTimeout(tick, 60 * 1000);
}
