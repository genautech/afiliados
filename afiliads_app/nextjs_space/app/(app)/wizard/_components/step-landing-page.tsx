'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Wand2, ShieldCheck, Eye, Loader2, ExternalLink, RefreshCw, Sparkles, Tag, Check, Info, ArrowLeft, ArrowRight
} from 'lucide-react';
import { AgentHelp, ChecklistItemRow } from './agent-help';
import { BRIDGE_CHECKLIST } from '@/lib/wizard-data';
import { PresellPageType, PRESELL_PAGE_TYPES } from '@/lib/presell-types';

export interface StepLandingPageProps {
  campaignId: string | null;
  productType: 'AFFILIATE' | 'PROPRIETARY_LOW_TICKET' | 'MENTORSHIP';
  productName: string;
  vertical: string;
  channel: string;
  pageType: string;
  setPageType: (type: any) => void;
  popupGate: boolean;
  setPopupGate: (v: boolean) => void;
  videoUrl: string;
  setVideoUrl: (v: string) => void;
  
  // Tracking states
  gtmContainerId?: string;
  setGtmContainerId?: (v: string) => void;
  metaPixelId?: string;
  setMetaPixelId?: (v: string) => void;
  metaCapiToken?: string;
  setMetaCapiToken?: (v: string) => void;

