import { ProductResearch } from '@prisma/client';
import { recommendBridgePage, BridgePageType } from '@/lib/bridgePageRecommender';
import { SalesPageType } from '@/lib/salesPageAnalyzer';
import { rankPresellOutcomes } from '@/lib/presell';

export type Channel = 'SEARCH' | 'YOUTUBE' | 'DEMAND_GEN' | 'PMAX';
export type Funnel = 'BRIDGE' | 'DIRECT' | 'REVIEW' | 'SL';
export type PresellPageType = 'advertorial' | 'pogo' | 'vsl' | 'interstitial';
export type FunnelStage = 'FUNDO' | 'MEIO' | 'TOPO';
export type KeywordLayer = 'A' | 'B' | 'C' | 'D';

export type SelectedKeywordInput = { keyword: string; layer: string; matchType: string; relevance: number };

export type CampaignStrategy = {
  funnelStage: FunnelStage;
  dominantLayer: KeywordLayer | null;
  recommendedFunnel: Funnel;
  recommendedChannel: Channel | null;
  recommendedBridgeType: PresellPageType;
  bridgeTypeSource: 'estatico' | 'historico_real';
  blockedChannels: Channel[];
  channelBlockReason: string | null;
  budgetGuidance: {
    testDurationDays: number;
    budgetTestMultiplier: [number, number];
    budgetScaleMultiplier: [number, number];
    rationale: string;
  };
};

// Canais em que 'interstitial' é seguro (mesmo critério de lib/presell.ts
// INTERSTITIAL_BLOCKED_CHANNELS e lib/bridgePageRecommender.ts INTERSTITIAL_SAFE_CHANNELS) —
// nenhum dado histórico pode sobrepor esse gate, é sempre a autoridade final.
const INTERSTITIAL_SAFE_CHANNELS = new Set<Channel>(['YOUTUBE', 'DEMAND_GEN']);

/**
 * Camadas de keyword A-D já são a taxonomia de "estágio de funil" do app (SEO & Keyword
 * Architect, ver lib/agents.ts e lib/knowledge-data.ts): A = fundo/comercial, B =
 * comparação, C = problema/dor, D = informacional. Mapeamos pra 3 estágios porque B
 * (comparação) tem comportamento de meio de funil — já conhece a categoria mas não decidiu.
 */
const LAYER_TO_STAGE: Record<KeywordLayer, FunnelStage> = { A: 'FUNDO', B: 'MEIO', C: 'TOPO', D: 'TOPO' };

/**
 * strategy.campanha.tipo (Compliance Sentinel) e strategy.presell.tipo vêm como texto
 * livre do LLM da pesquisa de produto. Este é o único lugar do app onde esse texto é
 * traduzido pros enums reais usados na Campaign (CHANNELS/FUNNELS em lib/wizard-data.ts).
 */
function normalizeChannel(raw: unknown): Channel | null {
  const s = String(raw ?? '').toLowerCase();
  if (!s) return null;
  if (s.includes('search')) return 'SEARCH';
  if (s.includes('youtube') || s === 'yt') return 'YOUTUBE';
  if (s.includes('demand')) return 'DEMAND_GEN';
  if (s.includes('pmax') || s.includes('performance max')) return 'PMAX';
  return null;
}

function normalizePresellTipo(raw: unknown): { funnel: Funnel; pageType: PresellPageType } | null {
  const s = String(raw ?? '').toLowerCase();
  if (!s) return null;
  if (s.includes('review')) return { funnel: 'REVIEW', pageType: 'advertorial' };
  if (s.includes('vsl')) return { funnel: 'BRIDGE', pageType: 'vsl' };
  if (s.includes('pogo')) return { funnel: 'BRIDGE', pageType: 'pogo' };
  if (s.includes('lead')) return { funnel: 'SL', pageType: 'advertorial' };
  if (s.includes('advertorial') || s.includes('quiz')) return { funnel: 'BRIDGE', pageType: 'advertorial' };
  if (s.includes('direct')) return { funnel: 'DIRECT', pageType: 'advertorial' };
  return null;
}

/** Mapeia o enum de saída do recommendBridgePage() (BridgePageType) pro vocabulário real
 * de Presell.pageType usado pelo gerador de presell do app ('advertorial'|'pogo'|'vsl') —
 * quiz/lead-gen ainda não têm gerador próprio (ver Fluxo 4 do SKILL.md), então caem em
 * advertorial como fallback seguro. */
function bridgeTypeToPageType(t: BridgePageType): PresellPageType {
  if (t === BridgePageType.POGO) return 'pogo';
  if (t === BridgePageType.INTERSTITIAL) return 'interstitial';
  return 'advertorial';
}

