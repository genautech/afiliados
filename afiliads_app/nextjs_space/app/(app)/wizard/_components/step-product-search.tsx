'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { AgentHelp, applyEnumIfValid } from './agent-help';
import { KnowledgeInjector } from './knowledge-injector';
import type { ProductType } from './step-product-type';
import {
  Search, Bot, Loader2, AlertTriangle, CheckCircle2, ArrowLeft, ArrowRight,
  TrendingUp, Tag, ShieldAlert, Target, Link2, Key, HelpCircle,
  Sparkles, Magnet, ArrowUpRight, DollarSign, Download,
  TrendingDown, Minus, KeyRound, ServerCrash, Inbox
} from 'lucide-react';
import { PLATFORMS_EXTENDED, VERTICALS, GEOS, CHANNELS, ExtendedPlatform } from '@/lib/wizard-data';
import type {
  AdScoutOracleOutput,
  AnalyzedClaimItem,
  ClaimRiskLevel,
  CompetitorItem,
} from '@/lib/validations/market-research';

/** `activeDays` é opcional no schema: fonte sem data de início entra sem histórico. */
export type ScoutCompetitor = CompetitorItem;
export type ScoutResult = AdScoutOracleOutput;

export type AdMaturity = 'novo' | 'validando' | 'consolidado';

/**
 * Tempo no ar é o proxy mais barato de anúncio que converte: ninguém paga 60 dias
 * de mídia num criativo que não paga a conta.
 */
export function adMaturity(activeDays: number): AdMaturity {
  if (activeDays < 14) return 'novo';
  if (activeDays < 60) return 'validando';
  return 'consolidado';
}

export const MATURITY_TONE: Record<AdMaturity, string> = {
  novo: 'text-slate-400',
  validando: 'text-amber-400',
  consolidado: 'text-emerald-400',
};

/** Estágios reais do pipeline Firecrawl -> Meta -> Compliance. */
export const SCOUT_STAGES = [
  'Raspando anúncios...',
  'Interagindo com a biblioteca...',
  'Orquestrando IA da Meta...',
  'Validando Compliance...',
] as const;
export type ScoutStage = (typeof SCOUT_STAGES)[number];

/** -1 quando o rótulo não é um estágio conhecido (ex.: string vazia). */
export function scoutStageIndex(stage: string): number {
  return SCOUT_STAGES.indexOf(stage as ScoutStage);
}

/**
 * O catálogo de geos usa `UK`, que não é ISO 3166-1 alpha-2. O regex do schema
 * (`/^[A-Z]{2}$/`) aceita, mas a Meta Ads Library devolve vazio sem erro — então
 * traduzimos antes de mandar.
 */
const GEO_TO_ISO: Record<string, string> = { UK: 'GB' };

export function toScoutCountry(geoId: string | null | undefined): string {
  const raw = (geoId ?? '').trim().toUpperCase();
  if (!raw) return 'BR';
  if (raw === 'ALL') return 'ALL';
  const iso = GEO_TO_ISO[raw] ?? raw;
  return /^[A-Z]{2}$/.test(iso) ? iso : 'BR';
}

export type ScoutMode = 'ads' | 'idea';

export type TrendSlope = 'positive' | 'stable' | 'negative' | null;

export const TREND_PRESENTATION: Record<
  'positive' | 'stable' | 'negative' | 'unknown',
  { icon: typeof TrendingUp; label: string; tone: string }
> = {
  positive: {
    icon: TrendingUp,
    label: 'Nicho em forte crescimento no Google Trends',
    tone: 'text-emerald-400',
  },
  stable: {
    icon: Minus,
    label: 'Demanda consolidada e estável no Google Trends',
    tone: 'text-amber-400',
  },
  negative: {
    icon: TrendingDown,
    label: 'Demanda em declínio no Google Trends',
    tone: 'text-rose-400',
  },
  unknown: {
    icon: HelpCircle,
    label: 'Dados de tendência indisponíveis no momento',
    tone: 'text-muted-foreground',
  },
};

export function trendPresentation(slope: TrendSlope) {
  return TREND_PRESENTATION[slope ?? 'unknown'];
}

export type SourceStatus = 'live' | 'unavailable';

export interface SourceReport {
  metaAdsLibrary: SourceStatus;
  googleTrends: SourceStatus;
  googleAdsTransparency: SourceStatus;
}

const SOURCE_LABEL: Record<keyof SourceReport, string> = {
  metaAdsLibrary: 'Meta Ads Library',
  googleTrends: 'Google Trends',
  googleAdsTransparency: 'Google Ads Transparency',
};

export const SOURCE_ORDER: Array<keyof SourceReport> = [
  'metaAdsLibrary',
  'googleTrends',
  'googleAdsTransparency',
];

export function sourceLabel(key: keyof SourceReport): string {
  return SOURCE_LABEL[key];
}

/**
 * Só marcamos uma fonte como ativa quando a resposta prova que ela respondeu.
 * `isMockMode: true` significa dado fabricado — nenhuma fonte é declarada viva,
 * porque um selo de transparência em cima de mock é pior que selo nenhum.
 */
export function deriveSourceReport(raw: unknown): SourceReport {
  const root = (raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}) as Record<string, unknown>;
  const mock = root.isMockMode === true;
  const declared = (root.sources && typeof root.sources === 'object' ? root.sources : {}) as Record<string, unknown>;

  const read = (key: keyof SourceReport, proven: boolean): SourceStatus => {
    if (mock) return 'unavailable';
    const value = declared[key];
    if (value === 'live' || value === true) return 'live';
    if (value === 'unavailable' || value === false) return 'unavailable';
    return proven ? 'live' : 'unavailable';
  };

  const slope = root.trendSlope;
  const slopeIsReal = slope === 'positive' || slope === 'stable' || slope === 'negative';

  return {
    metaAdsLibrary: read('metaAdsLibrary', !mock),
    googleTrends: read('googleTrends', slopeIsReal),
    // Nenhuma rota consulta a Transparency ainda: não afirmamos que está viva.
    googleAdsTransparency: read('googleAdsTransparency', false),
  };
}

export function normalizeTrendSlope(raw: unknown): TrendSlope {
  const root = (raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}) as Record<string, unknown>;
  // Mock não produz tendência: vira desconhecido, nunca "crescimento".
  if (root.isMockMode === true) return null;
  const slope = root.trendSlope;
  return slope === 'positive' || slope === 'stable' || slope === 'negative' ? slope : null;
}

/** Etapas reais do pipeline de geração de oferta — sem "agentes virtuais". */
export const IDEA_STAGES = [
  'Buscando dados em tempo real no Meta Ads Library...',
  'Avaliando interesse histórico no Google Trends...',
  'Orquestrando inteligência de oferta com OpenRouter...',
] as const;

