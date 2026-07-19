'use client';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Radar, Coins, Sparkles, Download, RefreshCw, Trash2, Search as SearchIcon, Trophy } from 'lucide-react';
import { toast } from 'sonner';

const inputCls = 'bg-[#0f172a] border-[#334155] text-white placeholder:text-slate-500';
const layerColors: Record<string, string> = { A: 'bg-blue-500/20 text-blue-400', B: 'bg-green-500/20 text-green-400', C: 'bg-yellow-500/20 text-yellow-400', D: 'bg-purple-500/20 text-purple-400' };
const PROVIDERS: Record<string, string> = { gweb: 'Google Web', youtube: 'YouTube', bing: 'Bing', amazon: 'Amazon', tiktok: 'TikTok', instagram: 'Instagram', chatgpt: 'ChatGPT', gemini: 'Gemini' };
const BUCKETS = [
  { key: 'questions', label: 'Perguntas' },
  { key: 'prepositions', label: 'Preposições' },
  { key: 'comparisons', label: 'Comparações' },
  { key: 'alphabeticals', label: 'Alfabético' },
];
const KEYWORD_FIELDS = ['keyword', 'text', 'suggestion', 'phrase', 'term'];
const VOLUME_FIELDS = ['volume', 'search_volume', 'monthly_volume', 'monthly_search_volume'];
const CPC_FIELDS = ['cpc', 'cost_per_click', 'cost'];

function extractRows(node: any, out: Map<string, any>) {
  if (Array.isArray(node)) { node.forEach((n) => extractRows(n, out)); return; }
  if (!node || typeof node !== 'object') return;
  const kwField = KEYWORD_FIELDS.find((f) => typeof node[f] === 'string' && node[f].trim());
  if (kwField) {
    const kw = String(node[kwField]).trim().toLowerCase();
    const num = (fields: string[]) => {
      for (const f of fields) {
        const v = typeof node[f] === 'string' ? parseFloat(node[f].replace(/[^0-9.]/g, '')) : node[f];
        if (typeof v === 'number' && isFinite(v)) return v;
      }
      return null;
    };
    const row = { keyword: kw, volume: num(VOLUME_FIELDS), cpc: num(CPC_FIELDS), intent: node?.intent ?? null, sentiment: node?.sentiment ?? null };
    const prev = out.get(kw);
    if (!prev || (row.volume ?? -1) > (prev.volume ?? -1)) out.set(kw, row);
  }
  Object.values(node).forEach((v) => { if (v && typeof v === 'object') extractRows(v, out); });
}