function dominantKeywordLayer(keywords: SelectedKeywordInput[]): KeywordLayer | null {
  if (!keywords?.length) return null;
  const counts: Record<string, number> = {};
  for (const k of keywords) {
    const layer = String(k?.layer ?? '').toUpperCase();
    if (['A', 'B', 'C', 'D'].includes(layer)) counts[layer] = (counts[layer] ?? 0) + 1;
  }
  const entries = Object.entries(counts);
  if (!entries.length) return null;
  // Empate: prioriza a camada mais "fundo" (mais conservador assumir intenção alta que baixa).
  entries.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return entries[0][0] as KeywordLayer;
}

/** Lê o gate de canal do vendor gravado pelo Affiliate Page Analyst (fix do caso FemiCore)
 * — ProductResearch.affiliateInsights = { googleSearchPermitido, allowedChannels[],
 * forbiddenChannels[] }. Trata "não confirmado" como bloqueio, não como liberado por
 * omissão (mesma regra da skill: sem fonte real, trata como não verificado). */
function deriveBlockedChannels(product: ProductResearch): { blocked: Channel[]; reason: string | null } {
  const insights = (product.affiliateInsights as any) ?? {};
  const blocked = new Set<Channel>();
  const reasons: string[] = [];

  const googleSearchPermitido = insights.googleSearchPermitido;
  if (googleSearchPermitido !== true) {
    blocked.add('SEARCH');
    reasons.push(
      googleSearchPermitido === false
        ? 'Página de afiliados do vendor proíbe Google Search explicitamente.'
        : 'Permissão de Google Search não confirmada com a página real de afiliados do vendor.'
    );
  }

  const forbidden: string[] = Array.isArray(insights.forbiddenChannels) ? insights.forbiddenChannels : [];
  for (const raw of forbidden) {
    const s = String(raw).toLowerCase();
    if (s.includes('search')) blocked.add('SEARCH');
    else if (s.includes('youtube')) blocked.add('YOUTUBE');
    else if (s.includes('demand')) blocked.add('DEMAND_GEN');
    else if (s.includes('pmax') || s.includes('performance max')) blocked.add('PMAX');
  }
  if (forbidden.length) reasons.push(`Vendor proíbe explicitamente: ${forbidden.join(', ')}.`);

  return { blocked: Array.from(blocked), reason: reasons.length ? reasons.join(' ') : null };
}

function budgetGuidanceForStage(stage: FunnelStage, riskLevel: string): CampaignStrategy['budgetGuidance'] {
  const conservative = riskLevel === 'alto';
  if (stage === 'FUNDO') {
    return {
      testDurationDays: 3,
      budgetTestMultiplier: conservative ? [1, 1.5] : [1, 2],
      budgetScaleMultiplier: conservative ? [3, 4] : [3, 5],
      rationale: 'Fundo de funil (camada A/B de keyword): tráfego de alta intenção comercial, converte rápido — janela de teste padrão de 72h costuma bastar, CPC pode ficar mais apertado.',
    };
  }
  if (stage === 'MEIO') {
    return {
      testDurationDays: 5,
      budgetTestMultiplier: conservative ? [1, 2] : [1.5, 2.5],
      budgetScaleMultiplier: conservative ? [2, 3] : [3, 4],
      rationale: 'Meio de funil (camada B, comparação/review): já conhece a categoria mas ainda decide — dê um pouco mais de amostra (5 dias) antes de KILL/SCALE.',
    };
  }
  return {
    testDurationDays: 7,
    budgetTestMultiplier: conservative ? [1.5, 2] : [2, 3],
    budgetScaleMultiplier: conservative ? [1.5, 2] : [2, 3],
    rationale: 'Topo de funil (camada C/D, problema/informacional): tráfego frio precisa de bridge/aquecimento — julgar antes de ~7 dias ou amostra maior mata campanhas válidas cedo demais; escale com mais cautela até validar volume.',
  };
}

