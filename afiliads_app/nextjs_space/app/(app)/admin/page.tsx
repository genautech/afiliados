'use client';
import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  ShieldCheck, Users, ListTodo, Coins, Loader2, RefreshCw,
  KeyRound, CheckCircle2, CircleDollarSign, FileText
} from 'lucide-react';

function fmtUsd(n: number | undefined | null): string {
  const v = n ?? 0;
  return `$${v.toFixed(v > 0 && v < 0.01 ? 4 : 2)}`;
}

function fmtTokens(n: number | undefined | null): string {
  if (!n) return '0';
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// ===== Aba Usuários =====
function UsersTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedKeys, setExpandedKeys] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/admin/users')
      .then(r => r.json())
      .then(d => setUsers(d?.users ?? []))
      .catch(() => toast.error('Erro ao carregar usuários'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleActive = async (userId: string, isActive: boolean) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Erro');
      setUsers(prev => prev.map(u => (u.id === userId ? { ...u, isActive } : u)));
      toast.success(isActive ? 'Usuário ativado' : 'Usuário desativado');
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao atualizar usuário');
    }
  };

  if (loading) return <div className="flex justify-center py-12 text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-3">
      {users.map(u => (
        <Card key={u.id} className="bg-[#1e293b] border-[#334155]">
          <CardContent className="pt-5 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white font-semibold">{u.name || '(sem nome)'}</span>
                  {u.role === 'ADMIN' && <Badge className="bg-purple-500/20 text-purple-300">ADMIN</Badge>}
                  {u.isActive
                    ? <Badge className="bg-green-500/20 text-green-400">ATIVO</Badge>
                    : <Badge className="bg-red-500/20 text-red-400">DESATIVADO</Badge>}
                </div>
                <p className="text-sm text-slate-400">{u.email}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Desde {new Date(u.createdAt).toLocaleDateString('pt-BR')} · {u.campaignCount} campanhas · {u.agentRunCount} execuções de agentes
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right text-xs text-slate-400">
                  <p>Meta receita: <span className="text-slate-200 font-mono">{fmtUsd(u.metaReceitaMensal)}</span>/mês</p>
                  <p>Meta ROI: <span className="text-slate-200 font-mono">{u.metaRoi}%</span> · Budget ads: <span className="text-slate-200 font-mono">{fmtUsd(u.budgetMensalAds)}</span></p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Acesso</span>
                  <Switch checked={u.isActive} onCheckedChange={(v: boolean) => toggleActive(u.id, v)} disabled={u.role === 'ADMIN'} />
                </div>
              </div>
            </div>

            <div>
              <button
                onClick={() => setExpandedKeys(expandedKeys === u.id ? null : u.id)}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                <KeyRound className="h-3 w-3" /> {u.keys.length} chaves configuradas {expandedKeys === u.id ? '▴' : '▾'}
              </button>
              {expandedKeys === u.id && (
                u.keys.length === 0 ? (
                  <p className="text-xs text-slate-500 mt-2">Nenhuma chave configurada — este usuário usa as chaves da plataforma (uso cobrado).</p>
                ) : (
                  <div className="mt-2 overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead><tr className="text-slate-500 border-b border-[#334155]">
                        <th className="text-left py-1.5">Serviço</th><th className="text-left">Campo</th><th className="text-left">Valor (mascarado)</th><th className="text-right">Atualizada</th>
                      </tr></thead>
                      <tbody>
                        {u.keys.map((k: any, i: number) => (
                          <tr key={i} className="border-b border-[#334155]/40">
                            <td className="py-1.5 text-slate-300">{k.service}</td>
                            <td className="text-slate-400">{k.field}</td>
                            <td className="font-mono text-slate-300">{k.maskedValue}</td>
                            <td className="text-right text-slate-500">{new Date(k.updatedAt).toLocaleDateString('pt-BR')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>
      ))}
      {users.length === 0 && <p className="text-sm text-slate-500 text-center py-8">Nenhum usuário cadastrado.</p>}
    </div>
  );
}

// ===== Aba Campanhas =====
function CampaignsTab() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    fetch('/api/admin/campaigns')
      .then(r => r.json())
      .then(d => setCampaigns(d?.campaigns ?? []))
      .catch(() => toast.error('Erro ao carregar campanhas'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-12 text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const filtered = filter
    ? campaigns.filter(c =>
        (c.user?.email ?? '').toLowerCase().includes(filter.toLowerCase()) ||
        (c.name ?? '').toLowerCase().includes(filter.toLowerCase()))
    : campaigns;

  return (
    <Card className="bg-[#1e293b] border-[#334155]">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base text-white">Campanhas de todos os usuários ({filtered.length})</CardTitle>
          <Input
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Filtrar por usuário ou campanha…"
            className="bg-[#0f172a] border-[#334155] text-white max-w-xs h-8 text-sm"
          />
        </div>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <p className="text-sm text-slate-500 py-6 text-center">Nenhuma campanha encontrada.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-[#334155] text-slate-400 text-xs">
                <th className="text-left py-2">Usuário</th><th className="text-left">Campanha</th><th className="text-left">Plataforma</th><th className="text-left">Status</th><th className="text-right">Spend</th><th className="text-right">Receita</th><th className="text-right">ROI</th><th className="text-right">Cliques</th><th className="text-right">Conv.</th>
              </tr></thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id} className="border-b border-[#334155]/50">
                    <td className="py-2 text-slate-300">{c.user?.name || c.user?.email}</td>
                    <td className="text-white">{c.name}</td>
                    <td className="text-slate-400">{c.platform} · {c.geo}</td>
                    <td>
                      <Badge className={cn('text-[10px]',
                        c.status === 'ATIVA' || c.status === 'SCALE' ? 'bg-green-500/20 text-green-400'
                          : c.status === 'EM_TESTE' ? 'bg-blue-500/20 text-blue-400'
                          : c.status === 'KILL' || c.status === 'PAUSADA' ? 'bg-red-500/20 text-red-400'
                          : 'bg-slate-500/20 text-slate-400')}>
                        {c.status}
                      </Badge>
                    </td>
                    <td className="text-right text-slate-300 font-mono">{fmtUsd(c.spend)}</td>
                    <td className="text-right text-green-400 font-mono">{fmtUsd(c.revenue)}</td>
                    <td className={cn('text-right font-mono', c.roiPct == null ? 'text-slate-500' : c.roiPct >= 0 ? 'text-green-400' : 'text-red-400')}>
                      {c.roiPct == null ? '—' : `${c.roiPct.toFixed(0)}%`}
                    </td>
                    <td className="text-right text-slate-400 font-mono">{c.clicks}</td>
                    <td className="text-right text-slate-400 font-mono">{c.conversions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ===== Aba Gastos com agentes =====
function AgentCostsTab() {
  const [period, setPeriod] = useState(currentPeriod());
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback((p: string) => {
    setLoading(true);
    fetch(`/api/admin/agent-costs?period=${p}`)
      .then(r => r.json())
      .then(setData)
      .catch(() => toast.error('Erro ao carregar gastos'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(period); }, [period, load]);

  const act = async (userId: string, action: string) => {
    setActing(userId + action);
    try {
      const res = await fetch('/api/admin/agent-costs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, period, action }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result?.error || 'Erro');
      toast.success(action === 'generate' ? `Cobrança gerada: ${fmtUsd(result.amountUsd)}` : action === 'mark_paid' ? 'Marcado como pago' : 'Marcado como pendente');
      load(period);
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro na ação');
    } finally {
      setActing(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400">Período:</span>
          <Input
            type="month"
            value={period}
            onChange={e => setPeriod(e.target.value || currentPeriod())}
            className="bg-[#0f172a] border-[#334155] text-white w-44 h-8 text-sm"
          />
        </div>
        {data?.totals && (
          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-300">
              Plataforma (a receber): <span className="font-mono text-yellow-400">{fmtUsd(data.totals.platformCostUsd)}</span>
            </span>
            <span className="text-slate-400">
              Chaves próprias: <span className="font-mono">{fmtUsd(data.totals.byokCostUsd)}</span>
            </span>
            <Button size="sm" variant="outline" className="border-[#334155] text-slate-300 gap-1 h-8" onClick={() => load(period)}>
              <RefreshCw className="h-3 w-3" /> Atualizar
            </Button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12 text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (
        <Card className="bg-[#1e293b] border-[#334155]">
          <CardContent className="pt-5">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-[#334155] text-slate-400 text-xs">
                  <th className="text-left py-2">Usuário</th>
                  <th className="text-right">Execuções</th>
                  <th className="text-right">Tokens (plataforma)</th>
                  <th className="text-right">Custo plataforma</th>
                  <th className="text-right">Custo chave própria</th>
                  <th className="text-left pl-4">Cobrança</th>
                  <th className="text-right">Ações</th>
                </tr></thead>
                <tbody>
                  {(data?.rows ?? []).map((r: any) => (
                    <tr key={r.user.id} className="border-b border-[#334155]/50">
                      <td className="py-2.5">
                        <span className="text-white">{r.user.name || r.user.email}</span>
                        {!r.user.isActive && <Badge className="bg-red-500/20 text-red-400 text-[10px] ml-2">DESATIVADO</Badge>}
                      </td>
                      <td className="text-right text-slate-300 font-mono">{r.platform.runs + r.byok.runs}</td>
                      <td className="text-right text-slate-400 font-mono">{fmtTokens(r.platform.totalTokens)}</td>
                      <td className="text-right text-yellow-400 font-mono">{fmtUsd(r.platform.costUsd)}</td>
                      <td className="text-right text-slate-400 font-mono">{fmtUsd(r.byok.costUsd)}</td>
                      <td className="pl-4">
                        {r.payment ? (
                          <span className="flex items-center gap-1.5">
                            {r.payment.status === 'PAGO'
                              ? <Badge className="bg-green-500/20 text-green-400 gap-1"><CheckCircle2 className="h-3 w-3" /> PAGO</Badge>
                              : <Badge className="bg-yellow-500/20 text-yellow-400">PENDENTE</Badge>}
                            <span className="font-mono text-xs text-slate-300">{fmtUsd(r.payment.amountUsd)}</span>
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500">não gerada</span>
                        )}
                      </td>
                      <td className="text-right space-x-1.5 whitespace-nowrap">
                        <Button
                          size="sm" variant="outline"
                          className="border-[#334155] text-slate-300 h-7 text-xs gap-1"
                          disabled={acting === r.user.id + 'generate'}
                          onClick={() => act(r.user.id, 'generate')}
                          title="Gera/atualiza a cobrança com o custo plataforma do período"
                        >
                          <FileText className="h-3 w-3" /> Gerar
                        </Button>
                        {r.payment && r.payment.status !== 'PAGO' && (
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white h-7 text-xs gap-1"
                            disabled={acting === r.user.id + 'mark_paid'}
                            onClick={() => act(r.user.id, 'mark_paid')}
                          >
                            <CircleDollarSign className="h-3 w-3" /> Marcar pago
                          </Button>
                        )}
                        {r.payment && r.payment.status === 'PAGO' && (
                          <Button
                            size="sm" variant="outline"
                            className="border-[#334155] text-slate-400 h-7 text-xs"
                            disabled={acting === r.user.id + 'mark_pending'}
                            onClick={() => act(r.user.id, 'mark_pending')}
                          >
                            Reabrir
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-slate-500 mt-3">
              "Custo plataforma" = execuções com as chaves globais do admin (valor a receber do usuário). "Chave própria" = o usuário configurou a própria chave em Configurações e paga direto ao provedor. Os números são os mesmos que cada usuário vê no extrato da página Agentes.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function AdminPage() {
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-display font-bold text-white tracking-tight flex items-center gap-2">
          <ShieldCheck className="h-7 w-7 text-purple-400" /> Administração
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Gestão de usuários, acompanhamento de campanhas e gastos com agentes de toda a plataforma.
        </p>
      </div>

      <Tabs defaultValue="usuarios" className="space-y-4">
        <TabsList className="bg-[#1e293b] border border-[#334155]">
          <TabsTrigger value="usuarios" className="gap-1.5 data-[state=active]:bg-[#0f172a]"><Users className="h-4 w-4" /> Usuários</TabsTrigger>
          <TabsTrigger value="campanhas" className="gap-1.5 data-[state=active]:bg-[#0f172a]"><ListTodo className="h-4 w-4" /> Campanhas</TabsTrigger>
          <TabsTrigger value="gastos" className="gap-1.5 data-[state=active]:bg-[#0f172a]"><Coins className="h-4 w-4" /> Gastos com agentes</TabsTrigger>
        </TabsList>
        <TabsContent value="usuarios"><UsersTab /></TabsContent>
        <TabsContent value="campanhas"><CampaignsTab /></TabsContent>
        <TabsContent value="gastos"><AgentCostsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
