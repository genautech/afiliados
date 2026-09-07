import { confirmLoopPause } from './google-ads/loop-pause';
import { reconcileCampaignStatus } from './google-ads/reconcile-status';
import { syncCampaignSpend } from './google-ads/spend-sync';
import type { SpendCoverage } from './spend-coverage';
import { prisma } from './prisma';
import { callAgent } from './llm';
import { computeEconomics, evaluateRules, type RulesResult, type CampaignEconomics } from './campaign-rules';

/** Janela de performance (CPC/EPC/CVR). O orçamento acumulado ignora esta janela. */
export const PERFORMANCE_WINDOW_DAYS = 14;

const INTERVAL_MS: Record<string, number> = {
  '12h': 12 * 3600_000,
  '24h': 24 * 3600_000,
  '48h': 48 * 3600_000,
  '72h': 72 * 3600_000,
};

export interface LoopRunResult {
  campaignId: string;
  campaignName: string;
  decision: string;
  triggers: string[];
  agentsRun: string[];
  totalTokens: number;
  llmSummary: string | null;
  error: string | null;
  loopRunId: string;
}

export async function runCampaignLoop(userId: string, campaignId: string, trigger: 'manual' | 'cron' | 'daily-log'): Promise<LoopRunResult> {
  // A05: o `take: 14` fazia o burn de orçamento enxergar só os últimos 14 dias. Campanha de
  // 30 dias a $5/dia mostrava $70 gastos de um budget de teste de $100 — nunca batia 100% e
  // nunca pausava, mesmo tendo gasto $150. Orçamento é acumulado desde o lançamento; janela
  // deslizante vale só para as métricas de performance (CPC/EPC/CVR).
  let campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, userId },
    include: { dailyLogs: { orderBy: { logDate: 'desc' } } },
  });
  if (!campaign) throw new Error('Campanha não encontrada');

  // A01/A02: antes de decidir qualquer coisa, resolve pendência de confirmação remota. Sem
  // isso o loop opera sobre um status que o Google Ads nunca confirmou — e uma campanha que
  // subiu PAUSED apareceria como candidata a SCALE.
  const reconciliacao = await reconcileCampaignStatus(userId, campaign);
  if (reconciliacao.reconciliado) {
    campaign = {
      ...campaign,
      status: reconciliacao.status,
      loopEnabled: reconciliacao.loopEnabled ?? campaign.loopEnabled,
    };
    // Campanha confirmada parada não recebe loop de otimização: só a checagem de compliance.
    if (campaign.status === 'PAUSADA') return runComplianceOnlyCheck(userId, campaignId);
  }

  let pendingPause: 'KILL' | 'PAUSAR' | null = null;
  if (campaign.loopEnabled && campaign.googleCampaignId) {
    const previous = await prisma.campaignDecision.findFirst({
      where: { userId, campaignId, decision: { in: ['AUTO_PAUSE_PENDING', 'AUTO_PAUSE_CONFIRMED'] } },
      orderBy: { createdAt: 'desc' },
    });
    if (previous?.decision === 'AUTO_PAUSE_PENDING') {
      try {
        const intent = JSON.parse(previous.rationale || '{}');
        if (intent.googleCampaignId === campaign.googleCampaignId && ['KILL','PAUSADO'].includes(intent.target)) pendingPause = intent.target === 'KILL' ? 'KILL' : 'PAUSAR';
      } catch { /* Sem contrato de intenção válido, não executa uma mutação por inferência. */ }
    }
  }

  let spendCoverage: SpendCoverage | null = null;
  let spendSyncError: string | null = null;
  if (campaign.googleCampaignId) {
    try {
      const synced = await syncCampaignSpend(userId, campaignId);
      spendCoverage = synced.coverage;
      const refreshed = await prisma.campaign.findFirst({
        where: { id: campaignId, userId }, include: { dailyLogs: { orderBy: { logDate: 'desc' } } },
      });
      if (!refreshed) throw new Error('Campanha indisponível após sync');
      campaign = refreshed;
    } catch (error) {
      spendCoverage = null;
      spendSyncError = error instanceof Error ? error.message : 'Falha na ingestão de gasto';
    }
  }

  const econ = computeEconomics(campaign, campaign.dailyLogs, {
    performanceWindowDays: PERFORMANCE_WINDOW_DAYS,
    spendCoverage,
  });
  const rules: RulesResult = evaluateRules(econ, campaign);

  const agentsRun: string[] = [];
  let totalTokens = 0;
  let llmSummary: string | null = null;
  let error: string | null = spendSyncError;
  let finalDecision = pendingPause ?? rules.decision;
  const allTriggers = [...rules.triggers];

  const needsLlm = !['SEM_DADOS', 'CONFIG_INCOMPLETA', 'PAUSAR', 'KILL'].includes(finalDecision);
  const wanted = (campaign.loopAgents ?? 'ads').split(',').map((s) => s.trim()).filter(Boolean);

  if (needsLlm) {
    if (wanted.includes('ads')) {
      try {
        const res = await callAgent(userId, {
          agent: 'ads-auditor',
          json: true,
          campaignId: campaign.id,
          campaignTarget: { kind: 'campaign', campaignId: campaign.id },
          systemPrompt: `Você é o Paid Ads Auditor do AfiliAds rodando dentro do loop de auto-correção. A decisão pelas REGRAS OFICIAIS (já calculadas em código) foi \"${rules.decision}\". Seu papel: confirmar ou contestar com base nos números, e listar ajustes concretos. Você NÃO pode inventar métricas — use apenas as fornecidas. Responda APENAS JSON válido.`,
          userPrompt: `Campanha: ${campaign.name} (${campaign.platform}, ${campaign.vertical}, funil ${campaign.funnel}).\n[INFO GOOGLE ADS]: O orçamento diário ($${campaign.budgetDaily}), estratégia de lances (\"${campaign.bidStrategy || 'não configurada'}\") e status de ativação foram importados e sincronizados via API do Google Ads, representando o estado real da conta de anúncios.\nEconomia calculada (últimos ${econ.logCount} registros): gasto $${econ.spend.toFixed(2)}, receita bruta $${econ.revenue.toFixed(2)}, reembolso $${econ.refunds.toFixed(2)}, receita líquida $${econ.revenueNet.toFixed(2)}, lucro $${econ.profit.toFixed(2)}, ${econ.clicks} cliques, ${econ.hops} hops (passagem presell→oferta ${econ.hopRatePct.toFixed(0)}%), ${econ.conversions} conversões, EPC líquido $${econ.epcReal.toFixed(2)}, CPC real $${econ.cpcReal.toFixed(2)}, CVR ${econ.cvrRealPct.toFixed(2)}%, burn ${econ.budgetBurnPct.toFixed(0)}% do budget de teste.\nReferência da campanha: comissão líquida $${campaign.commissionNet}, EPC break-even $${campaign.epcBreakeven}, CPC máx $${campaign.cpcMax}, CPC scale $${campaign.cpcScale}.\nDecisão das regras: ${rules.decision} — gatilhos: ${rules.triggers.join(' | ')}\nRetorne JSON: {\"concorda\": true|false, \"decisao_sugerida\": \"SCALE|OTIMIZAR|PAUSAR|KILL|CONTINUAR\", \"diagnostico\": \"2-3 frases\", \"ajustes\": [\"até 4 ações concretas priorizadas\"]}`,
        });
        agentsRun.push('ads-auditor');
        totalTokens += (res.usage.totalTokens ?? 0);
        if (res.data) {
          llmSummary = `${res.data.diagnostico ?? ''}${Array.isArray(res.data.ajustes) ? '\nAjustes: ' + res.data.ajustes.join('; ') : ''}`.trim();
          if (res.data.concorda === false && typeof res.data.decisao_sugerida === 'string') {
            allTriggers.push(`Auditor divergiu das regras: sugeriu ${res.data.decisao_sugerida} — mantida a decisão das regras (${rules.decision}), revisar manualmente`);
          }
        }
      } catch (e: any) {
        error = `ads-auditor: ${e?.message}`;
      }
    }

    if (wanted.includes('compliance') && campaign.presellUrl) {
      try {
        const page = await fetch(campaign.presellUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, cache: 'no-store' });
        if (page.ok) {
          const html = (await page.text())
            .replace(/<script[\s\S]*?<\/script>/gi, ' ')
            .replace(/<style[\s\S]*?<\/style>/gi, ' ')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .slice(0, 10000);
          const res = await callAgent(userId, {
            agent: 'compliance-sentinel',
            json: true,
            campaignId: campaign.id,
            campaignTarget: { kind: 'campaign', campaignId: campaign.id },
            systemPrompt: 'Você é o Compliance Sentinel do AfiliAds no loop de auto-correção. Audite o texto REAL da presell contra políticas do Google Ads (claims de cura/renda, urgência falsa, depoimentos proibidos). Responda APENAS JSON válido.',
            userPrompt: `Presell da campanha ${campaign.name} (${campaign.presellUrl}):\n\"\"\"${html}\"\"\"\nRetorne JSON: {\"aprovado\": true|false, \"alertas\": [{\"nivel\": \"critico|atencao\", \"texto\": \"...\"}]}`,
          });
          agentsRun.push('compliance-sentinel');
          totalTokens += (res.usage.totalTokens ?? 0);
          const criticos = (res.data?.alertas ?? []).filter((a: any) => a?.nivel === 'critico');
          if (criticos.length > 0) {
            allTriggers.push(`Compliance: ${criticos.length} alerta(s) crítico(s) na presell — ${criticos.map((a: any) => a.texto).join(' | ')}`);
            if (finalDecision === 'CONTINUAR' || finalDecision === 'SCALE') finalDecision = 'OTIMIZAR';
          }
        } else {
          allTriggers.push(`Presell inacessível (HTTP ${page.status}) em ${campaign.presellUrl} — verificar hospedagem`);
        }
      } catch (e: any) {
        allTriggers.push(`Presell inacessível (${e?.message}) — verificar hospedagem/URL`);
      }
    }
  }

  // Persistência: decisão + status + histórico
  const shouldPersistDecision = !['CONTINUAR', 'SEM_DADOS', 'CONFIG_INCOMPLETA'].includes(finalDecision);
  if (shouldPersistDecision) {
    await prisma.campaignDecision.create({
      data: {
        campaignId: campaign.id,
        userId,
        decision: finalDecision,
        rationale: `[loop:${trigger}] ${allTriggers.join(' | ')}${llmSummary ? `\nAuditor: ${llmSummary}` : ''}`,
      },
    });
    // Registro Kill/Scale: alimenta a planilha de testes e a aba Aprendizados
    await prisma.testResult.upsert({
      where: { userId_testId: { userId, testId: `LOOP-${campaign.name}` } },
      update: {
        result: finalDecision,
        actualSpend: econ.spend,
        conversions: econ.conversions,
        revenue: econ.revenueNet,
        epc: econ.epcReal,
        avgCpc: econ.cpcReal,
        breakevenCpc: campaign.cpcMax,
        learning: allTriggers.join(' | '),
        nextStep: llmSummary?.slice(0, 500) ?? null,
        endDate: new Date(),
      },
      create: {
        userId,
        testId: `LOOP-${campaign.name}`,
        campaignId: campaign.id,
        network: campaign.platform,
        offerName: campaign.name,
        hypothesis: `Teste com budget $${campaign.budgetTest} — regras do loop`,
        budgetTest: campaign.budgetTest,
        actualSpend: econ.spend,
        conversions: econ.conversions,
        revenue: econ.revenueNet,
        epc: econ.epcReal,
        avgCpc: econ.cpcReal,
        breakevenCpc: campaign.cpcMax,
        result: finalDecision,
        learning: allTriggers.join(' | '),
        nextStep: llmSummary?.slice(0, 500) ?? null,
        startDate: campaign.launchedAt ?? campaign.createdAt,
        endDate: new Date(),
      },
    }).catch((e) => console.error('TestResult upsert error:', e?.message));
  }
  // A decisão de segurança é uma intenção. Só a releitura remota confirma o estado local.
  if (finalDecision === 'KILL' || finalDecision === 'PAUSAR') {
    try {
      await confirmLoopPause(userId, campaign, finalDecision === 'KILL' ? 'KILL' : 'PAUSADO');
      allTriggers.push('Pausa confirmada remotamente no Google Ads');
    } catch (pauseError) {
      const message = pauseError instanceof Error ? pauseError.message : 'Falha ao confirmar pausa';
      error = [error, `Pausa pendente: ${message}`].filter(Boolean).join(' | ');
      allTriggers.push(`Pausa não confirmada: ${message}`);
      // Mantém o status e a cadência anterior, permitindo reconciliar na próxima varredura.
    }
  } else {
    await prisma.campaign.update({ where: { id: campaign.id }, data: { lastLoopRunAt: new Date() } });
  }

  const loopRun = await prisma.loopRun.create({
    data: {
      campaignId: campaign.id,
      userId,
      trigger,
      decision: finalDecision,
      triggers: allTriggers,
      agentsRun,
      economics: econ as any,
      llmSummary,
      totalTokens,
      error,
    },
  });

  return {
    campaignId: campaign.id,
    campaignName: campaign.name,
    decision: finalDecision,
    triggers: allTriggers,
    agentsRun,
    totalTokens: (totalTokens ?? 0),
    llmSummary,
    error,
    loopRunId: loopRun.id,
  };
}