export async function deriveCampaignStrategy(
  userId: string,
  product: ProductResearch,
  selectedKeywords: SelectedKeywordInput[]
): Promise<CampaignStrategy> {
  const dominantLayer = dominantKeywordLayer(selectedKeywords);
  const funnelStage: FunnelStage = dominantLayer ? LAYER_TO_STAGE[dominantLayer] : 'MEIO';

  const strategy = (product.strategy as any) ?? {};
  const presellNorm = normalizePresellTipo(strategy?.presell?.tipo);
  const channelFromStrategy = normalizeChannel(strategy?.campanha?.tipo);

  const { blocked: blockedChannels, reason: channelBlockReason } = deriveBlockedChannels(product);

  let recommendedChannel: Channel | null = channelFromStrategy && !blockedChannels.includes(channelFromStrategy)
    ? channelFromStrategy
    : null;
  if (!recommendedChannel) {
    // Fallback quando o dossiê não trouxe canal (ou o canal recomendado está bloqueado):
    // fundo de funil tolera Search/Demand Gen de alta intenção; topo de funil se dá melhor
    // com formatos de vídeo/feed pra aquecer tráfego frio.
    const fallbackOrder: Channel[] = funnelStage === 'FUNDO' ? ['SEARCH', 'DEMAND_GEN', 'YOUTUBE', 'PMAX'] : ['YOUTUBE', 'DEMAND_GEN', 'SEARCH', 'PMAX'];
    recommendedChannel = fallbackOrder.find((c) => !blockedChannels.includes(c)) ?? null;
  }

  // Bridge/funil: nunca cai em DIRECT por omissão (regra de ouro: link direto nunca é URL
  // final) — só usa DIRECT se o dossiê recomendou isso explicitamente.
  let recommendedFunnel: Funnel = presellNorm?.funnel ?? 'BRIDGE';
  let recommendedBridgeType: PresellPageType = presellNorm?.pageType ?? 'advertorial';

  if (product.salesPageType) {
    try {
      const rec = recommendBridgePage(product, product.salesPageType as unknown as SalesPageType, undefined);
      recommendedBridgeType = bridgeTypeToPageType(rec.recommendedType);
    } catch {
      // salesPageType presente mas incompatível com o recomendador — mantém o valor do strategy.presell.tipo.
    }
  }

  // pageType 'interstitial' (screenshot da sales page do vendor + popup de segmentação) só é
  // seguro em canais Native/Display/YouTube/social — no app, YOUTUBE/DEMAND_GEN. Só recomendamos
  // quando existe uma sales page real forte o bastante pra virar screenshot (DIRECT/VSL) e o
  // dossiê não trouxe uma preferência explícita própria (presellNorm vence sempre).
  const interstitialSafeChannel = recommendedChannel === 'YOUTUBE' || recommendedChannel === 'DEMAND_GEN';
  if (!presellNorm && interstitialSafeChannel && product.vendorPageUrl
      && (product.salesPageType === SalesPageType.DIRECT || product.salesPageType === SalesPageType.VSL)) {
    recommendedBridgeType = 'interstitial';
  }
  // Blindagem final: nenhum caminho acima pode deixar 'interstitial' escapar pra SEARCH/PMAX.
  if ((recommendedChannel === 'SEARCH' || recommendedChannel === 'PMAX') && recommendedBridgeType === 'interstitial') {
    recommendedBridgeType = 'advertorial';
  }

  // Aprendizado contínuo: se já existe resultado real (receita/lucro, não só clique) suficiente
  // pra essa vertical×canal, ele pode sobrepor a regra estática acima — mas nunca o gate de
  // canal do interstitial, reaplicado depois como última palavra.
  let bridgeTypeSource: CampaignStrategy['bridgeTypeSource'] = 'estatico';
  try {
    const { ranked } = await rankPresellOutcomes(userId, product.vertical, recommendedChannel ?? undefined);
    const best = ranked.find((r) => r.profit > 0 && (r.pageType !== 'interstitial' || (recommendedChannel && INTERSTITIAL_SAFE_CHANNELS.has(recommendedChannel))));
    if (best && best.pageType !== recommendedBridgeType && ['advertorial', 'pogo', 'vsl', 'interstitial'].includes(best.pageType)) {
      const previous = recommendedBridgeType;
      recommendedBridgeType = best.pageType as PresellPageType;
      bridgeTypeSource = 'historico_real';
      const { logLearningToObsidian } = await import('./obsidianSync');
      await logLearningToObsidian({
        title: `override-pagetype-${product.vertical}`,
        tags: ['aprendizado-continuo', 'pagetype-override'],
        body: `Recomendação estática de pageType pra **${product.name}** (vertical **${product.vertical}**, canal **${recommendedChannel}**) era "${previous}" — sobreposta por resultado real de campanhas anteriores pra **"${best.pageType}"** (lucro $${best.profit.toFixed(2)}, ROI ${best.roiPct.toFixed(0)}%, ${best.conversions} conversões em ${best.campaigns} campanha(s)).\n\nIsso vem de \`rankPresellOutcomes()\` em \`lib/presell.ts\` — nunca fura o gate de canal do interstitial.`,
      });
    }
  } catch {
    // Sem dado histórico suficiente (ou erro de leitura) — mantém a recomendação estática.
  }
  if ((recommendedChannel === 'SEARCH' || recommendedChannel === 'PMAX') && recommendedBridgeType === 'interstitial') {
    recommendedBridgeType = 'advertorial';
    bridgeTypeSource = 'estatico';
  }

  return {
    funnelStage,
    dominantLayer,
    recommendedFunnel,
    recommendedChannel,
    recommendedBridgeType,
    bridgeTypeSource,
    blockedChannels,
    channelBlockReason,
    budgetGuidance: budgetGuidanceForStage(funnelStage, product.riskLevel),
  };
}