  onPrev: () => void;
  onNext: () => void;
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
  onPrev,
  onNext
}: StepLandingPageProps) {
  const [generating, setGenerating] = useState(false);
  const [verifyingChecklist, setVerifyingChecklist] = useState(false);
  const [bridgeChecks, setBridgeChecks] = useState<Record<string, boolean>>({});
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [slug, setSlug] = useState('');

  // Local state for tracking variables to present inline GTM / Pixel configs
  const [gtmId, setGtmId] = useState('');
  const [pixelId, setPixelId] = useState('');
  const [capiToken, setCapiToken] = useState('');

  // Fetch current pre-sell or tracking data if campaign exists
  useEffect(() => {
    if (!campaignId) return;

    // Simulated fetch of current generated pre-sell status
    const fetchPresellStatus = async () => {
      try {
        const res = await fetch(`/api/campaigns/${campaignId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.presells && data.presells.length > 0) {
            const latest = data.presells[0];
            setPublishedUrl(latest.publishedUrl || `/p/${latest.slug}`);
            setSlug(latest.slug);
          }
        }
      } catch (err) {
        console.warn('Failed to fetch pre-sell status:', err);
      }
    };

    fetchPresellStatus();
  }, [campaignId]);

  const handleGeneratePage = async () => {
    if (!campaignId) {
      toast.error('Grave a campanha como rascunho antes de gerar a página');
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch('/api/presells', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId,
          productName,
          pageType,
          popupGate,
          videoUrl: pageType === 'vsl' ? videoUrl : undefined,
          gtmContainerId: gtmId || undefined,
          metaPixelId: pixelId || undefined,
          metaCapiToken: capiToken || undefined,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Erro na geração da página de alta conversão');
      }

      const data = await res.json();
      toast.success('Página de Alta Conversão Gerada com Sucesso!');
      setPublishedUrl(data.presell.publishedUrl || `/p/${data.presell.slug}`);
      setSlug(data.presell.slug);
    } catch (err: any) {
      toast.error(err.message || 'Erro de IA na geração da página');
    } finally {
      setGenerating(false);
    }
  };

  const runChecklistVerify = async () => {
    if (!campaignId) return;
    setVerifyingChecklist(true);
    try {
      const res = await fetch('/api/checklists/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId, step: 4 })
      });
      if (res.ok) {
        const data = await res.json();
        setBridgeChecks(data.checks || {});
        toast.success('Verificação de conformidade concluída!');
      } else {
        toast.error('Erro ao processar validação do checklist');
      }
    } catch {
      toast.error('Erro ao verificar checklist');
    } finally {
      setVerifyingChecklist(false);
    }
  };

  // Determine dynamic templates list based on product vertical type
  const getPageTypeLabel = (type: string) => {
    switch (type) {
      case 'advertorial': return 'Advertorial (Artigo de Review)';
      case 'pogo': return 'Pogo (Curta, direto ao ponto)';
      case 'vsl': return 'VSL (Video Sales Letter)';
      case 'authority': return 'Authority (Autoridade Editorial - Ingredientes/Pacotes)';
      case 'interstitial': return 'Interstitial (Teaser Screenshot - Display/Native)';
      case 'tsl': return 'TSL (Texto Longo de Vendas)';
      case 'cookie_popup': return 'Cookie/Popup (Foca em marcação de cookies)';
      case 'review': return 'Review (Análise de especialista detalhada)';
      default: return type;
    }
  };

  const getDynamicTemplates = () => {
    if (productType === 'PROPRIETARY_LOW_TICKET') {
      return [
        { type: 'advertorial', desc: 'Página de Vendas Direta (Estrutura clássica de Infoproduto)' },
        { type: 'vsl', desc: 'Página de Vendas de Vídeo (VSL Low-Ticket)' },
        { type: 'tsl', desc: 'Página de Vendas Longa Editorial (Alta persuasão de texto)' },
        { type: 'cookie_popup', desc: 'Squeeze Page Interativa com Formulário de Compra' }
      ];
    }
    if (productType === 'MENTORSHIP') {
      return [
        { type: 'review', desc: 'Landing Page de Captura de Lead (Inscrição para Mentoria)' },
        { type: 'authority', desc: 'Página de Autoridade e Agenda (Foco em call de fechamento)' },
        { type: 'pogo', desc: 'Página Squeeze Curta (Foco em WhatsApp direto / Isque Digital)' }
      ];
    }
    return [
      { type: 'advertorial', desc: 'Advertorial (Artigo de Review de Afiliado)' },
      { type: 'pogo', desc: 'Pogo (Página curta direta ao HopLink)' },
      { type: 'vsl', desc: 'VSL (Vídeo de Venda Editorial)' },
      { type: 'authority', desc: 'Authority (Ingredientes, Formulação e Selos)' },
      { type: 'interstitial', desc: 'Interstitial (Screenshot + Popup de Segmentação)' },
      { type: 'tsl', desc: 'TSL (Texto de Vendas para Display)' },
      { type: 'cookie_popup', desc: 'Cookie/Popup (Teaser de Cookie)' },
      { type: 'review', desc: 'Review Completo e Detalhado de Usuário' }
    ];
  };

  const templates = getDynamicTemplates();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Eye className="h-5 w-5 text-emerald-400 animate-pulse" />
          {productType === 'AFFILIATE' ? 'Pré-sell / Bridge Page' : 'Landing Page de Venda'}
        </h2>
        <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          Modo Inteligente
        </Badge>
      </div>

      {/* Checklist Ring Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-[#090d16] border border-[#1e293b] rounded-xl p-4">
        <div className="relative w-12 h-12 shrink-0">
          <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
            <circle cx="24" cy="24" r="20" fill="none" stroke="#1e293b" strokeWidth="3.5" />
            <circle
              cx="24"
              cy="24"
              r="20"
              fill="none"
              stroke={Object.keys(bridgeChecks).length > 0 ? '#10b981' : '#f59e0b'}
              strokeWidth="3.5"
              strokeDasharray={`${(Object.values(bridgeChecks).filter(Boolean).length / Math.max(1, BRIDGE_CHECKLIST.length)) * 125.6} 125.6`}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
            {Object.values(bridgeChecks).filter(Boolean).length}/{BRIDGE_CHECKLIST.length}
          </span>
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-200">Validador de Compliance Sentinel</p>
          <p className="text-xs text-slate-400">
            {BRIDGE_CHECKLIST.filter(i => i.critical && !bridgeChecks[i.key]).length} requisitos pendentes de auditoria.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={runChecklistVerify}
          disabled={verifyingChecklist || !campaignId}
          className="border-[#1e293b] hover:bg-[#111827] text-slate-300 gap-1.5 shrink-0"
        >
          {verifyingChecklist ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" />
          ) : (
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          )}
          Validar Layout
        </Button>
      </div>

      {/* Editor & Configuration Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-slate-300 font-semibold flex items-center gap-1.5">
                <Tag className="h-4 w-4 text-emerald-400" /> Template de Geração
              </Label>
              <AgentHelp fieldKey="pageType" fieldValue={pageType} context={{ channel, vertical }} />
            </div>
            <Select value={pageType} onValueChange={(v) => setPageType(v)}>
              <SelectTrigger className="bg-[#0b0f19] border-[#1e293b] text-slate-100 hover:border-emerald-500/50 transition-colors">
                <SelectValue placeholder="Selecione o layout de página" />
              </SelectTrigger>
              <SelectContent className="bg-[#0b0f19] border-[#1e293b]">
                {templates.map(tpl => (
                  <SelectItem key={tpl.type} value={tpl.type} className="text-slate-300 hover:bg-[#1e293b] hover:text-white">
                    {tpl.desc}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2 bg-[#090d16]/50 border border-[#1e293b] p-3 rounded-lg">
            <Checkbox
              id="step5-popup-gate"
              checked={popupGate}
              onCheckedChange={(v: boolean) => setPopupGate(v)}
              className="border-[#1e293b] text-emerald-500 data-[state=checked]:bg-emerald-500"
            />
            <div className="grid gap-1.5 leading-none">
              <label htmlFor="step5-popup-gate" className="text-sm font-medium text-slate-200 cursor-pointer">
                Habilitar Pop-up de Retenção (Intenção de Saída)
              </label>
              <p className="text-xs text-slate-400">
                Abre caixa de aviso ao tentar fechar a aba, reduzindo taxas de rejeição.
              </p>
            </div>
          </div>

          {pageType === 'vsl' && (
            <div className="space-y-2 transition-all">
              <Label className="text-slate-300 font-semibold">URL de Incorporação do Vídeo</Label>
              <Input
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="Ex: https://www.youtube.com/embed/dQw4w9WgXcQ"
                className="bg-[#0b0f19] border-[#1e293b] text-slate-100 placeholder:text-slate-500 focus-visible:border-emerald-500 focus-visible:ring-emerald-500"
              />
            </div>
          )}
        </div>

        {/* Tracking Tags Configuration */}
        <div className="space-y-4 bg-[#090d16] border border-[#1e293b] p-5 rounded-xl">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-1.5 border-b border-[#1e293b] pb-2">
            <Sparkles className="h-4 w-4 text-emerald-400" /> Rastreamento Invisível Automatizado
          </h3>
          <p className="text-xs text-slate-400">
            Estes IDs serão embutidos e compilados de forma invisível nos cabeçalhos HTML para garantir atribuições seguras e consistentes.
          </p>

          <div className="space-y-2">
            <Label className="text-slate-300 text-xs font-semibold">Google Tag Manager Container ID</Label>
            <Input
              value={gtmId}
              onChange={(e) => setGtmId(e.target.value)}
              placeholder="Ex: GTM-XXXXXX"
              className="bg-[#0b0f19] border-[#1e293b] text-slate-100 placeholder:text-slate-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-slate-300 text-xs font-semibold">Meta Pixel ID</Label>
              <Input
                value={pixelId}
                onChange={(e) => setPixelId(e.target.value)}
                placeholder="Ex: 1234567890123"
                className="bg-[#0b0f19] border-[#1e293b] text-slate-100 placeholder:text-slate-500"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300 text-xs font-semibold">Meta CAPI Token</Label>
              <Input
                value={capiToken}
                onChange={(e) => setCapiToken(e.target.value)}
                type="password"
                placeholder="Token de Conversões CAPI"
                className="bg-[#0b0f19] border-[#1e293b] text-slate-100 placeholder:text-slate-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* AI Page Generation Panel */}
      <Card className="bg-[#090d16] border-[#1e293b] mt-4">
        <CardContent className="p-5 flex flex-col items-center justify-center text-center space-y-4">
          <div className="bg-emerald-500/10 p-3 rounded-full border border-emerald-500/20">
            <Wand2 className="h-6 w-6 text-emerald-400" />
          </div>
          <div className="max-w-md space-y-1">
            <h4 className="text-sm font-semibold text-slate-100">Geração de Redação & Estrutura via IA</h4>
            <p className="text-xs text-slate-400">
              Inicia o redator autônomo. Ele examinará o dossiê, objeções do Autocomplete e gerará um layout 100% livre de claims de risco.
            </p>
          </div>

          <Button
            onClick={handleGeneratePage}
            disabled={generating || !campaignId}
            className="bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-bold px-6 gap-2 w-full sm:w-auto"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Compilando Código & Tags...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Gerar Página de Alta Conversão
              </>
            )}
          </Button>

          {publishedUrl && (
            <div className="flex flex-col sm:flex-row items-center gap-3 bg-[#0d1425] border border-[#1e293b] p-3 rounded-lg w-full max-w-lg justify-between transition-all">
              <div className="text-left">
                <p className="text-xs text-slate-400">Página Publicada e Ativa:</p>
                <p className="text-xs font-mono text-emerald-400 truncate max-w-[280px]">
                  {publishedUrl}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="border-[#1e293b] hover:bg-[#1e293b] text-slate-300 gap-1"
                onClick={() => window.open(publishedUrl, '_blank')}
              >
                Visualizar <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between border-t border-slate-800 pt-4">
        <Button onClick={onPrev} variant="outline" className="border-[#1e293b] text-slate-300 gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
        <Button
          onClick={onNext}
          className="bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-bold gap-1.5"
        >
          Avançar <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
