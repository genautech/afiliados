'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { BookOpen, Check, CircleAlert, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { PreviewFrame } from './preview-frame';

/** Escrito por POST /api/campaigns/[id]/generate-draft (dna_aligner.py). */
interface CampaignDraft {
  ebookHtml?: string | null;
  landingPageHtml?: string | null;
  generatedAt?: string | null;
  mode?: 'LIVE' | 'MOCK' | null;
  sourceResearch?: string | null;
}

interface EbookDraftPanelProps {
  campaignId: string | null;
  productName?: string;
  className?: string;
}

function asDraft(value: unknown): CampaignDraft | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as CampaignDraft;
}

function formatMoment(iso?: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  return Number.isFinite(date.getTime()) ? date.toLocaleString('pt-BR') : '—';
}

/**
 * Gate de aprovação do rascunho. `apply-draft` copia o draftData inteiro, então
 * reaprovar o mesmo generatedAt é no-op — e o botão fica travado nesse caso.
 */
export function draftApprovalState(draft: CampaignDraft | null, active: CampaignDraft | null) {
  const hasDraft = Boolean(draft?.ebookHtml?.trim());
  const hasActive = Boolean(active?.ebookHtml?.trim());
  const activeIsStale = hasActive && Boolean(draft?.generatedAt) && active?.generatedAt !== draft?.generatedAt;
  return { hasDraft, hasActive, activeIsStale, approvable: hasDraft && (!hasActive || activeIsStale) };
}

export function EbookDraftPanel({ campaignId, productName, className = '' }: EbookDraftPanelProps) {
  const [draft, setDraft] = useState<CampaignDraft | null>(null);
  const [active, setActive] = useState<CampaignDraft | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [approving, setApproving] = useState(false);

  const load = useCallback(async () => {
    if (!campaignId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`);
      if (!res.ok) return;
      const data = await res.json();
      setDraft(asDraft(data?.draftData));
      setActive(asDraft(data?.activeData));
    } catch {
      /* silencioso: o passo continua utilizável sem o rascunho */
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => { void load(); }, [load]);

  const generate = async () => {
    if (!campaignId) { toast.error('Salve a campanha antes de gerar o rascunho.'); return; }
    setGenerating(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/generate-draft`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error || `Geração falhou (HTTP ${res.status}).`);
        return;
      }
      setDraft(asDraft(data?.draftData));
      toast.success(
        data?.draftData?.mode === 'MOCK'
          ? 'Rascunho gerado em modo MOCK — sem pesquisa real por trás.'
          : 'Rascunho do e-book gerado pelos agentes.',
      );
    } catch (e: any) {
      toast.error(e?.message || 'Erro de rede ao gerar o rascunho.');
    } finally {
      setGenerating(false);
    }
  };

  const approve = async () => {
    if (!campaignId) { toast.error('Salve a campanha antes de aprovar.'); return; }
    setApproving(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/apply-draft`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error || `Aprovação falhou (HTTP ${res.status}).`);
        return;
      }
      setActive(asDraft(data?.activeData) ?? draft);
      await load();
      toast.success('Rascunho aprovado: virou a versão ativa e liberou o empacotamento.');
    } catch (e: any) {
      toast.error(e?.message || 'Erro de rede ao aprovar o rascunho.');
    } finally {
      setApproving(false);
    }
  };

  const ebookHtml = draft?.ebookHtml?.trim() ? draft.ebookHtml : null;
  const { hasActive, activeIsStale, approvable } = draftApprovalState(draft, active);
  const canApprove = Boolean(campaignId) && approvable && !approving;

  return (
    <Card className={`bg-[#1e293b] border-[#334155] ${className}`}>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-white">
              <BookOpen className="h-5 w-5 text-amber-400" />
              Rascunho do e-book
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-500" />}
            </CardTitle>
            <CardDescription className="text-slate-400">
              O que os agentes escreveram para {productName || 'o produto'}. Nada é empacotado antes da
              sua aprovação.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {draft?.mode && (
              <Badge
                className={
                  draft.mode === 'LIVE'
                    ? 'bg-emerald-500/15 text-emerald-400 text-[10px] hover:bg-emerald-500/25'
                    : 'bg-amber-500/15 text-amber-400 text-[10px] hover:bg-amber-500/25'
                }
              >
                {draft.mode}
              </Badge>
            )}
            {hasActive && !activeIsStale && (
              <Badge className="bg-emerald-500/15 text-emerald-400 text-[10px] hover:bg-emerald-500/25">
                Aprovado · pronto para deploy
              </Badge>
            )}
            {activeIsStale && (
              <Badge className="bg-sky-500/15 text-sky-400 text-[10px] hover:bg-sky-500/25">
                Rascunho mais novo que o aprovado
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <PreviewFrame
          html={ebookHtml}
          title={`Preview do e-book — ${productName || 'rascunho'}`}
          maxHeight={560}
          emptyLabel={
            campaignId
              ? 'Nenhum rascunho gerado ainda. Peça a geração para os agentes abaixo.'
              : 'Salve a campanha para os agentes terem onde gravar o rascunho.'
          }
        />

        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
          <span>Gerado em: {formatMoment(draft?.generatedAt)}</span>
          {hasActive && <span>· Aprovado em: {formatMoment(active?.generatedAt)}</span>}
        </div>

        {activeIsStale && (
          <div className="flex items-start gap-2 rounded-lg border border-sky-500/25 bg-sky-500/5 p-3 text-[11px] text-sky-200">
            <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              A versão ativa é de {formatMoment(active?.generatedAt)} e existe rascunho novo de{' '}
              {formatMoment(draft?.generatedAt)}. Aprovar substitui o ativo pelo rascunho atual.
            </span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 border-t border-[#334155] pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={generate}
            disabled={generating || !campaignId}
            className="gap-2 border-[#334155] bg-transparent text-slate-200 hover:bg-[#0f172a] hover:text-white"
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {generating ? 'Gerando' : draft ? 'Gerar de novo' : 'Gerar rascunho com os agentes'}
          </Button>

          <Button
            type="button"
            onClick={approve}
            disabled={!canApprove}
            className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40"
          >
            {approving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {approving ? 'Aprovando' : 'Aprovar rascunho de e-book'}
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={() => void load()}
            disabled={loading || !campaignId}
            className="gap-2 text-slate-400 hover:bg-[#0f172a] hover:text-white"
          >
            <RefreshCw className="h-4 w-4" />
            Recarregar
          </Button>
        </div>

        {hasActive && !activeIsStale && (
          <p className="text-[11px] text-emerald-400/80">
            Versão ativa gravada. O empacotamento (PDF + zip da landing) é disparado no passo 9.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
