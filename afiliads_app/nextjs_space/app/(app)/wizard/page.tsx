'use client';
import { StepProductType, ProductType } from './_components/step-product-type';
import {
  StepProductSearch, SCOUT_STAGES, toScoutCountry, normalizeProductIdea,
  describeScoutFailure, deriveSourceReport, normalizeTrendSlope, IDEA_STAGES,
  type ScoutResult, type ScoutMode, type ProductIdea, type ScoutFailure,
  type SourceReport, type TrendSlope,
} from './_components/step-product-search';
import { EbookDraftPanel } from './_components/ebook-draft-panel';
import { AICostDashboard } from './_components/ai-cost-dashboard';
import { StepCalculator } from './_components/step-calculator';
import { StepCreativeGen } from './_components/step-creative-gen';
import { StepLandingPage } from './_components/step-landing-page';
import { StepLaunch } from './_components/step-launch';
import { ProductStudio } from './_components/product-studio';
import { AgentHelp, ChecklistItemRow, applyEnumIfValid, AutofillContext } from './_components/agent-help';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  Wand2, ArrowRight, ArrowLeft, ShieldCheck, FileText, Search, Tag,
  Settings, Radio, Rocket, CheckCircle2, Copy, ExternalLink, AlertTriangle, Info,
  Eye, Loader2, Shield, XCircle, Sparkles, TrendingUp, Save, Zap, Play, Bot
} from 'lucide-react';
import {
  PLATFORMS, VERTICALS, CHANNELS, GEOS, CVR_DEFAULTS, ANTISTRIKE_ITEMS,
  BRIDGE_CHECKLIST, GOOGLE_ADS_CHECKLIST, TRACKING_CHECKLIST_MAXWEB,
  TRACKING_CHECKLIST_CB, GOLIVE_CHECKLIST, KEYWORDS_BY_VERTICAL,
  NEGATIVES_BY_VERTICAL, PLATFORMS_EXTENDED, ExtendedPlatform, KEYWORD_TIERS,
} from '@/lib/wizard-data';
import { Step7LeadingStream } from '@/components/wizard/Step7LeadingStream';
import { PresellPageType, PRESELL_PAGE_TYPES } from '@/lib/presell-types';
import { ExperimentSetupCard } from '@/components/wizard/ExperimentSetupCard';
import { ExperimentDashboardCard } from '@/components/wizard/ExperimentDashboardCard';
import { requireOk, requireOkJson } from '@/lib/wizard-persistence';
import { getCampaignPresellId } from '@/lib/wizard-campaign-hydration';
import { validateAffiliateLink, AffiliatePlatform, HopLinkValidation } from '@/lib/affiliate-link-validator';
import { ProductResearch } from '@prisma/client';

const STEPS = [
  { num: 1, title: 'Oferta', icon: FileText },
  { num: 2, title: 'Break-even', icon: Settings },
  { num: 3, title: 'Anti-strike', icon: ShieldCheck },
  { num: 4, title: 'Pré-sell', icon: Eye },
  { num: 5, title: 'Keywords', icon: Search },
  { num: 6, title: 'Naming & E-book', icon: Tag },
  { num: 7, title: 'Google Ads', icon: Settings },
  { num: 8, title: 'Tracking', icon: Radio },
  { num: 9, title: 'Go-live', icon: Rocket },
];

/** Um pouco acima do `maxDuration = 90` da rota, para o erro do servidor vencer quando houver um. */
const SCOUT_CLIENT_TIMEOUT_MS = 100_000;

/** Rota real do Trend Scout: exige `{ niche, country }` e devolve o ProductResearch criado. */
const PRODUCT_IDEA_ENDPOINT = '/api/search/trend-scout';