export type ScoutFailureKind = 'missing_keys' | 'unavailable' | 'unauthorized' | 'generic';

export interface ScoutFailure {
  kind: ScoutFailureKind;
  title: string;
  detail: string;
}

/**
 * Converte a falha real do backend em algo acionável. Chave ausente e serviço fora
 * do ar têm respostas diferentes: uma o usuário resolve, a outra ele espera.
 *
 * A causa pode chegar em `details` (trend-scout) ou em `error` (market-scout), e o
 * trend-scout devolve 503 para credencial ausente — então a mensagem decide antes
 * do status, senão mandaríamos "tente de novo" para um problema de .env.
 */
export function describeScoutFailure(
  status: number,
  serverMessage?: string | null,
  serverDetails?: string | null,
): ScoutFailure {
  const cause = [serverDetails, serverMessage].find((v) => typeof v === 'string' && v.trim()) ?? '';
  const message = cause.toUpperCase();
  const mentionsKey = message.includes('API_KEY') || message.includes('CHAVE') || message.includes('CREDENC');

  if (status === 401 && !mentionsKey) {
    return {
      kind: 'unauthorized',
      title: 'Sessão expirada',
      detail: 'Faça login de novo para continuar a pesquisa.',
    };
  }
  if (mentionsKey || status === 424) {
    return {
      kind: 'missing_keys',
      title: 'Configuração incompleta',
      detail: 'Defina FIRECRAWL_API_KEY e OPENROUTER_API_KEY no arquivo .env e reinicie o servidor.',
    };
  }
  if (status === 503 || status === 502 || status === 504) {
    return {
      kind: 'unavailable',
      title: 'Fontes temporariamente indisponíveis',
      detail: 'Os scrapers não responderam agora. Tente de novo em alguns minutos ou busque um nicho mais amplo.',
    };
  }
  return {
    kind: 'generic',
    title: `Falha na pesquisa (HTTP ${status})`,
    detail: cause.trim() || 'O servidor não detalhou o motivo. Verifique os logs da rota.',
  };
}


/** Ideia de produto próprio gerada pela IA a partir de um nicho. */
export interface ProductIdea {
  /** id do ProductResearch criado — sem ele não dá para importar. */
  id: string | null;
  name: string;
  vertical: string;
  summary: string | null;
  /** 0-100. */
  revenueScore: number;
  suggestedPrice: number | null;
  suggestedAov: number | null;
  leadMagnet: string | null;
  upsells: string[];
}

function pickString(...values: unknown[]): string | null {
  const found = values.find((v): v is string => typeof v === 'string' && v.trim().length > 0);
  return found ? found.trim() : null;
}

function pickNumber(...values: unknown[]): number | null {
  const found = values.find((v): v is number => typeof v === 'number' && Number.isFinite(v));
  return found ?? null;
}

/** Aceita string solta ou o formato {name, value} do offer-architect. */
function toUpsellLabel(entry: unknown): string | null {
  if (typeof entry === 'string') return entry.trim() || null;
  if (!entry || typeof entry !== 'object') return null;
  const row = entry as Record<string, unknown>;
  const name = pickString(row.name, row.nome, row.title, row.label);
  if (!name) return null;
  const value = pickNumber(row.value, row.preco, row.price);
  return value !== null ? `${name} · R$ ${value.toFixed(2)}` : name;
}

/**
 * A rota de ideia ainda não existe: normalizamos as formas plausíveis (raiz,
 * `idea`, `product`) e o `upsell` singular do offer-architect.
 */
export function normalizeProductIdea(raw: unknown): ProductIdea | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const root = raw as Record<string, unknown>;
  const nestedSource = [root.idea, root.product, root.productResearch].find(
    (v) => v && typeof v === 'object' && !Array.isArray(v),
  );
  const node = (nestedSource ?? root) as Record<string, unknown>;

  // O trend-scout persiste preço, isca e upsells dentro de `strategy` do ProductResearch.
  const strategy = (node.strategy && typeof node.strategy === 'object' ? node.strategy : {}) as Record<string, unknown>;
  const pricing = (() => {
    const fromStrategy = strategy.pricing;
    const fromNode = node.pricing;
    const source = [fromStrategy, fromNode].find((v) => v && typeof v === 'object' && !Array.isArray(v));
    return (source ?? {}) as Record<string, unknown>;
  })();

  const name = pickString(node.name, node.nome, node.title, node.promessa);
  if (!name) return null;

  const rawUpsells = [pricing.upsells, node.upsells, strategy.upsells].find(Array.isArray);
  const upsellList = rawUpsells ?? (
    node.upsell !== undefined && node.upsell !== null ? [node.upsell] : []
  );

  const score = pickNumber(node.revenueScore, node.revenue_score, node.potentialScore, node.score) ?? 0;

  return {
    id: pickString(node.id, root.id, node.productResearchId, root.productResearchId),
    name,
    vertical: pickString(node.vertical, node.nicho) ?? '',
    summary: pickString(node.summary, strategy.vslHook, node.vslHook, node.resumo, node.rationale),
    revenueScore: Math.max(0, Math.min(100, Math.round(score))),
    suggestedPrice: pickNumber(pricing.suggestedPrice, node.suggestedPrice, node.suggested_price, node.preco, node.price),
    suggestedAov: pickNumber(pricing.suggestedAov, node.suggestedAov, node.suggested_aov, node.aov),
    leadMagnet: pickString(strategy.leadMagnet, node.leadMagnet, node.lead_magnet, node.isca),
    upsells: upsellList.map(toUpsellLabel).filter((v): v is string => v !== null),
  };
}

export function revenueScoreTone(score: number): string {
  if (score > 80) return 'text-emerald-400';
  if (score > 50) return 'text-amber-400';
  return 'text-slate-400';
}

/** Passado o limite, o stepper avisa que está fora da janela normal. */
export const SCOUT_SLOW_AFTER_SECONDS = 60;

export type SaturationLevel = 'baixa' | 'moderada' | 'alta' | 'saturado';

export function saturationFromAdCount(adCount: number): SaturationLevel {
  if (!Number.isFinite(adCount) || adCount < 5) return 'baixa';
  if (adCount < 15) return 'moderada';
  if (adCount < 30) return 'alta';
  return 'saturado';
}

export const SATURATION_TONE: Record<SaturationLevel, string> = {
  baixa: 'text-emerald-400',
  moderada: 'text-sky-400',
  alta: 'text-amber-400',
  saturado: 'text-rose-400',
};

