'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  PackageSearch, Search, Sparkles, Loader2, CheckCircle2, XCircle, Circle,
  ShieldCheck, ShieldAlert, AlertTriangle, Bot, MessageCircle, Send, X,
  Save, Wand2, Tag, KeyRound, Target, Scale, ArrowRight, RefreshCw,
  Handshake, ExternalLink, HelpCircle,
} from 'lucide-react';
import { affiliateMarketplaceUrl } from '@/lib/marketplace';

type AgentState = 'pending' | 'running' | 'done' | 'error';

interface Product {
  id: string;
  name: string;
  network: string;
  vertical: string;
  gravity: number | null;
  avgPayout: number | null;
  commissionPct: string;
  conversionRate: string;
  rebill: boolean;
  score: number;
  riskLevel: string;
  source: string;
  summary: string | null;
  tags: string[] | null;
  keywords: any;
  strategy: any;
  compliance: any;
  status: string;
  chosenKeyword: string;
  hopLink?: string | null;
  affiliatePageUrl?: string | null;
  affiliateInsights?: any;
}

interface ChatMsg { role: 'user' | 'assistant'; content: string }

const PIPELINE_AGENTS = [
  { id: 'hunter', registryId: 'product-hunter', name: 'Product Hunter', desc: 'Coletando gravity, payout, funil e score da oferta' },
  { id: 'seo', registryId: 'seo-architect', name: 'SEO & Keyword Architect', desc: 'Gerando camadas A/B/C/D de keywords e negativas' },
  { id: 'compliance', registryId: 'compliance-sentinel', name: 'Compliance Sentinel', desc: 'Auditando claims, políticas Google e definindo estratégia' },
];

const layerColors: Record<string, string> = {
  A: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  B: 'bg-green-500/20 text-green-300 border-green-500/30',
  C: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  D: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
};

const layerLabels: Record<string, string> = {
  A: 'Camada A — Fundo de funil',
  B: 'Camada B — Comparação',
  C: 'Camada C — Problema',
  D: 'Camada D — Informacional',
};

function scoreBadgeCls(score: number) {
  if (score >= 75) return 'bg-green-500/20 text-green-400 border-green-500/30';
  if (score >= 50) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
  return 'bg-red-500/20 text-red-400 border-red-500/30';
}

function RiskBadge({ level }: { level: string }) {
  if (level === 'baixo') return <Badge className="bg-green-500/10 text-green-400 border-green-500/30 gap-1"><ShieldCheck className="h-3 w-3" /> Risco Baixo</Badge>;
  if (level === 'alto') return <Badge className="bg-red-500/10 text-red-400 border-red-500/30 gap-1"><ShieldAlert className="h-3 w-3" /> Risco Alto</Badge>;
  return <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/30 gap-1"><AlertTriangle className="h-3 w-3" /> Risco Médio</Badge>;
}

const cardCls = 'bg-[#1e293b] border-[#334155]';
const inputCls = 'bg-[#0f172a] border-[#334155] text-white placeholder:text-slate-500';

function ValBadge({ label, value }: { label: string; value: boolean | null | undefined }) {
  if (value === true) return <Badge className="bg-green-500/10 text-green-400 border-green-500/30 gap-1"><CheckCircle2 className="h-3 w-3" /> {label}: permitido</Badge>;
  if (value === false) return <Badge className="bg-red-500/10 text-red-400 border-red-500/30 gap-1"><XCircle className="h-3 w-3" /> {label}: PROIBIDO</Badge>;
  return <Badge className="bg-slate-500/10 text-slate-400 border-slate-500/30 gap-1"><HelpCircle className="h-3 w-3" /> {label}: não informado</Badge>;
}

