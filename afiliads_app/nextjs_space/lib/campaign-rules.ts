export interface CampaignEconomics {
  spend: number;
  revenue: number;
  profit: number;
  clicks: number;
  hops: number;
  hopRatePct: number;
  conversions: number;
  epcReal: number;
  cpcReal: number;
  cvrRealPct: number;
  budgetBurnPct: number;
  daysWithSpend: number;
  daysOverCpcMax: number;
  logCount: number;
}

export type LoopDecision = 'SCALE' | 'OTIMIZAR' | 'PAUSAR' | 'KILL' | 'CONTINUAR' | 'SEM_DADOS' | 'CONFIG_INCOMPLETA';

export interface RulesResult {
  decision: LoopDecision;
  triggers: string[];
  missingFields?: string[];
}

interface CampaignLike {
  commissionNet: number;
  epcBreakeven: number;
  cpcMax: number;
  budgetTest: number;
  offerUrl?: string | null;
}

interface DailyLogLike {
  spend: number;
  revenue: number;
  clicks: number;
  hops?: number;
  conversions: number;
  logDate: Date | string;
}

// Campos mínimos para qualquer análise econômica fazer sentido
export function validateCampaignConfig(c: CampaignLike): string[] {
  const missing: string[] = [];
  if (!(c.commissionNet > 0)) missing.push('commissionNet (comissão líquida)');
  if (!(c.epcBreakeven > 0)) missing.push('epcBreakeven (EPC de break-even)');
  if (!(c.cpcMax > 0)) missing.push('cpcMax (CPC máximo)');
  if (!(c.budgetTest > 0)) missing.push('budgetTest (orçamento de teste)');
  if (!c.offerUrl) missing.push('offerUrl (URL da oferta)');
  return missing;
}

export function computeEconomics(campaign: CampaignLike, logs: DailyLogLike[]): CampaignEconomics {
  let spend = 0, revenue = 0, clicks = 0, hops = 0, conversions = 0;
  let daysWithSpend = 0, daysOverCpcMax = 0;
  for (const l of logs) {
    spend += l.spend ?? 0;
    revenue += l.revenue ?? 0;
    clicks += l.clicks ?? 0;
    hops += l.hops ?? 0;
    conversions += l.conversions ?? 0;
    if ((l.spend ?? 0) > 0) {
      daysWithSpend++;
      const dayCpc = (l.clicks ?? 0) > 0 ? l.spend / l.clicks : Infinity;
      if (campaign.cpcMax > 0 && dayCpc > campaign.cpcMax) daysOverCpcMax++;
    }
  }
  return {
    spend,
    revenue,
    profit: revenue - spend,
    clicks,
    hops,
    hopRatePct: clicks > 0 ? (hops / clicks) * 100 : 0,
    conversions,
    epcReal: clicks > 0 ? revenue / clicks : 0,
    cpcReal: clicks > 0 ? spend / clicks : 0,
    cvrRealPct: clicks > 0 ? (conversions / clicks) * 100 : 0,
    budgetBurnPct: campaign.budgetTest > 0 ? (spend / campaign.budgetTest) * 100 : 0,
    daysWithSpend,
    daysOverCpcMax,
    logCount: logs.length,
  };
}

// Thresholds oficiais do loop (mesma régua para código, LLM e manual)
export function evaluateRules(econ: CampaignEconomics, campaign: CampaignLike): RulesResult {
  const missing = validateCampaignConfig(campaign);
  if (missing.length > 0) {
    return { decision: 'CONFIG_INCOMPLETA', triggers: [`Campos faltando: ${missing.join(', ')}`], missingFields: missing };
  }
  if (econ.daysWithSpend < 1 || econ.spend <= 0) {
    return { decision: 'SEM_DADOS', triggers: ['Nenhum dia com gasto registrado no diário — registre os dados do Google Ads antes de auditar'] };
  }

  const triggers: string[] = [];

  // KILL: gastou 2× a comissão líquida sem converter, ou CPC estourado por 3+ dias
  if (econ.conversions === 0 && econ.spend >= 2 * campaign.commissionNet) {
    triggers.push(`Gasto $${econ.spend.toFixed(2)} ≥ 2× comissão líquida ($${campaign.commissionNet.toFixed(2)}) sem nenhuma conversão`);
  }
  if (econ.daysOverCpcMax >= 3) {
    triggers.push(`CPC real acima do máximo ($${campaign.cpcMax.toFixed(2)}) em ${econ.daysOverCpcMax} dias`);
  }
  if (triggers.length > 0) return { decision: 'KILL', triggers };

  // PAUSAR: budget de teste consumido sem veredito
  if (econ.budgetBurnPct >= 100) {
    return { decision: 'PAUSAR', triggers: [`Budget de teste 100% consumido ($${econ.spend.toFixed(2)} de $${campaign.budgetTest.toFixed(2)}) — pausar e decidir com os dados completos`] };
  }

  // SCALE: economia comprovada com amostra mínima
  if (econ.conversions >= 2 && econ.cpcReal > 0 && econ.epcReal >= 1.3 * econ.cpcReal) {
    return { decision: 'SCALE', triggers: [`EPC real $${econ.epcReal.toFixed(2)} ≥ 1.3× CPC real $${econ.cpcReal.toFixed(2)} com ${econ.conversions} conversões — elegível para escalar (requer aprovação)`] };
  }

  // OTIMIZAR: paga a conta mas sem margem de escala
  if (econ.conversions >= 1 && econ.cpcReal > 0 && econ.epcReal >= econ.cpcReal) {
    return { decision: 'OTIMIZAR', triggers: [`EPC real $${econ.epcReal.toFixed(2)} entre 1.0× e 1.3× o CPC real $${econ.cpcReal.toFixed(2)} — otimizar termos/anúncios antes de escalar`] };
  }
  if (econ.cpcReal > campaign.cpcMax) {
    return { decision: 'OTIMIZAR', triggers: [`CPC real $${econ.cpcReal.toFixed(2)} acima do máximo $${campaign.cpcMax.toFixed(2)} (${econ.daysOverCpcMax} dia(s)) — baixar lances ou cortar termos caros`] };
  }

  return { decision: 'CONTINUAR', triggers: [`Teste em andamento: $${econ.spend.toFixed(2)} gastos (${econ.budgetBurnPct.toFixed(0)}% do budget), ${econ.clicks} cliques, ${econ.conversions} conversões — sem gatilho de decisão ainda`] };
}
