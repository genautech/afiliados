'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Palette, Package, ShieldCheck, BookOpen, Wand2, Layout, Rocket,
  Loader2, ChevronDown, ChevronRight, AlertTriangle,
} from 'lucide-react';
import type { ProductType } from './step-product-type';

type TabId = 'brand' | 'offer' | 'claims' | 'content' | 'copyqa' | 'visual' | 'launch';

const TABS: { id: TabId; label: string; icon: React.ElementType; route: string }[] = [
  { id: 'brand', label: 'Brand Kit', icon: Palette, route: '/api/brand-kit' },
  { id: 'offer', label: 'Oferta', icon: Package, route: '/api/offer-design' },
  { id: 'claims', label: 'Claims', icon: ShieldCheck, route: '/api/claims' },
  { id: 'content', label: 'Conteúdo', icon: BookOpen, route: '/api/content-architecture' },
  { id: 'copyqa', label: 'Anti-slop', icon: Wand2, route: '/api/copy-qa' },
  { id: 'visual', label: 'Visual', icon: Layout, route: '/api/visual-system' },
  { id: 'launch', label: 'Lançamento', icon: Rocket, route: '/api/launch-plan' },
];

interface ProductStudioProps {
  productType: ProductType;
  productName: string;
  vertical: string;
  aov: number;
  campaignId: string | null;
}

type Results = Partial<Record<TabId, any>>;