export default function BuscaProdutosPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [query, setQuery] = useState('');
  const [network, setNetwork] = useState('clickbank');
  const [verticalFilter, setVerticalFilter] = useState('todas');

  const [analyzing, setAnalyzing] = useState(false);
  const [analyzingName, setAnalyzingName] = useState('');
  const [agentStates, setAgentStates] = useState<Record<string, AgentState>>({});
  const [agentUsage, setAgentUsage] = useState<Record<string, { totalTokens: number }>>({});
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Product | null>(null);

  const [affUrl, setAffUrl] = useState('');
  const [affAnalyzing, setAffAnalyzing] = useState(false);

  const [chatOpen, setChatOpen] = useState(false);
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatStreaming, setChatStreaming] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const dossierRef = useRef<HTMLDivElement>(null);

  const loadProducts = useCallback(async () => {
    try {
      const r = await fetch('/api/products');
      const data = await r.json();
      if (Array.isArray(data)) setProducts(data);
    } catch { /* silencioso */ }
    setLoadingList(false);
  }, []);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMsgs]);

  const progress = (() => {
    const done = PIPELINE_AGENTS.filter(a => agentStates[a.id] === 'done').length;
    const running = PIPELINE_AGENTS.some(a => agentStates[a.id] === 'running') ? 1 : 0;
    return Math.min(100, Math.round(((done + running * 0.5) / PIPELINE_AGENTS.length) * 100));
  })();

  async function runAnalysis(name: string) {
    const productName = name.trim();
    if (!productName) { toast.error('Digite o nome do produto'); return; }
    setAnalyzing(true);
    setAnalyzingName(productName);
    setSelected(null);
    setPipelineError(null);
    setAgentStates({ hunter: 'pending', seo: 'pending', compliance: 'pending' });
    setAgentUsage({});
    try {
      const res = await fetch('/api/product-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productName, network }),
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? `Erro ${res.status}`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const evt = JSON.parse(line.slice(6));
          if (evt.status === 'step') {
            setAgentStates(prev => ({ ...prev, [evt.agent]: evt.state === 'running' ? 'running' : 'done' }));
            if (evt.usage) setAgentUsage(prev => ({ ...prev, [evt.agent]: evt.usage }));
          } else if (evt.status === 'completed') {
            setSelected(evt.product);
            toast.success(`Análise concluída — score ${evt.product?.score ?? '?'}/100`);
            loadProducts();
            setTimeout(() => dossierRef.current?.scrollIntoView({ behavior: 'smooth' }), 150);
          } else if (evt.status === 'error') {
            throw new Error(evt.error);
          }
        }
      }
    } catch (err: any) {
      setPipelineError(err?.message ?? 'Erro na análise');
    } finally {
      setAnalyzing(false);
    }
  }

  function openProduct(p: Product) {
    if (p.status === 'analisado' || p.status === 'escolhido') {
      setSelected(p);
      setAffUrl(p.affiliatePageUrl ?? '');
      setPipelineError(null);
      setTimeout(() => dossierRef.current?.scrollIntoView({ behavior: 'smooth' }), 150);
    } else {
      runAnalysis(p.name);
    }
  }

  async function analyzeAffiliatePage() {
    if (!selected) return;
    const url = affUrl.trim();
    if (!url) { toast.error('Informe a URL da página de afiliado (padrões: /aff, /aff-th, /affiliates, /jv)'); return; }
    setAffAnalyzing(true);
    try {
      const res = await fetch(`/api/products/${selected.id}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ affiliatePageUrl: url }),
      });
      const d = await res.json();
      if (!res.ok) { toast.error(d?.error ?? 'Erro na análise'); return; }
      setSelected(d.product);
      loadProducts();
      const gs = d?.insights?.campaignValidation?.googleSearchAllowed;
      if (gs === false) toast.warning('Atenção: Google Search PROIBIDO para este produto!');
      else toast.success('Página de afiliado analisada');
    } catch { toast.error('Erro na análise'); } finally { setAffAnalyzing(false); }
  }

  async function chooseProduct(p: Product) {
    const r = await fetch('/api/products', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: p.id, status: 'escolhido' }),
    });
    if (r.ok) {
      const updated = await r.json();
      setSelected(updated);
      loadProducts();
      toast.success(`${p.name} marcado como escolhido`);
    }
  }

  async function saveAsOffer(p: Product) {
    const slug = p.name.replace(/[^A-Za-z0-9]/g, '').slice(0, 10).toUpperCase();
    const netLower = (p.network || 'clickbank').toLowerCase();
    const prefix = netLower === 'buygoods' ? 'BG' : netLower === 'maxweb' ? 'MW' : 'CB';
    const netName = netLower === 'buygoods' ? 'BuyGoods' : netLower === 'maxweb' ? 'MaxWeb' : 'ClickBank';
    const body = {
      offerId: `${prefix}-${slug}`,
      network: netName,
      name: p.name,
      vertical: p.vertical || 'geral',
      payoutCommission: p.avgPayout ? `$${p.avgPayout} (${p.commissionPct})` : p.commissionPct,
      gravityEpcRef: p.gravity ? `Gravity ${p.gravity}` : '',
      upsells: p.rebill ? 'Sim' : 'Não',
      funnelRecommended: p.strategy?.tipo_venda?.funil === 'direct' ? 'Direct' : 'Bridge',
      breakevenCpc: Number(p.strategy?.campanha?.cpc_max_usd ?? 0),
      notes: p.summary ?? '',
    };
    const r = await fetch('/api/offers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (r.ok) toast.success('Oferta salva — veja na aba Ofertas em Planilhas');
    else toast.error('Erro ao salvar oferta');
  }

  async function sendChat(text?: string) {
    const content = (text ?? chatInput).trim();
    if (!content || chatStreaming) return;
    const newMsgs: ChatMsg[] = [...chatMsgs, { role: 'user', content }];
    setChatMsgs([...newMsgs, { role: 'assistant', content: '' }]);
    setChatInput('');
    setChatStreaming(true);
    try {
      const res = await fetch('/api/product-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: selected?.id, messages: newMsgs }),
      });
      if (!res.ok || !res.body) throw new Error('Erro no chat');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let acc = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const evt = JSON.parse(line.slice(6));
          if (evt.status === 'chunk') {
            acc += evt.content;
            setChatMsgs(prev => {
              const copy = [...prev];
              copy[copy.length - 1] = { role: 'assistant', content: acc };
              return copy;
            });
          }
        }
      }
    } catch {
      setChatMsgs(prev => {
        const copy = [...prev];
        copy[copy.length - 1] = { role: 'assistant', content: '⚠️ Erro ao responder. Tente novamente.' };
        return copy;
      });
    } finally {
      setChatStreaming(false);
    }
  }

  const verticals = Array.from(new Set(products.map(p => p.vertical).filter(Boolean)));
  const gridProducts = products.filter(p => verticalFilter === 'todas' || p.vertical === verticalFilter);
  const kw = selected?.keywords;
  const strat = selected?.strategy;
  const comp = selected?.compliance;

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h1 className="text-2xl font-display font-bold text-white tracking-tight flex items-center gap-2">
          <PackageSearch className="h-6 w-6 text-green-400" /> Busca de Produtos
        </h1>
        <p className="text-slate-400 mt-1">Encontre e analise produtos com IA multi-agente</p>
      </div>

      {/* Barra de busca */}
      <Card className={cardCls}>
        <CardContent className="pt-6 flex flex-col sm:flex-row gap-3">
          <Select value={network} onValueChange={setNetwork}>
            <SelectTrigger className={cn(inputCls, 'sm:w-[160px]')}>
              <SelectValue placeholder="Rede" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="clickbank">ClickBank</SelectItem>
              <SelectItem value="buygoods">BuyGoods</SelectItem>
              <SelectItem value="maxweb">MaxWeb</SelectItem>
            </SelectContent>
          </Select>
          <Input
            className={cn(inputCls, 'flex-1')}
            placeholder="Nome do produto (ex: Lymph Tonic, FemiCore...)"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') runAnalysis(query); }}
          />
          <Button
            onClick={() => runAnalysis(query)}
            disabled={analyzing}
            className="bg-green-600 hover:bg-green-700 text-white gap-2"
          >
            {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Analisar
          </Button>
        </CardContent>
      </Card>

      {/* Melhores produtos */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Melhores Produtos</h2>
        <Select value={verticalFilter} onValueChange={setVerticalFilter}>
          <SelectTrigger className={cn(inputCls, 'w-[190px]')}>
            <SelectValue placeholder="Vertical" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as verticais</SelectItem>
            {verticals.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loadingList ? (
        <div className="flex items-center gap-2 text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Carregando produtos...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {gridProducts.map(p => (
            <Card key={p.id} className={cn(cardCls, 'transition-all hover:border-green-500/40 hover:-translate-y-0.5')}>
              <CardContent className="pt-5 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold text-white leading-tight">{p.name}</div>
                  <Badge className={cn('border shrink-0', scoreBadgeCls(p.score))}>{p.score}</Badge>
                </div>
                <div className="text-xs text-slate-400">{p.vertical}</div>
                <div className="text-sm text-slate-300 space-y-1 font-mono">
                  <div>Gravity: {p.gravity ?? '—'}</div>
                  <div>$/venda: {p.avgPayout ? `$${p.avgPayout.toFixed(2)}` : '—'}</div>
                  <div>Conv.: {p.conversionRate || '—'}</div>
                  <div className="flex items-center gap-1">Rebill: {p.rebill ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <span className="text-slate-500">Não</span>}</div>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <RiskBadge level={p.riskLevel} />
                  {p.status === 'escolhido' && <Badge className="bg-blue-500/10 text-blue-300 border-blue-500/30">Escolhido</Badge>}
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full mt-1 gap-1 bg-[#0f172a] border border-[#334155] text-slate-200 hover:bg-[#0b1220]"
                  onClick={() => openProduct(p)}
                  disabled={analyzing}
                >
                  {p.status === 'novo' ? <>Analisar <Sparkles className="h-3.5 w-3.5" /></> : <>Abrir dossiê <ArrowRight className="h-3.5 w-3.5" /></>}
                </Button>
              </CardContent>
            </Card>
          ))}
          {gridProducts.length === 0 && (
            <div className="col-span-full text-sm text-slate-500 flex items-center gap-2">
              <Search className="h-4 w-4 opacity-50" /> Nenhum produto — digite um nome acima e clique em Analisar.
            </div>
          )}
        </div>
      )}

      {/* Pipeline de análise */}
      {analyzing && (
        <Card className={cardCls}>
          <CardContent className="pt-6 space-y-4">
            <div className="text-white font-medium">Analisando &quot;{analyzingName}&quot;...</div>
            <div className="space-y-3">
              {PIPELINE_AGENTS.map(a => {
                const st = agentStates[a.id] ?? 'pending';
                return (
                  <div key={a.id} className="flex items-start gap-3">
                    {st === 'done' && <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />}
                    {st === 'running' && <Loader2 className="h-4 w-4 animate-spin text-blue-400 mt-0.5" />}
                    {st === 'pending' && <Circle className="h-4 w-4 text-slate-600 mt-0.5" />}
                    <div className="flex-1">
                      <div className={cn('text-sm flex items-center gap-2', st === 'running' ? 'text-white' : st === 'done' ? 'text-slate-300' : 'text-slate-500')}>
                        {a.name}
                        {agentUsage[a.id] && (
                          <Badge className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-[10px]">
                            {agentUsage[a.id].totalTokens >= 1000 ? `${(agentUsage[a.id].totalTokens / 1000).toFixed(1)}k` : agentUsage[a.id].totalTokens} tokens
                          </Badge>
                        )}
                      </div>
                      {st === 'running' && <div className="text-xs text-slate-400 font-mono">{a.desc}...</div>}
                    </div>
                  </div>
                );
              })}
            </div>
            <Progress value={progress} className="h-2" />
          </CardContent>
        </Card>
      )}

      {pipelineError && !analyzing && (
        <Alert className="bg-red-500/10 border-red-500/30 text-red-300">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Não foi possível analisar este produto</AlertTitle>
          <AlertDescription className="flex items-center gap-3 mt-1">
            <span>{pipelineError}</span>
            <Button variant="outline" size="sm" className="border-red-500/30 text-red-300 gap-1" onClick={() => runAnalysis(analyzingName)}>
              <RefreshCw className="h-3.5 w-3.5" /> Tentar novamente
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Dossiê */}
      {selected && !analyzing && (
        <Card ref={dossierRef as any} className={cn(cardCls, 'border-green-500/20')}>
          <CardContent className="pt-6 space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-white">{selected.name}</h2>
                  <Badge className={cn('border', scoreBadgeCls(selected.score))}>Score: {selected.score}</Badge>
                  <RiskBadge level={selected.riskLevel} />
                </div>
                <div className="text-sm text-slate-400 mt-1 font-mono">
                  {selected.vertical} · Gravity {selected.gravity ?? '—'} · {selected.avgPayout ? `$${selected.avgPayout.toFixed(2)}/venda` : '—'} · {selected.commissionPct || '—'}
                </div>
                {selected.summary && <p className="text-sm text-slate-300 mt-2 max-w-3xl">{selected.summary}</p>}
                {selected.chosenKeyword && (
                  <div className="mt-2 text-sm">
                    <span className="text-slate-400">Melhor keyword: </span>
                    <span className="text-green-400 font-mono font-semibold">&quot;{selected.chosenKeyword}&quot;</span>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {selected.status !== 'escolhido' && (
                  <Button variant="secondary" className="gap-1 bg-blue-600/20 border border-blue-500/30 text-blue-300 hover:bg-blue-600/30" onClick={() => chooseProduct(selected)}>
                    <Target className="h-4 w-4" /> Escolher produto
                  </Button>
                )}
                <Button variant="secondary" className="gap-1 bg-[#0f172a] border border-[#334155] text-slate-200" onClick={() => saveAsOffer(selected)}>
                  <Save className="h-4 w-4" /> Salvar como Oferta
                </Button>
                <Button className="bg-green-600 hover:bg-green-700 text-white gap-1" onClick={() => router.push('/wizard')}>
                  <Wand2 className="h-4 w-4" /> Criar Campanha no Wizard
                </Button>
              </div>
            </div>

            <Tabs defaultValue="keywords">
              <TabsList className="bg-[#0f172a] border border-[#334155]">
                <TabsTrigger value="keywords" className="gap-1"><KeyRound className="h-3.5 w-3.5" /> Keywords</TabsTrigger>
                <TabsTrigger value="estrategia" className="gap-1"><Target className="h-3.5 w-3.5" /> Estratégia</TabsTrigger>
                <TabsTrigger value="compliance" className="gap-1"><Scale className="h-3.5 w-3.5" /> Compliance</TabsTrigger>
                <TabsTrigger value="affpage" className="gap-1"><Handshake className="h-3.5 w-3.5" /> Pág. Afiliado</TabsTrigger>
                <TabsTrigger value="tags" className="gap-1"><Tag className="h-3.5 w-3.5" /> Tags</TabsTrigger>
              </TabsList>

              <TabsContent value="keywords" className="space-y-4 mt-4">
                {kw ? (
                  <>
                    {(['A', 'B', 'C', 'D'] as const).map(layer => {
                      const items = kw[`camada_${layer}`] ?? [];
                      if (!items.length) return null;
                      return (
                        <div key={layer}>
                          <Badge className={cn('border mb-2', layerColors[layer])}>{layerLabels[layer]}</Badge>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {items.map((k: any, i: number) => (
                              <div key={i} className="flex items-center justify-between bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2">
                                <span className="text-sm text-slate-200 font-mono">{k?.kw}</span>
                                <div className="flex items-center gap-2 text-xs">
                                  {k?.cpc_estimado_usd != null && <span className="text-slate-400">CPC ~${k.cpc_estimado_usd}</span>}
                                  <Badge className={cn('border', scoreBadgeCls(k?.score ?? 0))}>{k?.score ?? '—'}</Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                    {Array.isArray(kw?.negativas) && kw.negativas.length > 0 && (
                      <div>
                        <div className="text-sm text-slate-400 mb-2">🚫 Negativas</div>
                        <div className="flex flex-wrap gap-1.5">
                          {kw.negativas.map((n: string, i: number) => (
                            <span key={i} className="text-xs px-2 py-1 rounded bg-red-500/10 text-red-300 border border-red-500/20">{n}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : <div className="text-sm text-slate-500">Rode a análise para gerar o mapa de keywords.</div>}
              </TabsContent>

              <TabsContent value="estrategia" className="mt-4">
                {strat ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="bg-[#0f172a] border-[#334155]">
                      <CardContent className="pt-4 space-y-1">
                        <div className="text-xs text-slate-400 uppercase">Pré-sell</div>
                        <div className="text-white font-semibold capitalize">{strat?.presell?.tipo ?? '—'}</div>
                        <p className="text-sm text-slate-300">{strat?.presell?.motivo}</p>
                        {Array.isArray(strat?.presell?.elementos) && (
                          <ul className="text-xs text-slate-400 list-disc pl-4 pt-1 space-y-0.5">
                            {strat.presell.elementos.map((e: string, i: number) => <li key={i}>{e}</li>)}
                          </ul>
                        )}
                      </CardContent>
                    </Card>
                    <Card className="bg-[#0f172a] border-[#334155]">
                      <CardContent className="pt-4 space-y-1">
                        <div className="text-xs text-slate-400 uppercase">Tipo de venda</div>
                        <div className="text-white font-semibold capitalize">{strat?.tipo_venda?.funil ?? '—'}</div>
                        <p className="text-sm text-slate-300">{strat?.tipo_venda?.motivo}</p>
                        {strat?.funil_vendor && <p className="text-xs text-slate-400 pt-1">Funil do vendor: {strat.funil_vendor}</p>}
                      </CardContent>
                    </Card>
                    <Card className="bg-[#0f172a] border-[#334155]">
                      <CardContent className="pt-4 space-y-1">
                        <div className="text-xs text-slate-400 uppercase">Campanha Google</div>
                        <div className="text-white font-mono text-sm">{strat?.campanha?.naming ?? '—'}</div>
                        <p className="text-sm text-slate-300">{strat?.campanha?.tipo} · {strat?.campanha?.lances}</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-[#0f172a] border-[#334155]">
                      <CardContent className="pt-4 space-y-1">
                        <div className="text-xs text-slate-400 uppercase">Break-even</div>
                        <div className="font-mono text-2xl text-green-400">
                          CPC máx ${strat?.campanha?.cpc_max_usd ?? '—'}
                        </div>
                        <div className="text-sm text-slate-300 font-mono">CPC scale ${strat?.campanha?.cpc_scale_usd ?? '—'} · EPC BE ${strat?.break_even?.epc_breakeven_usd ?? '—'}</div>
                        <div className="text-xs text-slate-400">Comissão líquida ${strat?.break_even?.comissao_liquida_usd ?? '—'} · CVR est. {strat?.break_even?.cvr_estimada_pct ?? '—'}%</div>
                      </CardContent>
                    </Card>
                  </div>
                ) : <div className="text-sm text-slate-500">Rode a análise para gerar a estratégia.</div>}
              </TabsContent>

              <TabsContent value="compliance" className="mt-4 space-y-2">
                {comp?.alertas?.length ? comp.alertas.map((a: any, i: number) => (
                  <Alert
                    key={i}
                    className={cn(
                      a?.nivel === 'critico' ? 'bg-red-500/10 border-red-500/30 text-red-300'
                        : a?.nivel === 'atencao' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300'
                        : 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                    )}
                  >
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{a?.texto}</AlertDescription>
                  </Alert>
                )) : <div className="text-sm text-slate-500">Sem alertas registrados — rode a análise.</div>}
              </TabsContent>

              <TabsContent value="affpage" className="mt-4 space-y-4">
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    className={cn(inputCls, 'flex-1')}
                    placeholder="URL da página de afiliado do produtor (padrões: /aff, /aff-th, /affiliates, /jv, /partners)"
                    value={affUrl}
                    onChange={e => setAffUrl(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') analyzeAffiliatePage(); }}
                  />
                  <Button onClick={analyzeAffiliatePage} disabled={affAnalyzing} className="bg-purple-600 hover:bg-purple-700 text-white gap-1.5">
                    {affAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    Analisar página (grátis)
                  </Button>
                </div>
                <div className="flex flex-wrap gap-3 text-xs">
                  {affiliateMarketplaceUrl(selected.network, selected.name) && (
                    <a href={affiliateMarketplaceUrl(selected.network, selected.name)!} target="_blank" rel="noopener" className="text-purple-400 hover:text-purple-300 flex items-center gap-1">
                      <ExternalLink className="h-3.5 w-3.5" /> Ver no marketplace {selected.network?.toLowerCase() === 'clickbank' ? 'ClickBank' : selected.network}
                    </a>
                  )}
                  {selected.affiliatePageUrl && (
                    <a href={selected.affiliatePageUrl} target="_blank" rel="noopener" className="text-blue-400 hover:text-blue-300 flex items-center gap-1">
                      <ExternalLink className="h-3.5 w-3.5" /> Abrir página de afiliado
                    </a>
                  )}
                </div>

                {selected.affiliateInsights ? (() => {
                  const ai = selected.affiliateInsights;
                  const val = ai?.campaignValidation ?? {};
                  return (
                    <div className="space-y-4">
                      <div className={cn('rounded-lg p-4 border', val?.googleSearchAllowed === false ? 'bg-red-500/10 border-red-500/30' : 'bg-green-500/10 border-green-500/30')}>
                        <div className="text-xs text-slate-400 uppercase mb-2">Validação de Campanha</div>
                        <div className="flex flex-wrap gap-2 mb-2">
                          <ValBadge label="Google Search" value={val?.googleSearchAllowed} />
                          <ValBadge label="Brand bidding" value={val?.brandBiddingAllowed} />
                          <ValBadge label="Direct linking" value={val?.directLinkingAllowed} />
                        </div>
                        {val?.notes && <p className="text-sm text-slate-200">{val.notes}</p>}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <Card className="bg-[#0f172a] border-[#334155]"><CardContent className="pt-4">
                          <div className="text-xs text-slate-400 uppercase">Comissão</div>
                          <div className="text-white font-semibold">{ai?.commission ?? '—'}</div>
                        </CardContent></Card>
                        <Card className="bg-[#0f172a] border-[#334155]"><CardContent className="pt-4">
                          <div className="text-xs text-slate-400 uppercase">Bônus CPA</div>
                          <div className="text-white font-semibold">{ai?.cpaBonus ?? '—'}</div>
                        </CardContent></Card>
                        <Card className="bg-[#0f172a] border-[#334155]"><CardContent className="pt-4">
                          <div className="text-xs text-slate-400 uppercase">EPC de referência</div>
                          <div className="text-white font-semibold">{ai?.epcRef ?? '—'}</div>
                        </CardContent></Card>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm text-slate-400 mb-2">✅ Canais permitidos/recomendados</div>
                          <div className="flex flex-wrap gap-1.5">
                            {(ai?.allowedChannels ?? []).map((c: string, i: number) => <Badge key={i} className="bg-green-500/10 text-green-300 border border-green-500/20">{c}</Badge>)}
                            {(ai?.allowedChannels ?? []).length === 0 && <span className="text-xs text-slate-500">não informado</span>}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-slate-400 mb-2">⛔ Canais proibidos</div>
                          <div className="flex flex-wrap gap-1.5">
                            {(ai?.forbiddenChannels ?? []).map((c: string, i: number) => <Badge key={i} className="bg-red-500/10 text-red-300 border border-red-500/20">{c}</Badge>)}
                            {(ai?.forbiddenChannels ?? []).length === 0 && <span className="text-xs text-slate-500">não informado</span>}
                          </div>
                        </div>
                      </div>

                      {(ai?.restrictions ?? []).length > 0 && (
                        <div>
                          <div className="text-sm text-slate-400 mb-2">Restrições do produtor</div>
                          <ul className="space-y-1">
                            {ai.restrictions.map((r: string, i: number) => (
                              <li key={i} className="text-sm text-slate-200 flex items-start gap-2"><AlertTriangle className="h-3.5 w-3.5 text-yellow-400 mt-0.5 shrink-0" /> {r}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {(ai?.tips ?? []).length > 0 && (
                        <div>
                          <div className="text-sm text-slate-400 mb-2">💡 Dicas do produtor</div>
                          <ul className="space-y-1">
                            {ai.tips.map((t: string, i: number) => <li key={i} className="text-sm text-slate-200">• {t}</li>)}
                          </ul>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        {(ai?.resources ?? []).length > 0 && (
                          <div>
                            <div className="text-slate-400 mb-1">Recursos</div>
                            {ai.resources.map((r: string, i: number) => <div key={i} className="text-slate-300 text-xs">• {r}</div>)}
                          </div>
                        )}
                        {(ai?.hoplinks ?? []).length > 0 && (
                          <div>
                            <div className="text-slate-400 mb-1">Hoplinks</div>
                            {ai.hoplinks.map((h: string, i: number) => <div key={i} className="text-slate-300 text-xs font-mono break-all">• {h}</div>)}
                          </div>
                        )}
                        {(ai?.contacts ?? []).length > 0 && (
                          <div>
                            <div className="text-slate-400 mb-1">Contatos</div>
                            {ai.contacts.map((c: string, i: number) => <div key={i} className="text-slate-300 text-xs">• {c}</div>)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })() : (
                  <div className="text-sm text-slate-500">
                    Todo produto tem uma página de afiliado do produtor com comissões reais, canais permitidos/proibidos e restrições que <span className="text-slate-300">validam ou matam a campanha</span> (ex.: LymphFlow proíbe Google Search). Informe a URL acima e analise antes de criar a campanha.
                  </div>
                )}
              </TabsContent>

              <TabsContent value="tags" className="mt-4">
                <div className="flex flex-wrap gap-2">
                  {(selected.tags ?? []).map((t, i) => (
                    <Badge key={i} variant="secondary" className="bg-[#0f172a] border border-[#334155] text-slate-300">{t}</Badge>
                  ))}
                  {(!selected.tags || selected.tags.length === 0) && <div className="text-sm text-slate-500">Sem tags — rode a análise.</div>}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Botão flutuante do chat */}
      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed right-6 bottom-6 z-40 bg-green-600 hover:bg-green-700 text-white rounded-full p-3.5 shadow-lg shadow-green-900/40"
          aria-label="Abrir assistente"
        >
          <MessageCircle className="h-5 w-5" />
        </button>
      )}

      {/* Chat lateral */}
      <Sheet open={chatOpen} onOpenChange={setChatOpen}>
        <SheetContent side="right" className="bg-[#1e293b] border-[#334155] w-full sm:w-[380px] sm:max-w-[380px] flex flex-col p-0">
          <SheetHeader className="px-4 py-3 border-b border-[#334155]">
            <SheetTitle className="text-white flex items-center gap-2 text-base">
              <Bot className="h-4 w-4 text-green-400" /> Assistente de Análise
              {selected && <Badge className="bg-[#0f172a] border border-[#334155] text-slate-300 font-normal">{selected.name}</Badge>}
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="flex-1 px-4 py-3">
            <div className="space-y-3">
              {chatMsgs.length === 0 && (
                <p className="text-sm text-slate-500">
                  Pergunte sobre o produto em análise: CPC ideal, ângulos de presell, riscos de compliance, comparação com similares...
                </p>
              )}
              {chatMsgs.map((m, i) => (
                <div key={i} className={cn('rounded-lg px-3 py-2 text-sm whitespace-pre-wrap', m.role === 'user' ? 'bg-green-600/20 text-green-100 ml-6' : 'bg-[#0f172a] text-slate-200 mr-2')}>
                  {m.content}
                  {m.role === 'assistant' && chatStreaming && i === chatMsgs.length - 1 && (
                    <span className="inline-block w-1.5 h-4 bg-green-400 animate-pulse ml-0.5 align-text-bottom" />
                  )}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
          </ScrollArea>
          <div className="px-4 pb-2 flex flex-wrap gap-1.5">
            {['Qual o CPC ideal?', 'Compare com produtos similares', 'Reforce a análise de compliance'].map(s => (
              <button
                key={s}
                onClick={() => sendChat(s)}
                disabled={chatStreaming}
                className="text-xs px-2 py-1 rounded-full bg-[#0f172a] border border-[#334155] text-slate-400 hover:text-white hover:border-green-500/40"
              >
                {s}
              </button>
            ))}
          </div>
          <div className="p-3 border-t border-[#334155] flex gap-2">
            <Textarea
              className={cn(inputCls, 'min-h-[40px] max-h-28 resize-none flex-1')}
              placeholder="Digite sua pergunta..."
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
            />
            <Button size="icon" onClick={() => sendChat()} disabled={chatStreaming || !chatInput.trim()} className="bg-green-600 hover:bg-green-700 shrink-0">
              {chatStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
