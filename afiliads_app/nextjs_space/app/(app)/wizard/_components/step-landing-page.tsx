'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, ExternalLink, ShieldCheck, ArrowLeft, ArrowRight, Save, MonitorPlay } from 'lucide-react';
import { toast } from 'sonner';
import { ChecklistItemRow } from './agent-help';
import { BRIDGE_CHECKLIST } from '@/lib/wizard-data';
import type { PresellPageType } from '@/lib/presell-types';
import type { ProductType } from './step-product-type';
import { PreviewFrame } from './preview-frame';
import { AiProposalPanel } from './ai-proposal-panel';

interface StepLandingPageProps {
  campaignId: string | null;
  productType: ProductType;
  productName: string;
  vertical: string;
  channel: string;
  pageType: PresellPageType;
  setPageType: (v: PresellPageType) => void;
  popupGate: boolean;
  setPopupGate: (v: boolean) => void;
  videoUrl: string;
  setVideoUrl: (v: string) => void;
  presellUrl: string;
  generating: boolean;
  onGenerate: () => Promise<void> | void;
  bridgeChecks: Record<string, boolean>;
  onToggleCheck: (key: string, value: boolean) => void;
  checklistMeta: Record<string, { verificationType: string; note?: string | null }>;
  verifyingChecklist: boolean;
  onVerifyChecklist: () => Promise<any>;
  onFixChecklistItem: (step: number, itemKey: string) => Promise<any>;
  onPrev: () => void;
  onNext: () => void;
}

const TRACKING_FIELDS = {
  gtm: 'gtm_container_id',
  pixel: 'meta_pixel_id',
  capi: 'meta_access_token',
} as const;

/** Extrai a copy legível do HTML da presell para o painel de proposta da IA. */
function htmlToPlainCopy(html: string): string {
  if (!html) return '';
  return html
    .replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, '')
    .replace(/<\/(h1|h2|h3|h4|p|li|div|section|header|footer)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

const HTML_ESCAPE: Record<string, string> = {
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => HTML_ESCAPE[c]);
}

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

/** Casa o trecho ignorando diferenças de espaço em branco — a copy do agente vem normalizada. */
function excerptMatcher(excerpt: string): RegExp {
  const escaped = excerpt.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  return new RegExp(escaped, 'i');
}

export interface CopyRewrite {
  excerpt: string;
  rewrite: string;
}

/**
 * Aplica cada `excerpt -> rewrite` apenas nos nós de texto do HTML, deixando tags,
 * atributos, script e style intactos. Trecho que atravessa tags não casa e volta
 * em `missed` — preferimos reportar do que reescrever a página inteira às cegas.
 */
export function applyRewritesToHtml(
  html: string,
  rewrites: CopyRewrite[],
): { html: string; applied: number; missed: string[] } {
  const pending = rewrites.filter((r) => r?.excerpt?.trim() && r?.rewrite?.trim());
  if (!html || pending.length === 0) return { html, applied: 0, missed: [] };

  const matchers = pending.map((r) => excerptMatcher(r.excerpt));
  const done = new Set<number>();

  const rewriteTextNode = (raw: string): string => {
    if (!raw.trim()) return raw;
    let decoded = decodeEntities(raw);
    let changed = false;
    for (let i = 0; i < pending.length; i++) {
      if (done.has(i)) continue;
      if (!matchers[i].test(decoded)) continue;
      const replacement = pending[i].rewrite.trim();
      decoded = decoded.replace(matchers[i], () => replacement);
      done.add(i);
      changed = true;
    }
    return changed ? escapeHtml(decoded) : raw;
  };

  const OPAQUE = /^(script|style|noscript|textarea)$/i;
  const tokenRe = /<!--[\s\S]*?-->|<\/?([a-zA-Z][\w:-]*)\b[^>]*>/g;
  let out = '';
  let cursor = 0;
  let opaqueDepth = 0;
  let token: RegExpExecArray | null;

  while ((token = tokenRe.exec(html)) !== null) {
    const text = html.slice(cursor, token.index);
    out += opaqueDepth > 0 ? text : rewriteTextNode(text);
    out += token[0];
    cursor = token.index + token[0].length;

    const tag = token[1];
    if (tag && OPAQUE.test(tag)) {
      if (token[0].startsWith('</')) opaqueDepth = Math.max(0, opaqueDepth - 1);
      else if (!token[0].endsWith('/>')) opaqueDepth++;
    }
  }
  const tail = html.slice(cursor);
  out += opaqueDepth > 0 ? tail : rewriteTextNode(tail);

  const missed = pending.filter((_, i) => !done.has(i)).map((r) => r.excerpt);
  return { html: out, applied: done.size, missed };
}