export default function WizardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [experimentId, setExperimentId] = useState<string | null>(null);

  const [autofilling, setAutofilling] = useState(false);
  const autofillLock = useRef(false);
  const [autofillRationale, setAutofillRationale] = useState<Record<string, string>>({});
  const [autofillSummary, setAutofillSummary] = useState<string | null>(null);
  const [aiNegatives, setAiNegatives] = useState<string[] | null>(null);
  const [sourceProductResearchId, setSourceProductResearchId] = useState<string | null>(null);
  const [researchProducts, setResearchProducts] = useState<Array<{ id: string; name: string; score: number; vertical: string; confirmedAt?: string | null }>>([]);

  const [productType, setProductType] = useState<ProductType>('AFFILIATE');
  const [showProductTypeSelection, setShowProductTypeSelection] = useState(true);
  const [checkoutWebhook, setCheckoutWebhook] = useState('');
  const [leadMagnet, setLeadMagnet] = useState('');
  const [whatsappLink, setWhatsappLink] = useState('');
  const [step4SubTab, setStep4SubTab] = useState<'presell' | 'creative'>('presell');


  const [auditing, setAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState<any>(null);
  const [showAuditDialog, setShowAuditDialog] = useState(false);

  const runCampaignAudit = async () => {
    if (!campaignId) return;
    setAuditing(true);
    setAuditResult(null);
    try {
      const res = await fetch('/api/campaign-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId }),
      });
      if (res.ok) {
        const data = await res.json();
        setAuditResult(data);
        setShowAuditDialog(true);
        toast.success('Auditoria concluída com sucesso!');
      } else {
        toast.error('Erro ao auditar campanha');
      }
    } catch {
      toast.error('Erro ao auditar campanha');
    } finally {
      setAuditing(false);
    }
  };

  // Step 1
  const [platform, setPlatform] = useState<ExtendedPlatform>('ClickBank');
  const [name, setName] = useState('');
  const [vertical, setVertical] = useState('Weight Loss');
  const [geo, setGeo] = useState('US');
  const [channel, setChannel] = useState('SEARCH');
  const [funnel, setFunnel] = useState('BRIDGE');
  const [blockedChannels, setBlockedChannels] = useState<string[]>([]);
  const [channelBlockReason, setChannelBlockReason] = useState<string | null>(null);
  const [commission, setCommission] = useState('');
  const [refundPct, setRefundPct] = useState('');
  const [aov, setAov] = useState('');
  const [offerUrl, setOfferUrl] = useState('');
  const [hopLinkValidation, setHopLinkValidation] = useState<HopLinkValidation | null>(null);

  // Step 2
  const [cvrExpected, setCvrExpected] = useState('');

  // Step 3
  const [antistrikeChecks, setAntistrikeChecks] = useState<Record<string, boolean>>({});

  // Step 4
  const [bridgeChecks, setBridgeChecks] = useState<Record<string, boolean>>({});
  const [presellUrl, setPresellUrl] = useState('');
  const [flowpageUrl, setFlowpageUrl] = useState('');
  const [hostingerDomain, setHostingerDomain] = useState('');
  const [presellHtml, setPresellHtml] = useState('');
  const [pageType, setPageType] = useState<PresellPageType>('advertorial');
  const [popupGate, setPopupGate] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [generatingPresell, setGeneratingPresell] = useState(false);
  // Staleness cross-step (Fase 2, 2026-07-27): snapshot dos campos que a presell usa pra se
  // gerar, tirado no momento da geração — se algum divergir depois (usuário mudou canal/tipo
  // de página/vídeo/nome em passo posterior), a presell pode estar desatualizada e precisa
  // regenerar antes de lançar. Comparação é só client-side (não bloqueia nada sozinha —
  // bridge_ok em GOLIVE_CHECKLIST continua sendo o gate real), é só aviso antecipado.
  const [presellSnapshot, setPresellSnapshot] = useState<{ channel: string; pageType: PresellPageType; videoUrl: string; name: string } | null>(null);
  const [presellId, setPresellId] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [ftpDomains, setFtpDomains] = useState<string[]>([]);
  const [publishingOwnDomain, setPublishingOwnDomain] = useState(false);
  const [presellCustomContext, setPresellCustomContext] = useState('');

  // Step 5
  const [selectedKeywords, setSelectedKeywords] = useState<Array<{keyword:string;layer:string;matchType:string;relevance:number;selected:boolean}>>([]);
  const [newKeyword, setNewKeyword] = useState('');

  // Step 6
  const [version, setVersion] = useState('1');

  // Step 7
  const [googleAdsChecks, setGoogleAdsChecks] = useState<Record<string, boolean>>({});
  const [creatingGads, setCreatingGads] = useState(false);
  const [googleCampaignId, setGoogleCampaignId] = useState<string | null>(null);

  // Step 8
  const [trackingChecks, setTrackingChecks] = useState<Record<string, boolean>>({});
  const [postbackUrl, setPostbackUrl] = useState('');
  const [clickidToken, setClickidToken] = useState('clickid');

  // Step 9
  const [goLiveChecks, setGoLiveChecks] = useState<Record<string, boolean>>({});
  const [budgetTest, setBudgetTest] = useState('50');

  // Metadados de verificação real dos checklists (auto vs autoatestado) — populado ao carregar
  // a campanha e ao rodar a verificação automática (/api/campaigns/[id]/checklists/verify).
  const [checklistMeta, setChecklistMeta] = useState<Record<string, { verificationType: string; note?: string | null }>>({});
  const [verifyingChecklist, setVerifyingChecklist] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [testDuration, setTestDuration] = useState('72h');
  const [budgetScale, setBudgetScale] = useState('0');
  const [loopEnabled, setLoopEnabled] = useState(false);
  const [loopInterval, setLoopInterval] = useState('24h');
  const [loopAgents, setLoopAgents] = useState('ads,compliance');

  // Ad Scout Oracle V2 States
  const [scoutQuery, setScoutQuery] = useState('');
  const [scoutLoading, setScoutLoading] = useState(false);
  const [scoutStage, setScoutStage] = useState('');
  const [scoutResult, setScoutResult] = useState<ScoutResult | null>(null);
  const [scoutCountry, setScoutCountry] = useState('BR');
  const [scoutMode, setScoutMode] = useState<ScoutMode>('ads');
  const [productIdea, setProductIdea] = useState<ProductIdea | null>(null);
  const [generatingIdea, setGeneratingIdea] = useState(false);
  const [ideaStage, setIdeaStage] = useState('');
  const [trendSlope, setTrendSlope] = useState<TrendSlope>(null);
  const [sourceReport, setSourceReport] = useState<SourceReport | null>(null);
  const [ideaIsMock, setIdeaIsMock] = useState(false);
  const [scoutFailure, setScoutFailure] = useState<ScoutFailure | null>(null);
  const [scoutProductType, setScoutProductType] = useState<ProductType>('AFFILIATE');

  // Break-even calculations
  const commVal = parseFloat(commission) || 0;
  const refVal = parseFloat(refundPct) || 0;
  const cvr = parseFloat(cvrExpected) || CVR_DEFAULTS[vertical] || 1.0;
  const commissionNet = commVal * (1 - refVal / 100);
  const epcBE = commissionNet * (cvr / 100);
  const cpcMax = epcBE;
  const cpcScale = cpcMax / 1.3;

  // Campaign name generator
  const platformCode: Record<string, string> = { ClickBank: 'CB', BuyGoods: 'BG', MaxWeb: 'MW', Hotmart: 'HT', Eduzz: 'ED', Monetizze: 'MZ' };
  const verticalCode: Record<string, string> = { 'Weight Loss': 'WL', Nutra: 'NUTRA', 'Make Money': 'MMO', Relationships: 'REL', Health: 'HEALTH', Beauty: 'BEAUTY', 'Cursos BR': 'CURSO', Outro: 'OTHER' };
  const campaignNameGen = `${platformCode[platform] ?? 'XX'}_${verticalCode[vertical] ?? 'XX'}_${geo}_${channel}_${funnel}_v${version}`;
  const utmString = `?utm_source=google&utm_medium=cpc&utm_campaign=${campaignNameGen}&utm_content={creative}&utm_term={keyword}`;

  const days = testDuration === '48h' ? 2 : testDuration === '72h' ? 3 : parseInt(testDuration) || 3;
  const budgetDaily = (parseFloat(budgetTest) || 50) / days;

  // Step completion tracking
  const stepCompletion = {
    1: name.trim().length > 0 && commVal > 0,
    2: true,
    3: platform !== 'ClickBank' || ANTISTRIKE_ITEMS.filter(i => i.critical).every(i => antistrikeChecks[i.key]),
    4: BRIDGE_CHECKLIST.filter(i => i.critical).every(i => bridgeChecks[i.key]),
    5: selectedKeywords.filter(k => k.selected).length >= 1,
    6: true,
    7: GOOGLE_ADS_CHECKLIST.filter(i => i.critical).every(i => googleAdsChecks[i.key]),
    8: platform !== 'MaxWeb' || TRACKING_CHECKLIST_MAXWEB.filter(i => i.critical).every(i => trackingChecks[i.key]),
    9: GOLIVE_CHECKLIST.filter(i => i.critical).every(i => goLiveChecks[i.key]),
  } as Record<number, boolean>;

  // Retorna o id salvo (corrigido 2026-07-27): quem chama isso pra depois usar o id (ex.:
  // generatePresellHtml) não pode confiar em ler `campaignId` do estado logo em seguida — o
  // setCampaignId() daqui é assíncrono, o valor só aparece no próximo render, então o closure
  // de quem chamou ainda vê o valor antigo (null na primeira campanha nova).
  const saveCampaign = async (): Promise<string | null> => {
    setSaving(true);
    try {
      const payload = {
        name: name || `${campaignNameGen}`,
        productResearchId: sourceProductResearchId,
        platform, vertical, geo, channel, funnel,
        offerUrl, commission: commVal, refundPct: refVal,
        aov: parseFloat(aov) || 0, cvrExpected: cvr,
        commissionNet, epcBreakeven: epcBE, cpcMax, cpcScale,
        // presellUrl NÃO entra aqui de propósito (corrigido 2026-07-27): esse campo já tem
        // writers dedicados e precisos (generatePresellHtml, publishToOwnDomain, e o onBlur do
        // Input abaixo) — incluir no snapshot geral do saveCampaign() faz uma aba antiga (com
        // presellUrl desatualizado no estado local) sobrescrever silenciosamente uma URL mais
        // recente gravada por outra aba/ação (ex.: publicação em WordPress). Já aconteceu em
        // produção: presellUrl real (WordPress) foi revertido pro valor antigo do AfiliAds só
        // porque o usuário clicou "Próximo"/"Verificar" numa aba aberta antes da publicação.
        flowpageUrl, hostingerDomain,
        budgetTest: parseFloat(budgetTest) || 50,
        budgetDaily, testDuration,
        budgetScale: parseFloat(budgetScale) || 0,
        campaignNameGenerated: campaignNameGen,
        googleCampaignName: campaignNameGen,
        utmCampaign: campaignNameGen,
        utmString, wizardStep: step,
        loopEnabled, loopInterval, loopAgents,
        postbackUrl, clickidToken, presellHtml,
        pageType, popupGate, videoUrl,
      };
      if (campaignId) {
        const response = await fetch(`/api/campaigns/${campaignId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        await requireOk(response, 'Erro ao salvar campanha');
        return campaignId;
      } else {
        const res = await fetch('/api/campaigns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await requireOkJson<{ id?: unknown }>(res, 'Erro ao criar campanha');
        const newId = typeof data?.id === 'string' && data.id.length > 0 ? data.id : null;
        if (!newId) throw new Error('A API não retornou o ID da campanha criada');
        setCampaignId(newId);
        return newId;
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar campanha');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const saveChecklists = async (stepNum: number, items: Array<{key:string;label:string;critical:boolean}>, checks: Record<string,boolean>, targetCampaignId = campaignId) => {
    if (!targetCampaignId) throw new Error('Campanha ainda não foi salva');
    const response = await fetch(`/api/campaigns/${targetCampaignId}/checklists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: items.map(i => ({ step: stepNum, itemKey: i.key, itemLabel: i.label, isCritical: i.critical, isChecked: checks[i.key] ?? false })) }),
    });
    await requireOk(response, 'Erro ao salvar checklist');
  };

  const hydrateFromCampaign = (c: any) => {

    if (c?.platform === 'Stripe' || c?.platform === 'Kiwify') {
      setProductType('PROPRIETARY_LOW_TICKET');
    } else if (c?.whatsappLink || c?.leadMagnet) {
      setProductType('MENTORSHIP');
    } else {
      setProductType('AFFILIATE');
    }
    setShowProductTypeSelection(false);

    setCampaignId(c?.id ?? null);
    setPresellId(getCampaignPresellId(c));
    setSourceProductResearchId(c?.productResearchId ?? c?.productResearch?.id ?? null);
    setName(c?.name ?? '');
    setPlatform(c?.platform ?? 'ClickBank');
    setVertical(c?.vertical ?? 'Weight Loss');
    setGeo(c?.geo ?? 'US');
    setChannel(c?.channel ?? 'SEARCH');
    setFunnel(c?.funnel ?? 'BRIDGE');
    setCommission(c?.commission ? String(c.commission) : '');
    setRefundPct(c?.refundPct ? String(c.refundPct) : '');
    setAov(c?.aov ? String(c.aov) : '');
    setOfferUrl(c?.offerUrl ?? '');
    setCvrExpected(c?.cvrExpected ? String(c.cvrExpected) : '');
    setPresellUrl(c?.presellUrl ?? '');
    setFlowpageUrl(c?.flowpageUrl ?? '');
    setHostingerDomain(c?.hostingerDomain ?? '');
    setPresellHtml(c?.presellHtml ?? '');
    setPageType(c?.pageType ?? 'advertorial');
    setPopupGate(!!c?.popupGate);
    setVideoUrl(c?.videoUrl ?? '');
    setPostbackUrl(c?.postbackUrl ?? '');
    setClickidToken(c?.clickidToken ?? 'clickid');
    setBudgetTest(c?.budgetTest ? String(c.budgetTest) : '50');
    setTestDuration(c?.testDuration ?? '72h');
    setBudgetScale(c?.budgetScale ? String(c.budgetScale) : '0');
    setLoopEnabled(!!c?.loopEnabled);
    setLoopInterval(c?.loopInterval ?? '24h');
    setLoopAgents(c?.loopAgents ?? 'ads,compliance');
    setGoogleCampaignId(c?.googleCampaignId ?? null);
    setExperimentId(c?.experimentId ?? null);
    // Snapshot inicial pra detecção de staleness (Fase 2): assume que os campos batiam com a
    // presell na última vez que essa campanha foi salva — só divergências feitas NESTA sessão
    // de edição (a partir daqui) vão acender o aviso, o que cobre o cenário real do pedido
    // ("corrigi algo no passo 5 que invalida o passo 4").
    if (c?.presellGeneratedAt) {
      setPresellSnapshot({ channel: c?.channel ?? 'SEARCH', pageType: c?.pageType ?? 'advertorial', videoUrl: c?.videoUrl ?? '', name: c?.name ?? '' });
    }
    if (Array.isArray(c?.keywords) && c.keywords.length > 0) {
      setSelectedKeywords(c.keywords.map((k: any) => ({
        keyword: k.keyword, layer: k.layer, matchType: k.matchType, relevance: k.relevanceScore, selected: k.isSelected,
      })));
    }
    if (Array.isArray(c?.checklists) && c.checklists.length > 0) {
      const meta: Record<string, { verificationType: string; note?: string | null }> = {};
      const byStep: Record<number, Record<string, boolean>> = {};
      for (const row of c.checklists) {
        meta[row.itemKey] = { verificationType: row.verificationType ?? 'self_attested', note: row.note };
        byStep[row.step] = byStep[row.step] ?? {};
        byStep[row.step][row.itemKey] = row.isChecked;
      }
      setChecklistMeta(meta);
      if (byStep[3]) setAntistrikeChecks(byStep[3]);
      if (byStep[4]) setBridgeChecks(byStep[4]);
      if (byStep[7]) setGoogleAdsChecks(byStep[7]);
      if (byStep[8]) setTrackingChecks(byStep[8]);
      if (byStep[9]) setGoLiveChecks(byStep[9]);
    }
    if (typeof c?.wizardStep === 'number' && c.wizardStep >= 1 && c.wizardStep <= 9) setStep(c.wizardStep);
  };

  // Roda a verificação real (SSL, disclaimer/privacy no HTML, sync do Google Ads, etc.) em vez
  // de confiar só no que o usuário marcou — substitui o resultado dos itens `auto` pelo checado
  // de verdade; itens autoatestados continuam intocados (só o toggle manual do usuário).
  // Retorna o `byStep` fresco (corrigido 2026-07-27, Fase 2): quem chama isso e precisa decidir
  // algo NO MESMO fluxo (ex.: next()/launch() checando canAdvance logo depois) não pode ler os
  // estados setAntistrikeChecks/setBridgeChecks/etc. — são assíncronos, só valem no próximo
  // render, então o valor lido ali seria sempre o antigo (mesma classe de bug de
  // generatePresellHtml/saveCampaign, ver commit c90bafc).
  const runChecklistVerify = async (targetCampaignId = campaignId): Promise<Record<number, Record<string, boolean>> | null> => {
    if (!targetCampaignId) { toast.error('Salve a campanha (avance um passo) antes de verificar o checklist.'); return null; }
    setVerifyingChecklist(true);
    try {
      const res = await fetch(`/api/campaigns/${targetCampaignId}/checklists/verify`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { toast.error(data?.error ?? 'Erro ao verificar checklist'); return null; }
      const meta = { ...checklistMeta };
      const byStep: Record<number, Record<string, boolean>> = {};
      for (const row of data.items ?? []) {
        meta[row.itemKey] = { verificationType: row.verificationType, note: row.note };
        byStep[row.step] = byStep[row.step] ?? {};
        byStep[row.step][row.itemKey] = row.isChecked;
      }
      setChecklistMeta(meta);
      if (byStep[3]) setAntistrikeChecks((prev) => ({ ...prev, ...byStep[3] }));
      if (byStep[4]) setBridgeChecks((prev) => ({ ...prev, ...byStep[4] }));
      if (byStep[7]) setGoogleAdsChecks((prev) => ({ ...prev, ...byStep[7] }));
      if (byStep[8]) setTrackingChecks((prev) => ({ ...prev, ...byStep[8] }));
      if (byStep[9]) setGoLiveChecks((prev) => ({ ...prev, ...byStep[9] }));
      toast.success(`Checklist verificado de verdade — ${data.verified} item(ns) checado(s) automaticamente.`);
      return byStep;
    } catch {
      toast.error('Erro de rede ao verificar checklist.');
      return null;
    } finally {
      setVerifyingChecklist(false);
    }
  };

  // "Corrigir com agente" (Fase 3): chama o agente pro item de checklist que falhou. Quando o
  // item mapeia pra um campo real (ex.: postbackUrl/clickidToken), o servidor já aplica e
  // re-verifica — só precisamos sincronizar o campo local (senão o Input fica mostrando o
  // valor velho) e resincronizar o checklist inteiro pra refletir o resultado fresco.
  const fixChecklistItem = async (step: number, itemKey: string) => {
    if (!campaignId) { toast.error('Salve a campanha antes de corrigir o checklist.'); return { error: 'Campanha não salva ainda.' }; }
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/checklists/fix`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step, itemKey }),
      });
      const data = await res.json();
      if (!res.ok || data?.success === false) return { error: data?.error ?? 'Erro ao corrigir item de checklist' };
      if (data.campoAlterado === 'postbackUrl' && typeof data.valorAplicado === 'string') setPostbackUrl(data.valorAplicado);
      if (data.campoAlterado === 'clickidToken' && typeof data.valorAplicado === 'string') setClickidToken(data.valorAplicado);
      if (data.passouAVerificar || data.campoAlterado) await runChecklistVerify();
      return data;
    } catch {
      return { error: 'Erro de rede ao corrigir item de checklist.' };
    }
  };

  // Cria a campanha de verdade no Google Ads (PAUSED) — corrigido 2026-07-27: antes só existia
  // em app/(app)/campanhas/[id]/page.tsx, fora do wizard, então o Passo 9 (Go-live) travava
  // pedindo googleCampaignId sem nenhuma ação disponível no próprio wizard pra consegui-lo.
  // Reaproveita literalmente o mesmo endpoint (/api/google-ads/create) e o mesmo gate de
  // checklist crítico que já existe lá.
  const createInGoogleAds = async () => {
    if (!campaignId) { toast.error('Salve a campanha (avance um passo) antes de criar no Google Ads.'); return; }
    setCreatingGads(true);
    try {
      const res = await fetch('/api/google-ads/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setGoogleCampaignId(data.googleCampaignId ?? 'criada');
        toast.success(data.mock ? 'Campanha criada em modo simulação (credenciais reais do Google Ads não configuradas)' : 'Campanha criada no Google Ads como PAUSED — ative manualmente quando estiver pronta');
        await runChecklistVerify();
      } else {
        toast.error(data.error || 'Erro ao criar campanha no Google Ads');
      }
    } catch {
      toast.error('Erro de rede ao criar campanha no Google Ads');
    } finally {
      setCreatingGads(false);
    }
  };

  // `baseline` traz os valores conhecidos ANTES do autofill (ex.: os da campanha recém-hidratada).
  // Necessário porque o estado do React ainda não reflete a hidratação síncrona anterior quando
  // este autofill roda logo em seguida dentro do mesmo efeito assíncrono — ler os setters de estado
  // via closure aqui pegaria valores desatualizados (stale) e sobrescreveria dados reais da campanha.
  const applyAutofill = (data: any, opts?: { onlyIfEmpty?: boolean; baseline?: Record<string, any>; existingKeywordsCount?: number }) => {
    const onlyIfEmpty = !!opts?.onlyIfEmpty;
    const baseline = opts?.baseline ?? {};
    const setIf = (key: string, setter: (v: any) => void, value: any) => {
      if (value === undefined || value === null || String(value).trim() === '') return;
      if (onlyIfEmpty) {
        const cur = baseline[key];
        if (cur !== undefined && cur !== null && String(cur).trim().length > 0) return;
      }
      setter(String(value));
    };
    setIf('name', setName, data.name);
    setIf('platform', setPlatform, data.platform);
    setIf('vertical', setVertical, data.vertical);
    setIf('geo', setGeo, data.geo);
    setIf('channel', setChannel, data.channel);
    setIf('funnel', setFunnel, data.funnel);
    setIf('commission', setCommission, data.commission);
    setIf('refundPct', setRefundPct, data.refundPct);
    setIf('aov', setAov, data.aov);
    setIf('offerUrl', setOfferUrl, data.offerUrl);
    setIf('cvrExpected', setCvrExpected, data.cvrExpected);
    setIf('budgetTest', setBudgetTest, data.budgetTest);
    setIf('testDuration', setTestDuration, data.testDuration);
    setIf('budgetScale', setBudgetScale, data.budgetScale);
    if (Array.isArray(data.keywords) && data.keywords.length > 0 && (!onlyIfEmpty || !opts?.existingKeywordsCount)) {
      setSelectedKeywords(data.keywords);
    }
    if (Array.isArray(data.negatives) && data.negatives.length > 0) setAiNegatives(data.negatives);
    if (data.rationale) setAutofillRationale((prev) => ({ ...prev, ...data.rationale }));
    if (data.summary) setAutofillSummary(data.summary);
    if (data.strategy) {
      setBlockedChannels(Array.isArray(data.strategy.blockedChannels) ? data.strategy.blockedChannels : []);
      setChannelBlockReason(data.strategy.channelBlockReason ?? null);
      // O motor determinístico (lib/campaign-strategy.ts) já decide o pageType certo por canal
      // — inclusive "interstitial" só quando o canal é YOUTUBE/DEMAND_GEN e nunca em SEARCH/PMAX.
      // Aplica como sugestão (não sobrescreve escolha manual já salva de uma campanha existente).
      const suggestedPageType = data.strategy.recommendedBridgeType;
      if (['advertorial', 'pogo', 'vsl', 'interstitial'].includes(suggestedPageType)) {
        const curPageType = baseline.pageType;
        if (!onlyIfEmpty || curPageType === undefined || curPageType === null || String(curPageType).trim() === '') {
          setPageType(suggestedPageType as PresellPageType);
        }
      }
    }
  };

  const runAutofill = async (params: { productResearchId?: string; campaignId?: string; baseline?: Record<string, any>; existingKeywordsCount?: number }) => {
    if (autofillLock.current) return;
    autofillLock.current = true;
    setAutofilling(true);
    try {
      const res = await fetch('/api/wizard-autofill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productResearchId: params.productResearchId, campaignId: params.campaignId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error ?? 'Erro ao gerar sugestões do agente');
        return;
      }
      applyAutofill(data, {
        onlyIfEmpty: !params.productResearchId && !!params.campaignId,
        baseline: params.baseline,
        existingKeywordsCount: params.existingKeywordsCount,
      });
      toast.success('Wizard preenchido pelo Campaign Setup Strategist — revise e ajuste conforme necessário.');
    } catch {
      toast.error('Erro de rede ao consultar o agente.');
    } finally {
      autofillLock.current = false;
      setAutofilling(false);
    }
  };

  useEffect(() => {
    const prId = searchParams?.get('productResearchId') ?? undefined;
    const cId = searchParams?.get('campaignId') ?? undefined;
    if (!prId && !cId) return;
    (async () => {
      if (cId) {
        try {
          const res = await fetch(`/api/campaigns/${cId}`);
          if (res.ok) {
            const c = await res.json();
            hydrateFromCampaign(c);
            toast.success('Campanha carregada — continue de onde parou.');
            await runAutofill({
              campaignId: cId,
              existingKeywordsCount: Array.isArray(c?.keywords) ? c.keywords.length : 0,
              baseline: {
                name: c?.name, platform: c?.platform, vertical: c?.vertical, geo: c?.geo,
                channel: c?.channel, funnel: c?.funnel, commission: c?.commission, refundPct: c?.refundPct,
                aov: c?.aov, offerUrl: c?.offerUrl, cvrExpected: c?.cvrExpected,
                budgetTest: c?.budgetTest, testDuration: c?.testDuration, budgetScale: c?.budgetScale,
                pageType: c?.pageType,
              },
            });
            return;
          }
        } catch { /* segue sem hidratar */ }
      }
      if (prId) {
        const product = await requireConfirmedProduct(prId);
        if (!product?.confirmedAt) {
          toast.error('Confirme as regras do vendor na Busca de Produtos antes de carregar este produto.');
          router.push(`/busca-produtos?productId=${prId}`);
          return;
        }
        setSourceProductResearchId(prId);
        // Validate initial offerUrl when loading from product research
        if (product.hopLink && product.network) {
          setOfferUrl(product.hopLink);
          setHopLinkValidation(validateAffiliateLink(product.hopLink, product.network as AffiliatePlatform));
        }
        await runAutofill({ productResearchId: prId });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetch('/api/products')
      .then(res => res.ok ? res.json() : [])
      .then(data => setResearchProducts(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/wp-sites')
      .then(res => res.ok ? res.json() : Promise.resolve({} as { ftpDomains?: string[] }))
      .then(data => setFtpDomains(Array.isArray(data?.ftpDomains) ? data.ftpDomains! : []))
      .catch(() => {});
  }, []);

  // Ad Scout Oracle V2 Loader & Action Hook
  useEffect(() => {
    if (!campaignId && !sourceProductResearchId) {
      if (vertical && !scoutQuery) setScoutQuery(vertical);
      return;
    }
    const q = new URLSearchParams();
    if (campaignId) q.set('campaignId', campaignId);
    if (sourceProductResearchId) q.set('productId', sourceProductResearchId);

    fetch(`/api/search/market-scout?${q.toString()}`)
      .then(res => res.ok ? res.json() : null)
      .then(res => {
        if (res && res.found) {
          setScoutResult(res.data);
          setScoutQuery(res.data.query);
          setScoutProductType(res.data.productType);
        } else if (vertical && !scoutQuery) {
          setScoutQuery(vertical);
        }
      })
      .catch(() => {});
  }, [campaignId, sourceProductResearchId, vertical]);

  const ideaLock = useRef(false);

  const runProductIdea = async () => {
    if (!scoutQuery || scoutQuery.trim().length < 2) {
      toast.error('Descreva o nicho ou a ideia com pelo menos 2 caracteres.');
      return;
    }
    // Mesma trava do autofill: gerar oferta é caro, dois cliques não podem pagar duas vezes.
    if (ideaLock.current) return;
    ideaLock.current = true;
    setGeneratingIdea(true);
    setProductIdea(null);
    setScoutFailure(null);
    setSourceReport(null);
    setTrendSlope(null);
    setIdeaIsMock(false);
    setIdeaStage(IDEA_STAGES[0]);
    let stageIndex = 1;
    const stageTimer = setInterval(() => {
      if (stageIndex < IDEA_STAGES.length) setIdeaStage(IDEA_STAGES[stageIndex++]);
    }, 8000);
    try {
      const response = await fetch(PRODUCT_IDEA_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niche: scoutQuery.trim(), country: scoutCountry }),
        signal: AbortSignal.timeout(SCOUT_CLIENT_TIMEOUT_MS),
      });
      const data = await response.json().catch(() => null);
      if (response.status === 404 && !data?.error) {
        setScoutFailure({
          kind: 'generic',
          title: 'Rota de geração ausente',
          detail: `POST ${PRODUCT_IDEA_ENDPOINT} ainda não existe no app.`,
        });
        return;
      }
      if (!response.ok) {
        const failure = describeScoutFailure(response.status, data?.error, data?.details);
        setScoutFailure(failure);
        toast.error(`${failure.title}: ${failure.detail}`);
        return;
      }
      const idea = normalizeProductIdea(data);
      if (!idea) {
        setScoutFailure({
          kind: 'generic',
          title: 'Resposta sem oferta',
          detail: 'O servidor respondeu com sucesso, mas o payload nao trouxe uma ideia utilizavel.',
        });
        return;
      }
      // A procedencia sai da propria resposta: mock nunca vira fonte "ativa".
      const mock = data?.isMockMode === true;
      setIdeaIsMock(mock);
      setTrendSlope(normalizeTrendSlope(data));
      setSourceReport(deriveSourceReport(data));
      setProductIdea(idea);
      try {
        const refreshed = await fetch('/api/products').then((r) => (r.ok ? r.json() : []));
        if (Array.isArray(refreshed)) setResearchProducts(refreshed);
      } catch {
        /* a lista recarrega no próximo mount; não é motivo para falhar a geração */
      }
      if (mock) {
        toast.warning('O backend respondeu em modo simulado: a oferta não veio de fonte real.');
      } else {
        toast.success(
          idea.id
            ? 'Oferta desenhada. Revise e clique em Importar Produto.'
            : 'Oferta desenhada, mas sem id persistido — não dá para importar.',
        );
      }
    } catch (error: unknown) {
      const aborted = error instanceof DOMException && (error.name === 'TimeoutError' || error.name === 'AbortError');
      setScoutFailure({
        kind: aborted ? 'unavailable' : 'generic',
        title: aborted ? 'Tempo limite excedido' : 'Erro de rede',
        detail: aborted
          ? 'A geração passou do tempo limite e foi cancelada. Tente de novo ou reduza o escopo do nicho.'
          : 'Não foi possível falar com o servidor. Confira se o app está no ar.',
      });
    } finally {
      clearInterval(stageTimer);
      setIdeaStage('');
      ideaLock.current = false;
      setGeneratingIdea(false);
    }
  };

  /**
   * O autofill deriva os números do agente; a ideia traz os que o usuário aprovou
   * no card. Cravamos os da ideia por último para card e formulário não divergirem.
   */
  const importProductIdea = async (idea: ProductIdea) => {
    if (!idea.id) {
      toast.error('Esta ideia não foi persistida: não há id de produto para importar.');
      return;
    }
    await loadFromResearch(idea.id);
    if (idea.name) setName(idea.name);
    if (idea.vertical) setVertical(idea.vertical);
    // Produto próprio: a receita por venda é o preço de front-end, não uma comissão.
    if (idea.suggestedPrice !== null) setCommission(String(idea.suggestedPrice));
    if (idea.suggestedAov !== null) setAov(String(idea.suggestedAov));
    toast.success('Ideia importada com o preço e o AOV que apareceram no card.');
  };

  const scoutCountryTouched = useRef(false);
  useEffect(() => {
    if (scoutCountryTouched.current) return;
    setScoutCountry(toScoutCountry(geo));
  }, [geo]);

  const runAdScoutResearch = async () => {
    if (!scoutQuery || scoutQuery.trim().length < 2) {
      toast.error('Digite uma palavra-chave válida de no mínimo 2 caracteres.');
      return;
    }
    setScoutLoading(true);
    setScoutResult(null);
    setScoutFailure(null);
    setScoutStage(SCOUT_STAGES[0]);

    // O pipeline Firecrawl -> Meta leva 15-45s: avançamos o stepper devagar e
    // seguramos o último estágio até a resposta chegar, em vez de estourar em 4s.
    let i = 1;
    const interval = setInterval(() => {
      if (i < SCOUT_STAGES.length) setScoutStage(SCOUT_STAGES[i++]);
    }, 6000);

    try {
      const response = await fetch('/api/search/market-scout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: scoutQuery,
          productResearchId: sourceProductResearchId || undefined,
          campaignId: campaignId || undefined,
          productType: scoutProductType,
          country: scoutCountry,
        }),
        // O servidor tem maxDuration=90s. Sem este teto, um corte de timeout na
        // borda deixa a promise pendurada e o stepper girando para sempre.
        signal: AbortSignal.timeout(SCOUT_CLIENT_TIMEOUT_MS),
      });

      clearInterval(interval);

      if (response.ok) {
        const resData = (await response.json()) as ScoutResult;
        setScoutResult(resData);
        toast.success('Pesquisa do Ad Scout consolidada com sucesso!');
      } else {
        const errorData = await response.json().catch(() => ({}));
        const failure = describeScoutFailure(response.status, errorData?.error, errorData?.details);
        setScoutFailure(failure);
        toast.error(`${failure.title}: ${failure.detail}`);
      }
    } catch (error: unknown) {
      clearInterval(interval);
      const aborted = error instanceof DOMException && (error.name === 'TimeoutError' || error.name === 'AbortError');
      toast.error(
        aborted
          ? `A pesquisa passou de ${Math.round(SCOUT_CLIENT_TIMEOUT_MS / 1000)}s e foi cancelada. A biblioteca da Meta pode estar lenta — tente de novo ou reduza o escopo do país.`
          : 'Erro de rede ao falar com o Ad Scout.',
      );
    } finally {
      setScoutLoading(false);
      setScoutStage('');
    }
  };

  const requireConfirmedProduct = async (id: string): Promise<ProductResearch | null> => {
    const cached = researchProducts.find(p => p.id === id);
    if (cached) return cached as ProductResearch;
    try {
      const res = await fetch('/api/products');
      if (!res.ok) return null;
      const list = await res.json();
      return Array.isArray(list) ? (list.find((p: ProductResearch) => p.id === id) ?? null) : null;
    } catch { return null; }
  };

  const loadFromResearch = async (id: string) => {
    // A checagem do vendor é um fetch: sem esta trava, dois cliques rápidos
    // disparam dois autofills concorrentes antes de `autofilling` virar true.
    if (!id || autofillLock.current) return;
    autofillLock.current = true;
    let product: ProductResearch | null = null;
    try {
      product = await requireConfirmedProduct(id);
    } finally {
      autofillLock.current = false;
    }
    if (!product?.confirmedAt) {
      toast.error('Confirme as regras do vendor na Busca de Produtos antes de carregar este produto.');
      router.push(`/busca-produtos?productId=${id}`);
      return;
    }
    setSourceProductResearchId(id);
    await runAutofill({ productResearchId: id });
  };

  const saveKeywords = async (targetCampaignId?: string) => {
    const cid = targetCampaignId || campaignId || (await saveCampaign());
    if (!cid) throw new Error('Campanha ainda não foi salva');
    // Envia também as keywords desmarcadas: o endpoint reconcilia a seleção
    // persistida, evitando que uma keyword removida do Passo 5 continue apta
    // para o create do Google Ads no Passo 7.
    const kws = selectedKeywords;
    if (kws.length > 0) {
      const response = await fetch('/api/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords: kws.map(k => ({ ...k, relevanceScore: k.relevance, campaignId: cid, isSelected: k.selected === true })) }),
      });
      await requireOk(response, 'Erro ao salvar keywords');
    }
  };

  // `fresh` (opcional): resultado recém-vindo de runChecklistVerify() — usa ele em vez do
  // estado local quando disponível (corrigido 2026-07-27, Fase 2: o estado só reflete a
  // verificação depois do próximo render, ver comentário em runChecklistVerify).
  const canAdvance = (fresh?: Record<number, Record<string, boolean>> | null) => {
    if (step === 1) return name.trim().length > 0 && commVal > 0;
    const checksFor = (s: number, fallback: Record<string, boolean>) => fresh?.[s] ? { ...fallback, ...fresh[s] } : fallback;
    if (step === 3 && platform === 'ClickBank') {
      return ANTISTRIKE_ITEMS.filter(i => i.critical).every(i => checksFor(3, antistrikeChecks)[i.key]);
    }
    if (step === 4) return BRIDGE_CHECKLIST.filter(i => i.critical).every(i => checksFor(4, bridgeChecks)[i.key]);
    if (step === 5) return selectedKeywords.filter(k => k.selected).length >= 1;
    if (step === 7) return GOOGLE_ADS_CHECKLIST.filter(i => i.critical).every(i => checksFor(7, googleAdsChecks)[i.key]);
    if (step === 8) {
      const trackingItems = platform === 'MaxWeb' ? TRACKING_CHECKLIST_MAXWEB : TRACKING_CHECKLIST_CB;
      return trackingItems.filter(i => i.critical).every(i => checksFor(8, trackingChecks)[i.key]);
    }
    if (step === 9) return GOLIVE_CHECKLIST.filter(i => i.critical).every(i => checksFor(9, goLiveChecks)[i.key]);
    return true;
  };

  const verifyServerWizardGate = async (targetCampaignId: string, targetStep: number): Promise<boolean> => {
    if (targetStep !== 7 && targetStep !== 8) return true;
    const response = await fetch(`/api/campaigns/${targetCampaignId}/wizard-gate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step: targetStep }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const pending = Array.isArray(data?.pending) && data.pending.length > 0 ? ` Pendências: ${data.pending.join(', ')}.` : '';
      toast.error(data?.error ?? `Não é possível avançar do Passo ${targetStep}.${pending}`);
      return false;
    }
    return data?.allowed === true;
  };

  // Passos com checklist 'auto' — precisam de verificação fresca do servidor antes de avançar
  // (corrigido 2026-07-27, Fase 2): canAdvance() sozinho só lia estado local, que podia estar
  // desatualizado (ex.: presell regenerada depois da última verificação, ou correção feita num
  // campo que afeta um item 'auto' de um passo anterior). Ver
  // ~/.claude/plans/velvet-finding-cherny.md.
  const STEPS_COM_VERIFICACAO_AUTO = new Set([3, 4, 7, 8, 9]);

  const next = async () => {
    const savedId = await saveCampaign();
    if (!savedId) return;
    try {
      if (step === 3) await saveChecklists(3, ANTISTRIKE_ITEMS, antistrikeChecks, savedId);
      if (step === 4) await saveChecklists(4, BRIDGE_CHECKLIST, bridgeChecks, savedId);
      if (step === 5) await saveKeywords(savedId);
      if (step === 7) await saveChecklists(7, GOOGLE_ADS_CHECKLIST, googleAdsChecks, savedId);
      if (step === 8) {
        const items = platform === 'MaxWeb' ? TRACKING_CHECKLIST_MAXWEB : TRACKING_CHECKLIST_CB;
        await saveChecklists(8, items, trackingChecks, savedId);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao persistir este passo');
      return;
    }
    let freshChecks: Record<number, Record<string, boolean>> | null = null;
    if (STEPS_COM_VERIFICACAO_AUTO.has(step)) {
      setAdvancing(true);
      try {
        freshChecks = await runChecklistVerify(savedId);
      } finally {
        setAdvancing(false);
      }
      if (!freshChecks) return;
    }
    // Trava real: não avança com item crítico pendente (auto ou autoatestado) — antes disso só
    // mostrava um aviso e deixava passar mesmo assim. Use "Verificar automaticamente" pra
    // confirmar os itens verificáveis, ou marque manualmente os autoatestados. Agora sempre
    // roda em cima do resultado FRESCO acima, nunca de estado que pode estar velho.
    if (!canAdvance(freshChecks)) {
      toast.error('Não é possível avançar: complete os itens críticos deste passo primeiro (use "Verificar automaticamente" ou marque os autoatestados pendentes).');
      return;
    }
    if (!(await verifyServerWizardGate(savedId, step))) return;
    if (step < 9) setStep(step + 1);
  };

  const prev = () => { if (step > 1) setStep(step - 1); };

  const launch = async () => {
    const savedId = await saveCampaign();
    if (!savedId) return;
    try {
      await saveChecklists(9, GOLIVE_CHECKLIST, goLiveChecks, savedId);
    // Última validação fresca antes de lançar de verdade (Fase 2, 2026-07-27) — nunca lança em
    // cima de goLiveChecks potencialmente velho (ex.: usuário ficou um tempo no Passo 9 e algo
    // mudou nesse meio tempo, como o status da presell vinculada ou da campanha no Google Ads).
      setAdvancing(true);
      let freshChecks: Record<number, Record<string, boolean>> | null = null;
      try {
        freshChecks = await runChecklistVerify(savedId);
      } finally {
        setAdvancing(false);
      }
      if (!freshChecks) return;
      if (!canAdvance(freshChecks)) {
        toast.error('A verificação final encontrou item(ns) crítico(s) pendente(s) — confira o checklist antes de lançar.');
        return;
      }
      const kws = selectedKeywords.filter(k => k.selected);
      if (kws.length > 0) {
        const keywordResponse = await fetch('/api/keywords', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keywords: kws.map(k => ({ ...k, relevanceScore: k.relevance, campaignId: savedId, isSelected: true })) }),
        });
        await requireOk(keywordResponse, 'Erro ao salvar keywords do lançamento');
      }
      const launchResponse = await fetch(`/api/campaigns/${savedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        // Concluir o Wizard não ativa a campanha remota. A campanha só será
        // considerada ACTIVE depois de um PUSH confirmado e sincronizado.
        body: JSON.stringify({ status: 'EM_TESTE', wizardCompleted: true, wizardStep: 9 }),
      });
      await requireOk(launchResponse, 'Erro ao concluir lançamento');
      toast.success('Configuração concluída. A campanha remota continua PAUSED até a ativação confirmada no Google Ads.');
      if (sourceProductResearchId) {
        router.push(`/trend-lab?campaignId=${savedId}&productResearchId=${sourceProductResearchId}`);
      } else {
        router.push('/campanhas');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao lançar campanha');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator?.clipboard?.writeText?.(text);
    toast.success('Copiado!');
  };

  const addKeywordFromSuggestions = (kw: string, layer: string) => {
    if (selectedKeywords.find(k => k.keyword === kw)) return;
    setSelectedKeywords(prev => [...prev, { keyword: kw, layer, matchType: 'phrase', relevance: 3, selected: true }]);
  };

  const addManualKeyword = () => {
    if (!newKeyword.trim()) return;
    setSelectedKeywords(prev => [...prev, { keyword: newKeyword.trim(), layer: 'A', matchType: 'phrase', relevance: 3, selected: true }]);
    setNewKeyword('');
  };

  const analyzePresell = async () => {
    setAnalyzing(true);
    setAnalysisResult(null);
    try {
      const res = await fetch('/api/presell-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          presellUrl: presellUrl || undefined,
          presellHtml: presellHtml || undefined,
          keyword: selectedKeywords.find(k => k.selected)?.keyword ?? name,
          vertical,
          platform,
          offerUrl,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setAnalysisResult(data);
        toast.success('Análise concluída!');
      } else {
        toast.error('Erro na análise');
      }
    } catch {
      toast.error('Erro na análise');
    } finally {
      setAnalyzing(false);
    }
  };

  // Chama o pipeline real de geração (lib/presell.ts via /api/presells) — corrigido
  // 2026-07-27: antes disso era um preenchimento de string local (BRIDGE_TEMPLATE), nunca
  // criava um Presell vinculado à campanha, e por isso o checklist 'auto' (que procura um
  // Presell real via campaignId — ver getPresellHtml() em lib/complianceVerifier.ts) nunca
  // encontrava nada pra verificar. Precisa de campaignId (salva a campanha antes, se preciso)
  // e de um hopLink real (offerUrl).
  const generatePresellHtml = async (extraContext?: string) => {
    if (!offerUrl || !/^https?:\/\//.test(offerUrl)) {
      toast.error('Preencha a URL da oferta / Link de Afiliado (offerUrl) com um link https:// válido antes de gerar a presell.');
      return;
    }
    const cid = campaignId || (await saveCampaign());
    if (!cid) {
      toast.error('Não foi possível salvar a campanha antes de gerar a presell.');
      return;
    }
    if (cid) {
      fetch(`/api/campaigns/${cid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerUrl, pageType, popupGate, videoUrl, presellUrl, hostingerDomain, flowpageUrl }),
      }).catch(() => {});
    }
    const ctxToPass = extraContext || presellCustomContext || undefined;
    const productName = researchProducts.find(p => p.id === sourceProductResearchId)?.name || name || vertical;
    setGeneratingPresell(true);
    try {
      const res = await fetch('/api/presells', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName,
          hopLink: offerUrl,
          productId: sourceProductResearchId || undefined,
          campaignId: cid,
          pageType,
          popupGate,
          videoUrl: pageType === 'vsl' ? videoUrl : undefined,
          channel,
          geo,
          trackingId: name || undefined,
          context: ctxToPass,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error ?? 'Erro ao gerar a presell com o agente.');
        return;
      }
      setPresellHtml(data.html ?? '');
      setPresellId(data.id ?? null);
      const absoluteUrl = typeof data.url === 'string' && data.url.startsWith('/')
        ? `${window.location.origin}${data.url}`
        : data.url;
      if (absoluteUrl) setPresellUrl(absoluteUrl);
      setShowPreview(true);
      setPresellSnapshot({ channel, pageType, videoUrl, name });
      // Persiste a URL de verdade junto com presellGeneratedAt — sem isso, checagens que leem
      // campaign.presellUrl direto do banco (ex.: "SSL ativo") ficam falhando logo após gerar,
      // já que só um saveCampaign() completo (Próximo/Salvar Rascunho) sincronizava esse campo.
      fetch(`/api/campaigns/${cid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ presellGeneratedAt: new Date().toISOString(), presellUrl: absoluteUrl || presellUrl }),
      }).catch(() => {});
      toast.success('Presell gerada pelo Presell Builder (IA) — revise antes de avançar.');
    } catch {
      toast.error('Erro de rede ao gerar a presell.');
    } finally {
      setGeneratingPresell(false);
    }
  };

  // "Regenerar com correções" (Fase 3d): busca as lições da mesma vertical/canal/plataforma
  // já aprendidas via "Corrigir com agente" (ChecklistLearning) e injeta como contexto extra
  // na regeneração — pra não ter que descrever de novo manualmente um problema já resolvido
  // numa campanha anterior.
  const regenerateWithCorrections = async () => {
    if (!campaignId) { toast.error('Salve a campanha antes de regenerar com correções.'); return; }
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/checklists/learnings`);
      const data = await res.json();
      if (!res.ok) { toast.error(data?.error ?? 'Erro ao buscar lições aprendidas'); return; }
      if (!data.context) { toast.error('Nenhuma correção registrada ainda pra esta vertical/canal — use "Corrigir com agente" nos itens que falharem primeiro.'); return; }
      await generatePresellHtml(data.context);
    } catch {
      toast.error('Erro de rede ao buscar lições aprendidas.');
    }
  };

  // Publica a presell gerada no domínio próprio do usuário via FTP (lib/presell.ts →
  // publishToFtp, configurado em FTP_SITES_JSON) — usado quando o domínio não é WordPress.
  // Atualiza presellUrl/hostingerDomain da campanha com a URL real publicada.
  const publishToOwnDomain = async () => {
    if (!presellId) { toast.error('Gere a presell primeiro antes de publicar no domínio próprio.'); return; }
    const domain = ftpDomains.includes(hostingerDomain) ? hostingerDomain : ftpDomains[0];
    if (!domain) { toast.error('Nenhum domínio FTP configurado (FTP_SITES_JSON).'); return; }
    setPublishingOwnDomain(true);
    try {
      const res = await fetch(`/api/presells/${presellId}/promote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destino: 'ftp', dominio: domain }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data?.error ?? 'Erro ao publicar no domínio próprio.'); return; }
      const publishedUrl = data?.presell?.url;
      if (publishedUrl) setPresellUrl(publishedUrl);
      setHostingerDomain(domain);
      const cid = campaignId || (await saveCampaign());
      if (cid) {
        await fetch(`/api/campaigns/${cid}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ presellUrl: publishedUrl, hostingerDomain: domain }),
        }).catch(() => {});
      }
      toast.success(`Publicada em ${publishedUrl}`);
    } catch {
      toast.error('Erro de rede ao publicar no domínio próprio.');
    } finally {
      setPublishingOwnDomain(false);
    }
  };

  const inputCls = "bg-[#0f172a] border-[#334155] text-white placeholder:text-slate-500";

  return (
    <AutofillContext.Provider value={autofillRationale}>
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white tracking-tight flex items-center gap-2">
            <Wand2 className="h-6 w-6 text-green-400" /> Wizard de Nova Campanha
          </h1>
          <p className="text-slate-400 text-sm mt-1">Passo {step} de 9 — {STEPS[step-1]?.title}</p>
        </div>
        {campaignId && (
          <Button onClick={runCampaignAudit} disabled={auditing} className="bg-blue-600 hover:bg-blue-700 text-white gap-2" size="sm">
            {auditing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
            {auditing ? 'Auditando...' : 'Reanalisar Campanha com IA'}
          </Button>
        )}
      </div>

      {autofilling && (
        <div className="flex items-center gap-4 bg-gradient-to-r from-purple-600/10 to-green-600/10 border border-purple-500/30 rounded-lg p-4">
          <Loader2 className="h-6 w-6 text-purple-400 animate-spin shrink-0" />
          <div>
            <p className="text-sm font-semibold text-white flex items-center gap-1.5"><Bot className="h-4 w-4 text-purple-400" /> Analisando produto...</p>
            <p className="text-xs text-slate-400 mt-0.5">O Campaign Setup Strategist está estudando o dossiê do produto e preenchendo o wizard com as melhores práticas.</p>
          </div>
        </div>
      )}

      {!autofilling && autofillSummary && (
        <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3 flex items-start gap-2">
          <Sparkles className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
          <p className="text-xs text-green-200">{autofillSummary} Passe o mouse no ícone <Sparkles className="inline h-3 w-3" /> ao lado de cada campo para ver a justificativa do agente.</p>
        </div>
      )}

      {showAuditDialog && auditResult && (
        <Dialog open={showAuditDialog} onOpenChange={setShowAuditDialog}>
          <DialogContent className="max-w-2xl bg-[#1e293b] border-[#334155] text-white">
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center gap-2">
                <Shield className="h-6 w-6 text-green-400" /> Relatório de Auditoria IA
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                Análise de riscos e compliance pré-lançamento
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 mt-4">
              <div className="flex items-center gap-4 bg-[#0f172a] p-4 rounded-lg">
                <div className="relative w-16 h-16 shrink-0">
                  <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                    <circle cx="32" cy="32" r="28" fill="none" stroke="#334155" strokeWidth="4" />
                    <circle cx="32" cy="32" r="28" fill="none" stroke={(auditResult.audit_score ?? 0) >= 80 ? '#22c55e' : (auditResult.audit_score ?? 0) >= 50 ? '#f59e0b' : '#ef4444'} strokeWidth="4" strokeDasharray={`${((auditResult.audit_score ?? 0) / 100) * 175.9} 175.9`} strokeLinecap="round" />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">{auditResult.audit_score ?? 0}</span>
                </div>
                <div>
                  <h4 className="text-sm font-semibold">Pontuação de Prontidão</h4>
                  <p className="text-xs text-slate-400">Risk Level: <span className={`font-bold ${(auditResult.risk_level === 'LOW' || auditResult.risk_level === 'MEDIUM') ? 'text-green-400' : 'text-red-400'}`}>{auditResult.risk_level}</span></p>
                </div>
              </div>

              {auditResult.summary && (
                <p className="text-sm text-slate-300 italic bg-[#0f172a] p-3 rounded-lg border border-[#334155]/40">{auditResult.summary}</p>
              )}

              {auditResult.blockers?.length > 0 && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 space-y-1">
                  <p className="text-sm font-semibold text-red-400 flex items-center gap-1.5"><XCircle className="h-4 w-4" /> Bloqueadores de Lançamento (Críticos):</p>
                  {auditResult.blockers.map((b: string, i: number) => <p key={i} className="text-xs text-red-300 pl-5">• {b}</p>)}
                </div>
              )}

              {auditResult.warnings?.length > 0 && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 space-y-1">
                  <p className="text-sm font-semibold text-yellow-400 flex items-center gap-1.5"><AlertTriangle className="h-4 w-4" /> Avisos / Otimizações:</p>
                  {auditResult.warnings.map((w: string, i: number) => <p key={i} className="text-xs text-yellow-300 pl-5">• {w}</p>)}
                </div>
              )}

              {auditResult.recommendations?.length > 0 && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 space-y-1">
                  <p className="text-sm font-semibold text-blue-400 flex items-center gap-1.5"><Info className="h-4 w-4" /> Recomendações Estratégicas:</p>
                  {auditResult.recommendations.map((r: string, i: number) => <p key={i} className="text-xs text-blue-300 pl-5">• {r}</p>)}
                </div>
              )}
            </div>

            <DialogFooter className="mt-6">
              <Button onClick={() => setShowAuditDialog(false)} className="bg-green-600 hover:bg-green-700 text-white">Fechar Relatório</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Enhanced Progress with circular indicators */}
      <div className="space-y-3">
        <Progress value={(step / 9) * 100} className="h-2 bg-[#1e293b]" />
        <div className="flex justify-between gap-1">
          {STEPS.map(s => {
            const Icon = s.icon;
            const isComplete = s.num < step || (s.num === step && stepCompletion[s.num]);
            const isCurrent = s.num === step;
            const isPast = s.num < step;
            return (
              <button
                key={s.num}
                onClick={() => s.num <= step && setStep(s.num)}
                className="flex flex-col items-center gap-1 text-xs transition-all group"
              >
                <div className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  isCurrent ? 'bg-green-500/20 ring-2 ring-green-400' :
                  isPast && isComplete ? 'bg-green-500/10' :
                  isPast ? 'bg-yellow-500/10' :
                  'bg-[#1e293b]'
                }`}>
                  {isPast && isComplete ? (
                    <CheckCircle2 className="h-4 w-4 text-green-400" />
                  ) : (
                    <Icon className={`h-4 w-4 ${
                      isCurrent ? 'text-green-400' : isPast ? 'text-slate-400' : 'text-slate-600'
                    }`} />
                  )}
                </div>
                <span className={`hidden sm:block ${
                  isCurrent ? 'text-green-400 font-medium' : isPast ? 'text-slate-400' : 'text-slate-600'
                }`}>{s.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Aviso de presell desatualizada (Fase 2, 2026-07-27): canal/tipo de página/vídeo/nome
          mudaram depois da última geração — a presell publicada pode não bater mais com a
          configuração atual da campanha. Não bloqueia sozinho (bridge_ok em GOLIVE_CHECKLIST é
          o gate real), só avisa cedo pra evitar lançar em cima de conteúdo desatualizado. */}
      {presellSnapshot && step >= 5 && (
        presellSnapshot.channel !== channel || presellSnapshot.pageType !== pageType ||
        presellSnapshot.videoUrl !== videoUrl || presellSnapshot.name !== name
      ) && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-200">
              Canal, tipo de página, vídeo ou nome mudaram desde a última geração da pré-sell — ela pode estar desatualizada. Regenere antes de lançar.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => { setStep(4); generatePresellHtml(); }} disabled={generatingPresell} className="border-amber-500/40 text-amber-200 gap-1.5 shrink-0">
            {generatingPresell ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} Regenerar agora
          </Button>
        </div>
      )}

      {/* Step Content */}
      <Card className="bg-[#1e293b] border-[#334155]">
        <CardContent className="p-6">
          {/* STEP 1 - Oferta */}
          {step === 1 && (
            showProductTypeSelection ? (
              <StepProductType
                value={productType}
                onChange={(type) => {
                  setProductType(type);
                  if (type === 'AFFILIATE') {
                    setPlatform('ClickBank');
                  } else if (type === 'PROPRIETARY_LOW_TICKET') {
                    setPlatform('Hotmart');
                  } else {
                    setPlatform('Outro');
                  }
                }}
                onNext={() => setShowProductTypeSelection(false)}
              />
            ) : (
              <div className="space-y-6">
                {productType !== 'AFFILIATE' && (
                  <ProductStudio
                    productType={productType}
                    productName={name}
                    vertical={vertical}
                    aov={Number(aov) || 0}
                    campaignId={campaignId}
                  />
                )}
              <StepProductSearch
                campaignId={campaignId}
                productType={productType}
                name={name}
                setName={setName}
                platform={platform}
                setPlatform={setPlatform}
                vertical={vertical}
                setVertical={setVertical}
                geo={geo}
                setGeo={setGeo}
                channel={channel}
                setChannel={setChannel}
                funnel={funnel}
                setFunnel={setFunnel}
                offerUrl={offerUrl}
                setOfferUrl={setOfferUrl}
                commission={commission}
                setCommission={setCommission}
                refundPct={refundPct}
                setRefundPct={setRefundPct}
                aov={aov}
                setAov={setAov}
                checkoutWebhook={checkoutWebhook}
                setCheckoutWebhook={setCheckoutWebhook}
                leadMagnet={leadMagnet}
                setLeadMagnet={setLeadMagnet}
                whatsappLink={whatsappLink}
                setWhatsappLink={setWhatsappLink}
                researchProducts={researchProducts}
                sourceProductResearchId={sourceProductResearchId}
                loadFromResearch={loadFromResearch}
                autofilling={autofilling}
                scoutQuery={scoutQuery}
                setScoutQuery={setScoutQuery}
                scoutLoading={scoutLoading}
                scoutStage={scoutStage}
                scoutResult={scoutResult}
                scoutProductType={scoutProductType}
                setScoutProductType={setScoutProductType}
                scoutMode={scoutMode}
                setScoutMode={setScoutMode}
                productIdea={productIdea}
                generatingIdea={generatingIdea}
                runProductIdea={runProductIdea}
                importProductIdea={importProductIdea}
                ideaStage={ideaStage}
                trendSlope={trendSlope}
                sourceReport={sourceReport}
                ideaIsMock={ideaIsMock}
                scoutFailure={scoutFailure}
                dismissScoutFailure={() => setScoutFailure(null)}
                scoutCountry={scoutCountry}
                setScoutCountry={(v: string) => { scoutCountryTouched.current = true; setScoutCountry(v); }}
                runAdScoutResearch={runAdScoutResearch}
                onPrev={() => setShowProductTypeSelection(true)}
                onNext={next}
              />
              </div>
            )
          )}

          {step === 2 && (
            <StepCalculator
              productType={productType}
              vertical={vertical}
              commission={commission}
              setCommission={setCommission}
              refundPct={refundPct}
              setRefundPct={setRefundPct}
              cvrExpected={cvrExpected}
              setCvrExpected={setCvrExpected}
              onPrev={prev}
              onNext={next}
            />
          )}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-green-400" /> Anti-strike Checklist {platform === 'ClickBank' ? '(ClickBank)' : ''}
                </h2>
                <Button size="sm" variant="outline" onClick={() => void runChecklistVerify()} disabled={verifyingChecklist || !campaignId} className="border-[#334155] text-slate-300 gap-1.5">
                  {verifyingChecklist ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />} Verificar automaticamente
                </Button>
              </div>
              {platform !== 'ClickBank' && (
                <div className="bg-blue-500/10 rounded-lg p-4 text-blue-300 text-sm flex items-start gap-2">
                  <Info className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>Este checklist é específico para ClickBank. Para {platform}, verifique os Terms da plataforma diretamente. Pode avançar.</span>
                </div>
              )}
              {/* Progress ring for this step */}
              {platform === 'ClickBank' && (
                <div className="flex items-center gap-4 bg-[#0f172a] rounded-lg p-4">
                  <div className="relative w-12 h-12">
                    <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
                      <circle cx="24" cy="24" r="20" fill="none" stroke="#334155" strokeWidth="3" />
                      <circle cx="24" cy="24" r="20" fill="none" stroke={ANTISTRIKE_ITEMS.filter(i => i.critical).every(i => antistrikeChecks[i.key]) ? '#22c55e' : '#f59e0b'} strokeWidth="3" strokeDasharray={`${(Object.values(antistrikeChecks).filter(Boolean).length / ANTISTRIKE_ITEMS.length) * 125.6} 125.6`} strokeLinecap="round" />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">{Object.values(antistrikeChecks).filter(Boolean).length}/{ANTISTRIKE_ITEMS.length}</span>
                  </div>
                  <div>
                    <p className="text-sm text-white">Progresso do Checklist</p>
                    <p className="text-xs text-slate-500">{ANTISTRIKE_ITEMS.filter(i => i.critical && !antistrikeChecks[i.key]).length} itens críticos pendentes</p>
                  </div>
                </div>
              )}
              <div className="space-y-3">
                {ANTISTRIKE_ITEMS.map(item => (
                  <ChecklistItemRow
                    key={item.key}
                    item={item}
                    checked={antistrikeChecks[item.key] ?? false}
                    onToggle={(v) => setAntistrikeChecks(prev => ({ ...prev, [item.key]: v }))}
                    meta={checklistMeta[item.key]}
                  />
                ))}
              </div>
            </div>
          )}

          {/* STEP 4 - Bridge/Pré-sell ENHANCED */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={step4SubTab === 'presell' ? 'default' : 'outline'}
                    onClick={() => setStep4SubTab('presell')}
                    className={step4SubTab === 'presell' ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-bold' : 'border-[#334155] text-slate-300'}
                  >
                    Página Pré-sell
                  </Button>
                  <Button
                    size="sm"
                    variant={step4SubTab === 'creative' ? 'default' : 'outline'}
                    onClick={() => setStep4SubTab('creative')}
                    className={step4SubTab === 'creative' ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-bold' : 'border-[#334155] text-slate-300'}
                  >
                    Anúncios & Copys <Badge className="ml-1.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[9px] scale-90">Novo</Badge>
                  </Button>
                </div>
              </div>

              {step4SubTab === 'creative' ? (
                <StepCreativeGen
                  campaignId={campaignId}
                  productType={productType}
                  productName={name}
                  vertical={vertical}
                  onPrev={prev}
                  onNext={next}
                />
              ) : (
                <StepLandingPage
                  campaignId={campaignId}
                  productType={productType}
                  productName={name}
                  vertical={vertical}
                  channel={channel}
                  pageType={pageType}
                  setPageType={setPageType}
                  popupGate={popupGate}
                  setPopupGate={setPopupGate}
                  videoUrl={videoUrl}
                  setVideoUrl={setVideoUrl}
                  presellUrl={presellUrl}
                  generating={generatingPresell}
                  onGenerate={() => generatePresellHtml()}
                  bridgeChecks={bridgeChecks}
                  onToggleCheck={(key, value) => setBridgeChecks((prevChecks) => ({ ...prevChecks, [key]: value }))}
                  checklistMeta={checklistMeta}
                  verifyingChecklist={verifyingChecklist}
                  onVerifyChecklist={() => runChecklistVerify()}
                  onFixChecklistItem={fixChecklistItem}
                  onPrev={prev}
                  onNext={next}
                />
              )}
            </div>
          )}

          {/* STEP 5 - Keywords */}
          {step === 5 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">Pesquisa de Keywords</h2>
              {/* Tools bar */}
              <div className="flex flex-wrap gap-2 bg-[#0f172a] rounded-lg p-3">
                <a href="https://answerthepublic.com/pt" target="_blank" rel="noopener">
                  <Button size="sm" variant="outline" className="border-[#334155] text-slate-300 gap-1"><ExternalLink className="h-3 w-3" /> Answer The Public</Button>
                </a>
                <span className="cursor-pointer" onClick={() => window.open(`https://trends.google.com/trends/explore?q=${encodeURIComponent(selectedKeywords.find(k => k.selected)?.keyword ?? vertical)}&geo=${geo}`, '_blank')}>
                  <Button size="sm" variant="outline" className="border-[#334155] text-slate-300 gap-1"><TrendingUp className="h-3 w-3" /> Google Trends</Button>
                </span>
                <a href={`https://ads.google.com/aw/keywordplanner/home`} target="_blank" rel="noopener">
                  <Button size="sm" variant="outline" className="border-[#334155] text-slate-300 gap-1"><Search className="h-3 w-3" /> Keyword Planner</Button>
                </a>
              </div>

              {/* Suggestions by layer */}
              <div>
                <h3 className="text-sm font-medium text-white mb-3">Sugestões por Camada</h3>
                {KEYWORD_TIERS.map(layer => {
                  const layerLabels: Record<string, string> = { A: 'Problema', B: 'Solução', C: 'Comparação', D: 'Comercial' };
                  const suggestions = KEYWORDS_BY_VERTICAL[vertical]?.[layer] ?? KEYWORDS_BY_VERTICAL['Weight Loss']?.[layer] ?? [];
                  return (
                    <div key={layer} className="mb-4">
                      <Badge className="mb-2 bg-[#0f172a] text-slate-300">Camada {layer} — {layerLabels[layer]}</Badge>
                      <div className="flex flex-wrap gap-2">
                        {suggestions.map((kw: string) => {
                          const isAdded = selectedKeywords.find(k => k.keyword === kw);
                          return (
                            <button key={kw} onClick={() => !isAdded && addKeywordFromSuggestions(kw, layer)} className={`text-xs px-3 py-1.5 rounded-full transition-all ${
                              isAdded ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-[#0f172a] text-slate-300 hover:bg-[#334155] border border-[#334155]'
                            }`}>
                              {isAdded ? '✓ ' : '+ '}{kw}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Manual add */}
              <div className="flex gap-2">
                <Input value={newKeyword} onChange={(e:any) => setNewKeyword(e?.target?.value ?? '')} placeholder="Adicionar keyword manualmente" className={`${inputCls} flex-1`} onKeyDown={(e:any) => e?.key === 'Enter' && addManualKeyword()} />
                <Button onClick={addManualKeyword} className="bg-green-600 hover:bg-green-700 text-white">Adicionar</Button>
              </div>
              {/* Selected keywords */}
              {selectedKeywords.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-white mb-2">Keywords Selecionadas ({selectedKeywords.filter(k=>k.selected).length}/8)</h3>
                  <div className="space-y-2">
                    {selectedKeywords.map((kw, idx) => (
                      <div key={idx} className="flex items-center gap-3 bg-[#0f172a] rounded-lg p-3">
                        <Checkbox checked={kw.selected} onCheckedChange={(v: any) => {
                          const copy = [...selectedKeywords];
                          copy[idx] = { ...copy[idx], selected: !!v };
                          setSelectedKeywords(copy);
                        }} />
                        <span className="text-sm text-white flex-1">{kw.keyword}</span>
                        <Badge className="bg-[#1e293b] text-slate-400 text-[10px]">{kw.layer}</Badge>
                        <Select value={kw.matchType} onValueChange={(v) => {
                          const copy = [...selectedKeywords];
                          copy[idx] = { ...copy[idx], matchType: v };
                          setSelectedKeywords(copy);
                        }}>
                          <SelectTrigger className="w-24 h-7 text-xs bg-[#1e293b] border-[#334155] text-white"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-[#1e293b] border-[#334155]">
                            <SelectItem value="phrase" className="text-white">Phrase</SelectItem>
                            <SelectItem value="exact" className="text-white">Exact</SelectItem>
                            <SelectItem value="broad" className="text-white">Broad</SelectItem>
                          </SelectContent>
                        </Select>
                        <button onClick={() => setSelectedKeywords(prev => prev.filter((_,i) => i !== idx))} className="text-red-400 hover:text-red-300 text-xs">✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Negatives */}
              <div className="mt-4">
                <h3 className="text-sm font-medium text-white mb-2">Negativas Sugeridas ({vertical}){aiNegatives && <span className="text-purple-400 font-normal"> · geradas pelo agente para este produto</span>}</h3>
                <div className="flex flex-wrap gap-2">
                  {(aiNegatives ?? NEGATIVES_BY_VERTICAL[vertical] ?? NEGATIVES_BY_VERTICAL['Outro'] ?? []).map((neg: string) => (
                    <Badge key={neg} className="bg-red-500/10 text-red-300 text-xs">-{neg}</Badge>
                  ))}
                </div>
                <Button size="sm" variant="outline" className="mt-2 border-[#334155] text-slate-300 gap-1" onClick={() => copyToClipboard((aiNegatives ?? NEGATIVES_BY_VERTICAL[vertical] ?? []).join('\n'))}>
                  <Copy className="h-3 w-3" /> Copiar Negativas
                </Button>
              </div>
            </div>
          )}

          {/* STEP 6 - Naming & UTMs */}
          {step === 6 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">Naming & UTMs</h2>
              <div><Label className="text-slate-300">Versão</Label><Input type="number" value={version} onChange={(e:any) => setVersion(e?.target?.value ?? '1')} className={`${inputCls} w-20`} min={1} /></div>
              <div className="bg-[#0f172a] rounded-lg p-4">
                <Label className="text-slate-400 text-xs">Nome da Campanha Gerado</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-green-400 font-mono text-lg">{campaignNameGen}</code>
                  <Button size="sm" variant="ghost" onClick={() => copyToClipboard(campaignNameGen)} className="text-slate-400 hover:text-white"><Copy className="h-4 w-4" /></Button>
                </div>
              </div>
              <div className="bg-[#0f172a] rounded-lg p-4">
                <Label className="text-slate-400 text-xs">UTM Completo</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-blue-400 font-mono text-sm break-all">{utmString}</code>
                  <Button size="sm" variant="ghost" onClick={() => copyToClipboard(utmString)} className="text-slate-400 hover:text-white shrink-0"><Copy className="h-4 w-4" /></Button>
                </div>
              </div>
              <p className="text-xs text-slate-500">Formato: [REDE]_[VERTICAL]_[GEO]_[CANAL]_[FUNIL]_vN</p>

              <EbookDraftPanel campaignId={campaignId} productName={name} />

              <AICostDashboard campaignId={campaignId} />
            </div>
          )}

          {/* STEP 7 - Google Ads */}
          {step === 7 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-lg font-semibold text-white">Setup Google Ads</h2>
                <Button size="sm" variant="outline" onClick={() => void runChecklistVerify()} disabled={verifyingChecklist || !campaignId} className="border-[#334155] text-slate-300 gap-1.5">
                  {verifyingChecklist ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />} Verificar automaticamente
                </Button>
              </div>
              <div className="flex items-center gap-4 bg-[#0f172a] rounded-lg p-4">
                <div className="relative w-12 h-12">
                  <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
                    <circle cx="24" cy="24" r="20" fill="none" stroke="#334155" strokeWidth="3" />
                    <circle cx="24" cy="24" r="20" fill="none" stroke={GOOGLE_ADS_CHECKLIST.filter(i => i.critical).every(i => googleAdsChecks[i.key]) ? '#22c55e' : '#f59e0b'} strokeWidth="3" strokeDasharray={`${(Object.values(googleAdsChecks).filter(Boolean).length / GOOGLE_ADS_CHECKLIST.length) * 125.6} 125.6`} strokeLinecap="round" />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">{Object.values(googleAdsChecks).filter(Boolean).length}/{GOOGLE_ADS_CHECKLIST.length}</span>
                </div>
                <div>
                  <p className="text-sm text-white">Budget diário sugerido: <strong className="font-mono text-green-400">${budgetDaily?.toFixed?.(2)}</strong></p>
                  <p className="text-xs text-slate-500">${budgetTest} / {days} dias</p>
                </div>
              </div>
              <Step7LeadingStream campaignId={campaignId ?? ''} budgetDaily={budgetDaily} onSuccess={runChecklistVerify} />
              {campaignId && (
                <ExperimentSetupCard
                  campaignId={campaignId}
                  presellId={presellId}
                  controlPresellUrl={presellUrl}
                  onExperimentUpdated={(updatedExperimentId) => {
                    if (updatedExperimentId) setExperimentId(updatedExperimentId);
                    void runChecklistVerify();
                  }}
                />
              )}
              {experimentId && (
                <ExperimentDashboardCard
                  experimentId={experimentId}
                  hasGoogleCampaignId={!!googleCampaignId}
                  onActionComplete={runChecklistVerify}
                />
              )}
              <div className="space-y-3">
                {GOOGLE_ADS_CHECKLIST.map(item => (
                  <ChecklistItemRow
                    key={item.key}
                    item={item}
                    checked={googleAdsChecks[item.key] ?? false}
                    onToggle={(v) => setGoogleAdsChecks(prev => ({ ...prev, [item.key]: v }))}
                    meta={checklistMeta[item.key]}
                    step={7}
                    onFix={fixChecklistItem}
                  />
                ))}
              </div>

              <div className="bg-[#0f172a] rounded-lg p-4 flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-sm text-white">Criar a campanha de verdade no Google Ads</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {googleCampaignId
                      ? `Já criada (PAUSED) — ID ${googleCampaignId}. Necessário pro Passo 9 (Go-live).`
                      : 'Cria em modo PAUSED (não gasta nada até você ativar manualmente). Exige os itens críticos deste checklist marcados/verificados antes.'}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" onClick={createInGoogleAds} disabled={creatingGads || !!googleCampaignId} className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5">
                    {creatingGads ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5" />}
                    {googleCampaignId ? 'Já criada' : creatingGads ? 'Criando...' : 'Criar no Google Ads (PAUSED)'}
                  </Button>
                  {googleCampaignId && (
                    <a href={`https://ads.google.com/aw/campaigns?campaignId=${googleCampaignId}`} target="_blank" rel="noopener">
                      <Button size="sm" variant="outline" className="border-[#334155] text-slate-300 gap-1.5" title="Abre a campanha no Google Ads — se a conta ativa no navegador não for a certa, troque de conta lá antes">
                        <ExternalLink className="h-3.5 w-3.5" /> Ver no Google Ads
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 8 - Tracking */}
          {step === 8 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-lg font-semibold text-white">Tracking & Tags</h2>
                <Button size="sm" variant="outline" onClick={() => void runChecklistVerify()} disabled={verifyingChecklist || !campaignId} className="border-[#334155] text-slate-300 gap-1.5">
                  {verifyingChecklist ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />} Verificar automaticamente
                </Button>
              </div>
              {platform === 'MaxWeb' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div><div className="flex items-center gap-1"><Label className="text-slate-300">Postback URL</Label><AgentHelp fieldKey="postbackUrl" fieldValue={postbackUrl} onApply={setPostbackUrl} /></div><Input value={postbackUrl} onChange={(e:any) => setPostbackUrl(e?.target?.value ?? '')} placeholder="https://...postback..." className={inputCls} /><p className="text-xs text-slate-500 mt-1">{'Ex: https://track.maxweb.com/postback?clickid={clickid}'}</p></div>
                  <div><div className="flex items-center gap-1"><Label className="text-slate-300">Token ClickID</Label><AgentHelp fieldKey="clickidToken" fieldValue={clickidToken} onApply={setClickidToken} /></div><Input value={clickidToken} onChange={(e:any) => setClickidToken(e?.target?.value ?? '')} className={inputCls} /></div>
                </div>
              )}
              {platform === 'MaxWeb' && (
                <div className="bg-yellow-500/10 rounded-lg p-4 text-yellow-300 text-sm">
                  <strong>Teste de Postback:</strong><br/>
                  1. Gere 1 conversão manual → 2. Verifique no painel MaxWeb → 3. Marque OK abaixo
                </div>
              )}
              <div className="space-y-3">
                {(platform === 'MaxWeb' ? TRACKING_CHECKLIST_MAXWEB : TRACKING_CHECKLIST_CB).map(item => (
                  <ChecklistItemRow
                    key={item.key}
                    item={item}
                    checked={trackingChecks[item.key] ?? false}
                    onToggle={(v) => setTrackingChecks(prev => ({ ...prev, [item.key]: v }))}
                    meta={checklistMeta[item.key]}
                    step={8}
                    onFix={fixChecklistItem}
                  />
                ))}
              </div>
            </div>
          )}

          {/* STEP 9 - Go-live & Lançamento Multicanal */}
          {step === 9 && (
            <StepLaunch
              campaignId={campaignId}
              campaignNameGen={campaignNameGen}
              name={name}
              platform={platform}
              vertical={vertical}
              geo={geo}
              channel={channel}
              funnel={funnel}
              commVal={commVal}
              cpcMax={cpcMax}
              selectedKeywords={selectedKeywords}
              sourceProductResearchId={sourceProductResearchId}
              
              budgetTest={budgetTest}
              setBudgetTest={setBudgetTest}
              testDuration={testDuration}
              setTestDuration={setTestDuration}
              budgetDaily={budgetDaily}
              budgetScale={budgetScale}
              setBudgetScale={setBudgetScale}
              
              goLiveChecks={goLiveChecks}
              setGoLiveChecks={setGoLiveChecks}
              checklistMeta={checklistMeta}
              setChecklistMeta={setChecklistMeta}
              
              loopEnabled={loopEnabled}
              setLoopEnabled={setLoopEnabled}
              loopInterval={loopInterval}
              setLoopInterval={setLoopInterval}
              loopAgents={loopAgents}
              setLoopAgents={setLoopAgents}
              
              verifyingChecklist={verifyingChecklist}
              runChecklistVerify={runChecklistVerify}
              fixChecklistItem={fixChecklistItem}
              
              onPrev={prev}
              saveCampaign={saveCampaign}
              canAdvance={canAdvance}
            />
          )}
        </CardContent>
      </Card>

      {/* Navigation - Apenas para passos anteriores a 9 */}
      {step < 9 && (
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div className="flex gap-2">
            <Button variant="outline" onClick={prev} disabled={step === 1} className="border-[#334155] text-slate-300 gap-2">
              <ArrowLeft className="h-4 w-4" /> Anterior
            </Button>
            <Button variant="outline" onClick={async () => {
              await saveCampaign();
              toast.success('Rascunho da campanha salvo com sucesso!');
            }} disabled={saving} className="border-[#334155] text-slate-300 gap-2">
              <Save className="h-4 w-4" /> Salvar Rascunho
            </Button>
          </div>
          <Button onClick={next} disabled={saving || advancing} className="bg-green-600 hover:bg-green-700 text-white gap-2">
            {(saving || advancing) && <Loader2 className="h-4 w-4 animate-spin" />}
            {advancing ? 'Validando...' : 'Próximo'} <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
    </AutofillContext.Provider>
  );
}