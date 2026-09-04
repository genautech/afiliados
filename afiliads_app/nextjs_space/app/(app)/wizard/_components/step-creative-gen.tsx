'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import {
  Wand2, Sparkles, ShieldAlert, Facebook, Search, CheckCircle2,
  AlertTriangle, RotateCcw, ThumbsUp, MessageSquare, Share2,
  ExternalLink, ShieldCheck, ArrowRight, ArrowLeft, AlertCircle, Wrench, Loader2,
  Image as ImageIcon, BookImage, Megaphone
} from 'lucide-react';
import { validateCompliance, autoCorrectClaims, type ComplianceResult, type ComplianceIssue } from '@/lib/validators/complianceValidator';

/** Os dois `type` aceitos por POST /api/creatives/generate-image. */
export type VisualKind = 'ebook-cover' | 'facebook-ad';

export interface GeneratedVisual {
  url: string;
  kind: VisualKind;
  model: string | null;
  prompt: string | null;
  mock: boolean;
}

/** O prompt é montado aqui: a rota só recebe texto pronto, não conhece o wizard. */
export function buildVisualPrompt(
  kind: VisualKind,
  productName: string,
  vertical: string,
  angle: string,
): string {
  const produto = productName.trim() || 'produto digital';
  const nicho = vertical.trim() || 'geral';
  return kind === 'ebook-cover'
    ? `Capa 3D de e-book premium para "${produto}", nicho ${nicho}. Livro em perspectiva com profundidade e sombra suave, tipografia legível no topo, fundo escuro com luz direcional. Sem texto ilegível, sem watermark.`
    : `Banner de anúncio para feed, proporção 1.91:1, produto "${produto}", nicho ${nicho}, ângulo "${angle}". Composição limpa com foco central, alto contraste, espaço negativo à esquerda para sobrepor copy. Sem texto embutido, sem watermark.`;
}

const VISUAL_STAGES = [
  'Montando o prompt a partir do ângulo e da vertical...',
  'Enfileirando no ComfyUI / Higgsfield...',
  'Difundindo os passos de render...',
  'Fazendo upscale e recorte final...',
];

