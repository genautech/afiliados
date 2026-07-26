'use client';
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatCard, StatGrid } from '@/components/ui/stat-card';
import { CalendarDays, Save, TrendingUp, TrendingDown, Minus, DollarSign, Target } from 'lucide-react';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';

const DailyCharts = dynamic(() => import('@/components/daily-charts'), { ssr: false, loading: () => <div className="h-64 bg-[#1e293b] rounded-lg animate-pulse" /> });

export default function DiarioPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState('30');

  // Form
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [spend, setSpend] = useState('');
  const [impressions, setImpressions] = useState('');
  const [clicks, setClicks] = useState('');
  const [hops, setHops] = useState('');
  const [conversions, setConversions] = useState('');
  const [revenue, setRevenue] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/campaigns').then(r => r.json()).then(d => setCampaigns(d ?? [])).catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedCampaign) return;
    setLoading(true);
    fetch(`/api/daily-logs?campaignId=${selectedCampaign}`)
      .then(r => r.json())
      .then(d => setLogs(d ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedCampaign]);

  const handleSave = async () => {
    if (!selectedCampaign) { toast.error('Selecione uma campanha'); return; }
    setSaving(true);
    try {
      await fetch('/api/daily-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: selectedCampaign,
          logDate,
          spend: parseFloat(spend) || 0,
          impressions: parseInt(impressions) || 0,
          clicks: parseInt(clicks) || 0,
          hops: parseInt(hops) || 0,
          conversions: parseInt(conversions) || 0,
          revenue: parseFloat(revenue) || 0,
          notes: notes || null,
        }),
      });
      toast.success('Dados salvos!');
      // Reload
      const d = await fetch(`/api/daily-logs?campaignId=${selectedCampaign}`).then(r => r.json());
      setLogs(d ?? []);
      setSpend(''); setImpressions(''); setClicks(''); setHops(''); setConversions(''); setRevenue(''); setNotes('');
    } catch { toast.error('Erro ao salvar'); } finally { setSaving(false); }
  };

  const campaign = campaigns.find((c: any) => c?.id === selectedCampaign);
  const filteredLogs = (logs ?? []).slice(0, parseInt(period) || 30);
  const totalSpend = filteredLogs.reduce((s: number, l: any) => s + (l?.spend ?? 0), 0);
  const totalRevenue = filteredLogs.reduce((s: number, l: any) => s + (l?.revenue ?? 0), 0);
  const profit = totalRevenue - totalSpend;
  const healthStatus = profit > 0 ? 'LUCRATIVO' : profit === 0 ? 'BREAK-EVEN' : 'PREJUÍZO';
  const healthPct = totalSpend > 0 ? ((profit / totalSpend) * 100) : 0;

  const inputCls = "bg-[#0f172a] border-[#334155] text-white placeholder:text-slate-500";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-display font-bold text-white tracking-tight flex items-center gap-2">
          <CalendarDays className="h-6 w-6 text-blue-400" /> Diário de Acompanhamento
        </h1>
        <p className="text-slate-400 text-sm mt-1">Registre e acompanhe a performance diária</p>
      </div>

      {/* Campaign selector */}
      <div className="flex gap-4 flex-wrap">
        <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
          <SelectTrigger className={`w-full sm:w-96 ${inputCls}`}><SelectValue placeholder="Selecione uma campanha" /></SelectTrigger>
          <SelectContent className="bg-[#1e293b] border-[#334155]">
            {(campaigns ?? []).map((c: any) => <SelectItem key={c?.id} value={c?.id} className="text-white">{c?.name} ({c?.platform})</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className={`w-full sm:w-44 ${inputCls}`}><SelectValue /></SelectTrigger>
          <SelectContent className="bg-[#1e293b] border-[#334155]">
            <SelectItem value="7" className="text-white">Últimos 7 dias</SelectItem>
            <SelectItem value="14" className="text-white">Últimos 14 dias</SelectItem>
            <SelectItem value="30" className="text-white">Últimos 30 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {selectedCampaign && (
        <>
          {/* Health / period KPIs */}
          <StatGrid cols={4}>
            <StatCard
              label="Saúde do período"
              value={healthStatus}
              hint={`Lucro ${healthPct?.toFixed?.(1)}% sobre o gasto`}
              tone={profit > 0 ? 'positive' : profit < 0 ? 'negative' : 'warning'}
              icon={profit > 0 ? <TrendingUp className="h-5 w-5" /> : profit < 0 ? <TrendingDown className="h-5 w-5" /> : <Minus className="h-5 w-5" />}
            />
            <StatCard
              label="Gasto"
              value={`$${totalSpend?.toFixed?.(2)}`}
              hint={`Últimos ${period} dias`}
              tone="negative"
              icon={<DollarSign className="h-5 w-5" />}
            />
            <StatCard
              label="Receita"
              value={`$${totalRevenue?.toFixed?.(2)}`}
              hint={`Lucro $${profit?.toFixed?.(2)}`}
              tone="positive"
              icon={<TrendingUp className="h-5 w-5" />}
            />
            <StatCard
              label="EPC Break-even"
              value={`$${campaign?.epcBreakeven?.toFixed?.(4) ?? '0.0000'}`}
              hint="Meta mínima por clique"
              tone="warning"
              icon={<Target className="h-5 w-5" />}
            />
          </StatGrid>

          {/* Form */}
          <Card className="bg-[#1e293b] border-[#334155]">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-white">Registrar Dados do Dia</CardTitle>
              <p className="text-sm text-slate-400">Preencha as métricas para manter o acompanhamento atualizado</p>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1.5"><Label className="text-slate-300 text-sm">Data</Label><Input type="date" value={logDate} onChange={(e:any) => setLogDate(e?.target?.value ?? '')} className={inputCls} /></div>
                <div className="space-y-1.5"><Label className="text-slate-300 text-sm">Gasto (USD)</Label><Input type="number" value={spend} onChange={(e:any) => setSpend(e?.target?.value ?? '')} placeholder="0.00" className={inputCls} /></div>
                <div className="space-y-1.5"><Label className="text-slate-300 text-sm">Cliques</Label><Input type="number" value={clicks} onChange={(e:any) => setClicks(e?.target?.value ?? '')} placeholder="0" className={inputCls} /></div>
                <div className="space-y-1.5"><Label className="text-slate-300 text-sm">Impressões</Label><Input type="number" value={impressions} onChange={(e:any) => setImpressions(e?.target?.value ?? '')} placeholder="0" className={inputCls} /></div>
                <div className="space-y-1.5"><Label className="text-slate-300 text-sm">Hops (hoplink)</Label><Input type="number" value={hops} onChange={(e:any) => setHops(e?.target?.value ?? '')} placeholder="0" className={inputCls} /></div>
                <div className="space-y-1.5"><Label className="text-slate-300 text-sm">Conversões</Label><Input type="number" value={conversions} onChange={(e:any) => setConversions(e?.target?.value ?? '')} placeholder="0" className={inputCls} /></div>
                <div className="space-y-1.5"><Label className="text-slate-300 text-sm">Receita (USD)</Label><Input type="number" value={revenue} onChange={(e:any) => setRevenue(e?.target?.value ?? '')} placeholder="0.00" className={inputCls} /></div>
                <div className="flex items-end"><Button onClick={handleSave} loading={saving} className="bg-green-600 hover:bg-green-700 text-white w-full h-10 gap-2"><Save className="h-4 w-4" /> Salvar dia</Button></div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">Notas</Label>
                <Input value={notes} onChange={(e:any) => setNotes(e?.target?.value ?? '')} placeholder="Observações do dia (opcional)" className={inputCls} />
              </div>
            </CardContent>
          </Card>

          {/* Charts */}
          <DailyCharts logs={filteredLogs} breakeven={campaign?.epcBreakeven ?? 0} />

          {/* Log history */}
          <Card className="bg-[#1e293b] border-[#334155]">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-white">Histórico diário</CardTitle>
              <p className="text-sm text-slate-400">Linha a linha do período selecionado</p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-sm min-w-[720px]">
                  <thead>
                    <tr className="border-b border-[#334155] text-slate-400 text-xs uppercase tracking-wide">
                      <th className="text-left py-3 px-2">Data</th>
                      <th className="text-right py-3 px-2">Gasto</th>
                      <th className="text-right py-3 px-2">Cliques</th>
                      <th className="text-right py-3 px-2">Conv.</th>
                      <th className="text-right py-3 px-2">Receita</th>
                      <th className="text-right py-3 px-2">EPC</th>
                      <th className="text-right py-3 px-2">CPC</th>
                      <th className="text-left py-3 px-2">Notas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((log: any) => {
                      const epc = (log?.clicks ?? 0) > 0 ? (log?.revenue ?? 0) / log.clicks : 0;
                      const cpc = (log?.clicks ?? 0) > 0 ? (log?.spend ?? 0) / log.clicks : 0;
                      return (
                        <tr key={log?.id} className="border-b border-[#334155]/50 hover:bg-[#0f172a]/50">
                          <td className="py-3.5 px-2 text-white font-medium">{new Date(log?.logDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                          <td className="py-3.5 px-2 text-right text-white font-mono">${(log?.spend ?? 0)?.toFixed?.(2)}</td>
                          <td className="py-3.5 px-2 text-right text-white font-mono">{log?.clicks ?? 0}</td>
                          <td className="py-3.5 px-2 text-right text-white font-mono">{log?.conversions ?? 0}</td>
                          <td className="py-3.5 px-2 text-right text-green-400 font-mono">${(log?.revenue ?? 0)?.toFixed?.(2)}</td>
                          <td className="py-3.5 px-2 text-right text-white font-mono">${epc?.toFixed?.(3)}</td>
                          <td className="py-3.5 px-2 text-right text-white font-mono">${cpc?.toFixed?.(3)}</td>
                          <td className="py-3.5 px-2 text-slate-400 text-sm max-w-[220px] truncate">{log?.notes ?? '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {filteredLogs.length === 0 && <p className="text-center text-slate-500 py-10">Sem registros</p>}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