// Campanha PAUSADA não gera gasto de ads pra auditar nem deve ter status flipado
// automaticamente (SCALE/KILL/PAUSAR), mas a presell pode continuar publicada
// acumulando risco de compliance sem ninguém olhar. Roda só o compliance-sentinel,
// nunca ads-auditor, e nunca mexe em status/Google Ads.
export async function runComplianceOnlyCheck(userId: string, campaignId: string): Promise<LoopRunResult> {
  const campaign = await prisma.campaign.findFirst({ where: { id: campaignId, userId } });
  if (!campaign) throw new Error('Campanha não encontrada');

  const agentsRun: string[] = [];
  let totalTokens = 0;
  let error: string | null = null;
  let finalDecision = 'CONTINUAR';
  const allTriggers: string[] = [];

  if (campaign.presellUrl) {
    try {
      const page = await fetch(campaign.presellUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, cache: 'no-store' });
      if (page.ok) {
        const html = (await page.text())
          .replace(/<script[\s\S]*?<\/script>/gi, ' ')
          .replace(/<style[\s\S]*?<\/style>/gi, ' ')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .slice(0, 10000);
        const res = await callAgent(userId, {
          agent: 'compliance-sentinel',
          json: true,
          campaignId: campaign.id,
          campaignTarget: { kind: 'campaign', campaignId: campaign.id, purpose: 'paused-compliance' },
          systemPrompt: 'Você é o Compliance Sentinel do AfiliAds verificando uma campanha PAUSADA (sem gasto de ads ativo, mas a presell pode continuar publicada e acessível). Audite o texto REAL da presell contra políticas do Google Ads (claims de cura/renda, urgência falsa, depoimentos proibidos). Responda APENAS JSON válido.',
          userPrompt: `Presell da campanha ${campaign.name} (${campaign.presellUrl}) — campanha está PAUSADA, este é um check de compliance de rotina, não uma auditoria de ads:\n\"\"\"${html}\"\"\"\nRetorne JSON: {\"aprovado\": true|false, \"alertas\": [{\"nivel\": \"critico|atencao\", \"texto\": \"...\"}]}`,
        });
        agentsRun.push('compliance-sentinel');
        totalTokens += (res.usage.totalTokens ?? 0);
        const criticos = (res.data?.alertas ?? []).filter((a: any) => a?.nivel === 'critico');
        if (criticos.length > 0) {
          allTriggers.push(`Compliance (campanha pausada): ${criticos.length} alerta(s) crítico(s) na presell — ${criticos.map((a: any) => a.texto).join(' | ')}`);
          finalDecision = 'OTIMIZAR';
        }
      } else {
        allTriggers.push(`Presell inacessível (HTTP ${page.status}) em ${campaign.presellUrl} — verificar hospedagem`);
      }
    } catch (e: any) {
      allTriggers.push(`Presell inacessível (${e?.message}) — verificar hospedagem/URL`);
      error = `compliance-sentinel: ${e?.message}`;
    }
  }

  if (finalDecision !== 'CONTINUAR') {
    await prisma.campaignDecision.create({
      data: {
        campaignId: campaign.id,
        userId,
        decision: finalDecision,
        rationale: `[loop:cron-paused] ${allTriggers.join(' | ')}`,
      },
    });
  }

  await prisma.campaign.update({ where: { id: campaign.id }, data: { lastLoopRunAt: new Date() } });

  const loopRun = await prisma.loopRun.create({
    data: {
      campaignId: campaign.id,
      userId,
      trigger: 'cron',
      decision: finalDecision,
      triggers: allTriggers,
      agentsRun,
      economics: {} as any,
      llmSummary: null,
      totalTokens: (totalTokens ?? 0),
      error,
    },
  });

  return {
    campaignId: campaign.id,
    campaignName: campaign.name,
    decision: finalDecision,
    triggers: allTriggers,
    agentsRun,
    totalTokens: (totalTokens ?? 0),
    llmSummary: null,
    error,
    loopRunId: loopRun.id,
  };
}

