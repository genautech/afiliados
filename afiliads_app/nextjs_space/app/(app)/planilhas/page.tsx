'use client';
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  Table, TrendingUp, TrendingDown, DollarSign, Target, BarChart3,
  FileSpreadsheet, Search, Plus, ChevronDown, ChevronUp, ExternalLink,
  AlertTriangle, CheckCircle2, XCircle, Clock, Eye, EyeOff
} from 'lucide-react';
import { affiliateMarketplaceUrl } from '@/lib/marketplace';

const resultColors: Record<string, string> = {
  SCALE: 'bg-green-500/20 text-green-400 border-green-500/30',
  OTIMIZAR: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  KILL: 'bg-red-500/20 text-red-400 border-red-500/30',
  PAUSAR: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  PENDENTE: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

const networkColors: Record<string, string> = {
  ClickBank: 'text-purple-400', BuyGoods: 'text-orange-400', MaxWeb: 'text-cyan-400',
  Hotmart: 'text-red-400', Eduzz: 'text-green-400', Monetizze: 'text-yellow-400',
};

const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'ofertas', label: 'Ofertas', icon: Target },
  { id: 'campanhas', label: 'Campanhas Google', icon: Search },
  { id: 'diario', label: 'Diário', icon: FileSpreadsheet },
  { id: 'testes', label: 'Testes Kill/Scale', icon: AlertTriangle },
  { id: 'keywords', label: 'Keywords', icon: Search },
  { id: 'financeiro', label: 'Financeiro', icon: DollarSign },
  { id: 'semanal', label: 'Métricas Semanais', icon: TrendingUp },
];

