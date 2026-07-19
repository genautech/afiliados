import { prisma } from './prisma';
import { callAgent } from './llm';
import { computeEconomics, evaluateRules, type RulesResult, type CampaignEconomics } from './campaign-rules';

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
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, userId },
    include: { dailyLogs: { orderBy: { logDate: 'desc' }, take: 14 } },
  });
  if (!campaign) throw new Error('Campanha não encontrada');

  const econ = computeEconomics(campaign, campaign.dailyLogs);
  const rules: RulesResult = evaluateRules(econ, campaign);

  const agentsRun: string[] = [];
  let totalTokens = 0;
  let llmSummary: string | null = null;
  let error: string | null = null;
  let finalDecision = rules.decision;
  const allTriggers = [...rules.triggers];

  const needsLlm = !['SEM_DADOS', 'CONFIG_INCOMPLETA'].includes(rules.decision);
  const wanted = (campaign.loopAgents ?? 'ads').split(',').map((s) => s.trim()).filter(Boolean);

  if (needsLlm) {
    if (wanted.includes('ads')) {
      try {
        const res = await callAgent(userId, {
          agent: 'ads-auditor',
          systemPrompt: `Você é o Paid Ads Auditor do AfiliAds rodando dentro do loop de auto-correção. A decisão pelas REGRAS OFICIAIS (já calculadas em código) foi "${rules.decision}". Seu papel: confirmar ou contestar com base nos números, e listar ajustes concretos. Você NÃO pode inventar métricas — use apenas as fornecidas. Responda APENAS JSON válido.`,
          userPrompt: `Campanha: ${campaign.name} (${campaign.platform}, ${campaign.vertical}, funil ${campaign.funnel}).
Economia calculada (últimos ${econ.logCount} registros): gasto $${econ.spend.toFixed(2)}, receita $${econ.revenue.toFixed(2)}, lucro $${econ.profit.toFixed(2)}, ${econ.clicks} cliques, ${econ.hops} hops (passagem presell→oferta ${econ.hopRatePct.toFixed(0)}%), ${econ.conversions} conversões, EPC real $${econ.epcReal.toFixed(2)}, CPC real $${econ.cpcReal.toFixed(2)}, CVR ${econ.cvrRealPct.toFixed(2)}%, burn ${econ.budgetBurnPct.toFixed(0)}% do budget de teste.
Referências da campanha: comissão líquida $${campaign.commissionNet}, EPC break-even $${campaign.epcBreakeven}, CPC máx $${campaign.cpcMax}, CPC scale $${campaign.cpcScale}.
Decisão das regras: ${rules.decision} — gatilhos: ${rules.triggers.join(' | ')}
Retorne JSON: {"concorda": true|false, "decisao_sugerida": "SCALE|OTIMIZAR|PAUSAR|KILL|CONTINUAR", "diagnostico": "2-3 frases", "ajustes": ["até 4 ações concretas priorizadas"]}`,
        });
        agentsRun.push('ads-auditor');
        totalTokens += res.usage.totalTokens;
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
            systemPrompt: 'Você é o Compliance Sentinel do AfiliAds no loop de auto-correção. Audite o texto REAL da presell contra políticas do Google Ads (claims de cura/renda, urgência falsa, depoimentos proibidos). Responda APENAS JSON válido.',
            userPrompt: `Presell da campanha ${campaign.name} (${campaign.presellUrl}):\n"""${html}"""\nRetorne JSON: {"aprovado": true|false, "alertas": [{"nivel": "critico|atencao", "texto": "..."}]}`,
          });
          agentsRun.push('compliance-sentinel');
          totalTokens += res.usage.totalTokens;
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
        revenue: econ.revenue,
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
        revenue: econ.revenue,
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
  // KILL/PAUSAR mudam status automaticamente; SCALE só sugere (aprovação humana)
  if (finalDecision === 'KILL') {
    await prisma.campaign.update({ where: { id: campaign.id }, data: { status: 'KILL', lastLoopRunAt: new Date() } });
  } else if (finalDecision === 'PAUSAR') {
    await prisma.campaign.update({ where: { id: campaign.id }, data: { status: 'PAUSADA', lastLoopRunAt: new Date() } });
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
    totalTokens,
    llmSummary,
    error,
    loopRunId: loopRun.id,
  };
}

export async function runDueLoops(trigger: 'cron' | 'manual' = 'cron'): Promise<LoopRunResult[]> {
  const now = Date.now();
  const candidates = await prisma.campaign.findMany({
    where: { loopEnabled: true, status: { notIn: ['KILL', 'PAUSADA'] } },
    select: { id: true, userId: true, loopInterval: true, lastLoopRunAt: true },
  });
  const due = candidates.filter((c) => {
    const interval = INTERVAL_MS[c.loopInterval] ?? INTERVAL_MS['24h'];
    return !c.lastLoopRunAt || now - c.lastLoopRunAt.getTime() >= interval;
  });
  const results: LoopRunResult[] = [];
  for (const c of due) {
    try {
      results.push(await runCampaignLoop(c.userId, c.id, trigger));
    } catch (e: any) {
      console.error(`Loop error campaign ${c.id}:`, e?.message);
    }
  }
  return results;
}
