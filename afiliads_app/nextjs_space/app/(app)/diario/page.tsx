'use client';
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarDays, Save, TrendingUp, TrendingDown, Minus } from 'lucide-react';
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
  const healthStatus = profit > 0 ? 'LUCRATIVO' : profit === 0 ? 'NO BREAK-EVEN' : 'PREJUÍZO';
  const healthColor = profit > 0 ? 'text-green-400' : profit === 0 ? 'text-yellow-400' : 'text-red-400';
  const healthPct = totalSpend > 0 ? ((profit / totalSpend) * 100) : 0;

  const inputCls = "bg-[#0f172a] border-[#334155] text-white placeholder:text-slate-500";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-white tracking-tight flex items-center gap-2">
          <CalendarDays className="h-6 w-6 text-blue-400" /> Diário de Acompanhamento
        </h1>
        <p className="text-slate-400 text-sm mt-1">Registre e acompanhe a performance diária</p>
      </div>

      {/* Campaign selector */}
      <div className="flex gap-4 flex-wrap">
        <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
          <SelectTrigger className={`w-80 ${inputCls}`}><SelectValue placeholder="Selecione uma campanha" /></SelectTrigger>
          <SelectContent className="bg-[#1e293b] border-[#334155]">
            {(campaigns ?? []).map((c: any) => <SelectItem key={c?.id} value={c?.id} className="text-white">{c?.name} ({c?.platform})</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className={`w-36 ${inputCls}`}><SelectValue /></SelectTrigger>
          <SelectContent className="bg-[#1e293b] border-[#334155]">
            <SelectItem value="7" className="text-white">Últimos 7 dias</SelectItem>
            <SelectItem value="14" className="text-white">Últimos 14 dias</SelectItem>
            <SelectItem value="30" className="text-white">Últimos 30 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {selectedCampaign && (
        <>
          {/* Health indicator */}
          <Card className="bg-[#1e293b] border-[#334155]">
            <CardContent className="p-5 flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                {profit > 0 ? <TrendingUp className="h-6 w-6 text-green-400" /> : profit < 0 ? <TrendingDown className="h-6 w-6 text-red-400" /> : <Minus className="h-6 w-6 text-yellow-400" />}
                <div>
                  <span className={`text-lg font-bold ${healthColor}`}>{healthStatus}</span>
                  <p className="text-xs text-slate-400">Lucro: ${profit?.toFixed?.(2)} ({healthPct?.toFixed?.(1)}%)</p>
                </div>
              </div>
              <div className="flex gap-6 text-sm">
                <div><span className="text-slate-400">Gasto:</span> <span className="text-white font-mono">${totalSpend?.toFixed?.(2)}</span></div>
                <div><span className="text-slate-400">Receita:</span> <span className="text-green-400 font-mono">${totalRevenue?.toFixed?.(2)}</span></div>
                {campaign && <div><span className="text-slate-400">BE:</span> <span className="text-yellow-400 font-mono">${campaign?.epcBreakeven?.toFixed?.(4)}</span></div>}
              </div>
            </CardContent>
          </Card>

          {/* Form */}
          <Card className="bg-[#1e293b] border-[#334155]">
            <CardHeader className="pb-3"><CardTitle className="text-base text-white">Registrar Dados</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                <div><Label className="text-slate-300 text-xs">Data</Label><Input type="date" value={logDate} onChange={(e:any) => setLogDate(e?.target?.value ?? '')} className={inputCls} /></div>
                <div><Label className="text-slate-300 text-xs">Gasto (USD)</Label><Input type="number" value={spend} onChange={(e:any) => setSpend(e?.target?.value ?? '')} placeholder="0.00" className={inputCls} /></div>
                <div><Label className="text-slate-300 text-xs">Cliques</Label><Input type="number" value={clicks} onChange={(e:any) => setClicks(e?.target?.value ?? '')} placeholder="0" className={inputCls} /></div>
                <div><Label className="text-slate-300 text-xs">Impressões</Label><Input type="number" value={impressions} onChange={(e:any) => setImpressions(e?.target?.value ?? '')} placeholder="0" className={inputCls} /></div>
                <div><Label className="text-slate-300 text-xs">Hops (cliques no hoplink)</Label><Input type="number" value={hops} onChange={(e:any) => setHops(e?.target?.value ?? '')} placeholder="0" className={inputCls} /></div>
                <div><Label className="text-slate-300 text-xs">Conv.</Label><Input type="number" value={conversions} onChange={(e:any) => setConversions(e?.target?.value ?? '')} placeholder="0" className={inputCls} /></div>
                <div><Label className="text-slate-300 text-xs">Receita (USD)</Label><Input type="number" value={revenue} onChange={(e:any) => setRevenue(e?.target?.value ?? '')} placeholder="0.00" className={inputCls} /></div>
                <div className="flex items-end"><Button onClick={handleSave} loading={saving} className="bg-green-600 hover:bg-green-700 text-white w-full gap-1"><Save className="h-3 w-3" /> Salvar</Button></div>
              </div>
              <div className="mt-3"><Input value={notes} onChange={(e:any) => setNotes(e?.target?.value ?? '')} placeholder="Notas do dia (opcional)" className={inputCls} /></div>
            </CardContent>
          </Card>

          {/* Charts */}
          <DailyCharts logs={filteredLogs} breakeven={campaign?.epcBreakeven ?? 0} />

          {/* Log history */}
          <Card className="bg-[#1e293b] border-[#334155]">
            <CardHeader className="pb-3"><CardTitle className="text-base text-white">Histórico</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-[#334155] text-slate-400 text-xs">
                    <th className="text-left py-2">Data</th><th className="text-right">Gasto</th><th className="text-right">Cliques</th>
                    <th className="text-right">Conv.</th><th className="text-right">Receita</th><th className="text-right">EPC</th><th className="text-right">CPC</th><th className="text-left">Notas</th>
                  </tr></thead>
                  <tbody>
                    {filteredLogs.map((log: any) => {
                      const epc = (log?.clicks ?? 0) > 0 ? (log?.revenue ?? 0) / log.clicks : 0;
                      const cpc = (log?.clicks ?? 0) > 0 ? (log?.spend ?? 0) / log.clicks : 0;
                      return (
                        <tr key={log?.id} className="border-b border-[#334155]/50 hover:bg-[#0f172a]/50">
                          <td className="py-2 text-white">{new Date(log?.logDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                          <td className="text-right text-white font-mono">${(log?.spend ?? 0)?.toFixed?.(2)}</td>
                          <td className="text-right text-white font-mono">{log?.clicks ?? 0}</td>
                          <td className="text-right text-white font-mono">{log?.conversions ?? 0}</td>
                          <td className="text-right text-green-400 font-mono">${(log?.revenue ?? 0)?.toFixed?.(2)}</td>
                          <td className="text-right text-white font-mono">${epc?.toFixed?.(3)}</td>
                          <td className="text-right text-white font-mono">${cpc?.toFixed?.(3)}</td>
                          <td className="text-slate-400 text-xs max-w-[150px] truncate">{log?.notes ?? ''}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {filteredLogs.length === 0 && <p className="text-center text-slate-500 py-8">Sem registros</p>}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