export function ProductStudio({ productType, productName, vertical, aov, campaignId }: ProductStudioProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<TabId>('brand');
  const [loading, setLoading] = useState<TabId | null>(null);
  const [results, setResults] = useState<Results>({});

  const [audience, setAudience] = useState('');
  const [promise, setPromise] = useState('');
  const [mainPain, setMainPain] = useState('');
  const [surface, setSurface] = useState<'EBOOK' | 'LANDING' | 'CRIATIVO' | 'CARROSSEL'>('LANDING');
  const [claimsText, setClaimsText] = useState('');
  const [copyText, setCopyText] = useState('');
  const [restoring, setRestoring] = useState(false);

  // Recarrega o que já foi rodado para esta campanha. Sem isso o estúdio esquece
  // tudo ao fechar a aba, e o usuário refaz (e repaga) as sete chamadas de LLM.
  useEffect(() => {
    if (!campaignId) return;
    let cancelled = false;
    setRestoring(true);
    fetch(`/api/product-studio?campaignId=${encodeURIComponent(campaignId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (cancelled || !json?.results) return;
        const saved = json.results as Results;
        if (Object.keys(saved).length > 0) setResults((prev) => ({ ...saved, ...prev }));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setRestoring(false);
      });
    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  const brand = results.brand;
  const productKind: 'EBOOK' | 'MENTORIA' = productType === 'MENTORSHIP' ? 'MENTORIA' : 'EBOOK';
  const contentFormat: 'EBOOK' | 'MINI_CURSO' = productType === 'MENTORSHIP' ? 'MINI_CURSO' : 'EBOOK';

  async function run(id: TabId) {
    const spec = TABS.find((t) => t.id === id)!;
    const payload = buildPayload(id);
    if (!payload) return;

    setLoading(id);
    try {
      const res = await fetch(spec.route, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, campaignId: campaignId ?? undefined }),
      });
      const json = await res.json();
      if (!res.ok) {
        const detail = Array.isArray(json?.issues)
          ? json.issues.map((i: any) => `${i.path}: ${i.message}`).join(' · ')
          : json?.error;
        toast.error(detail || `Falha em ${spec.label}`);
        return;
      }
      setResults((prev) => ({ ...prev, [id]: json.data }));
      toast.success(
        json.version
          ? `${spec.label} pronto e salvo (v${json.version} · ${json.provider}/${json.model})`
          : `${spec.label} pronto (${json.provider}/${json.model})`
      );
    } catch {
      toast.error(`Erro de rede em ${spec.label}`);
    } finally {
      setLoading(null);
    }
  }

  function buildPayload(id: TabId): Record<string, unknown> | null {
    switch (id) {
      case 'brand':
        if (!productName || !vertical || !audience) {
          toast.error('Preencha nome do produto, nicho e público antes de extrair o brand kit.');
          return null;
        }
        return {
          brandName: productName,
          niche: vertical,
          audience,
          notes: promise || undefined,
        };
      case 'offer':
        if (!productName || !audience || !mainPain) {
          toast.error('Oferta precisa de nome, público e dor principal.');
          return null;
        }
        return {
          productName,
          productType: productKind,
          audience,
          mainPain,
          priceHint: aov > 0 ? aov : undefined,
          currency: 'BRL',
        };
      case 'claims': {
        const claims = claimsText.split('\n').map((c) => c.trim()).filter(Boolean);
        if (!claims.length) {
          toast.error('Cole um claim por linha para o Fact Steward avaliar.');
          return null;
        }
        return { claims, productName: productName || undefined, niche: vertical || undefined };
      }
      case 'content':
        if (!productName || !audience || !promise) {
          toast.error('Arquitetura de conteúdo precisa de nome, público e promessa.');
          return null;
        }
        return {
          productName,
          audience,
          promise,
          modules: 7,
          format: contentFormat,
        };
      case 'copyqa':
        if (!copyText.trim()) {
          toast.error('Cole o texto que quer passar pelo anti-slop.');
          return null;
        }
        return { text: copyText, context: `${productKind} · ${vertical || 'nicho não informado'}` };
      case 'visual':
        if (!brand) {
          toast.error('Rode o Brand Kit primeiro — o sistema visual deriva dele.');
          return null;
        }
        return {
          surface,
          palette: (brand.palette ?? []).map((c: any) => ({ role: c.role, hex: c.hex })),
          typography: { display: brand.typography?.display, text: brand.typography?.text },
          mood: brand.positioning || undefined,
        };
      case 'launch':
        if (!productName || !(aov > 0)) {
          toast.error('Informe nome e preço (AOV) para montar o plano de lançamento.');
          return null;
        }
        return { productName, productType: productKind, price: aov, currency: 'BRL' };
      default:
        return null;
    }
  }

  const active = TABS.find((t) => t.id === tab)!;

  return (
    <Card className="bg-[#0f172a] border-[#334155]">
      <CardHeader className="cursor-pointer" onClick={() => setOpen((v) => !v)}>
        <CardTitle className="text-white text-base flex items-center gap-2">
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          <Wand2 className="w-4 h-4 text-cyan-400" />
          Estúdio de Produto Próprio
          <Badge variant="outline" className="ml-2 text-[10px] border-[#334155] text-slate-400">
            {restoring ? 'carregando…' : `${Object.keys(results).length}/${TABS.length} rodados`}
          </Badge>
        </CardTitle>
        <CardDescription className="text-slate-400">
          Sete agentes para produto próprio: marca, oferta, claims, conteúdo, anti-slop, visual e lançamento.
          Nada aqui carrega marca de terceiros — tudo sai do que você informar.
        </CardDescription>
      </CardHeader>

      {open && (
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {TABS.map((t) => {
              const Icon = t.icon;
              const done = Boolean(results[t.id]);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs border transition-colors ${
                    tab === t.id
                      ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300'
                      : 'bg-[#1e293b] border-[#334155] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {t.label}
                  {done && <span className="ml-1 h-1.5 w-1.5 rounded-full bg-emerald-400" />}
                </button>
              );
            })}
          </div>

          <div className="rounded-lg border border-[#334155] bg-[#1e293b] p-4 space-y-3">
            {(tab === 'brand' || tab === 'offer' || tab === 'content') && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-slate-300 text-xs">Público (quem é, na sua língua)</Label>
                  <Input
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                    placeholder="ex.: mães de 30-45 que treinam em casa"
                    className="bg-[#0f172a] border-[#334155] text-white"
                  />
                </div>
                <div>
                  <Label className="text-slate-300 text-xs">
                    Promessa central{tab === 'content' ? '' : ' (opcional)'}
                  </Label>
                  <Input
                    value={promise}
                    onChange={(e) => setPromise(e.target.value)}
                    placeholder="ex.: montar o cardápio da semana em 20 minutos"
                    className="bg-[#0f172a] border-[#334155] text-white"
                  />
                </div>
                {tab === 'offer' && (
                  <div className="md:col-span-2">
                    <Label className="text-slate-300 text-xs">Dor principal</Label>
                    <Input
                      value={mainPain}
                      onChange={(e) => setMainPain(e.target.value)}
                      placeholder="ex.: não consegue manter dieta com a rotina de trabalho"
                      className="bg-[#0f172a] border-[#334155] text-white"
                    />
                  </div>
                )}
              </div>
            )}

            {tab === 'claims' && (
              <div>
                <Label className="text-slate-300 text-xs">Claims — um por linha</Label>
                <Textarea
                  value={claimsText}
                  onChange={(e) => setClaimsText(e.target.value)}
                  rows={5}
                  placeholder={'perde 5kg em 30 dias\naprovado por nutricionistas'}
                  className="bg-[#0f172a] border-[#334155] text-white font-mono text-xs"
                />
              </div>
            )}

            {tab === 'copyqa' && (
              <div>
                <Label className="text-slate-300 text-xs">Texto para revisão anti-slop</Label>
                <Textarea
                  value={copyText}
                  onChange={(e) => setCopyText(e.target.value)}
                  rows={6}
                  placeholder="Cole aqui a copy da landing, do e-mail ou do criativo."
                  className="bg-[#0f172a] border-[#334155] text-white text-xs"
                />
              </div>
            )}

            {tab === 'visual' && (
              brand ? (
                <div>
                  <Label className="text-slate-300 text-xs">Superfície</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {(['EBOOK', 'LANDING', 'CRIATIVO', 'CARROSSEL'] as const).map((s2) => (
                      <button
                        key={s2}
                        type="button"
                        onClick={() => setSurface(s2)}
                        className={`rounded px-2.5 py-1 text-[11px] border ${
                          surface === s2
                            ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300'
                            : 'bg-[#0f172a] border-[#334155] text-slate-400'
                        }`}
                      >
                        {s2}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="flex items-center gap-2 text-xs text-amber-400">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  O sistema visual deriva do Brand Kit. Rode a aba Brand Kit primeiro.
                </p>
              )
            )}

            {tab === 'launch' && (
              <p className="text-xs text-slate-400">
                Usa o preço informado no passo de break-even (AOV: {aov > 0 ? `R$ ${aov}` : 'não informado'}).
                O plano exige prova orgânica antes de liberar escala paga.
              </p>
            )}

            <Button
              onClick={() => run(tab)}
              disabled={loading !== null}
              className="bg-cyan-600 hover:bg-cyan-700"
              size="sm"
            >
              {loading === tab ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Rodando {active.label}…</>
              ) : (
                <>Rodar {active.label}</>
              )}
            </Button>
          </div>

          {results[tab] && (
            <div className="rounded-lg border border-[#334155] bg-[#0b1220] p-4">
              <div className="text-xs text-slate-400 mb-2">Saída validada de {active.label}</div>
              <pre className="text-[11px] text-slate-200 overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(results[tab], null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
