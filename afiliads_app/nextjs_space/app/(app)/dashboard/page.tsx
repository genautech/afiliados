'use client';
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatCard, StatGrid } from '@/components/ui/stat-card';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import {
  DollarSign, TrendingUp, MousePointerClick, AlertTriangle,
  BarChart3, Wand2, Target, Activity, FileSpreadsheet, CheckCircle2,
  XCircle, ArrowUpRight, ArrowDownRight, ListTodo, Package
} from 'lucide-react';

const DashboardChart = dynamic(() => import('@/components/dashboard-chart'), { ssr: false });

const statusColors: Record<string, string> = {
  EM_TESTE: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  ATIVO: 'bg-blue-600/20 text-blue-300 border-blue-600/30',
  OTIMIZANDO: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  SCALE: 'bg-green-500/20 text-green-400 border-green-500/30',
  PAUSADO: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  KILL: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const statusLabels: Record<string, string> = {
  EM_TESTE: 'Em Teste', ATIVO: 'Ativo', OTIMIZANDO: 'Otimizando',
  SCALE: 'Scale', PAUSADO: 'Pausado', KILL: 'Kill',
};

const platformColors: Record<string, string> = {
  ClickBank: 'text-purple-400', BuyGoods: 'text-orange-400', MaxWeb: 'text-cyan-400',
  Hotmart: 'text-red-400', Eduzz: 'text-green-400', Monetizze: 'text-yellow-400',
};

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-8">
        <h1 className="text-2xl font-display font-bold text-white">Dashboard</h1>
        <StatGrid cols={5}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="bg-[#1e293b] border-[#334155] animate-pulse">
              <CardContent className="p-6"><div className="h-24 bg-[#334155] rounded" /></CardContent>
            </Card>
          ))}
        </StatGrid>
      </div>
    );
  }

  const d = data ?? {};
  const profit = (d?.totalRevenue ?? 0) - (d?.totalSpend ?? 0);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white tracking-tight">Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">Visão geral com dados integrados das planilhas</p>
        </div>
        <div className="flex gap-2">
          <Link href="/planilhas">
            <Button variant="outline" className="border-[#334155] text-slate-300 hover:text-white hover:bg-[#334155] gap-2">
              <FileSpreadsheet className="h-4 w-4" /> Planilhas
            </Button>
          </Link>
          <Link href="/wizard">
            <Button className="bg-green-600 hover:bg-green-700 text-white gap-2">
              <Wand2 className="h-4 w-4" /> Nova Campanha
            </Button>
          </Link>
        </div>
      </div>

      {/* Main KPI Cards */}
      <StatGrid cols={5}>
        <StatCard
          label="Gasto Total"
          value={`$${d?.totalSpend?.toFixed?.(2) ?? '0.00'}`}
          hint="Investimento acumulado"
          tone="negative"
          icon={<DollarSign className="h-5 w-5" />}
        />
        <StatCard
          label="Receita Total"
          value={`$${d?.totalRevenue?.toFixed?.(2) ?? '0.00'}`}
          hint="Comissões / conversões"
          tone="positive"
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatCard
          label="Lucro"
          value={`$${profit?.toFixed?.(2) ?? '0.00'}`}
          hint={profit >= 0 ? 'Operação no positivo' : 'Operação no negativo'}
          tone={profit >= 0 ? 'positive' : 'negative'}
          icon={profit >= 0 ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
        />
        <StatCard
          label="ROAS"
          value={`${d?.roas?.toFixed?.(2) ?? '0.00'}x`}
          hint="Receita ÷ gasto"
          tone={(d?.roas ?? 0) >= 1 ? 'positive' : 'warning'}
          icon={<Target className="h-5 w-5" />}
        />
        <StatCard
          label="EPC Médio"
          value={`$${d?.epcMedio?.toFixed?.(3) ?? '0.000'}`}
          hint="Receita por clique"
          tone="info"
          icon={<MousePointerClick className="h-5 w-5" />}
        />
      </StatGrid>

      {/* Chart */}
      {(d?.recentLogs?.length ?? 0) > 0 && (
        <Card className="bg-[#1e293b] border-[#334155]">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-white flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-400" /> Performance Diária
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DashboardChart logs={d?.recentLogs ?? []} />
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Overview */}
        <Card className="bg-[#1e293b] border-[#334155] lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-white flex items-center gap-2">
              <Activity className="h-4 w-4 text-green-400" /> Status das Campanhas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(d?.byStatus ?? {})?.map?.(([status, count]: any) => (
              <div key={status} className="flex items-center justify-between">
                <Badge className={statusColors?.[status] ?? 'bg-slate-500/20 text-slate-400'}>
                  {statusLabels?.[status] ?? status}
                </Badge>
                <span className="text-white font-mono text-sm">{count ?? 0}</span>
              </div>
            ))}
            {Object.keys(d?.byStatus ?? {})?.length === 0 && (
              <p className="text-slate-500 text-sm">Nenhuma campanha ainda</p>
            )}
          </CardContent>
        </Card>

        {/* Platform Cards */}
        <Card className="bg-[#1e293b] border-[#334155] lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-white flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-400" /> Por Plataforma
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(d?.byPlatform ?? {})?.map?.(([platform, info]: any) => (
              <div key={platform} className="flex items-center justify-between">
                <span className={`text-sm font-medium ${platformColors?.[platform] ?? 'text-slate-300'}`}>{platform}</span>
                <div className="text-right">
                  <span className="text-white text-sm font-mono">{info?.count ?? 0} camp.</span>
                  <span className="text-slate-400 text-xs ml-2">${(info?.revenue ?? 0)?.toFixed?.(0)}</span>
                </div>
              </div>
            ))}
            {Object.keys(d?.byPlatform ?? {})?.length === 0 && (
              <p className="text-slate-500 text-sm">Nenhuma plataforma</p>
            )}
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card className="bg-[#1e293b] border-[#334155] lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-white flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-400" /> Alertas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(d?.alerts ?? [])?.map?.((alert: any, i: number) => (
              <div key={i} className={`p-3 rounded-lg text-sm transition-colors ${
                alert?.type === 'warning' ? 'bg-yellow-500/10 text-yellow-300' : 'bg-orange-500/10 text-orange-300'
              }`}>
                <Link href={`/campanhas/${alert?.campaignId ?? ''}`} className="hover:underline">
                  <span className="font-medium">{alert?.campaignName ?? 'Campanha'}</span>
                </Link>
                <p className="text-xs mt-0.5 opacity-80">{alert?.message ?? ''}</p>
                <button
                  className="text-[11px] mt-1.5 px-2 py-0.5 rounded bg-[#0f172a] border border-[#334155] text-slate-300 hover:text-white hover:border-green-500/40"
                  onClick={async () => {
                    const res = await fetch('/api/loop/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ campaignId: alert?.campaignId }) });
                    const data = await res.json();
                    if (res.ok) toast.success(`Loop ${alert?.campaignName}: ${data?.decision}`);
                    else toast.error(data?.error ?? 'Erro ao rodar loop');
                  }}
                >
                  ▶ Rodar loop agora
                </button>
              </div>
            ))}
            {(d?.alerts?.length ?? 0) === 0 && (
              <p className="text-slate-500 text-sm">Sem alertas no momento ✅</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick stats */}
      <StatGrid cols={6}>
        <StatCard
          label="Campanhas"
          value={d?.totalCampaigns ?? 0}
          hint="Total cadastradas"
          icon={<ListTodo className="h-5 w-5" />}
        />
        <StatCard
          label="Ofertas"
          value={d?.offersCount ?? 0}
          hint="Produtos rastreados"
          icon={<Package className="h-5 w-5" />}
        />
        <StatCard
          label="Cliques"
          value={d?.totalClicks ?? 0}
          hint="Volume de tráfego"
          icon={<MousePointerClick className="h-5 w-5" />}
        />
        <StatCard
          label="Conversões"
          value={d?.totalConversions ?? 0}
          hint="Vendas registradas"
          tone="info"
          icon={<Target className="h-5 w-5" />}
        />
        <StatCard
          label="Scales"
          value={d?.testsScale ?? 0}
          hint="Campanhas em escala"
          tone="positive"
          icon={<CheckCircle2 className="h-5 w-5" />}
        />
        <StatCard
          label="Kills"
          value={d?.testsKill ?? 0}
          hint="Campanhas encerradas"
          tone="negative"
          icon={<XCircle className="h-5 w-5" />}
        />
      </StatGrid>
    </div>
  );
}
