'use client';
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import { ListTodo, Search, Wand2, Skull, TrendingUp, Zap, MoreVertical, MessageSquare, Eye } from 'lucide-react';
import { toast } from 'sonner';

const statusColors: Record<string, string> = {
  EM_TESTE: 'bg-blue-500/20 text-blue-400', ATIVO: 'bg-blue-600/20 text-blue-300',
  OTIMIZANDO: 'bg-yellow-500/20 text-yellow-400', SCALE: 'bg-green-500/20 text-green-400',
  PAUSADO: 'bg-slate-500/20 text-slate-400', KILL: 'bg-red-500/20 text-red-400',
};
const statusLabels: Record<string, string> = {
  EM_TESTE: 'Em Teste', ATIVO: 'Ativo', OTIMIZANDO: 'Otimizando',
  SCALE: 'Scale', PAUSADO: 'Pausado', KILL: 'Kill',
};

export default function CampanhasPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPlatform, setFilterPlatform] = useState('all');
  const [search, setSearch] = useState('');
  const [decisionModal, setDecisionModal] = useState<any>(null);
  const [rationale, setRationale] = useState('');

  const loadCampaigns = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterStatus !== 'all') params.set('status', filterStatus);
    if (filterPlatform !== 'all') params.set('platform', filterPlatform);
    fetch(`/api/campaigns?${params}`)
      .then(r => r.json())
      .then(d => setCampaigns(d ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadCampaigns(); }, [filterStatus, filterPlatform]);

  const submitDecision = async (campaignId: string, decision: string) => {
    try {
      await fetch(`/api/campaigns/${campaignId}/decisions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, rationale }),
      });
      toast.success(`Decisão ${decision} registrada!`);
      setDecisionModal(null);
      setRationale('');
      loadCampaigns();
    } catch { toast.error('Erro ao registrar decisão'); }
  };

  const filtered = (campaigns ?? []).filter((c: any) => {
    if (search && !(c?.name ?? '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const getMetrics = (c: any) => {
    const logs = c?.dailyLogs ?? [];
    let spend = 0, revenue = 0, clicks = 0, conversions = 0;
    for (const l of logs) { spend += l?.spend ?? 0; revenue += l?.revenue ?? 0; clicks += l?.clicks ?? 0; conversions += l?.conversions ?? 0; }
    const cpc = clicks > 0 ? spend / clicks : 0;
    const epc = clicks > 0 ? revenue / clicks : 0;
    const ratio = cpc > 0 ? epc / cpc : 0;
    return { spend, revenue, clicks, conversions, cpc, epc, ratio, profit: revenue - spend };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white tracking-tight flex items-center gap-2">
            <ListTodo className="h-6 w-6 text-blue-400" /> Gerenciador de Campanhas
          </h1>
          <p className="text-slate-400 text-sm mt-1">Gerencie e tome decisões sobre suas campanhas</p>
        </div>
        <Link href="/wizard">
          <Button className="bg-green-600 hover:bg-green-700 text-white gap-2">
            <Wand2 className="h-4 w-4" /> Nova
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Buscar campanha..." value={search} onChange={(e: any) => setSearch(e?.target?.value ?? '')} className="bg-[#0f172a] border-[#334155] text-white pl-10" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40 bg-[#0f172a] border-[#334155] text-white"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent className="bg-[#1e293b] border-[#334155]">
            <SelectItem value="all" className="text-white">Todos Status</SelectItem>
            {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k} className="text-white">{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterPlatform} onValueChange={setFilterPlatform}>
          <SelectTrigger className="w-40 bg-[#0f172a] border-[#334155] text-white"><SelectValue placeholder="Plataforma" /></SelectTrigger>
          <SelectContent className="bg-[#1e293b] border-[#334155]">
            <SelectItem value="all" className="text-white">Todas</SelectItem>
            {['ClickBank','BuyGoods','MaxWeb','Hotmart','Eduzz','Monetizze'].map(p => <SelectItem key={p} value={p} className="text-white">{p}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Campaign cards */}
      {loading ? (
        <div className="grid gap-4">{[1,2,3].map(i => <Card key={i} className="bg-[#1e293b] border-[#334155] animate-pulse"><CardContent className="p-6"><div className="h-20 bg-[#334155] rounded" /></CardContent></Card>)}</div>
      ) : filtered.length === 0 ? (
        <Card className="bg-[#1e293b] border-[#334155]">
          <CardContent className="p-12 text-center">
            <ListTodo className="h-12 w-12 text-slate-500 mx-auto mb-4" />
            <p className="text-slate-400">Nenhuma campanha encontrada</p>
            <Link href="/wizard"><Button className="mt-4 bg-green-600 hover:bg-green-700 text-white">Criar Primeira Campanha</Button></Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((c: any) => {
            const m = getMetrics(c);
            return (
              <Card key={c?.id} className="bg-[#1e293b] border-[#334155] hover:border-[#475569] transition-all">
                <CardContent className="p-5 sm:p-6 space-y-5">
                  <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="text-white font-semibold text-lg">{c?.name ?? 'Sem nome'}</h3>
                        <Badge className={statusColors?.[c?.status] ?? 'bg-slate-500/20 text-slate-400'}>{statusLabels?.[c?.status] ?? c?.status}</Badge>
                        <Badge variant="outline" className="text-slate-300 border-slate-600 text-xs">{c?.platform}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                        <span>{c?.vertical} · {c?.geo} · {c?.channel}</span>
                        {c?.campaignNameGenerated && <span className="font-mono text-slate-500 text-xs">{c?.campaignNameGenerated}</span>}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap shrink-0">
                      <Link href={`/campanhas/${c?.id}`}>
                        <Button size="sm" variant="outline" className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10">
                          <Eye className="h-3 w-3 mr-1" /> Detalhes
                        </Button>
                      </Link>
                      <Button size="sm" variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10" onClick={() => setDecisionModal({ id: c?.id, decision: 'KILL', name: c?.name })}>
                        <Skull className="h-3 w-3 mr-1" /> Kill
                      </Button>
                      <Button size="sm" variant="outline" className="border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10" onClick={() => setDecisionModal({ id: c?.id, decision: 'OTIMIZAR', name: c?.name })}>
                        <Zap className="h-3 w-3 mr-1" /> Otimizar
                      </Button>
                      <Button size="sm" variant="outline" className="border-green-500/30 text-green-400 hover:bg-green-500/10" onClick={() => setDecisionModal({ id: c?.id, decision: 'SCALE', name: c?.name })}>
                        <TrendingUp className="h-3 w-3 mr-1" /> Scale
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
                    <div className="rounded-lg bg-[#0f172a] border border-[#334155]/80 px-4 py-3">
                      <p className="text-xs text-slate-400 mb-1">Gasto</p>
                      <p className="text-base sm:text-lg font-mono font-semibold text-white">${m.spend?.toFixed?.(2)}</p>
                    </div>
                    <div className="rounded-lg bg-[#0f172a] border border-[#334155]/80 px-4 py-3">
                      <p className="text-xs text-slate-400 mb-1">Receita</p>
                      <p className="text-base sm:text-lg font-mono font-semibold text-green-400">${m.revenue?.toFixed?.(2)}</p>
                    </div>
                    <div className="rounded-lg bg-[#0f172a] border border-[#334155]/80 px-4 py-3">
                      <p className="text-xs text-slate-400 mb-1">CPC</p>
                      <p className="text-base sm:text-lg font-mono font-semibold text-white">${m.cpc?.toFixed?.(3)}</p>
                    </div>
                    <div className="rounded-lg bg-[#0f172a] border border-[#334155]/80 px-4 py-3">
                      <p className="text-xs text-slate-400 mb-1">EPC</p>
                      <p className="text-base sm:text-lg font-mono font-semibold text-white">${m.epc?.toFixed?.(3)}</p>
                    </div>
                    <div className="rounded-lg bg-[#0f172a] border border-[#334155]/80 px-4 py-3">
                      <p className="text-xs text-slate-400 mb-1">EPC/CPC</p>
                      <p className={`text-base sm:text-lg font-mono font-semibold ${m.ratio >= 1.3 ? 'text-green-400' : m.ratio >= 1.0 ? 'text-yellow-400' : 'text-red-400'}`}>{m.ratio?.toFixed?.(2)}</p>
                    </div>
                    <div className="rounded-lg bg-[#0f172a] border border-[#334155]/80 px-4 py-3">
                      <p className="text-xs text-slate-400 mb-1">Conversões</p>
                      <p className="text-base sm:text-lg font-mono font-semibold text-white">{m.conversions}</p>
                    </div>
                  </div>
                  {(c?.decisions?.length ?? 0) > 0 && (
                    <div className="pt-4 border-t border-[#334155]">
                      <p className="text-sm text-slate-400 mb-2">Histórico de decisões</p>
                      <div className="flex flex-wrap gap-2">
                        {(c?.decisions ?? []).map((dec: any) => (
                          <span key={dec?.id} className="text-xs bg-[#0f172a] rounded-md px-2.5 py-1.5 text-slate-300 border border-[#334155]/60">
                            {dec?.decision} {dec?.rationale ? `— ${dec.rationale}` : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Decision Modal */}
      {decisionModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setDecisionModal(null)}>
          <Card className="bg-[#1e293b] border-[#334155] w-full max-w-md" onClick={(e: any) => e?.stopPropagation?.()}>
            <CardHeader>
              <CardTitle className="text-white text-lg">
                {decisionModal?.decision === 'KILL' ? '☠️ KILL' : decisionModal?.decision === 'SCALE' ? '🚀 SCALE' : '⚡ OTIMIZAR'} — {decisionModal?.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-slate-300 mb-1 block">Anotação / Motivo (opcional)</label>
                <textarea className="w-full bg-[#0f172a] border border-[#334155] rounded-lg p-3 text-white text-sm resize-none" rows={3} value={rationale} onChange={(e: any) => setRationale(e?.target?.value ?? '')} placeholder="Por que essa decisão?" />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 border-[#334155] text-slate-300" onClick={() => setDecisionModal(null)}>Cancelar</Button>
                <Button className={`flex-1 text-white ${decisionModal?.decision === 'KILL' ? 'bg-red-600 hover:bg-red-700' : decisionModal?.decision === 'SCALE' ? 'bg-green-600 hover:bg-green-700' : 'bg-yellow-600 hover:bg-yellow-700'}`} onClick={() => submitDecision(decisionModal?.id, decisionModal?.decision)}>Confirmar</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
