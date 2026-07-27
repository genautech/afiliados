// Restringe este arquivo (e tudo que ele importa) ao runtime nodejs — sem isso, o Next.js
// também tenta empacotar register() pro runtime edge (por causa do middleware.ts existir no
// projeto), e módulos Node-only (fs/path, usados em lib/marketIntel.ts e lib/obsidianSync.ts
// pro sync com hermes/knowledge e Obsidian) quebram esse bundle em build ("Module not found").
export const runtime = 'nodejs';

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  await registerLoopScheduler();
  await registerMarketIntelScheduler();
}

async function registerLoopScheduler() {
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

// Fase 2 do aprendizado contínuo (inteligência de mercado): atualiza MarketIntelSnapshot
// semanalmente por produto com campanha ATIVA, sem depender de sessão manual. Independente do
// LOOP_SCHEDULER (pode estar ligado sem este, e vice-versa). Precisa de FIRECRAWL_API_KEY própria
// no .env — sem ela, cada tick só loga e não gasta crédito nenhum.
async function registerMarketIntelScheduler() {
  if (process.env.MARKET_INTEL_SCHEDULER !== 'on') {
    console.log('[market-intel-scheduler] desligado (MARKET_INTEL_SCHEDULER != on)');
    return;
  }
  const INTERVAL_DAYS = 7;
  const CHECK_MS = 6 * 3600 * 1000; // checa a cada 6h se já passou 1 semana desde a última rodada

  const g = globalThis as any;
  if (g.__afiliadsMarketIntelTimer) return;
  g.__afiliadsMarketIntelLastRun = 0;

  const tick = async () => {
    try {
      if (Date.now() - g.__afiliadsMarketIntelLastRun < INTERVAL_DAYS * 24 * 3600 * 1000) return;
      g.__afiliadsMarketIntelLastRun = Date.now();

      if (!process.env.FIRECRAWL_API_KEY) {
        console.log('[market-intel-scheduler] FIRECRAWL_API_KEY não configurada — pulando esta rodada');
        return;
      }

      const { prisma } = await import('./lib/prisma');
      const { collectMarketIntel } = await import('./lib/marketIntel');

      const activeCampaigns = await prisma.campaign.findMany({
        where: { status: 'ATIVA', productResearchId: { not: null } },
        select: { productResearchId: true },
        distinct: ['productResearchId'],
      });
      const productIds = Array.from(new Set(activeCampaigns.map((c) => c.productResearchId).filter(Boolean))) as string[];

      for (const pid of productIds) {
        try {
          const product = await prisma.productResearch.findUnique({ where: { id: pid } });
          if (!product) continue;
          let vendorDomain: string | undefined;
          try {
            if (product.vendorPageUrl) vendorDomain = new URL(product.vendorPageUrl).hostname;
          } catch { /* URL inválida — segue sem excluir domínio */ }

          await collectMarketIntel(product.userId, {
            productName: product.name,
            vertical: product.vertical,
            productId: product.id,
            vendorDomain,
          });
          console.log(`[market-intel-scheduler] snapshot atualizado — produto "${product.name}"`);
        } catch (e: any) {
          console.error(`[market-intel-scheduler] falhou pro produto ${pid}:`, e?.message);
        }
      }
      console.log(`[market-intel-scheduler] tick ok — ${productIds.length} produto(s) com campanha ativa`);
    } catch (e: any) {
      console.error('[market-intel-scheduler] erro no tick:', e?.message);
    }
  };

  g.__afiliadsMarketIntelTimer = setInterval(tick, CHECK_MS);
  console.log('[market-intel-scheduler] ligado — semanal por produto com campanha ativa');
  setTimeout(tick, 90 * 1000);
}