/**
 * Alcance de uma varredura de loops. É obrigatório e explícito de propósito: a versão anterior
 * de runDueLoops varria as campanhas de TODOS os usuários e a rota autenticada
 * /api/loop/run chamava ela sem userId — qualquer usuário logado disparava o loop (e as
 * pausas automáticas no Google Ads) nas campanhas de todo mundo. Sem valor default aqui,
 * nenhum chamador consegue cair no escopo global sem escrever isso.
 */
export type LoopScope =
  | { kind: 'user'; userId: string }
  | { kind: 'all-users'; reason: string };

export async function runDueLoops(
  trigger: 'cron' | 'manual',
  scope: LoopScope,
): Promise<LoopRunResult[]> {
  const now = Date.now();
  if (scope.kind === 'user' && !scope.userId) {
    throw new Error('runDueLoops: escopo de usuário exige userId');
  }
  const candidates = await prisma.campaign.findMany({
    where: {
      loopEnabled: true,
      status: { notIn: ['KILL'] },
      ...(scope.kind === 'user' ? { userId: scope.userId } : {}),
    },
    select: { id: true, userId: true, loopInterval: true, lastLoopRunAt: true, status: true },
  });
  const due = candidates.filter((c) => {
    const interval = INTERVAL_MS[c.loopInterval] ?? INTERVAL_MS['24h'];
    return !c.lastLoopRunAt || now - c.lastLoopRunAt.getTime() >= interval;
  });
  const results: LoopRunResult[] = [];
  for (const c of due) {
    try {
      results.push(
        c.status === 'PAUSADO' || c.status === 'PAUSADA'
          ? await runComplianceOnlyCheck(c.userId, c.id)
          : await runCampaignLoop(c.userId, c.id, trigger)
      );
    } catch (e: any) {
      console.error(`Loop error campaign ${c.id}:`, e?.message);
    }
  }
  return results;
}