export default function PlanilhasPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetch('/api/planilhas')
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => toast.error('Erro ao carregar dados'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-display font-bold text-white">Planilhas de Acompanhamento</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1,2,3].map(i => (
            <Card key={i} className="bg-[#1e293b] border-[#334155] animate-pulse">
              <CardContent className="p-6"><div className="h-20 bg-[#334155] rounded" /></CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const d = data ?? {};
  const fin = d?.financial ?? {};

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-[#1e293b] border-[#334155]">
          <CardContent className="p-5">
            <p className="text-sm text-slate-400">Gasto Total</p>
            <p className="text-2xl font-bold text-red-400 font-mono">${fin?.totalSpend?.toFixed(2) ?? '0.00'}</p>
          </CardContent>
        </Card>
        <Card className="bg-[#1e293b] border-[#334155]">
          <CardContent className="p-5">
            <p className="text-sm text-slate-400">Receita Líquida</p>
            <p className="text-2xl font-bold text-green-400 font-mono">${fin?.netRevenue?.toFixed(2) ?? '0.00'}</p>
          </CardContent>
        </Card>
        <Card className="bg-[#1e293b] border-[#334155]">
          <CardContent className="p-5">
            <p className="text-sm text-slate-400">Lucro</p>
            <p className={`text-2xl font-bold font-mono ${(fin?.profit ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              ${fin?.profit?.toFixed(2) ?? '0.00'}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-[#1e293b] border-[#334155]">
          <CardContent className="p-5">
            <p className="text-sm text-slate-400">ROAS</p>
            <p className="text-2xl font-bold text-white font-mono">{fin?.roas?.toFixed(2) ?? '0.00'}x</p>
          </CardContent>
        </Card>
      </div>
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Ofertas', value: d?.offers?.length ?? 0, color: 'text-purple-400' },
          { label: 'Campanhas', value: d?.campaigns?.length ?? 0, color: 'text-blue-400' },
          { label: 'Registros Diário', value: d?.dailyLogs?.length ?? 0, color: 'text-cyan-400' },
          { label: 'Testes', value: d?.testResults?.length ?? 0, color: 'text-yellow-400' },
          { label: 'Keywords', value: d?.keywords?.length ?? 0, color: 'text-green-400' },
        ].map(item => (
          <Card key={item.label} className="bg-[#1e293b] border-[#334155]">
            <CardContent className="p-4 text-center">
              <p className={`text-3xl font-bold font-mono ${item.color}`}>{item.value}</p>
              <p className="text-xs text-slate-400 mt-1">{item.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Decisions */}
      <Card className="bg-[#1e293b] border-[#334155]">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white">Últimas Decisões</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {(d?.decisions ?? []).slice(0, 8).map((dec: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-[#0f172a]">
                <div>
                  <span className="text-white text-sm font-medium">{dec?.campaign?.name ?? 'N/A'}</span>
                  <p className="text-slate-400 text-xs mt-0.5">{dec?.rationale?.slice(0, 80) ?? ''}...</p>
                </div>
                <Badge className={resultColors[dec?.decision] ?? resultColors.PENDENTE}>{dec?.decision}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderOfertas = () => {
    const filtered = (d?.offers ?? []).filter((o: any) =>
      !searchTerm || o?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o?.network?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return (
      <div className="space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#334155]">
                {['ID', 'Rede', 'Oferta', 'Vertical', 'Geo', 'Payout', 'Break-even CPC', 'Status', 'Resultado', 'Pág. Afiliado'].map(h => (
                  <th key={h} className="text-left p-3 text-slate-400 font-medium text-xs uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((o: any) => (
                <tr key={o.id} className="border-b border-[#334155]/50 hover:bg-[#334155]/30 transition-colors">
                  <td className="p-3 text-slate-300 font-mono text-xs">{o.offerId}</td>
                  <td className={`p-3 font-medium ${networkColors[o.network] ?? 'text-slate-300'}`}>{o.network}</td>
                  <td className="p-3 text-white font-medium">{o.name}</td>
                  <td className="p-3 text-slate-300">{o.vertical}</td>
                  <td className="p-3 text-slate-300">{o.geoAllowed}</td>
                  <td className="p-3 text-green-400 font-mono">{o.payoutCommission}</td>
                  <td className="p-3 text-yellow-400 font-mono">${o.breakevenCpc?.toFixed(2)}</td>
                  <td className="p-3"><Badge variant="outline" className="border-[#334155] text-slate-300">{o.status}</Badge></td>
                  <td className="p-3"><Badge className={resultColors[o.result] ?? resultColors.PENDENTE}>{o.result ?? 'N/A'}</Badge></td>
                  <td className="p-3">
                    {(() => {
                      const mkUrl = affiliateMarketplaceUrl(o.network, o.name);
                      return (
                        <div className="flex items-center gap-2">
                          {mkUrl && (
                            <a href={mkUrl} target="_blank" rel="noopener" title="Página de afiliado no marketplace ClickBank" className="text-purple-400 hover:text-purple-300 flex items-center gap-1 text-xs">
                              <ExternalLink className="h-3.5 w-3.5" /> Marketplace
                            </a>
                          )}
                          {o.hopLink && (
                            <a href={o.hopLink} target="_blank" rel="noopener" title="HopLink de afiliado" className="text-blue-400 hover:text-blue-300 text-xs">hop</a>
                          )}
                          {!mkUrl && !o.hopLink && <span className="text-slate-600 text-xs">—</span>}
                        </div>
                      );
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-500 mt-2">{filtered.length} oferta(s) encontrada(s)</p>
      </div>
    );
  };

  const renderCampanhas = () => {
    const filtered = (d?.campaigns ?? []).filter((c: any) =>
      !searchTerm || c?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#334155]">
              {['Campanha', 'Tipo', 'Plataforma', 'Geo', 'Orç/dia', 'CPC Máx', 'UTM', 'Status', 'Loop'].map(h => (
                <th key={h} className="text-left p-3 text-slate-400 font-medium text-xs uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((c: any) => (
              <tr key={c.id} className="border-b border-[#334155]/50 hover:bg-[#334155]/30 transition-colors">
                <td className="p-3 text-white font-medium text-xs">{c.googleCampaignName || c.name}</td>
                <td className="p-3 text-slate-300">{c.campaignType ?? c.channel}</td>
                <td className={`p-3 font-medium ${networkColors[c.platform] ?? 'text-slate-300'}`}>{c.platform}</td>
                <td className="p-3 text-slate-300">{c.geo}</td>
                <td className="p-3 text-yellow-400 font-mono">${c.budgetDaily ?? 0}</td>
                <td className="p-3 text-slate-300 font-mono text-xs">{c.cpcMax > 0 ? `$${Number(c.cpcMax).toFixed(2)}` : '-'}</td>
                <td className="p-3 text-slate-400 font-mono text-xs">{c.utmCampaign ?? '-'}</td>
                <td className="p-3"><Badge className={resultColors[c.status] ?? 'bg-slate-500/20 text-slate-400'}>{c.status}</Badge></td>
                <td className="p-3 text-slate-300 text-xs">{c.loopEnabled ? `✓ ${c.loopInterval}` : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderDiario = () => {
    const filtered = (d?.dailyLogs ?? []).filter((l: any) =>
      !searchTerm || l?.campaign?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l?.offerName?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#334155]">
              {['Data', 'Campanha', 'Rede', 'Impr.', 'Cliques', 'CPC', 'Gasto', 'Conv.', 'Receita', 'EPC', 'ROAS', 'Decisão'].map(h => (
                <th key={h} className="text-left p-3 text-slate-400 font-medium text-xs uppercase whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((l: any) => {
              const epc = l.clicks > 0 ? l.revenue / l.clicks : 0;
              const cpc = l.clicks > 0 ? l.spend / l.clicks : 0;
              const roas = l.spend > 0 ? l.revenue / l.spend : 0;
              return (
                <tr key={l.id} className="border-b border-[#334155]/50 hover:bg-[#334155]/30 transition-colors">
                  <td className="p-3 text-slate-300 font-mono text-xs whitespace-nowrap">{new Date(l.logDate).toLocaleDateString('en-US', { timeZone: 'UTC' })}</td>
                  <td className="p-3 text-white font-medium text-xs">{l?.campaign?.name ?? 'N/A'}</td>
                  <td className={`p-3 ${networkColors[l.network ?? ''] ?? 'text-slate-300'}`}>{l.network ?? '-'}</td>
                  <td className="p-3 text-slate-300 font-mono">{l.impressions?.toLocaleString('en-US') ?? 0}</td>
                  <td className="p-3 text-slate-300 font-mono">{l.clicks}</td>
                  <td className="p-3 text-slate-300 font-mono">${cpc.toFixed(2)}</td>
                  <td className="p-3 text-red-400 font-mono">${l.spend?.toFixed(2)}</td>
                  <td className="p-3 text-slate-300 font-mono">{l.conversions}</td>
                  <td className="p-3 text-green-400 font-mono">${l.revenue?.toFixed(2)}</td>
                  <td className={`p-3 font-mono ${epc > cpc ? 'text-green-400' : 'text-red-400'}`}>${epc.toFixed(3)}</td>
                  <td className={`p-3 font-mono ${roas >= 1 ? 'text-green-400' : 'text-red-400'}`}>{roas.toFixed(2)}x</td>
                  <td className="p-3">
                    {l.decision && <Badge className={resultColors[l.decision] ?? resultColors.PENDENTE}>{l.decision}</Badge>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const renderTestes = () => {
    const filtered = (d?.testResults ?? []).filter((t: any) =>
      !searchTerm || t?.offerName?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return (
      <div className="space-y-4">
        {filtered.map((t: any) => (
          <Card key={t.id} className="bg-[#1e293b] border-[#334155]">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-bold">{t.testId}</span>
                    <Badge className={resultColors[t.result] ?? resultColors.PENDENTE}>{t.result}</Badge>
                  </div>
                  <p className={`text-sm ${networkColors[t.network] ?? 'text-slate-300'}`}>{t.network} — {t.offerName}</p>
                </div>
                <div className="text-right text-xs text-slate-400">
                  {t.startDate && <p>{new Date(t.startDate).toLocaleDateString('en-US', { timeZone: 'UTC' })}</p>}
                  {t.endDate && <p>→ {new Date(t.endDate).toLocaleDateString('en-US', { timeZone: 'UTC' })}</p>}
                </div>
              </div>
              <p className="text-slate-400 text-sm mb-3 italic">"{t.hypothesis}"</p>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                {[
                  { label: 'Orçamento', value: '$' + (t.budgetTest ?? 0).toFixed(0), color: 'text-slate-300' },
                  { label: 'Gasto Real', value: '$' + (t.actualSpend ?? 0).toFixed(2), color: 'text-red-400' },
                  { label: 'Conv.', value: t.conversions ?? 0, color: t.conversions > 0 ? 'text-green-400' : 'text-red-400' },
                  { label: 'Receita', value: '$' + (t.revenue ?? 0).toFixed(2), color: 'text-green-400' },
                  { label: 'EPC', value: '$' + (t.epc ?? 0).toFixed(3), color: (t.epc ?? 0) > (t.avgCpc ?? 0) ? 'text-green-400' : 'text-red-400' },
                  { label: 'CPC Médio', value: '$' + (t.avgCpc ?? 0).toFixed(2), color: 'text-yellow-400' },
                  { label: 'BE CPC', value: '$' + (t.breakevenCpc ?? 0).toFixed(2), color: 'text-slate-300' },
                ].map(m => (
                  <div key={m.label} className="bg-[#0f172a] p-2 rounded text-center">
                    <p className="text-xs text-slate-500">{m.label}</p>
                    <p className={`font-mono font-bold ${m.color}`}>{m.value}</p>
                  </div>
                ))}
              </div>
              {(t.nextStep || t.learning) && (
                <div className="mt-3 pt-3 border-t border-[#334155] grid grid-cols-1 md:grid-cols-2 gap-2">
                  {t.nextStep && <p className="text-sm"><span className="text-slate-400">Próximo passo:</span> <span className="text-white">{t.nextStep}</span></p>}
                  {t.learning && <p className="text-sm"><span className="text-slate-400">Aprendizado:</span> <span className="text-cyan-300">{t.learning}</span></p>}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        <p className="text-xs text-slate-500 mt-2">
          Regra prática: SCALE se EPC {'>'} 1.3 × CPC após cliques mínimos. KILL se sem conversão e gasto {'>'} orçamento. OTIMIZAR se no meio.
        </p>
      </div>
    );
  };

  const renderKeywords = () => {
    const positives = (d?.keywords ?? []).filter((k: any) => k.status !== 'negativa');
    const negatives = (d?.keywords ?? []).filter((k: any) => k.status === 'negativa');
    const filtered = searchTerm
      ? [...positives, ...negatives].filter((k: any) => k.keyword?.toLowerCase().includes(searchTerm.toLowerCase()))
      : null;
    const items = filtered ?? positives;
    return (
      <div className="space-y-6">
        <Card className="bg-[#1e293b] border-[#334155]">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-white">Keywords Ativas ({positives.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#334155]">
                    {['Keyword', 'Camada', 'Match', 'CPC Est.', 'Campanha', 'Status'].map(h => (
                      <th key={h} className="text-left p-3 text-slate-400 font-medium text-xs uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(filtered ?? positives).filter((k: any) => k.status !== 'negativa').map((k: any) => (
                    <tr key={k.id} className="border-b border-[#334155]/50 hover:bg-[#334155]/30">
                      <td className="p-3 text-white font-medium">{k.keyword}</td>
                      <td className="p-3"><Badge variant="outline" className="border-[#334155]">{k.layer}</Badge></td>
                      <td className="p-3 text-slate-300">{k.matchType}</td>
                      <td className="p-3 text-yellow-400 font-mono">${k.cpcEstimate?.toFixed(2)}</td>
                      <td className="p-3 text-slate-400 text-xs">{k.campaign?.name ?? 'Global'}</td>
                      <td className="p-3"><Badge className="bg-green-500/20 text-green-400">Ativa</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#1e293b] border-[#334155]">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-red-400">Negativas ({negatives.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {(filtered ?? negatives).filter((k: any) => k.status === 'negativa').map((k: any) => (
                <Badge key={k.id} variant="outline" className="border-red-500/30 text-red-400 font-mono">
                  [{k.matchType}] {k.keyword}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderFinanceiro = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: 'Gasto Total', value: fin?.totalSpend ?? 0, color: 'text-red-400', prefix: '$' },
          { label: 'Receita Bruta', value: fin?.totalRevenue ?? 0, color: 'text-green-400', prefix: '$' },
          { label: 'Refunds/Clawback', value: fin?.totalRefunds ?? 0, color: 'text-orange-400', prefix: '$' },
          { label: 'Receita Líquida', value: fin?.netRevenue ?? 0, color: 'text-green-300', prefix: '$' },
          { label: 'Lucro', value: fin?.profit ?? 0, color: (fin?.profit ?? 0) >= 0 ? 'text-green-400' : 'text-red-400', prefix: '$' },
          { label: 'ROAS', value: fin?.roas ?? 0, color: 'text-blue-400', prefix: '', suffix: 'x' },
        ].map(m => (
          <Card key={m.label} className="bg-[#1e293b] border-[#334155]">
            <CardContent className="p-5">
              <p className="text-sm text-slate-400">{m.label}</p>
              <p className={`text-2xl font-bold font-mono ${m.color}`}>
                {m.prefix}{typeof m.value === 'number' ? m.value.toFixed(2) : m.value}{m.suffix ?? ''}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Per-platform breakdown */}
      <Card className="bg-[#1e293b] border-[#334155]">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-white">Breakdown por Plataforma</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#334155]">
                  {['Plataforma', 'Gasto', 'Receita', 'Lucro', 'ROAS'].map(h => (
                    <th key={h} className="text-left p-3 text-slate-400 font-medium text-xs uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const platformMap: Record<string, { spend: number; revenue: number }> = {};
                  for (const log of d?.dailyLogs ?? []) {
                    const net = log?.network ?? 'Outro';
                    if (!platformMap[net]) platformMap[net] = { spend: 0, revenue: 0 };
                    platformMap[net].spend += log?.spend ?? 0;
                    platformMap[net].revenue += log?.revenue ?? 0;
                  }
                  return Object.entries(platformMap).map(([plat, info]) => {
                    const profit = info.revenue - info.spend;
                    const roas = info.spend > 0 ? info.revenue / info.spend : 0;
                    return (
                      <tr key={plat} className="border-b border-[#334155]/50">
                        <td className={`p-3 font-medium ${networkColors[plat] ?? 'text-slate-300'}`}>{plat}</td>
                        <td className="p-3 text-red-400 font-mono">${info.spend.toFixed(2)}</td>
                        <td className="p-3 text-green-400 font-mono">${info.revenue.toFixed(2)}</td>
                        <td className={`p-3 font-mono ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>${profit.toFixed(2)}</td>
                        <td className={`p-3 font-mono ${roas >= 1 ? 'text-green-400' : 'text-red-400'}`}>{roas.toFixed(2)}x</td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderSemanal = () => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#334155]">
            {['Semana', 'Impressões', 'Cliques', 'CTR', 'Gasto', 'Conversões', 'Receita', 'EPC', 'CPC', 'ROAS'].map(h => (
              <th key={h} className="text-left p-3 text-slate-400 font-medium text-xs uppercase whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(d?.weeklyMetrics ?? []).map((w: any) => (
            <tr key={w.week} className="border-b border-[#334155]/50 hover:bg-[#334155]/30">
              <td className="p-3 text-white font-mono text-xs">{w.week}</td>
              <td className="p-3 text-slate-300 font-mono">{w.impressions?.toLocaleString('en-US')}</td>
              <td className="p-3 text-slate-300 font-mono">{w.clicks}</td>
              <td className="p-3 text-slate-300 font-mono">{w.ctr?.toFixed(2)}%</td>
              <td className="p-3 text-red-400 font-mono">${w.spend?.toFixed(2)}</td>
              <td className="p-3 text-slate-300 font-mono">{w.conversions}</td>
              <td className="p-3 text-green-400 font-mono">${w.revenue?.toFixed(2)}</td>
              <td className={`p-3 font-mono ${w.epc > w.cpc ? 'text-green-400' : 'text-red-400'}`}>${w.epc?.toFixed(3)}</td>
              <td className="p-3 text-yellow-400 font-mono">${w.cpc?.toFixed(2)}</td>
              <td className={`p-3 font-mono ${w.roas >= 1 ? 'text-green-400' : 'text-red-400'}`}>{w.roas?.toFixed(2)}x</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return renderDashboard();
      case 'ofertas': return renderOfertas();
      case 'campanhas': return renderCampanhas();
      case 'diario': return renderDiario();
      case 'testes': return renderTestes();
      case 'keywords': return renderKeywords();
      case 'financeiro': return renderFinanceiro();
      case 'semanal': return renderSemanal();
      default: return renderDashboard();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white tracking-tight">Planilhas de Acompanhamento</h1>
          <p className="text-slate-400 text-sm mt-1">Dados consolidados das planilhas de tracking integrados ao sistema</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10 bg-[#1e293b] border-[#334155] text-white"
          />
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex flex-wrap gap-2">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setActiveTab(tab.id); setSearchTerm(''); }}
              className={activeTab === tab.id
                ? 'bg-green-600 hover:bg-green-700 text-white gap-1.5'
                : 'border-[#334155] text-slate-400 hover:text-white hover:bg-[#334155] gap-1.5'
              }
            >
              <Icon className="h-3.5 w-3.5" /> {tab.label}
            </Button>
          );
        })}
      </div>

      {/* Content */}
      <Card className="bg-[#1e293b] border-[#334155]">
        <CardContent className="p-6">
          {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
}