export function StepLandingPage({
  campaignId,
  productType,
  productName,
  vertical,
  channel,
  pageType,
  setPageType,
  popupGate,
  setPopupGate,
  videoUrl,
  setVideoUrl,
  presellUrl,
  generating,
  onGenerate,
  bridgeChecks,
  onToggleCheck,
  checklistMeta,
  verifyingChecklist,
  onVerifyChecklist,
  onFixChecklistItem,
  onPrev,
  onNext,
}: StepLandingPageProps) {
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [slug, setSlug] = useState('');
  const [gtmId, setGtmId] = useState('');
  const [pixelId, setPixelId] = useState('');
  const [capiToken, setCapiToken] = useState('');
  const [capiMasked, setCapiMasked] = useState(false);
  const [savingTracking, setSavingTracking] = useState(false);
  const [presellHtml, setPresellHtml] = useState('');
  const [refreshTick, setRefreshTick] = useState(0);
  const wasGenerating = useRef(generating);

  useEffect(() => {
    if (!campaignId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/campaigns/${campaignId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        if (typeof data?.presellHtml === 'string') setPresellHtml(data.presellHtml);
        const latest = data?.presells?.[0];
        if (!latest) return;
        setSlug(latest.slug ?? '');
        setPublishedUrl(latest.publishedUrl || (latest.slug ? `/p/${latest.slug}` : null));
      } catch {
        /* silencioso: o passo continua utilizável sem o status da presell */
      }
    })();
    return () => { cancelled = true; };
  }, [campaignId, refreshTick]);

  // Quando a geração termina, o HTML no banco mudou: recarrega para o preview refletir.
  useEffect(() => {
    if (wasGenerating.current && !generating) setRefreshTick((t) => t + 1);
    wasGenerating.current = generating;
  }, [generating]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/integrations');
        if (!res.ok) return;
        const rows = await res.json();
        if (cancelled || !Array.isArray(rows)) return;
        const find = (field: string) =>
          rows.find((r: any) => r?.serviceName === 'tracking' && r?.fieldName === field);
        const gtm = find(TRACKING_FIELDS.gtm);
        const pixel = find(TRACKING_FIELDS.pixel);
        const capi = find(TRACKING_FIELDS.capi);
        if (gtm?.fieldValue) setGtmId(gtm.fieldValue);
        if (pixel?.fieldValue) setPixelId(pixel.fieldValue);
        // fieldValue de token vem mascarado da API — não sobrescrevemos com bolinhas.
        if (capi?.fieldValue) setCapiMasked(true);
      } catch {
        /* silencioso */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (presellUrl) setPublishedUrl(presellUrl);
  }, [presellUrl]);

  const saveTracking = async () => {
    const pending: Array<[string, string]> = [];
    if (gtmId.trim()) pending.push([TRACKING_FIELDS.gtm, gtmId.trim()]);
    if (pixelId.trim()) pending.push([TRACKING_FIELDS.pixel, pixelId.trim()]);
    if (capiToken.trim()) pending.push([TRACKING_FIELDS.capi, capiToken.trim()]);
    if (!pending.length) { toast.error('Preencha ao menos um campo de tracking.'); return; }
    setSavingTracking(true);
    try {
      for (const [fieldName, fieldValue] of pending) {
        const res = await fetch('/api/integrations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ serviceName: 'tracking', fieldName, fieldValue }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          toast.error(data?.error ?? `Erro ao salvar ${fieldName}`);
          return;
        }
      }
      if (capiToken.trim()) { setCapiToken(''); setCapiMasked(true); }
      toast.success('Tracking salvo — será injetado na próxima geração da página.');
    } catch {
      toast.error('Erro de rede ao salvar tracking.');
    } finally {
      setSavingTracking(false);
    }
  };

  const getPageTypeLabel = (t: string) => {
    const labels: Record<string, string> = {
      advertorial: 'Advertorial (Artigo de Review)',
      pogo: 'Pogo (Comparativo)',
      vsl: 'VSL (Video Sales Letter)',
      interstitial: 'Interstitial (Aviso rápido)',
      authority: 'Authority (Página de autoridade)',
      tsl: 'TSL (Text Sales Letter)',
      cookie_popup: 'Cookie Popup (Gate de consentimento)',
      review: 'Review (Análise do produto)',
    };
    return labels[t] ?? t;
  };

  const getDynamicTemplates = (): PresellPageType[] => {
    if (productType === 'PROPRIETARY_LOW_TICKET') return ['tsl', 'vsl', 'advertorial', 'review'];
    if (productType === 'MENTORSHIP') return ['authority', 'vsl', 'tsl', 'advertorial'];
    return ['advertorial', 'pogo', 'vsl', 'interstitial', 'review', 'cookie_popup'];
  };

  const criticalItems = BRIDGE_CHECKLIST.filter(i => i.critical);
  const criticalDone = criticalItems.filter(i => bridgeChecks[i.key]).length;
  const totalDone = BRIDGE_CHECKLIST.filter(i => bridgeChecks[i.key]).length;
  const pct = BRIDGE_CHECKLIST.length ? Math.round((totalDone / BRIDGE_CHECKLIST.length) * 100) : 0;
  const canGoNext = criticalItems.every(i => bridgeChecks[i.key]);
  const activeCopy = useMemo(() => htmlToPlainCopy(presellHtml), [presellHtml]);

  // Aprovação do painel de IA: grava no presellHtml, que é o que o preview e a
  // página publicada leem. Lança em caso de falha para o painel não dar o
  // aprovado como aplicado.
  const handleApproveProposal = async (rewritten: string, issues: CopyRewrite[]) => {
    if (!presellHtml.trim()) {
      throw new Error('Não há HTML gerado para receber as correções. Gere a página antes de aprovar.');
    }
    const { html: nextHtml, applied, missed } = applyRewritesToHtml(presellHtml, issues);
    if (applied === 0) {
      throw new Error(
        'Nenhum trecho aprovado foi localizado no HTML da página. Regere a página e rode a revisão de novo.',
      );
    }
    if (!campaignId) {
      throw new Error('Salve a campanha antes de aprovar: sem id não há onde gravar as correções.');
    }

    const res = await fetch(`/api/campaigns/${campaignId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ presellHtml: nextHtml }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error || `Falha ao gravar a página (HTTP ${res.status}).`);
    }

    setPresellHtml(nextHtml);
    if (missed.length > 0) {
      toast.warning(
        `${applied} correção(ões) gravadas. ${missed.length} trecho(s) atravessam tags e ficaram de fora — ajuste à mão.`,
      );
    }
  };
  const proposalContext = [
    productName && `Produto: ${productName}`,
    vertical && `Vertical: ${vertical}`,
    channel && `Canal: ${channel}`,
    `Tipo de página: ${getPageTypeLabel(pageType)}`,
  ].filter(Boolean).join(' · ');

  return (
    <div className="space-y-4">
      <Card className="bg-[#1e293b] border-[#334155]">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-400" />
              Pré-sell / Landing Page
            </CardTitle>
            <p className="text-sm text-slate-400 mt-1">
              {productName || 'Produto'} · {vertical || 'sem vertical'} · {channel || 'sem canal'}
            </p>
          </div>
          <div className="relative h-16 w-16 shrink-0">
            <svg className="h-16 w-16 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#334155" strokeWidth="3" />
              <circle
                cx="18" cy="18" r="15.9155" fill="none"
                stroke={pct === 100 ? '#10b981' : '#f59e0b'}
                strokeWidth="3"
                strokeDasharray={`${pct} ${100 - pct}`}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-white">
              {pct}%
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-slate-300">Template da página</Label>
            <Select value={pageType} onValueChange={(v) => setPageType(v as PresellPageType)}>
              <SelectTrigger className="bg-[#0f172a] border-[#334155] text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1e293b] border-[#334155] text-white">
                {getDynamicTemplates().map((t) => (
                  <SelectItem key={t} value={t}>{getPageTypeLabel(t)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-[#0f172a]">
            <Checkbox
              checked={popupGate}
              onCheckedChange={(v: any) => setPopupGate(!!v)}
              className="mt-0.5 border-slate-600 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
            />
            <div>
              <span className="text-sm text-white">Popup gate antes do clique</span>
              <p className="text-xs text-slate-400 mt-0.5">
                Cuidado: gate agressivo é motivo comum de reprovação no Google Ads.
              </p>
            </div>
          </div>

          {pageType === 'vsl' && (
            <div className="space-y-2">
              <Label className="text-slate-300">URL do vídeo (VSL)</Label>
              <Input
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="bg-[#0f172a] border-[#334155] text-white"
              />
            </div>
          )}

          <div className="space-y-3 p-3 rounded-lg bg-[#0f172a] border border-[#334155]">
            <div className="flex items-center justify-between gap-3">
              <Label className="text-slate-300">Tracking injetado na página</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={saveTracking}
                disabled={savingTracking}
                className="h-7 text-[11px] border-[#334155] text-slate-300 gap-1.5"
              >
                {savingTracking ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                Salvar tracking
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-400">GTM Container ID</Label>
                <Input value={gtmId} onChange={(e) => setGtmId(e.target.value)} placeholder="GTM-XXXXXXX" className="bg-[#1e293b] border-[#334155] text-white" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-400">Meta Pixel ID</Label>
                <Input value={pixelId} onChange={(e) => setPixelId(e.target.value)} placeholder="1234567890" className="bg-[#1e293b] border-[#334155] text-white" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-400">Meta CAPI Token</Label>
                <Input
                  type="password"
                  value={capiToken}
                  onChange={(e) => setCapiToken(e.target.value)}
                  placeholder={capiMasked ? '•••••••• (já salvo)' : 'EAAG...'}
                  className="bg-[#1e293b] border-[#334155] text-white"
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-500">
              Salvo em Integrações (serviço <code>tracking</code>) e lido pelo gerador da presell na próxima geração.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => onGenerate()}
              disabled={generating}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            >
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {publishedUrl ? 'Regerar página' : 'Gerar página'}
            </Button>
            {publishedUrl && (
              <a
                href={publishedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1.5"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {slug ? `/p/${slug}` : 'Abrir página'}
              </a>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-[#1e293b] border-[#334155]">
        <CardHeader>
          <CardTitle className="text-white text-base flex items-center gap-2">
            <MonitorPlay className="h-4 w-4 text-emerald-400" />
            Preview da página
            {presellHtml ? (
              <Badge className="bg-emerald-500/15 text-emerald-400 text-[10px] hover:bg-emerald-500/25">
                HTML gerado
              </Badge>
            ) : publishedUrl ? (
              <Badge className="bg-sky-500/15 text-sky-400 text-[10px] hover:bg-sky-500/25">
                URL publicada
              </Badge>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PreviewFrame
            html={presellHtml || null}
            url={presellHtml ? null : publishedUrl}
            title={`Preview — ${productName || 'presell'}`}
            emptyLabel="Gere a página para ver o preview aqui."
          />
        </CardContent>
      </Card>

      <AiProposalPanel
        campaignId={campaignId}
        activeCopy={activeCopy}
        context={proposalContext}
        onApprove={handleApproveProposal}
      />

      <Card className="bg-[#1e293b] border-[#334155]">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="text-white text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            Checklist da página
            <Badge className="bg-slate-500/20 text-slate-300 text-[10px] hover:bg-slate-500/30">
              {criticalDone}/{criticalItems.length} críticos
            </Badge>
          </CardTitle>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onVerifyChecklist()}
            disabled={verifyingChecklist}
            className="h-8 text-xs border-[#334155] text-slate-300 gap-1.5"
          >
            {verifyingChecklist ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldCheck className="h-3 w-3" />}
            Verificar de verdade
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {BRIDGE_CHECKLIST.map((item) => (
            <ChecklistItemRow
              key={item.key}
              item={item}
              checked={!!bridgeChecks[item.key]}
              onToggle={(v) => onToggleCheck(item.key, v)}
              meta={checklistMeta[item.key]}
              step={4}
              onFix={onFixChecklistItem}
            />
          ))}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onPrev} className="border-[#334155] text-slate-300 gap-2">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
        <Button onClick={onNext} disabled={!canGoNext} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
          Avançar <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