export default function PesquisaKeywordsPage() {
  const [me, setMe] = useState<any>(null);
  const [meError, setMeError] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [searches, setSearches] = useState<any[]>([]);
  const [form, setForm] = useState({ campaignId: 'none', keyword: '', language: 'en', region: 'us', provider: 'gweb' });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [bucketRows, setBucketRows] = useState<Record<string, any[]>>({});
  const [bucketLoading, setBucketLoading] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [importing, setImporting] = useState(false);
  const pollRef = useRef<any>(null);

  const loadMe = useCallback(() => {
    fetch('/api/atp/me').then(async (r) => {
      const d = await r.json();
      if (!r.ok) { setMeError(d?.error ?? 'Erro'); setMe(null); return; }
      setMeError(null); setMe(d);
    }).catch(() => setMeError('Erro ao consultar o AnswerThePublic'));
  }, []);

  const loadSearches = useCallback(() => {
    fetch('/api/atp/searches').then((r) => r.json()).then((d) => setSearches(Array.isArray(d) ? d : [])).catch(console.error);
  }, []);

  useEffect(() => {
    loadMe();
    loadSearches();
    fetch('/api/campaigns').then((r) => r.json()).then((d) => setCampaigns(Array.isArray(d) ? d : [])).catch(console.error);
  }, [loadMe, loadSearches]);

  // Poll de buscas em processamento (leituras gratuitas)
  useEffect(() => {
    const loading = searches.filter((s) => !['completed', 'failed'].includes(s?.status) && s?.searchId);
    if (loading.length === 0) return;
    pollRef.current = setInterval(async () => {
      for (const s of loading.slice(0, 3)) {
        try {
          const r = await fetch(`/api/atp/searches/${s.id}`);
          const d = await r.json();
          if (d?.status && ['completed', 'failed'].includes(d.status)) loadSearches();
        } catch {}
      }
    }, 5000);
    return () => clearInterval(pollRef.current);
  }, [searches, loadSearches]);

  const selectCampaign = (id: string) => {
    const c = campaigns.find((x) => x?.id === id);
    setForm((f) => ({
      ...f,
      campaignId: id,
      keyword: f.keyword || (c?.name ? String(c.name).toLowerCase() : ''),
      region: c?.geo && String(c.geo).length === 2 ? String(c.geo).toLowerCase() : f.region,
    }));
  };

  const dedupeHit = searches.find((s) =>
    s?.keyword === form.keyword.trim().toLowerCase() && s?.language === form.language &&
    s?.region === form.region && s?.provider === form.provider &&
    Date.now() - new Date(s?.createdAt).getTime() < 24 * 60 * 60 * 1000
  );

  const runSearch = async () => {
    setSearching(true);
    setConfirmOpen(false);
    try {
      const res = await fetch('/api/atp/searches', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, campaignId: form.campaignId === 'none' ? null : form.campaignId, confirm: true }),
      });
      const d = await res.json();
      if (!res.ok) { toast.error(d?.error ?? 'Erro na busca'); return; }
      toast.success(d?.reused ? 'Busca reaproveitada — nenhum crédito gasto' : 'Busca criada — 1 crédito consumido');
      setForm((f) => ({ ...f, keyword: '' }));
      loadSearches();
      loadMe();
    } catch { toast.error('Erro na busca'); } finally { setSearching(false); }
  };

  const openReport = async (s: any) => {
    setSelected(s);
    setAnalysis(null);
    setChecked({});
    setBucketRows({});
    const reportId = s?.parentSearchId || s?.searchId;
    if (!reportId || s?.status !== 'completed') return;
    setBucketLoading(true);
    try {
      const all: Record<string, any[]> = {};
      const fetchBucket = async (key: string, qs: string) => {
        const r = await fetch(`/api/atp/reports/${reportId}?per_page=250${qs}`);
        const d = await r.json();
        if (!r.ok) return [];
        const map = new Map<string, any>();
        extractRows(d, map);
        return Array.from(map.values()).sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0));
      };
      all['all'] = await fetchBucket('all', '');
      for (const b of BUCKETS) all[b.key] = await fetchBucket(b.key, `&source_name=${b.key}`);
      setBucketRows(all);
    } catch { toast.error('Erro ao carregar report'); } finally { setBucketLoading(false); }
  };

  const runAnalysis = async () => {
    if (!selected) return;
    setAnalyzing(true);
    try {
      const res = await fetch('/api/atp/analyze', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ atpSearchId: selected.id, campaignId: selected?.campaignId ?? (form.campaignId === 'none' ? null : form.campaignId) }),
      });
      const d = await res.json();
      if (!res.ok) { toast.error(d?.error ?? 'Erro na análise'); return; }
      setAnalysis(d);
      const pre: Record<string, boolean> = {};
      (d?.ranking ?? []).slice(0, 10).forEach((r: any) => { if (r?.viable !== false) pre[r.keyword] = true; });
      setChecked(pre);
    } catch { toast.error('Erro na análise'); } finally { setAnalyzing(false); }
  };

  const importSelected = async () => {
    const rows = (analysis?.ranking ?? []).filter((r: any) => checked[r.keyword]);
    if (rows.length === 0) { toast.error('Selecione ao menos uma keyword'); return; }
    setImporting(true);
    try {
      await fetch('/api/keywords', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords: rows.map((r: any, i: number) => ({
            campaignId: selected?.campaignId ?? null,
            keyword: r.keyword,
            layer: r.layer ?? 'B',
            matchType: r.matchType ?? 'phrase',
            cpcEstimate: r.cpc ?? 0,
            relevanceScore: i < 5 ? 5 : i < 15 ? 4 : 3,
            isSelected: true,
          })),
        }),
      });
      toast.success(`${rows.length} keywords importadas para a biblioteca`);
    } catch { toast.error('Erro ao importar'); } finally { setImporting(false); }
  };

  const remaining = me?.searchesRemaining;
  const selectedCampaign = campaigns.find((c) => c?.id === (selected?.campaignId ?? form.campaignId));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-white tracking-tight flex items-center gap-2">
          <Radar className="h-6 w-6 text-green-400" /> Pesquisa ATP
        </h1>
        <p className="text-slate-400 text-sm mt-1">AnswerThePublic via API — buscas consomem crédito e exigem sua aprovação</p>
      </div>

      {/* Painel de créditos */}
      <Card className="bg-[#1e293b] border-[#334155]">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Coins className={`h-5 w-5 ${remaining !== null && remaining !== undefined && remaining < 10 ? 'text-red-400' : 'text-yellow-400'}`} />
              <span className="text-white font-mono text-lg">{meError ? '—' : remaining ?? '…'}</span>
              <span className="text-slate-400 text-sm">buscas restantes hoje</span>
            </div>
            {me?.workspace?.name && <Badge className="bg-green-500/20 text-green-400">{me.workspace.name}</Badge>}
            {me?.plan && <Badge className="bg-blue-500/20 text-blue-400">{me.plan}</Badge>}
            {meError && <span className="text-red-400 text-sm">{meError}</span>}
            {remaining !== null && remaining !== undefined && remaining < 10 && !meError && (
              <Badge className="bg-red-500/20 text-red-400">Créditos baixos — use com parcimônia</Badge>
            )}
            <Button size="sm" variant="outline" className="border-[#334155] text-slate-300 gap-1 ml-auto" onClick={loadMe}>
              <RefreshCw className="h-3 w-3" /> Atualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Nova pesquisa */}
      <Card className="bg-[#1e293b] border-[#334155]">
        <CardHeader className="pb-2"><CardTitle className="text-base text-white">Nova Pesquisa</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-3 flex-wrap">
            <Select value={form.campaignId} onValueChange={selectCampaign}>
              <SelectTrigger className={`w-56 ${inputCls}`}><SelectValue placeholder="Campanha (opcional)" /></SelectTrigger>
              <SelectContent className="bg-[#1e293b] border-[#334155]">
                <SelectItem value="none" className="text-white">Sem campanha</SelectItem>
                {campaigns.map((c) => <SelectItem key={c?.id} value={c?.id} className="text-white">{c?.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input value={form.keyword} onChange={(e: any) => setForm((f) => ({ ...f, keyword: e?.target?.value ?? '' }))} placeholder="Keyword seed (ex.: lymphatic drainage)" className={`${inputCls} flex-1 min-w-[220px]`} />
            <Input value={form.language} onChange={(e: any) => setForm((f) => ({ ...f, language: e?.target?.value ?? '' }))} className={`${inputCls} w-16`} title="Idioma (ISO 639-1)" />
            <Input value={form.region} onChange={(e: any) => setForm((f) => ({ ...f, region: e?.target?.value ?? '' }))} className={`${inputCls} w-16`} title="Região (ISO 3166-1)" />
            <Select value={form.provider} onValueChange={(v) => setForm((f) => ({ ...f, provider: v }))}>
              <SelectTrigger className={`w-36 ${inputCls}`}><SelectValue /></SelectTrigger>
              <SelectContent className="bg-[#1e293b] border-[#334155]">
                {Object.entries(PROVIDERS).map(([k, v]) => <SelectItem key={k} value={k} className="text-white">{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button
              onClick={() => setConfirmOpen(true)}
              disabled={!form.keyword.trim() || searching}
              className="bg-green-600 hover:bg-green-700 text-white gap-1"
            >
              <SearchIcon className="h-4 w-4" /> {searching ? 'Pesquisando…' : dedupeHit ? 'Pesquisar (grátis — reuso 24h)' : 'Pesquisar (1 crédito)'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de aprovação — gate obrigatório antes de gastar crédito */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="bg-[#1e293b] border-[#334155]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Confirmar busca no AnswerThePublic?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400 space-y-1">
              <span className="block">Termo: <span className="text-white font-mono">"{form.keyword.trim().toLowerCase()}"</span></span>
              <span className="block">Mercado: <span className="text-white">{form.language}/{form.region}</span> · Provider: <span className="text-white">{PROVIDERS[form.provider]}</span></span>
              <span className="block">Saldo atual: <span className="text-white font-mono">{remaining ?? '?'}</span> buscas</span>
              {dedupeHit
                ? <span className="block text-green-400 font-medium">Busca idêntica nas últimas 24h — será reaproveitada SEM gastar crédito.</span>
                : <span className="block text-yellow-400 font-medium">Esta busca consome 1 crédito do seu saldo.</span>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[#0f172a] border-[#334155] text-slate-300">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={runSearch} className="bg-green-600 hover:bg-green-700 text-white">
              {dedupeHit ? 'Reaproveitar busca' : 'Aprovar e gastar 1 crédito'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Histórico */}
      <Card className="bg-[#1e293b] border-[#334155]">
        <CardHeader className="pb-2"><CardTitle className="text-base text-white">Buscas Realizadas ({searches.length})</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-[#334155] text-slate-400 text-xs">
                <th className="text-left py-2">Keyword</th><th>Provider</th><th>Mercado</th><th>Status</th><th>Crédito</th><th>Campanha</th><th>Data</th><th></th>
              </tr></thead>
              <tbody>
                {searches.map((s) => (
                  <tr key={s?.id} className={`border-b border-[#334155]/50 hover:bg-[#0f172a]/50 ${selected?.id === s?.id ? 'bg-[#0f172a]' : ''}`}>
                    <td className="py-2 text-white">{s?.keyword}</td>
                    <td className="text-center text-slate-300 text-xs">{PROVIDERS[s?.provider] ?? s?.provider}</td>
                    <td className="text-center text-slate-300 text-xs">{s?.language}/{s?.region}</td>
                    <td className="text-center">
                      <Badge className={s?.status === 'completed' ? 'bg-green-500/20 text-green-400' : s?.status === 'failed' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}>
                        {s?.status === 'completed' ? 'pronta' : s?.status === 'failed' ? 'falhou' : 'processando'}
                      </Badge>
                    </td>
                    <td className="text-center text-xs">{s?.creditCharged ? <span className="text-yellow-400">1</span> : <span className="text-green-400">0</span>}</td>
                    <td className="text-slate-400 text-xs">{s?.campaign?.name ?? '—'}</td>
                    <td className="text-slate-400 text-xs text-center">{s?.createdAt ? new Date(s.createdAt).toLocaleDateString('pt-BR') : ''}</td>
                    <td className="text-right whitespace-nowrap">
                      <Button size="sm" variant="outline" className="border-[#334155] text-slate-300 h-7 px-2 mr-1" disabled={s?.status !== 'completed'} onClick={() => openReport(s)}>Ver report</Button>
                      <button onClick={async () => { await fetch(`/api/atp/searches/${s?.id}`, { method: 'DELETE' }); if (selected?.id === s?.id) setSelected(null); loadSearches(); }} className="text-red-400 hover:text-red-300 align-middle"><Trash2 className="h-3 w-3" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {searches.length === 0 && <p className="text-center text-slate-500 py-8">Nenhuma busca ainda — crie a primeira acima</p>}
          </div>
        </CardContent>
      </Card>

      {/* Report + análise */}
      {selected && (
        <Card className="bg-[#1e293b] border-[#334155]">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-base text-white">Report — "{selected?.keyword}" ({PROVIDERS[selected?.provider] ?? selected?.provider})</CardTitle>
              <Button onClick={runAnalysis} disabled={analyzing || selected?.status !== 'completed'} className="bg-purple-600 hover:bg-purple-700 text-white gap-1">
                <Sparkles className="h-4 w-4" /> {analyzing ? 'Analisando…' : 'Analisar p/ campanha (grátis)'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {bucketLoading && <p className="text-slate-400 text-sm py-4">Carregando report…</p>}
            <Tabs defaultValue="analise">
              <TabsList className="bg-[#0f172a] border border-[#334155] flex-wrap h-auto">
                <TabsTrigger value="analise" className="data-[state=active]:bg-purple-600/30 data-[state=active]:text-purple-300 text-slate-400">Análise</TabsTrigger>
                <TabsTrigger value="all" className="data-[state=active]:bg-green-600/30 data-[state=active]:text-green-300 text-slate-400">Todos ({bucketRows['all']?.length ?? 0})</TabsTrigger>
                {BUCKETS.map((b) => (
                  <TabsTrigger key={b.key} value={b.key} className="data-[state=active]:bg-green-600/30 data-[state=active]:text-green-300 text-slate-400">{b.label} ({bucketRows[b.key]?.length ?? 0})</TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="analise" className="mt-4">
                {!analysis && <p className="text-slate-500 text-sm py-4">Clique em "Analisar p/ campanha" para ranquear as keywords pela economia da campanha (camadas A–D, regra do 3×, intenção × volume × margem de CPC). Não consome crédito ATP.</p>}
                {analysis && (
                  <div className="space-y-4">
                    {analysis?.best?.keyword && (
                      <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <Trophy className="h-4 w-4 text-yellow-400" />
                          <span className="text-white font-semibold">{analysis.best.keyword}</span>
                          {analysis.best.layer && <Badge className={layerColors[analysis.best.layer] ?? ''}>Camada {analysis.best.layer}</Badge>}
                          {analysis.best.matchType && <Badge className="bg-slate-500/20 text-slate-300">{analysis.best.matchType}</Badge>}
                        </div>
                        <p className="text-slate-300 text-sm">{analysis.best.rationale}</p>
                        {analysis?.economics?.cpcTeto > 0 && (
                          <p className="text-slate-400 text-xs mt-2">CPC teto (breakeven): <span className="font-mono text-white">${analysis.economics.cpcTeto?.toFixed?.(2)}</span> · CPC alvo (ROAS 2×): <span className="font-mono text-white">${analysis.economics.cpcAlvo?.toFixed?.(2)}</span>{analysis?.campaign?.name ? ` · Campanha: ${analysis.campaign.name}` : ''}</p>
                        )}
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <p className="text-slate-400 text-xs">{analysis?.totalExtracted ?? 0} keywords no report · top {(analysis?.ranking ?? []).length} ranqueadas</p>
                      <Button size="sm" onClick={importSelected} disabled={importing} className="bg-green-600 hover:bg-green-700 text-white gap-1">
                        <Download className="h-3 w-3" /> {importing ? 'Importando…' : `Importar selecionadas (${Object.values(checked).filter(Boolean).length})`}
                      </Button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead><tr className="border-b border-[#334155] text-slate-400 text-xs">
                          <th className="py-2"></th><th className="text-left">Keyword</th><th>Camada</th><th>Match</th><th className="text-right">Volume</th><th className="text-right">CPC</th><th>Intenção</th><th className="text-right">Score</th><th>Viável</th>
                        </tr></thead>
                        <tbody>
                          {(analysis?.ranking ?? []).map((r: any) => (
                            <tr key={r?.keyword} className="border-b border-[#334155]/50 hover:bg-[#0f172a]/50">
                              <td className="py-2 text-center"><input type="checkbox" checked={!!checked[r?.keyword]} onChange={(e) => setChecked((c) => ({ ...c, [r.keyword]: e.target.checked }))} className="accent-green-500" /></td>
                              <td className="text-white">{r?.keyword}</td>
                              <td className="text-center"><Badge className={layerColors[r?.layer] ?? 'bg-slate-500/20 text-slate-400'}>{r?.layer}</Badge></td>
                              <td className="text-center text-slate-300 text-xs">{r?.matchType}</td>
                              <td className="text-right text-white font-mono">{r?.volume ?? '—'}</td>
                              <td className="text-right text-white font-mono">{r?.cpc !== null && r?.cpc !== undefined ? `$${Number(r.cpc).toFixed(2)}` : '—'}</td>
                              <td className="text-center text-slate-300 text-xs">{r?.intent}</td>
                              <td className="text-right text-white font-mono">{r?.score}</td>
                              <td className="text-center">{r?.viable === false ? <Badge className="bg-red-500/20 text-red-400">não</Badge> : r?.viable === true ? <Badge className="bg-green-500/20 text-green-400">sim</Badge> : <span className="text-slate-500 text-xs">—</span>}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </TabsContent>

              {['all', ...BUCKETS.map((b) => b.key)].map((key) => (
                <TabsContent key={key} value={key} className="mt-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-[#334155] text-slate-400 text-xs">
                        <th className="text-left py-2">Keyword</th><th className="text-right">Volume</th><th className="text-right">CPC</th><th>Intenção</th><th>Sentimento</th>
                      </tr></thead>
                      <tbody>
                        {(bucketRows[key] ?? []).map((r: any) => (
                          <tr key={r?.keyword} className="border-b border-[#334155]/50 hover:bg-[#0f172a]/50">
                            <td className="py-2 text-white">{r?.keyword}</td>
                            <td className="text-right text-white font-mono">{r?.volume ?? '—'}</td>
                            <td className="text-right text-white font-mono">{r?.cpc !== null && r?.cpc !== undefined ? `$${Number(r.cpc).toFixed(2)}` : '—'}</td>
                            <td className="text-center text-slate-300 text-xs">{r?.intent ?? '—'}</td>
                            <td className="text-center text-slate-300 text-xs">{r?.sentiment ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {(bucketRows[key]?.length ?? 0) === 0 && !bucketLoading && <p className="text-center text-slate-500 py-6">Sem dados neste bucket</p>}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