/** O schema só emite LOW/MEDIUM/HIGH, mas toleramos o rótulo PT que já circulou. */
export function isHighRisk(claim: Pick<AnalyzedClaimItem, 'riskLevel'> | { riskLevel: string }): boolean {
  const level = String(claim.riskLevel).toUpperCase();
  return level === 'HIGH' || level === 'ALTO';
}

export const RISK_TONE: Record<ClaimRiskLevel, { chip: string; border: string }> = {
  HIGH: { chip: 'bg-rose-500/15 text-rose-300', border: 'border-rose-500/25 bg-rose-500/[0.04]' },
  MEDIUM: { chip: 'bg-amber-500/15 text-amber-300', border: 'border-amber-500/20 bg-amber-500/[0.03]' },
  LOW: { chip: 'bg-slate-500/20 text-slate-300', border: 'border-[#334155] bg-[#0f172a]' },
};

export function riskTone(level: string): { chip: string; border: string } {
  const key = String(level).toUpperCase();
  if (key === 'HIGH' || key === 'ALTO') return RISK_TONE.HIGH;
  if (key === 'MEDIUM' || key === 'MEDIO' || key === 'MÉDIO') return RISK_TONE.MEDIUM;
  return RISK_TONE.LOW;
}

interface StepProductSearchProps {
  campaignId?: string | null;
  productType: 'AFFILIATE' | 'PROPRIETARY_LOW_TICKET' | 'MENTORSHIP';
  
  // State variables and setters
  name: string;
  setName: (v: string) => void;
  platform: ExtendedPlatform;
  setPlatform: (v: ExtendedPlatform) => void;
  vertical: string;
  setVertical: (v: string) => void;
  geo: string;
  setGeo: (v: string) => void;
  channel: string;
  setChannel: (v: string) => void;
  funnel: string;
  setFunnel: (v: string) => void;
  offerUrl: string;
  setOfferUrl: (v: string) => void;
  commission: string;
  setCommission: (v: string) => void;
  refundPct: string;
  setRefundPct: (v: string) => void;
  aov: string;
  setAov: (v: string) => void;

  // New fields for low-ticket and mentorship
  checkoutWebhook?: string;
  setCheckoutWebhook?: (v: string) => void;
  leadMagnet?: string;
  setLeadMagnet?: (v: string) => void;
  whatsappLink?: string;
  setWhatsappLink?: (v: string) => void;

  // Pre-analyzed products (Affiliate only)
  researchProducts: Array<{ id: string; name: string; score: number; vertical: string; confirmedAt?: string | null }>;
  sourceProductResearchId: string | null;
  loadFromResearch: (id: string) => Promise<void>;
  autofilling: boolean;

  // Ad Scout Oracle V2 States & API trigger
  scoutQuery: string;
  setScoutQuery: (v: string) => void;
  scoutLoading: boolean;
  scoutStage: string;
  scoutResult: ScoutResult | null;
  scoutProductType: ProductType;
  setScoutProductType: (v: ProductType) => void;
  /** ALL para varredura global ou código ISO de 2 letras. */
  scoutCountry: string;
  setScoutCountry: (v: string) => void;
  scoutMode: ScoutMode;
  setScoutMode: (v: ScoutMode) => void;
  productIdea: ProductIdea | null;
  generatingIdea: boolean;
  runProductIdea: () => Promise<void>;
  /** Importa a ideia: roda o autofill e depois crava os valores que o card exibiu. */
  importProductIdea: (idea: ProductIdea) => Promise<void>;
  ideaStage: string;
  trendSlope: TrendSlope;
  sourceReport: SourceReport | null;
  ideaIsMock: boolean;
  scoutFailure: ScoutFailure | null;
  dismissScoutFailure: () => void;
  runAdScoutResearch: () => Promise<void>;

  onPrev: () => void;
  onNext: () => void;
}