/** Aceita URL http(s) ou caminho servido pelo app; nunca data: nem file:. */
function isRenderableSrc(value: unknown): value is string {
  if (typeof value !== 'string' || !value.trim()) return false;
  if (value.startsWith('/')) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * A rota de imagem ainda está em construção no backend, então aceitamos as formas
 * plausíveis (`imageUrl`, `url`, `path`, `images[0]`) em vez de travar numa só.
 */
export function normalizeGeneratedImage(raw: unknown, kind: VisualKind): GeneratedVisual | null {
  if (!raw || typeof raw !== 'object') return null;
  const root = raw as Record<string, unknown>;
  const nested = (Array.isArray(root.images) ? root.images[0] : root.image) as
    | Record<string, unknown>
    | string
    | undefined;
  const nestedObj = (nested && typeof nested === 'object' ? nested : {}) as Record<string, unknown>;

  const candidates = [
    root.imageUrl, root.url, root.path, root.image_url,
    typeof nested === 'string' ? nested : undefined,
    nestedObj.url, nestedObj.imageUrl, nestedObj.path,
  ];
  const url = candidates.find(isRenderableSrc);
  if (!url) return null;

  const model = [root.model, root.engine, nestedObj.model].find(
    (v): v is string => typeof v === 'string' && v.trim().length > 0,
  );
  const prompt = [root.prompt, nestedObj.prompt].find(
    (v): v is string => typeof v === 'string' && v.trim().length > 0,
  );
  return { url, kind, model: model ?? null, prompt: prompt ?? null, mock: root.mock === true };
}

interface StepCreativeGenProps {
  campaignId: string | null;
  productType: 'AFFILIATE' | 'PROPRIETARY_LOW_TICKET' | 'MENTORSHIP';
  productName: string;
  vertical: string;
  onPrev: () => void;
  onNext: () => void;
}

export function StepCreativeGen({
  campaignId,
  productType,
  productName,
  vertical,
  onPrev,
  onNext
}: StepCreativeGenProps) {
  // Angle Selection
  const [selectedAngle, setSelectedAngle] = useState('Alerta de Fraude');
  const [selectedTone, setSelectedTone] = useState<'critical' | 'scientific' | 'alert' | 'challenge'>('alert');
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'facebook' | 'google'>('facebook');
  const [visuals, setVisuals] = useState<Partial<Record<VisualKind, GeneratedVisual>>>({});
  const [visualLoading, setVisualLoading] = useState<VisualKind | null>(null);
  const [visualStage, setVisualStage] = useState(0);

  // Ad Copy State - Facebook
  const [fbPrimaryText, setFbPrimaryText] = useState('');
  const [fbHeadline, setFbHeadline] = useState('');
  const [fbDescription, setFbDescription] = useState('');

  // Ad Copy State - Google Search
  const [gHeadline1, setGHeadline1] = useState('');
  const [gHeadline2, setGHeadline2] = useState('');
  const [gHeadline3, setGHeadline3] = useState('');
  const [gDescription1, setGDescription1] = useState('');
  const [gDescription2, setGDescription2] = useState('');

  // Compliance state
  const [complianceResult, setComplianceResult] = useState<ComplianceResult>({
    score: 100,
    riskLevel: 'LOW',
    issues: [],
    passed: true
  });

  const angles = [
    {
      name: 'Alerta de Fraude',
      tagline: 'Foque na segurança e integridade',
      description: 'Destaca golpes, falsificações e imitações do produto original na internet, guiando o comprador com segurança ao site oficial.',
      color: 'border-amber-500/30 hover:border-amber-500/80 active:bg-amber-500/10'
    },
    {
      name: 'Fórmula Científica',
      tagline: 'Foque nos compostos ativos',
      description: 'Explica o mecanismo de ação dos compostos ativos com tom autoritativo e embasamento em laboratório credenciado.',
      color: 'border-emerald-500/30 hover:border-emerald-500/80 active:bg-emerald-500/10'
    },
    {
      name: 'Depoimento Sóbrio',
      tagline: 'Foque em histórias reais',
      description: 'Fórmula de relato honesto com dúvidas no início e superação legítima ao adotar o produto na rotina diária.',
      color: 'border-blue-500/30 hover:border-blue-500/80 active:bg-blue-500/10'
    },
    {
      name: 'Desafio 30 Dias',
      tagline: 'Foque em risco zero',
      description: 'Desafia o usuário a testar o produto nas próximas semanas sob o respaldo da garantia total de reembolso do fabricante.',
      color: 'border-purple-500/30 hover:border-purple-500/80 active:bg-purple-500/10'
    }
  ];

  const tones = [
    { id: 'alert', label: 'Alerta Crítico' },
    { id: 'scientific', label: 'Científico' },
    { id: 'critical', label: 'Investigativo' },
    { id: 'challenge', label: 'Desafiador' }
  ] as const;

  // Real-time client-side compliance checker
  const runLocalComplianceCheck = () => {
    const fullText = [
      fbPrimaryText,
      fbHeadline,
      fbDescription,
      gHeadline1,
      gHeadline2,
      gHeadline3,
      gDescription1,
      gDescription2
    ].join('\n');

    const check = validateCompliance(fullText);
    setComplianceResult(check);
  };

  // Re-run compliance on input changes
  useEffect(() => {
    runLocalComplianceCheck();
  }, [
    fbPrimaryText,
    fbHeadline,
    fbDescription,
    gHeadline1,
    gHeadline2,
    gHeadline3,
    gDescription1,
    gDescription2
  ]);

  // Initial generation
  useEffect(() => {
    handleGenerate(true);
  }, [selectedAngle, selectedTone]);

  const handleGenerate = async (isInitial = false) => {
    setGenerating(true);
    try {
      const response = await fetch('/api/creatives/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId,
          productType,
          productName: productName || 'Produto Exemplo',
          productNiche: vertical || 'Saúde & Bem-estar',
          tone: selectedTone,
          angle: selectedAngle,
          intentQueries: ['como comprar original', 'reclame aqui', 'comentários reais'],
          competitorDores: ['imitações piratas', 'falta de garantia', 'demora na entrega']
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setFbPrimaryText(data.facebook.primaryText);
        setFbHeadline(data.facebook.headline);
        setFbDescription(data.facebook.description);

        setGHeadline1(data.google.headline1);
        setGHeadline2(data.google.headline2);
        setGHeadline3(data.google.googleHeadline3 || data.google.headline3 || '');
        setGDescription1(data.google.description1);
        setGDescription2(data.google.description2);

        setComplianceResult(data.compliance);

        if (!isInitial) {
          toast.success('Novas copys geradas com IA e verificadas pelo Compliance Sentinel!');
        }
      } else {
        toast.error('Erro ao gerar copys inteligentes');
      }
    } catch {
      toast.error('Erro de rede ao conectar com o gerador de criativos');
    } finally {
      setGenerating(false);
    }
  };

  const handleAutoFix = () => {
    setFbPrimaryText(autoCorrectClaims(fbPrimaryText));
    setFbHeadline(autoCorrectClaims(fbHeadline));
    setFbDescription(autoCorrectClaims(fbDescription));
    setGHeadline1(autoCorrectClaims(gHeadline1));
    setGHeadline2(autoCorrectClaims(gHeadline2));
    setGHeadline3(autoCorrectClaims(gHeadline3));
    setGDescription1(autoCorrectClaims(gDescription1));
    setGDescription2(autoCorrectClaims(gDescription2));
    toast.success('Compliance Sentinel: Claims de risco substituídos por termos permitidos.');
  };

  // Helper to highlight compliance risk items inside of edit fields or previews
  const highlightOffendingWords = (text: string) => {
    if (!text) return text;
    // Highlight matched words based on common rules
    let highlightedElements: React.ReactNode[] = [];
    const words = text.split(/(\s+)/);

    words.forEach((word, index) => {
      const cleanWord = word.trim().toLowerCase();
      // Match against mock rules
      const isHigh = /(curar?|cure|cura|diabetes|perca 10kg|emagrecer sem esforço|de r\$999 por r\$29)/i.test(cleanWord);
      const isMedium = /(100% garantido|garantia absoluta|últimos minutos|restam apenas)/i.test(cleanWord);

      if (isHigh) {
        highlightedElements.push(
          <span
            key={index}
            className="underline decoration-red-500 decoration-2 bg-red-500/10 text-red-200 px-0.5 rounded cursor-pointer"
            title="Risco Alto: Violação direta das políticas do Google/Meta."
          >
            {word}
          </span>
        );
      } else if (isMedium) {
        highlightedElements.push(
          <span
            key={index}
            className="underline decoration-yellow-500 decoration-2 bg-yellow-500/10 text-yellow-200 px-0.5 rounded cursor-pointer"
            title="Risco Médio: Termo agressivo, passível de strike."
          >
            {word}
          </span>
        );
      } else {
        highlightedElements.push(word);
      }
    });

    return <>{highlightedElements}</>;
  };

  useEffect(() => {
    if (!visualLoading) { setVisualStage(0); return; }
    const timer = setInterval(() => setVisualStage((i) => (i + 1) % VISUAL_STAGES.length), 1600);
    return () => clearInterval(timer);
  }, [visualLoading]);

  const generateVisual = async (kind: VisualKind) => {
    if (!campaignId) { toast.error('Salve a campanha antes de gerar a arte.'); return; }
    setVisualLoading(kind);
    try {
      const res = await fetch('/api/creatives/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId,
          type: kind,
          prompt: buildVisualPrompt(kind, productName, vertical, selectedAngle),
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.status === 404 && !data?.error) {
        toast.error('A rota POST /api/creatives/generate-image ainda não existe no app.');
        return;
      }
      if (!res.ok) {
        toast.error(data?.error || `Geração de imagem falhou (HTTP ${res.status}).`);
        return;
      }
      const visual = normalizeGeneratedImage(data, kind);
      if (!visual) {
        toast.error('A geração respondeu 200 sem caminho de imagem utilizável.');
        return;
      }
      setVisuals((prev) => ({ ...prev, [kind]: visual }));
      const what = kind === 'facebook-ad' ? 'Banner gerado e aplicado no mockup.' : 'Capa 3D gerada.';
      toast.success(visual.mock ? `${what} (placeholder — provedor de imagem não configurado)` : what);
    } catch (e: any) {
      toast.error(e?.message || 'Erro de rede ao gerar a imagem.');
    } finally {
      setVisualLoading(null);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Step Title */}
      <div className="flex flex-col space-y-1.5">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Wand2 className="h-5 w-5 text-emerald-400" /> Passo 4 — Geração de Criativos & Copy
        </h2>
        <p className="text-sm text-slate-400">
          Escolha um ângulo editorial de alta conversão e veja a IA do Compliance Sentinel criar títulos e descrições blindados contra strikes.
        </p>
      </div>

      {/* Grid: Angle Selection */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {angles.map((ang) => {
          const isSelected = selectedAngle === ang.name;
          return (
            <div
              key={ang.name}
              onClick={() => setSelectedAngle(ang.name)}
              className={`rounded-lg border p-4 cursor-pointer transition-all duration-200 ${ang.color} ${
                isSelected
                  ? 'bg-slate-900/60 border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/40'
                  : 'bg-slate-950/40 border-slate-800'
              }`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm text-white">{ang.name}</h4>
                  {isSelected && <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />}
                </div>
                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">{ang.tagline}</p>
                <p className="text-[11px] text-slate-500 leading-snug">{ang.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tone Selection Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0f172a] rounded-lg p-3 border border-slate-800/60">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tom de Voz:</span>
          <div className="flex gap-1.5">
            {tones.map((t) => (
              <Button
                key={t.id}
                size="sm"
                variant={selectedTone === t.id ? 'default' : 'ghost'}
                onClick={() => setSelectedTone(t.id)}
                className={`h-7 px-3 text-xs rounded ${
                  selectedTone === t.id
                    ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                {t.label}
              </Button>
            ))}
          </div>
        </div>

        <Button
          size="sm"
          onClick={() => handleGenerate(false)}
          disabled={generating}
          className="bg-blue-600 hover:bg-blue-500 text-white h-8 text-xs font-semibold gap-1.5"
        >
          {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {generating ? 'Regenerando...' : 'Regenerar com IA'}
        </Button>
      </div>

      {/* Compliance Sentinel Score Banner */}
      <div className={`rounded-lg border p-4 flex items-center justify-between flex-wrap gap-4 ${
        complianceResult.riskLevel === 'HIGH'
          ? 'bg-red-500/10 border-red-500/30'
          : complianceResult.riskLevel === 'MEDIUM'
          ? 'bg-yellow-500/10 border-yellow-500/30'
          : 'bg-emerald-500/10 border-emerald-500/30'
      }`}>
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12 shrink-0">
            <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
              <circle cx="24" cy="24" r="20" fill="none" stroke="#1e293b" strokeWidth="3" />
              <circle
                cx="24"
                cy="24"
                r="20"
                fill="none"
                stroke={
                  complianceResult.riskLevel === 'HIGH'
                    ? '#ef4444'
                    : complianceResult.riskLevel === 'MEDIUM'
                    ? '#f59e0b'
                    : '#10b981'
                }
                strokeWidth="3"
                strokeDasharray={`${(complianceResult.score / 100) * 125.6} 125.6`}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
              {complianceResult.score}%
            </span>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white flex items-center gap-1.5">
              Compliance Sentinel Shield
              <Badge className={
                complianceResult.riskLevel === 'HIGH'
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : complianceResult.riskLevel === 'MEDIUM'
                  ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }>
                Risco {complianceResult.riskLevel}
              </Badge>
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              {complianceResult.riskLevel === 'HIGH'
                ? 'Encontramos violações críticas de políticas. Clique em Auto-Corrigir para blindar seus anúncios.'
                : complianceResult.riskLevel === 'MEDIUM'
                ? 'Atenção a claims e palavras sensíveis que podem desencadear moderação manual.'
                : 'Seus criativos estão limpos de alegações médicas proibidas e prontos para publicação!'}
            </p>
          </div>
        </div>

        {complianceResult.issues.length > 0 && (
          <Button
            size="sm"
            onClick={handleAutoFix}
            className="bg-yellow-500 hover:bg-yellow-400 text-slate-950 text-xs font-bold gap-1.5 shrink-0 shadow-md"
          >
            <Wrench className="h-3.5 w-3.5" /> Auto-Corrigir Claims
          </Button>
        )}
      </div>

      {/* Editor & Preview Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Pane: Editor */}
        <div className="lg:col-span-6 space-y-4">
          <Card className="bg-[#111827]/40 border-slate-800">
            <CardHeader className="py-3 px-4 border-b border-slate-800">
              <CardTitle className="text-sm text-slate-300 flex items-center gap-1.5">
                <Wrench className="h-4 w-4 text-slate-400" /> Editor de Copys de Anúncio
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              
              {/* Facebook Inputs */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                    <Facebook className="h-3.5 w-3.5 text-blue-500" /> FACEBOOK ADS
                  </span>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">Texto Principal (Primary Text)</Label>
                  <Textarea
                    value={fbPrimaryText}
                    onChange={(e) => setFbPrimaryText(e.target.value)}
                    placeholder="Digite o texto do feed do Facebook..."
                    className="bg-[#0f172a] border-[#334155] text-white text-xs min-h-[100px] focus:border-emerald-500/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-300">Título (Headline)</Label>
                    <Input
                      value={fbHeadline}
                      onChange={(e) => setFbHeadline(e.target.value)}
                      placeholder="Título curto..."
                      className="bg-[#0f172a] border-[#334155] text-white text-xs focus:border-emerald-500/50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-300">Descrição (Ad Description)</Label>
                    <Input
                      value={fbDescription}
                      onChange={(e) => setFbDescription(e.target.value)}
                      placeholder="Descrição opcional..."
                      className="bg-[#0f172a] border-[#334155] text-white text-xs focus:border-emerald-500/50"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-800 my-4" />

              {/* Google Search Inputs */}
              <div className="space-y-3">
                <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                  <Search className="h-3.5 w-3.5 text-emerald-400" /> GOOGLE SEARCH ADS
                </span>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <Label className="text-[11px] text-slate-300">Título 1</Label>
                      <span className={`text-[9px] ${gHeadline1.length > 30 ? 'text-red-400 font-bold' : 'text-slate-500'}`}>{gHeadline1.length}/30</span>
                    </div>
                    <Input
                      value={gHeadline1}
                      maxLength={35}
                      onChange={(e) => setGHeadline1(e.target.value)}
                      placeholder="Título 1..."
                      className={`bg-[#0f172a] text-white text-xs focus:border-emerald-500/50 ${gHeadline1.length > 30 ? 'border-red-500' : 'border-[#334155]'}`}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <Label className="text-[11px] text-slate-300">Título 2</Label>
                      <span className={`text-[9px] ${gHeadline2.length > 30 ? 'text-red-400 font-bold' : 'text-slate-500'}`}>{gHeadline2.length}/30</span>
                    </div>
                    <Input
                      value={gHeadline2}
                      maxLength={35}
                      onChange={(e) => setGHeadline2(e.target.value)}
                      placeholder="Título 2..."
                      className={`bg-[#0f172a] text-white text-xs focus:border-emerald-500/50 ${gHeadline2.length > 30 ? 'border-red-500' : 'border-[#334155]'}`}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <Label className="text-[11px] text-slate-300">Título 3</Label>
                      <span className={`text-[9px] ${gHeadline3.length > 30 ? 'text-red-400 font-bold' : 'text-slate-500'}`}>{gHeadline3.length}/30</span>
                    </div>
                    <Input
                      value={gHeadline3}
                      maxLength={35}
                      onChange={(e) => setGHeadline3(e.target.value)}
                      placeholder="Título 3..."
                      className={`bg-[#0f172a] text-white text-xs focus:border-emerald-500/50 ${gHeadline3.length > 30 ? 'border-red-500' : 'border-[#334155]'}`}
                    />
                  </div>
                </div>

                <div className="space-y-3 mt-2">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs text-slate-300">Descrição 1</Label>
                      <span className={`text-[9px] ${gDescription1.length > 90 ? 'text-red-400 font-bold' : 'text-slate-500'}`}>{gDescription1.length}/90</span>
                    </div>
                    <Textarea
                      value={gDescription1}
                      maxLength={100}
                      onChange={(e) => setGDescription1(e.target.value)}
                      placeholder="Descrição 1 do anúncio de busca..."
                      className={`bg-[#0f172a] text-white text-xs min-h-[50px] focus:border-emerald-500/50 ${gDescription1.length > 90 ? 'border-red-500' : 'border-[#334155]'}`}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs text-slate-300">Descrição 2</Label>
                      <span className={`text-[9px] ${gDescription2.length > 90 ? 'text-red-400 font-bold' : 'text-slate-500'}`}>{gDescription2.length}/90</span>
                    </div>
                    <Textarea
                      value={gDescription2}
                      maxLength={100}
                      onChange={(e) => setGDescription2(e.target.value)}
                      placeholder="Descrição 2 do anúncio de busca..."
                      className={`bg-[#0f172a] text-white text-xs min-h-[50px] focus:border-emerald-500/50 ${gDescription2.length > 90 ? 'border-red-500' : 'border-[#334155]'}`}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Pane: Live Previews */}
        <div className="lg:col-span-6 space-y-4">
          {/* Geração visual por IA */}
          <div className="rounded-lg border border-slate-800 bg-transparent p-3 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-mono flex items-center gap-1.5">
                <ImageIcon className="h-3 w-3" /> Geração visual por IA (ComfyUI / Higgsfield)
              </p>
              {(visuals['facebook-ad']?.mock || visuals['ebook-cover']?.mock) && (
                <Badge className="bg-amber-500/15 text-amber-400 text-[9px] hover:bg-amber-500/25 font-mono">
                  MOCK
                </Badge>
              )}
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => void generateVisual('ebook-cover')}
                disabled={visualLoading !== null || !campaignId}
                className="gap-2 border-slate-800 bg-transparent text-slate-200 hover:bg-[#0f172a] hover:text-white justify-start"
              >
                {visualLoading === 'ebook-cover' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <BookImage className="h-3.5 w-3.5 text-purple-400" />
                )}
                Gerar Capa 3D do E-book com IA
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void generateVisual('facebook-ad')}
                disabled={visualLoading !== null || !campaignId}
                className="gap-2 border-slate-800 bg-transparent text-slate-200 hover:bg-[#0f172a] hover:text-white justify-start"
              >
                {visualLoading === 'facebook-ad' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Megaphone className="h-3.5 w-3.5 text-emerald-400" />
                )}
                Gerar Banner de Alta Conversão
              </Button>
            </div>

            {visualLoading && (
              <div className="space-y-1.5">
                <p className="font-mono text-[11px] text-purple-300 flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                  {VISUAL_STAGES[visualStage]}
                </p>
                <div className="flex gap-1">
                  {VISUAL_STAGES.map((stage, i) => (
                    <span
                      key={stage}
                      className={`h-0.5 flex-1 rounded-full transition-colors ${
                        i <= visualStage ? 'bg-purple-400' : 'bg-slate-800'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}

            {visuals['ebook-cover'] && (
              <div className="flex items-center gap-3 rounded border border-slate-800 bg-[#0f172a] p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={visuals['ebook-cover'].url}
                  alt="Capa 3D gerada por IA"
                  className="h-16 w-12 rounded object-cover border border-slate-700"
                />
                <div className="min-w-0">
                  <p className="text-[11px] text-slate-300">Capa 3D pronta</p>
                  <p className="font-mono text-[10px] text-slate-600 truncate">{visuals['ebook-cover'].url}</p>
                </div>
              </div>
            )}
          </div>


          <div className="flex items-center gap-1 bg-[#111827]/40 rounded-lg p-1 border border-slate-800">
            <Button
              size="sm"
              variant={activeTab === 'facebook' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('facebook')}
              className={`flex-1 text-xs gap-1.5 rounded h-8 ${
                activeTab === 'facebook' ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'text-slate-400'
              }`}
            >
              <Facebook className="h-3.5 w-3.5" /> Facebook Feed Live Preview
            </Button>
            <Button
              size="sm"
              variant={activeTab === 'google' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('google')}
              className={`flex-1 text-xs gap-1.5 rounded h-8 ${
                activeTab === 'google' ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold' : 'text-slate-400'
              }`}
            >
              <Search className="h-3.5 w-3.5" /> Google Search Live Preview
            </Button>
          </div>

          {/* Facebook Mockup Card */}
          {activeTab === 'facebook' && (
            <div className="border border-slate-800 bg-slate-900 rounded-xl overflow-hidden shadow-2xl max-w-lg mx-auto">
              {/* Header */}
              <div className="p-4 flex items-center gap-3 border-b border-slate-800/40">
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 font-bold border border-slate-700">
                  {productName ? productName.substring(0, 2).toUpperCase() : 'AD'}
                </div>
                <div>
                  <h5 className="font-semibold text-sm text-slate-100 flex items-center gap-1.5">
                    {productName || 'Patrocinador'}
                    <span className="text-[10px] text-emerald-400 border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 rounded">Fabricante Original</span>
                  </h5>
                  <p className="text-[11px] text-slate-500 mt-0.5">Patrocinado · 🌐 Web</p>
                </div>
              </div>

              {/* Primary Text */}
              <div className="p-4 text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                {highlightOffendingWords(fbPrimaryText || 'Insira o texto principal para gerar a pré-visualização real...')}
              </div>

              {/* Ad Image / Creative Banner mockup */}
              <div className="aspect-[1.91/1] bg-gradient-to-br from-slate-950 to-slate-800 flex flex-col items-center justify-center border-y border-slate-800/60 p-4 relative group overflow-hidden">
                {visuals['facebook-ad'] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={visuals['facebook-ad'].url}
                    alt="Banner gerado por IA para o anúncio"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 opacity-20 bg-cover bg-center" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=400&q=80')` }} />
                )}
                <div className={`z-10 text-center space-y-2 ${visuals['facebook-ad'] ? 'hidden' : ''}`}>
                  <div className="mx-auto w-10 h-10 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/30 text-emerald-400">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <p className="text-xs text-slate-300 font-medium">Arte Original Oficial do Fabricante</p>
                  <p className="text-[10px] text-slate-500">{vertical || 'Categoria Oficial'}</p>
                </div>
              </div>

              {/* Meta Box */}
              <div className="p-4 bg-slate-950 flex justify-between items-center border-b border-slate-800/40">
                <div className="space-y-1 pr-4">
                  <p className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase">site oficial do vendor</p>
                  <h6 className="font-bold text-xs text-slate-200 truncate">
                    {highlightOffendingWords(fbHeadline || 'Por que usar o original?')}
                  </h6>
                  <p className="text-[11px] text-slate-400 line-clamp-1">
                    {highlightOffendingWords(fbDescription || 'Clique para ler os termos e obter o reembolso.')}
                  </p>
                </div>
                <Button size="sm" className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold px-4 shrink-0 rounded">
                  Saiba Mais
                </Button>
              </div>

              {/* Likes / Actions Mock */}
              <div className="px-4 py-2 flex items-center justify-between text-slate-500 border-t border-slate-800/30 bg-slate-900/50">
                <button className="flex items-center gap-1 hover:text-slate-300 text-xs"><ThumbsUp className="h-3.5 w-3.5" /> Curtir</button>
                <button className="flex items-center gap-1 hover:text-slate-300 text-xs"><MessageSquare className="h-3.5 w-3.5" /> Comentar</button>
                <button className="flex items-center gap-1 hover:text-slate-300 text-xs"><Share2 className="h-3.5 w-3.5" /> Compartilhar</button>
              </div>
            </div>
          )}

          {/* Google Search Mockup Card */}
          {activeTab === 'google' && (
            <div className="border border-slate-800 bg-slate-900 p-5 rounded-xl shadow-2xl max-w-lg mx-auto space-y-3">
              {/* Header Badge */}
              <div className="flex items-center gap-2">
                {(visuals['facebook-ad'] || visuals['ebook-cover']) && (
                  // Favicon do anúncio: no Search a arte entra como miniatura da marca.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={(visuals['ebook-cover'] ?? visuals['facebook-ad'])!.url}
                    alt="Miniatura gerada por IA"
                    className="h-5 w-5 rounded-full object-cover border border-slate-700 shrink-0"
                  />
                )}
                <Badge className="bg-[#1e293b] text-slate-300 border border-slate-700/60 font-mono text-[9px] uppercase">anúncio</Badge>
                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  https://www.site-oficial.com/{productName ? productName.toLowerCase().replace(/\s+/g, '-') : 'original'} <ExternalLink className="h-2.5 w-2.5" />
                </span>
              </div>

              {/* Title Section (Google style: blue link) */}
              <h4 className="text-sm font-semibold text-blue-400 hover:underline cursor-pointer leading-snug space-x-1 font-sans">
                <span>{highlightOffendingWords(gHeadline1 || 'Anúncio Oficial')}</span>
                <span className="text-slate-500 font-normal">|</span>
                <span>{highlightOffendingWords(gHeadline2 || 'Site Oficial')}</span>
                <span className="text-slate-500 font-normal">|</span>
                <span>{highlightOffendingWords(gHeadline3 || 'Garantia de Reembolso')}</span>
              </h4>

              {/* Google URL Tag */}
              <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                {highlightOffendingWords(gDescription1 || 'Clique no link para ler o alerta oficial de segurança e obter o lote original com frete gratuito e 60 dias de garantia.')}
              </p>

              <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                {highlightOffendingWords(gDescription2 || 'Evite cópias piratas. Verifique o dossiê oficial antes de comprar com total segurança.')}
              </p>

              {/* Sitelinks Extensions (Vercel dark style) */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/40">
                <div className="p-2 hover:bg-slate-800/40 rounded transition-colors cursor-pointer">
                  <p className="text-[11px] font-semibold text-blue-400">Garantia de 60 Dias</p>
                  <p className="text-[10px] text-slate-500 line-clamp-1">Sua compra 100% resguardada.</p>
                </div>
                <div className="p-2 hover:bg-slate-800/40 rounded transition-colors cursor-pointer">
                  <p className="text-[11px] font-semibold text-blue-400">Perguntas Frequentes</p>
                  <p className="text-[10px] text-slate-500 line-clamp-1">Tire suas dúvidas antes de comprar.</p>
                </div>
              </div>
            </div>
          )}

          {/* List of Detected Issues */}
          {complianceResult.issues.length > 0 && (
            <Card className="bg-red-950/10 border-red-500/20">
              <CardHeader className="py-2.5 px-4 border-b border-red-500/10">
                <CardTitle className="text-xs font-semibold text-red-400 flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4" /> Detalhes de Alerta do Compliance Sentinel
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-2">
                {complianceResult.issues.map((issue, idx) => (
                  <div key={idx} className="bg-red-500/5 rounded p-2.5 border border-red-500/10 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-red-300">Termo: "{issue.text}"</span>
                      <Badge className="bg-red-500/20 text-red-400 border border-red-500/30 text-[9px]">
                        Risco {issue.riskLevel}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-300">{issue.explanation}</p>
                    <p className="text-[10px] text-emerald-400 font-medium italic mt-1">Sugestão: {issue.suggestion}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Navigation Buttons footer */}
      <div className="border-t border-slate-800/60 pt-5 flex justify-between items-center">
        <Button variant="outline" onClick={onPrev} className="border-slate-800 text-slate-300 h-9 text-xs gap-1.5">
          <ArrowLeft className="h-3.5 w-3.5" /> Anterior
        </Button>
        <Button onClick={onNext} className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 h-9 text-xs font-bold gap-1.5 px-5">
          Próximo Passo <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
