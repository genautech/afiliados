import type { SpendCoverage } from './spend-coverage';

export interface CampaignEconomics {
  /** Gasto da janela de performance (ou total, quando não há janela). */
  spend: number;
  /** A05: gasto acumulado desde o lançamento, sem janela. É o que mede burn de orçamento. */
  spendTotal: number;
  /** A03: idade do sync de gasto mais recente, em horas. Null = nunca sincronizado. */
  dataAgeHours: number | null;
  /** Receita bruta, antes de reembolso. Só para exibição — nenhuma regra decide por ela. */
  revenue: number;
  refunds: number;
  /** Receita menos reembolso. É esta que sustenta lucro, EPC e qualquer decisão. */
  revenueNet: number;
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
  refunds?: number;
  clicks: number;
  hops?: number;
  conversions: number;
  logDate: Date | string;
  /** A03: quando o gasto deste dia veio da plataforma. Null = nunca sincronizado. */
  syncedAt?: Date | string | null;
}

export interface EconomicsOptions {
  /**
   * A05: janela para métricas de performance (CPC/EPC/CVR/dias acima do CPC máx).
   * O gasto acumulado e o burn de orçamento NUNCA usam janela — são desde o lançamento.
   * Sem valor, tudo usa o histórico inteiro.
   */
  performanceWindowDays?: number;
  now?: Date;
  /**
   * A03: recorte que a ingestão de gasto acabou de cobrir. Quando presente, o
   * `observedAt` é a observação mais recente da plataforma e entra no cálculo de
   * `dataAgeHours` junto com o `syncedAt` dos diários. Null = sync falhou nesta rodada.
   */
  spendCoverage?: SpendCoverage | null;
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

// A04: reembolso reduz receita. Antes o lucro era receita bruta - gasto, então uma campanha
// com gasto 100, receita 200 e reembolso 200 aparecia com lucro +100 e ia para SCALE — o
// resultado real era -100. Toda decisão passa a usar receita líquida.
function paraData(v: Date | string): Date {
  return v instanceof Date ? v : new Date(v);
}

export function computeEconomics(
  campaign: CampaignLike,
  logs: DailyLogLike[],
  options: EconomicsOptions = {},
): CampaignEconomics {
  const agora = options.now ?? new Date();
  const janelaMs = options.performanceWindowDays
    ? options.performanceWindowDays * 86400_000
    : null;
  const naJanela = (l: DailyLogLike) =>
    janelaMs === null || agora.getTime() - paraData(l.logDate).getTime() <= janelaMs;

  // Acumulado de orçamento: TODO o histórico, sem janela.
  let spendTotal = 0;
  let ultimoSyncMs: number | null = null;
  if (options.spendCoverage) {
    const ms = paraData(options.spendCoverage.observedAt).getTime();
    if (Number.isFinite(ms)) ultimoSyncMs = ms;
  }
  for (const l of logs) {
    spendTotal += l.spend ?? 0;
    if (l.syncedAt) {
      const ms = paraData(l.syncedAt).getTime();
      if (Number.isFinite(ms) && (ultimoSyncMs === null || ms > ultimoSyncMs)) ultimoSyncMs = ms;
    }
  }

  // Performance: janela deslizante (ou tudo, se não houver janela).
  let spend = 0, revenue = 0, refunds = 0, clicks = 0, hops = 0, conversions = 0;
  let daysWithSpend = 0, daysOverCpcMax = 0;
  for (const l of logs) {
    if (!naJanela(l)) continue;
    spend += l.spend ?? 0;
    revenue += l.revenue ?? 0;
    refunds += l.refunds ?? 0;
    clicks += l.clicks ?? 0;
    hops += l.hops ?? 0;
    conversions += l.conversions ?? 0;
    if ((l.spend ?? 0) > 0) {
      daysWithSpend++;
      const dayCpc = (l.clicks ?? 0) > 0 ? l.spend / l.clicks : Infinity;
      if (campaign.cpcMax > 0 && dayCpc > campaign.cpcMax) daysOverCpcMax++;
    }
  }
  const revenueNet = revenue - refunds;
  return {
    spendTotal,
    dataAgeHours: ultimoSyncMs === null ? null : (agora.getTime() - ultimoSyncMs) / 3600_000,
    spend,
    revenue,
    refunds,
    revenueNet,
    profit: revenueNet - spend,
    clicks,
    hops,
    hopRatePct: clicks > 0 ? (hops / clicks) * 100 : 0,
    conversions,
    epcReal: clicks > 0 ? revenueNet / clicks : 0,
    cpcReal: clicks > 0 ? spend / clicks : 0,
    cvrRealPct: clicks > 0 ? (conversions / clicks) * 100 : 0,
    budgetBurnPct: campaign.budgetTest > 0 ? (spendTotal / campaign.budgetTest) * 100 : 0,
    daysWithSpend,
    daysOverCpcMax,
    logCount: logs.length,
  };
}

/** A03: acima disso o gasto sincronizado é velho demais para sustentar uma decisão. */
export const MAX_DATA_AGE_HOURS = 24;

// Thresholds oficiais do loop (mesma régua para código, LLM e manual)
export function evaluateRules(econ: CampaignEconomics, campaign: CampaignLike): RulesResult {
  const missing = validateCampaignConfig(campaign);
  if (missing.length > 0) {
    return { decision: 'CONFIG_INCOMPLETA', triggers: [`Campos faltando: ${missing.join(', ')}`], missingFields: missing };
  }
  if (econ.daysWithSpend < 1 || econ.spend <= 0) {
    return { decision: 'SEM_DADOS', triggers: ['Nenhum dia com gasto registrado no diário — registre os dados do Google Ads antes de auditar'] };
  }

  // A03: decidir com dado velho é pior que não decidir. Só vale quando houve algum sync de
  // plataforma; diário 100% manual (dataAgeHours null) segue pelo caminho normal.
  if (econ.dataAgeHours !== null && econ.dataAgeHours > MAX_DATA_AGE_HOURS) {
    return {
      decision: 'SEM_DADOS',
      triggers: [`Dados desatualizados: último sync de gasto há ${econ.dataAgeHours.toFixed(0)}h (limite ${MAX_DATA_AGE_HOURS}h) — sincronize o Google Ads antes de decidir`],
    };
  }

  const triggers: string[] = [];

  // KILL: gastou 2× a comissão líquida sem converter, ou CPC estourado por 3+ dias
  if (econ.conversions === 0 && econ.spend >= 2 * campaign.commissionNet) {
    triggers.push(`Gasto $${econ.spend.toFixed(2)} ≥ 2× comissão líquida ($${campaign.commissionNet.toFixed(2)}) sem nenhuma conversão`);
  }
  // Houve conversão, mas o reembolso comeu tudo: economicamente é igual a não ter convertido.
  if (econ.conversions > 0 && econ.revenueNet <= 0 && econ.spend >= 2 * campaign.commissionNet) {
    triggers.push(`Receita líquida $${econ.revenueNet.toFixed(2)} (bruta $${econ.revenue.toFixed(2)} − reembolso $${econ.refunds.toFixed(2)}) com gasto $${econ.spend.toFixed(2)} — reembolso anulou a receita`);
  }
  if (econ.daysOverCpcMax >= 3) {
    triggers.push(`CPC real acima do máximo ($${campaign.cpcMax.toFixed(2)}) em ${econ.daysOverCpcMax} dias`);
  }
  if (triggers.length > 0) return { decision: 'KILL', triggers };

  // PAUSAR: budget de teste consumido sem veredito
  if (econ.budgetBurnPct >= 100) {
    return { decision: 'PAUSAR', triggers: [`Budget de teste 100% consumido ($${econ.spendTotal.toFixed(2)} acumulados de $${campaign.budgetTest.toFixed(2)}) — pausar e decidir com os dados completos`] };
  }

  // SCALE: economia comprovada com amostra mínima
  // SCALE exige lucro líquido positivo além do EPC: escalar prejuízo é o pior erro do loop.
  if (econ.conversions >= 2 && econ.cpcReal > 0 && econ.epcReal >= 1.3 * econ.cpcReal && econ.profit > 0) {
    return { decision: 'SCALE', triggers: [`EPC líquido $${econ.epcReal.toFixed(2)} ≥ 1.3× CPC real $${econ.cpcReal.toFixed(2)} com ${econ.conversions} conversões e lucro $${econ.profit.toFixed(2)} — elegível para escalar (requer aprovação)`] };
  }
  if (econ.conversions >= 2 && econ.cpcReal > 0 && econ.epcReal >= 1.3 * econ.cpcReal && econ.profit <= 0) {
    return { decision: 'OTIMIZAR', triggers: [`EPC líquido bate o alvo mas o lucro é $${econ.profit.toFixed(2)} (gasto $${econ.spend.toFixed(2)}, receita líquida $${econ.revenueNet.toFixed(2)}) — não escalar no prejuízo`] };
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