export function StepProductSearch({
  campaignId = null,
  productType,
  name,
  setName,
  platform,
  setPlatform,
  vertical,
  setVertical,
  geo,
  setGeo,
  channel,
  setChannel,
  funnel,
  setFunnel,
  offerUrl,
  setOfferUrl,
  commission,
  setCommission,
  refundPct,
  setRefundPct,
  aov,
  setAov,
  checkoutWebhook = '',
  setCheckoutWebhook,
  leadMagnet = '',
  setLeadMagnet,
  whatsappLink = '',
  setWhatsappLink,
  researchProducts,
  sourceProductResearchId,
  loadFromResearch,
  autofilling,
  scoutQuery,
  setScoutQuery,
  scoutLoading,
  scoutStage,
  scoutResult,
  scoutProductType,
  setScoutProductType,
  scoutCountry,
  setScoutCountry,
  scoutMode,
  setScoutMode,
  productIdea,
  generatingIdea,
  runProductIdea,
  importProductIdea,
  ideaStage,
  trendSlope,
  sourceReport,
  ideaIsMock,
  scoutFailure,
  dismissScoutFailure,
  runAdScoutResearch,
  onPrev,
  onNext,
}: StepProductSearchProps) {
  const inputCls = 'bg-[#0f172a] border-[#334155] text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:ring-emerald-500/10';

  const highRiskClaims = React.useMemo(
    () => (scoutResult ? scoutResult.analyzedClaims.filter(isHighRisk) : []),
    [scoutResult],
  );
  // Alto risco primeiro: é o que trava a campanha, não pode ficar embaixo da lista.
  const sortedClaims = React.useMemo(() => {
    if (!scoutResult) return [];
    const weight = (level: string) => (isHighRisk({ riskLevel: level }) ? 0 : String(level).toUpperCase() === 'MEDIUM' ? 1 : 2);
    return [...scoutResult.analyzedClaims].sort((a, b) => weight(a.riskLevel) - weight(b.riskLevel));
  }, [scoutResult]);
  const saturation = saturationFromAdCount(scoutResult?.adCount ?? 0);

  const isIdeaMode = scoutMode === 'idea';
  const busy = scoutLoading || generatingIdea;
  const [elapsedSeconds, setElapsedSeconds] = React.useState(0);
  React.useEffect(() => {
    if (!scoutLoading) { setElapsedSeconds(0); return; }
    const startedAt = Date.now();
    const timer = setInterval(() => setElapsedSeconds(Math.round((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [scoutLoading]);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* 1. Header */}
      <div className="flex flex-col space-y-2">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
            Passo 2 de 3
          </span>
          <span className="text-slate-500 text-sm font-mono">/ Pesquisa & Dados</span>
        </div>
        <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
          {productType === 'AFFILIATE' && 'Definição da Oferta & Pesquisa de Mercado'}
          {productType === 'PROPRIETARY_LOW_TICKET' && 'Detalhes do Infoproduto & Pesquisa de Mercado'}
          {productType === 'MENTORSHIP' && 'Configuração da Mentoria & Público-Alvo'}
        </h2>
        <p className="text-sm text-slate-400">
          {productType === 'AFFILIATE' && 'Busque ofertas validadas ou insira uma nova para mapear com o Ad Scout.'}
          {productType === 'PROPRIETARY_LOW_TICKET' && 'Defina o nome do seu produto, fluxo de checkout e faça o benchmarking inteligente.'}
          {productType === 'MENTORSHIP' && 'Configure seu funil de mentoria, canal de leads e valide os temas mais buscados no mercado.'}
        </p>
      </div>

      {/* 2. Loader from Research (Affiliate Only) */}
      {productType === 'AFFILIATE' && researchProducts && researchProducts.length > 0 && (
        <Card className="bg-[#111827]/40 border-purple-500/20 shadow-sm">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2 shrink-0">
              <Bot className="h-4 w-4 text-purple-400 animate-pulse" />
              <Label className="text-purple-300 text-xs font-semibold uppercase tracking-wider font-mono">
                Importar Produto Analisado:
              </Label>
            </div>
            <div className="flex-1">
              <Select value={sourceProductResearchId ?? ''} onValueChange={loadFromResearch} disabled={autofilling}>
                <SelectTrigger className="bg-[#0f172a] border-[#334155] text-purple-200">
                  <SelectValue placeholder="Escolha um produto já analisado para autopreencher..." />
                </SelectTrigger>
                <SelectContent className="bg-[#1e293b] border-[#334155] max-h-72">
                  {researchProducts.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-white">
                      {p.name} — {p.vertical || 'sem vertical'} (Score: {p.score}/100)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 3. Core Campaign Details Form */}
      <Card className="bg-[#111827]/30 border-[#334155]">
        <CardHeader className="border-b border-[#334155]/40 py-4 px-6">
          <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
            <Target className="h-4 w-4 text-emerald-400" />
            Parâmetros Principais da Campanha
          </CardTitle>
          <CardDescription className="text-xs text-slate-400">
            Insira os dados base para a geração automatizada de anúncios e páginas.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Field: Campanha Name */}
            <div>
              <div className="flex items-center gap-1 mb-1.5">
                <Label className="text-slate-300 text-xs font-medium">
                  {productType === 'AFFILIATE' ? 'Nome da Campanha *' : 'Nome do Produto *'}
                </Label>
                <AgentHelp fieldKey="name" fieldValue={name} onApply={setName} />
              </div>
              <Input
                value={name}
                onChange={(e: any) => setName(e?.target?.value ?? '')}
                placeholder={productType === 'AFFILIATE' ? 'Ex: WL Supplement Alpha' : 'Ex: Guia Emagrecimento Definitivo'}
                className={inputCls}
              />
            </div>

            {/* Field: Platform / Checkout */}
            {productType === 'AFFILIATE' ? (
              <div>
                <div className="flex items-center gap-1 mb-1.5">
                  <Label className="text-slate-300 text-xs font-medium">Plataforma</Label>
                  <AgentHelp fieldKey="platform" fieldValue={platform} onApply={applyEnumIfValid(PLATFORMS_EXTENDED, setPlatform, 'Plataforma')} />
                </div>
                <Select value={platform} onValueChange={(v: ExtendedPlatform) => setPlatform(v)}>
                  <SelectTrigger className={inputCls}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1e293b] border-[#334155]">
                    {PLATFORMS_EXTENDED.map((p) => (
                      <SelectItem key={p} value={p} className="text-white">
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : productType === 'PROPRIETARY_LOW_TICKET' ? (
              <div>
                <div className="flex items-center gap-1 mb-1.5">
                  <Label className="text-slate-300 text-xs font-medium">Plataforma de Checkout</Label>
                </div>
                <Select value={platform} onValueChange={(v: ExtendedPlatform) => setPlatform(v)}>
                  <SelectTrigger className={inputCls}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1e293b] border-[#334155]">
                    <SelectItem value="Hotmart" className="text-white">Hotmart</SelectItem>
                    <SelectItem value="Eduzz" className="text-white">Eduzz</SelectItem>
                    <SelectItem value="Monetizze" className="text-white">Monetizze</SelectItem>
                    <SelectItem value="ClickBank" className="text-white">Stripe / Internacional</SelectItem>
                    <SelectItem value="Outro" className="text-white">Outra (Kiwify, Appmax...)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-1 mb-1.5">
                  <Label className="text-slate-300 text-xs font-medium">Modelo de Entrega</Label>
                </div>
                <Select value={platform} onValueChange={(v: ExtendedPlatform) => setPlatform(v)}>
                  <SelectTrigger className={inputCls}>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1e293b] border-[#334155]">
                    <SelectItem value="Hotmart" className="text-white">Área de Membros Hotmart</SelectItem>
                    <SelectItem value="Outro" className="text-white">Reunião Zoom / Ao Vivo</SelectItem>
                    <SelectItem value="Eduzz" className="text-white">Consultoria WhatsApp</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Field: Vertical */}
            <div>
              <div className="flex items-center gap-1 mb-1.5">
                <Label className="text-slate-300 text-xs font-medium">Vertical / Nicho</Label>
                <AgentHelp fieldKey="vertical" fieldValue={vertical} onApply={applyEnumIfValid(VERTICALS, setVertical, 'Vertical')} />
              </div>
              <Select value={vertical} onValueChange={setVertical}>
                <SelectTrigger className={inputCls}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1e293b] border-[#334155]">
                  {VERTICALS.map((v) => (
                    <SelectItem key={v} value={v} className="text-white">
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Field: Geo */}
            <div>
              <div className="flex items-center gap-1 mb-1.5">
                <Label className="text-slate-300 text-xs font-medium">Geo Segmentado</Label>
                <AgentHelp fieldKey="geo" fieldValue={geo} onApply={applyEnumIfValid(GEOS, setGeo, 'Geo')} />
              </div>
              <Select value={geo} onValueChange={setGeo}>
                <SelectTrigger className={inputCls}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1e293b] border-[#334155]">
                  {GEOS.map((g) => (
                    <SelectItem key={g} value={g} className="text-white">
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Field: Channel */}
            <div>
              <div className="flex items-center gap-1 mb-1.5">
                <Label className="text-slate-300 text-xs font-medium">Canal de Tráfego</Label>
                <AgentHelp fieldKey="channel" fieldValue={channel} context={{ vertical }} onApply={applyEnumIfValid(CHANNELS, setChannel, 'Canal')} />
              </div>
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger className={inputCls}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1e293b] border-[#334155]">
                  {CHANNELS.map((c) => (
                    <SelectItem key={c} value={c} className="text-white">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Field: Funnel */}
            <div>
              <div className="flex items-center gap-1 mb-1.5">
                <Label className="text-slate-300 text-xs font-medium">Estratégia de Funil</Label>
                <AgentHelp fieldKey="funnel" fieldValue={funnel} onApply={applyEnumIfValid(['BRIDGE', 'DIRECT', 'REVIEW', 'SL'], setFunnel, 'Funil')} />
              </div>
              <Select value={funnel} onValueChange={setFunnel}>
                <SelectTrigger className={inputCls}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1e293b] border-[#334155]">
                  {productType === 'AFFILIATE' ? (
                    <>
                      <SelectItem value="BRIDGE" className="text-white">Bridge Page (Recomendado)</SelectItem>
                      <SelectItem value="DIRECT" className="text-white">Link Direto (Fundo de Funil)</SelectItem>
                      <SelectItem value="REVIEW" className="text-white">Artigo de Review</SelectItem>
                      <SelectItem value="SL" className="text-white">Smartlink</SelectItem>
                    </>
                  ) : productType === 'PROPRIETARY_LOW_TICKET' ? (
                    <>
                      <SelectItem value="BRIDGE" className="text-white">Landing Page com CTA Direto</SelectItem>
                      <SelectItem value="REVIEW" className="text-white">Página de Vendas de Vídeo (VSL)</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="BRIDGE" className="text-white">Squeeze Page (Capturar Leads)</SelectItem>
                      <SelectItem value="DIRECT" className="text-white">Página Simples + Direct WhatsApp</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Fields dependentes do ProductType */}
            {productType === 'AFFILIATE' ? (
              <>
                <div>
                  <div className="flex items-center gap-1 mb-1.5">
                    <Label className="text-slate-300 text-xs font-medium">Comissão Inicial USD *</Label>
                    <AgentHelp fieldKey="commission" fieldValue={commission} context={{ platform, vertical, geo }} onApply={setCommission} />
                  </div>
                  <Input
                    type="number"
                    value={commission}
                    onChange={(e: any) => setCommission(e?.target?.value ?? '')}
                    placeholder="Ex: 47.00"
                    className={inputCls}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1 mb-1.5">
                    <Label className="text-slate-300 text-xs font-medium">Refund % Estimado</Label>
                    <AgentHelp fieldKey="refundPct" fieldValue={refundPct} context={{ platform, vertical }} onApply={setRefundPct} />
                  </div>
                  <Input
                    type="number"
                    value={refundPct}
                    onChange={(e: any) => setRefundPct(e?.target?.value ?? '')}
                    placeholder="Ex: 8"
                    className={inputCls}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1 mb-1.5">
                    <Label className="text-slate-300 text-xs font-medium">AOV do Funil (USD)</Label>
                    <AgentHelp fieldKey="aov" fieldValue={aov} onApply={setAov} />
                  </div>
                  <Input
                    type="number"
                    value={aov}
                    onChange={(e: any) => setAov(e?.target?.value ?? '')}
                    placeholder="Ex: 67.00"
                    className={inputCls}
                  />
                </div>
                <div className="sm:col-span-2">
                  <div className="flex items-center gap-1 mb-1.5">
                    <Label className="text-slate-300 text-xs font-medium">Link de Afiliado (HopLink/Smartlink) *</Label>
                    <AgentHelp fieldKey="offerUrl" fieldValue={offerUrl} onApply={setOfferUrl} />
                  </div>
                  <Input
                    value={offerUrl}
                    onChange={(e: any) => setOfferUrl(e?.target?.value ?? '')}
                    placeholder="https://hop.clickbank.net/..."
                    className={inputCls}
                  />
                </div>
              </>
            ) : productType === 'PROPRIETARY_LOW_TICKET' ? (
              <>
                <div>
                  <div className="flex items-center gap-1 mb-1.5">
                    <Label className="text-slate-300 text-xs font-medium">Preço do Produto (R$ / USD) *</Label>
                  </div>
                  <Input
                    type="number"
                    value={commission}
                    onChange={(e: any) => setCommission(e?.target?.value ?? '')}
                    placeholder="Ex: 47.00"
                    className={inputCls}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1 mb-1.5">
                    <Label className="text-slate-300 text-xs font-medium">AOV Estimado (com Upsells)</Label>
                  </div>
                  <Input
                    type="number"
                    value={aov}
                    onChange={(e: any) => setAov(e?.target?.value ?? '')}
                    placeholder="Ex: 67.00"
                    className={inputCls}
                  />
                </div>
                {setCheckoutWebhook && (
                  <div className="sm:col-span-2">
                    <div className="flex items-center gap-1 mb-1.5">
                      <Label className="text-slate-300 text-xs font-medium">URL do Webhook do Checkout</Label>
                    </div>
                    <Input
                      value={checkoutWebhook}
                      onChange={(e: any) => setCheckoutWebhook(e?.target?.value ?? '')}
                      placeholder="https://sua-plataforma-checkout.com/webhook..."
                      className={inputCls}
                    />
                  </div>
                )}
              </>
            ) : (
              <>
                <div>
                  <div className="flex items-center gap-1 mb-1.5">
                    <Label className="text-slate-300 text-xs font-medium">Preço da Mentoria *</Label>
                  </div>
                  <Input
                    type="number"
                    value={commission}
                    onChange={(e: any) => setCommission(e?.target?.value ?? '')}
                    placeholder="Ex: 997.00"
                    className={inputCls}
                  />
                </div>
                {setLeadMagnet && (
                  <div>
                    <div className="flex items-center gap-1 mb-1.5">
                      <Label className="text-slate-300 text-xs font-medium">Isca Digital / Recompensa</Label>
                    </div>
                    <Input
                      value={leadMagnet}
                      onChange={(e: any) => setLeadMagnet(e?.target?.value ?? '')}
                      placeholder="Ex: E-book PDF, Aula Grátis no YouTube"
                      className={inputCls}
                    />
                  </div>
                )}
                {setWhatsappLink && (
                  <div className="sm:col-span-2">
                    <div className="flex items-center gap-1 mb-1.5">
                      <Label className="text-slate-300 text-xs font-medium">Link de Redirecionamento do WhatsApp</Label>
                    </div>
                    <Input
                      value={whatsappLink}
                      onChange={(e: any) => setWhatsappLink(e?.target?.value ?? '')}
                      placeholder="https://wa.me/5511999999999?text=Quero%20saber%20mais..."
                      className={inputCls}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 4. Ad Scout Oracle V2 Benchmarking Panel */}
      <Card className="bg-[#111827]/30 border-purple-500/20 shadow-lg">
        <CardHeader className="border-b border-purple-500/10 py-4 px-6 bg-gradient-to-r from-purple-950/20 to-transparent">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
              <Bot className="h-5 w-5 text-purple-400" />
              Ad Scout Oracle v2 — Análise de Concorrência
            </CardTitle>
            {scoutResult && (
              <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono">
                Analisado: {scoutResult.query}
              </Badge>
            )}
          </div>
          <CardDescription className="text-xs text-slate-400">
            Varra a web por concorrentes ativos, copie os ângulos de headline e descubra as maiores dores de fóruns (Reddit/Quora).
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            <div className="sm:col-span-3">
              <Label className="text-slate-300 text-xs font-medium">Palavra-chave ou Nicho para Pesquisa</Label>
              <Input
                value={scoutQuery}
                onChange={(e: any) => setScoutQuery(e?.target?.value ?? '')}
                placeholder={
                  isIdeaMode
                    ? 'Descreva o nicho ou ideia (ex: jejum intermitente, automação de planilhas)...'
                    : 'Ex: weight loss supplements, emagrecer rapido, etc.'
                }
                className="bg-[#0f172a] border-purple-500/30 text-white placeholder:text-slate-500 focus:border-purple-500 focus:ring-purple-500/10 mt-1.5"
                disabled={busy}
              />
            </div>
            <div>
              <Label className="text-slate-300 text-xs font-medium">Tipo de Varredura</Label>
              <Select
                value={scoutMode === 'idea' ? 'IDEA' : scoutProductType}
                onValueChange={(v: string) => {
                  if (v === 'IDEA') { setScoutMode('idea'); return; }
                  setScoutMode('ads');
                  setScoutProductType(v as ProductType);
                }}
                disabled={busy}
              >
                <SelectTrigger className="bg-[#0f172a] border-purple-500/30 text-white mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1e293b] border-[#334155]">
                  <SelectItem value="IDEA" className="text-purple-300 font-medium">
                    ✨ Criar Ideia de Produto Próprio (IA Ads Scout)
                  </SelectItem>
                  <SelectItem value="AFFILIATE" className="text-white">Afiliado / Arbitragem</SelectItem>
                  <SelectItem value="PROPRIETARY_LOW_TICKET" className="text-white">Infoproduto Próprio</SelectItem>
                  <SelectItem value="MENTORSHIP" className="text-white">Mentoria / Alto Ticket</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-300 text-xs font-medium">País da biblioteca</Label>
              <Select
                value={scoutCountry}
                onValueChange={(v: string) => setScoutCountry(toScoutCountry(v))}
                disabled={busy}
              >
                <SelectTrigger className="bg-[#0f172a] border-purple-500/30 text-white mt-1.5 font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1e293b] border-[#334155]">
                  <SelectItem value="ALL" className="text-white font-mono">ALL — global</SelectItem>
                  {GEOS.map((geo) => (
                    <SelectItem key={geo} value={geo} className="text-white font-mono">
                      {toScoutCountry(geo)}
                      {toScoutCountry(geo) !== geo ? ` (${geo})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {scoutFailure && (
            <div
              className={`rounded-lg border p-3 ${
                scoutFailure.kind === 'missing_keys'
                  ? 'border-amber-500/30 bg-amber-500/[0.05]'
                  : 'border-destructive/30 bg-destructive/[0.05]'
              }`}
              role="alert"
            >
              <div className="flex items-start gap-2.5">
                {scoutFailure.kind === 'missing_keys' ? (
                  <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                ) : scoutFailure.kind === 'unavailable' ? (
                  <ServerCrash className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                ) : (
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-foreground">{scoutFailure.title}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{scoutFailure.detail}</p>
                  {scoutFailure.kind === 'missing_keys' && (
                    <code className="mt-2 block rounded border border-border bg-card px-2 py-1.5 font-mono text-[10px] text-muted-foreground">
                      FIRECRAWL_API_KEY=...{'\n'}OPENROUTER_API_KEY=...
                    </code>
                  )}
                </div>
                <button
                  type="button"
                  onClick={dismissScoutFailure}
                  className="shrink-0 text-[11px] text-muted-foreground hover:text-foreground"
                >
                  fechar
                </button>
              </div>
            </div>
          )}

          <Button
            onClick={isIdeaMode ? runProductIdea : runAdScoutResearch}
            disabled={busy || !scoutQuery.trim()}
            className="bg-purple-600 hover:bg-purple-700 text-white gap-2 w-full sm:w-auto text-xs font-semibold py-2.5 transition-all"
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {isIdeaMode ? 'Consultando fontes em tempo real...' : 'Raspando Meta Ads Library e orquestrando OpenRouter...'}
              </>
            ) : isIdeaMode ? (
              <>
                <Sparkles className="h-4 w-4" />
                Gerar Oferta com IA ✨
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Disparar Ad Scout Oracle
              </>
            )}
          </Button>

          {generatingIdea && (
            <div className="mt-4 space-y-2 rounded-lg border border-border bg-card/40 p-4">
              <p className="flex items-center gap-2 font-mono text-[11px] text-purple-300">
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                {ideaStage || IDEA_STAGES[0]}
              </p>
              <ol className="space-y-1">
                {IDEA_STAGES.map((stage) => {
                  const done = IDEA_STAGES.indexOf(stage) < IDEA_STAGES.indexOf(ideaStage as typeof IDEA_STAGES[number]);
                  const active = stage === ideaStage;
                  return (
                    <li
                      key={stage}
                      className={`text-[11px] ${
                        done ? 'text-muted-foreground line-through' : active ? 'text-foreground' : 'text-muted-foreground/60'
                      }`}
                    >
                      {stage}
                    </li>
                  );
                })}
              </ol>
            </div>
          )}

          {scoutLoading && !isIdeaMode && (
            <div className="mt-4 space-y-3 rounded-lg border border-purple-500/10 bg-purple-950/10 p-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-purple-300">
                  {scoutStage || SCOUT_STAGES[0]}
                </span>
                <span
                  className={`font-mono text-[11px] ${
                    elapsedSeconds > SCOUT_SLOW_AFTER_SECONDS ? 'text-amber-400' : 'text-slate-500'
                  }`}
                >
                  {elapsedSeconds}s{' '}
                  <span className="text-slate-600">
                    {elapsedSeconds > SCOUT_SLOW_AFTER_SECONDS ? '· acima da janela normal' : '/ ~15–45s'}
                  </span>
                </span>
              </div>

              <ol className="space-y-1.5">
                {SCOUT_STAGES.map((stage, index) => {
                  const current = scoutStageIndex(scoutStage);
                  const done = current > index;
                  const active = current === index || (current === -1 && index === 0);
                  return (
                    <li key={stage} className="flex items-center gap-2 text-[11px]">
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[9px] ${
                          done
                            ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-400'
                            : active
                              ? 'border-purple-500/50 bg-purple-500/15 text-purple-300'
                              : 'border-slate-700 bg-slate-900 text-slate-600'
                        }`}
                      >
                        {done ? <CheckCircle2 className="h-2.5 w-2.5" /> : index + 1}
                      </span>
                      <span
                        className={
                          done ? 'text-slate-500 line-through' : active ? 'text-purple-200' : 'text-slate-600'
                        }
                      >
                        {stage}
                      </span>
                      {active && <Loader2 className="h-3 w-3 animate-spin text-purple-400" />}
                    </li>
                  );
                })}
              </ol>

              <Progress className="h-1.5 bg-slate-900 overflow-hidden">
                <div
                  className="h-full rounded bg-purple-500 transition-all duration-700"
                  style={{
                    width: `${Math.min(
                      95,
                      ((Math.max(scoutStageIndex(scoutStage), 0) + 1) / SCOUT_STAGES.length) * 100,
                    )}%`,
                  }}
                />
              </Progress>
            </div>
          )}

          {/* Ideia de produto próprio gerada pela IA */}
          {isIdeaMode && productIdea && (
            <div className="mt-4 rounded-xl border border-purple-500/30 bg-purple-950/10 p-4 shadow-lg shadow-purple-900/10">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-purple-400">
                    <Sparkles className="h-3 w-3" /> Ideia de produto próprio
                  </p>
                  <h3 className="mt-1 text-base font-semibold text-white">{productIdea.name}</h3>
                  {productIdea.vertical && (
                    <p className="font-mono text-[11px] text-slate-500">{productIdea.vertical}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                    Potencial de receita
                  </p>
                  <p className={`font-mono text-2xl font-bold ${revenueScoreTone(productIdea.revenueScore)}`}>
                    {productIdea.revenueScore}
                    <span className="text-sm text-slate-600">/100</span>
                  </p>
                </div>
              </div>

              {productIdea.summary && (
                <p className="mt-3 text-[11px] leading-relaxed text-slate-300">{productIdea.summary}</p>
              )}

              {ideaIsMock && (
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/[0.05] p-3">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
                  <p className="text-[11px] leading-relaxed text-amber-200">
                    O backend respondeu em modo simulado (<code className="font-mono">isMockMode</code>). Estes
                    números não vieram de fonte nenhuma — não use para decidir oferta nem orçamento.
                  </p>
                </div>
              )}

              {/* Veredito de tendência: cinza quando não há dado, nunca otimista por omissão. */}
              {(() => {
                const trend = trendPresentation(trendSlope);
                const TrendIcon = trend.icon;
                return (
                  <div className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-card/40 p-2.5">
                    <TrendIcon className={`h-4 w-4 shrink-0 ${trend.tone}`} />
                    <span className={`text-[11px] font-medium ${trend.tone}`}>{trend.label}</span>
                  </div>
                );
              })()}

              {sourceReport && (
                <div className="mt-3">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    Fontes consultadas
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {SOURCE_ORDER.map((key) => {
                      const live = sourceReport[key] === 'live';
                      return (
                        <Badge
                          key={key}
                          className={`text-[10px] font-normal ${
                            live
                              ? 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'
                              : 'bg-amber-500/15 text-amber-300 hover:bg-amber-500/25'
                          }`}
                        >
                          {sourceLabel(key)} {live ? '✓ Ativo' : '⚠️ Indisponível'}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-[#334155] bg-[#0f172a]/60 p-3">
                  <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                    <DollarSign className="h-3 w-3" /> Preço sugerido / AOV
                  </p>
                  <p className="mt-1 font-mono text-sm text-emerald-400">
                    {productIdea.suggestedPrice !== null ? `R$ ${productIdea.suggestedPrice.toFixed(2)}` : '—'}
                    <span className="text-slate-600"> / </span>
                    {productIdea.suggestedAov !== null ? `R$ ${productIdea.suggestedAov.toFixed(2)}` : '—'}
                  </p>
                </div>

                <div className="rounded-lg border border-[#334155] bg-[#0f172a]/60 p-3">
                  <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                    <Magnet className="h-3 w-3" /> Isca digital recomendada
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-300">
                    {productIdea.leadMagnet ?? 'não sugerida'}
                  </p>
                </div>
              </div>

              {productIdea.upsells.length > 0 && (
                <div className="mt-3">
                  <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                    <ArrowUpRight className="h-3 w-3" /> Upsells sugeridos
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {productIdea.upsells.map((upsell, idx) => (
                      <Badge
                        key={`${upsell}-${idx}`}
                        className="bg-purple-500/15 text-[10px] font-normal text-purple-200 hover:bg-purple-500/25"
                      >
                        {upsell}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-purple-500/15 pt-3">
                <Button
                  size="sm"
                  onClick={() => { void importProductIdea(productIdea); }}
                  disabled={!productIdea.id || autofilling}
                  className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40"
                >
                  {autofilling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                  Importar Produto
                </Button>
                {!productIdea.id && (
                  <span className="text-[10px] text-amber-400/80">
                    a ideia não foi persistida: sem id não há o que importar
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Scout Results Rendering */}
          {scoutResult && !isIdeaMode && (
            <div className="space-y-6 mt-6 pt-6 border-t border-[#334155]/40">
              {/* Grid de métricas */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-lg border border-[#334155] bg-[#0f172a]/60 p-3">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">Anúncios ativos</p>
                  <p className="mt-1 font-mono text-xl font-bold text-white">{scoutResult.adCount}</p>
                  <p className="text-[10px] text-slate-600">concorrentes na praça</p>
                </div>

                <div className="rounded-lg border border-[#334155] bg-[#0f172a]/60 p-3">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">Preço médio</p>
                  <p className="mt-1 font-mono text-xl font-bold text-emerald-400">
                    R$ {scoutResult.avgPrice.toFixed(2)}
                  </p>
                  <p className="text-[10px] text-slate-600">praticado no nicho</p>
                </div>

                <div className="rounded-lg border border-[#334155] bg-[#0f172a]/60 p-3">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">Saturação</p>
                  <p className={`mt-1 font-mono text-xl font-bold capitalize ${SATURATION_TONE[saturation]}`}>
                    {saturation}
                  </p>
                  <p className="text-[10px] text-slate-600">{scoutResult.competitors.length} mapeados</p>
                </div>

                <div
                  className={`rounded-lg border p-3 ${
                    highRiskClaims.length > 0 ? 'border-rose-500/25 bg-rose-500/[0.04]' : 'border-[#334155] bg-[#0f172a]/60'
                  }`}
                >
                  <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">Risco compliance</p>
                  <p
                    className={`mt-1 font-mono text-xl font-bold ${
                      highRiskClaims.length > 0 ? 'text-rose-400' : 'text-emerald-400'
                    }`}
                  >
                    {highRiskClaims.length}
                  </p>
                  <p className="text-[10px] text-slate-600">
                    claim(s) de alto risco em {scoutResult.analyzedClaims.length}
                  </p>
                </div>
              </div>

              {/* Dossiê de compliance */}
              {scoutResult.analyzedClaims.length > 0 && (
                <div className="space-y-2">
                  <h3 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-slate-300">
                    <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
                    Dossiê de compliance
                    {highRiskClaims.length > 0 && (
                      <Badge className="bg-rose-500/15 text-[10px] text-rose-300 hover:bg-rose-500/25">
                        {highRiskClaims.length} de alto risco
                      </Badge>
                    )}
                  </h3>
                  <div className="space-y-2">
                    {sortedClaims.map((claim, idx) => {
                      const tone = riskTone(claim.riskLevel);
                      const high = isHighRisk(claim);
                      return (
                        <div key={`${claim.claim}-${idx}`} className={`rounded-lg border p-3 ${tone.border}`}>
                          <div className="flex flex-wrap items-center gap-2">
                            {high && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-rose-400" />}
                            <Badge className={`${tone.chip} font-mono text-[9px] uppercase hover:opacity-90`}>
                              {claim.riskLevel}
                            </Badge>
                            <span className="font-mono text-[10px] text-slate-500">
                              via {claim.sourceCompetitor}
                            </span>
                          </div>
                          <p className="mt-2 font-mono text-[11px] leading-relaxed text-slate-200">
                            &ldquo;{claim.claim}&rdquo;
                          </p>
                          <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">
                            <span className="text-slate-600">Por quê: </span>
                            {claim.justification}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Sem concorrentes: estado vazio instrutivo, nunca dado inventado. */}
              {scoutResult.competitors.length === 0 && (
                <div className="rounded-lg border border-dashed border-border bg-card/30 p-5 text-center">
                  <Inbox className="mx-auto h-6 w-6 text-muted-foreground" />
                  <p className="mt-2 text-xs font-semibold text-foreground">
                    Nenhum anúncio ativo encontrado para este nicho
                  </p>
                  <p className="mx-auto mt-1.5 max-w-md text-[11px] leading-relaxed text-muted-foreground">
                    Não inventamos concorrentes. Isso costuma significar nicho pouco explorado em{' '}
                    <span className="font-mono">{scoutCountry}</span> — ou termo específico demais. Tente um
                    termo mais amplo, troque o país da biblioteca, ou confirme na Meta Ads Library e no Google
                    Ads Transparency Center se existe alguém anunciando hoje.
                  </p>
                </div>
              )}

              {/* Concorrentes */}
              {scoutResult.competitors.length > 0 && (
                <div className="space-y-2">
                  <h3 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-slate-300">
                    <Target className="h-3.5 w-3.5 text-purple-400" />
                    Concorrentes mapeados
                  </h3>
                  <div className="divide-y divide-[#1e293b] overflow-hidden rounded-lg border border-[#334155]">
                    {scoutResult.competitors.map((comp, idx) => (
                      <div
                        key={`${comp.url}-${idx}`}
                        className="flex flex-wrap items-start justify-between gap-3 bg-[#0f172a]/60 p-3 transition-colors hover:bg-[#0f172a]"
                      >
                        <div className="min-w-0 flex-1">
                          <a
                            href={comp.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs font-semibold text-sky-400 hover:text-sky-300"
                          >
                            {comp.name}
                            <Link2 className="h-3 w-3 shrink-0" />
                          </a>
                          <p className="mt-1 text-[11px] leading-relaxed text-slate-400">{comp.angle}</p>
                          <p className="mt-0.5 truncate font-mono text-[10px] text-slate-600">{comp.url}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          {typeof comp.activeDays === 'number' && (
                            <div className="text-right">
                              <p className="font-mono text-[10px] uppercase text-slate-600">no ar</p>
                              <p className={`font-mono text-xs ${MATURITY_TONE[adMaturity(comp.activeDays)]}`}>
                                {comp.activeDays}d
                              </p>
                              <p className="font-mono text-[9px] text-slate-600">
                                {adMaturity(comp.activeDays)}
                              </p>
                            </div>
                          )}
                          <div className="text-right">
                            <p className="font-mono text-[10px] uppercase text-slate-600">preço</p>
                            <p className="font-mono text-xs text-emerald-400">R$ {comp.price.toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Dores da audiência */}
              {scoutResult.audiencePain.length > 0 && (
                <div className="space-y-2">
                  <h3 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-slate-300">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                    Dores reais capturadas
                  </h3>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {scoutResult.audiencePain.map((pain, idx) => (
                      <div
                        key={`${pain}-${idx}`}
                        className="rounded border border-[#334155] bg-[#0f172a] p-2.5 text-[11px] leading-relaxed text-slate-300"
                      >
                        {pain}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ângulos sugeridos */}
              {scoutResult.anglesSuggested.length > 0 && (
                <div className="space-y-2">
                  <h3 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-slate-300">
                    <Tag className="h-3.5 w-3.5 text-sky-400" />
                    Ângulos de anúncio sugeridos
                  </h3>
                  <div className="grid grid-cols-1 gap-2">
                    {scoutResult.anglesSuggested.map((angle, idx) => (
                      <div
                        key={`${angle}-${idx}`}
                        className="rounded border border-sky-500/20 bg-sky-500/[0.04] p-2.5 text-[11px] leading-relaxed text-slate-200"
                      >
                        {angle}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4b. Injeção de conhecimento (YouTube / GitHub / LP concorrente) */}
      <KnowledgeInjector
        campaignId={campaignId}
        extraTags={[vertical, productType].filter(Boolean) as string[]}
      />

      {/* 5. Navigation Footer */}
      <div className="flex justify-between items-center pt-4 border-t border-[#334155]/60">
        <Button
          variant="outline"
          onClick={onPrev}
          className="border-[#334155] text-slate-300 hover:bg-[#1e293b] gap-1.5 text-xs font-semibold py-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar
        </Button>
        <Button
          onClick={onNext}
          disabled={!name.trim() || (productType === 'AFFILIATE' && !offerUrl.trim())}
          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 gap-1.5 text-xs font-semibold py-2 transition-all shadow-md shadow-emerald-500/10"
        >
          Avançar para Break-even <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
