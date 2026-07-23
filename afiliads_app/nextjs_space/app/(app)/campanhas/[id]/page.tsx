'use client';
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { affiliateMarketplaceUrl } from '@/lib/marketplace';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { StatCard, StatGrid } from '@/components/ui/stat-card';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ArrowLeft, Shield, AlertTriangle, CheckCircle2, XCircle, Loader2,
  ExternalLink, TrendingUp, TrendingDown, Target, DollarSign,
  BarChart3, Zap, Eye, Copy, RefreshCw, Play, MousePointerClick
} from 'lucide-react';

const statusColors: Record<string, string> = {
  EM_TESTE: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  ATIVO: 'bg-green-500/20 text-green-400 border-green-500/30',
  OTIMIZANDO: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  SCALE: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  PAUSADO: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  KILL: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const statusLabels: Record<string, string> = {
  EM_TESTE: 'Em Teste', ATIVO: 'Ativo', OTIMIZANDO: 'Otimizando',
  SCALE: 'Scale', PAUSADO: 'Pausado', KILL: 'Kill',
};

interface AuditResult {
  audit_score: number;
  risk_level: string;
  categories: Array<{ name: string; score: number; status: string; items: Array<{ check: string; status: string; detail: string }> }>;
  blockers: string[];
  warnings: string[];
  recommendations: string[];
  ready_to_launch: boolean;
  summary: string;
}

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [campaign, setCampaign] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [auditing, setAuditing] = useState(false);
  const [audit, setAudit] = useState<AuditResult | null>(null);
  const [syncingGads, setSyncingGads] = useState(false);

  const runGadsSync = async (direction: 'pull' | 'push', customUpdates?: any) => {
    setSyncingGads(true);
    try {
      const res = await fetch('/api/google-ads/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: params?.id,
          direction,
          updates: customUpdates,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || 'Sincronização realizada com sucesso!');
        await fetchCampaign(); // Refresh campaign details
      } else {
        toast.error(data.error || 'Erro na sincronização com o Google Ads');
      }
    } catch {
      toast.error('Erro de rede ao sincronizar com Google Ads');
    } finally {
      setSyncingGads(false);
    }
  };

  const [loopEnabled, setLoopEnabled] = useState(false);
  const [loopInterval, setLoopInterval] = useState('24h');
  const [loopAgents, setLoopAgents] = useState('ads,compliance');
  const [savingLoop, setSavingLoop] = useState(false);
  const [executingLoop, setExecutingLoop] = useState(false);

  useEffect(() => {
    if (campaign) {
      setLoopEnabled(campaign.loopEnabled ?? false);
      setLoopInterval(campaign.loopInterval ?? '24h');
      setLoopAgents(campaign.loopAgents ?? 'ads,compliance');
    }
  }, [campaign]);

  const saveLoopConfig = async (enabled: boolean, interval: string, agents: string) => {
    setSavingLoop(true);
    try {
      const res = await fetch(`/api/campaigns/${params?.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loopEnabled: enabled,
          loopInterval: interval,
          loopAgents: agents,
        }),
      });
      if (res.ok) {
        toast.success('Automação do agente atualizada!');
        setCampaign((prev: any) => ({ ...prev, loopEnabled: enabled, loopInterval: interval, loopAgents: agents }));
      } else {
        toast.error('Erro ao salvar automação');
      }
    } catch {
      toast.error('Erro de rede');
    } finally {
      setSavingLoop(false);
    }
  };

  const runLoopAction = async () => {
    setExecutingLoop(true);
    try {
      const res = await fetch('/api/loop/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: params?.id }),
      });
      const data = await res.json();
      if (res.ok) {
        const tokens = data?.totalTokens >= 1000 ? `${(data.totalTokens / 1000).toFixed(1)}k` : data?.totalTokens;
        toast.success(`Loop: ${data?.decision} (${(data?.agentsRun ?? []).join(', ') || 'só regras'} · ${tokens} tokens)`);
        if (Array.isArray(data?.triggers) && data.triggers.length) {
          toast.info(data.triggers[0], { duration: 8000 });
        }
        await fetchCampaign(); // Refresh campaign details & decisions
      } else {
        toast.error(data?.error ?? 'Erro ao rodar loop de agentes');
      }
    } catch {
      toast.error('Erro de rede ao executar loop');
    } finally {
      setExecutingLoop(false);
    }
  };

  useEffect(() => {
    if (params?.id) fetchCampaign();
  }, [params?.id]);

  const fetchCampaign = async () => {
    try {
      const res = await fetch(`/api/campaigns/${params?.id}`);
      if (res.ok) {
        const data = await res.json();
        setCampaign(data);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const runAudit = async () => {
    setAuditing(true);
    try {
      const res = await fetch('/api/campaign-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: params?.id }),
      });
      if (res.ok) {
        const data = await res.json();
        setAudit(data);
        toast.success('Auditoria concluída!');
      } else {
        toast.error('Erro na auditoria');
      }
    } catch { toast.error('Erro na auditoria'); }
    finally { setAuditing(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-green-400" /></div>;
  if (!campaign) return <div className="text-center text-slate-400 py-20">Campanha não encontrada</div>;

  // Computed metrics
  const totalSpend = campaign.dailyLogs?.reduce((s: number, l: any) => s + (l.spend ?? 0), 0) ?? 0;
  const totalRevenue = campaign.dailyLogs?.reduce((s: number, l: any) => s + (l.revenue ?? 0), 0) ?? 0;
  const totalClicks = campaign.dailyLogs?.reduce((s: number, l: any) => s + (l.clicks ?? 0), 0) ?? 0;
  const totalConversions = campaign.dailyLogs?.reduce((s: number, l: any) => s + (l.conversions ?? 0), 0) ?? 0;
  const epc = totalClicks > 0 ? totalRevenue / totalClicks : 0;
  const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
  const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
  const profit = totalRevenue - totalSpend;

  // Checklist progress per step
  const checklistByStep: Record<number, { total: number; checked: number; criticalTotal: number; criticalChecked: number }> = {};
  (campaign.checklists ?? []).forEach((c: any) => {
    if (!checklistByStep[c.step]) checklistByStep[c.step] = { total: 0, checked: 0, criticalTotal: 0, criticalChecked: 0 };
    checklistByStep[c.step].total++;
    if (c.isChecked) checklistByStep[c.step].checked++;
    if (c.isCritical) {
      checklistByStep[c.step].criticalTotal++;
      if (c.isChecked) checklistByStep[c.step].criticalChecked++;
    }
  });

  const stepNames: Record<number, string> = { 3: 'Anti-strike', 4: 'Bridge', 7: 'Google Ads', 8: 'Tracking', 9: 'Go-live' };

  const totalCheckItems = campaign.checklists?.length ?? 0;
  const totalChecked = campaign.checklists?.filter((c: any) => c.isChecked)?.length ?? 0;
  const overallProgress = totalCheckItems > 0 ? Math.round((totalChecked / totalCheckItems) * 100) : 0;

  // Risk score (simple heuristic)
  const criticalUnchecked = campaign.checklists?.filter((c: any) => c.isCritical && !c.isChecked)?.length ?? 0;
  const riskScore = Math.max(0, 100 - (criticalUnchecked * 15) - (!campaign.presellUrl ? 10 : 0) - (!campaign.offerUrl ? 15 : 0));
  const riskLevel = riskScore >= 80 ? 'LOW' : riskScore >= 50 ? 'MEDIUM' : riskScore >= 30 ? 'HIGH' : 'CRITICAL';
  const riskColors: Record<string, string> = { LOW: 'text-green-400', MEDIUM: 'text-yellow-400', HIGH: 'text-orange-400', CRITICAL: 'text-red-400' };

  const copyText = (text: string) => { navigator?.clipboard?.writeText?.(text); toast.success('Copiado!'); };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push('/campanhas')} className="text-slate-400 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-display font-bold text-white">{campaign.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={statusColors[campaign.status] ?? 'bg-slate-500/20 text-slate-400'}>{statusLabels[campaign.status] ?? campaign.status}</Badge>
              <span className="text-xs text-slate-500">{campaign.platform} · {campaign.vertical} · {campaign.geo}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => runGadsSync('pull')}
            disabled={syncingGads}
            className="bg-slate-700 hover:bg-slate-600 text-white gap-2"
          >
            {syncingGads ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Sincronizar Google Ads
          </Button>
          <Button onClick={runAudit} disabled={auditing} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
            {auditing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
            {auditing ? 'Auditando...' : 'Auditoria IA'}
          </Button>
          <Link href={`/diario?campaign=${params?.id}`}>
            <Button variant="outline" className="border-[#334155] text-slate-300 gap-2">
              <BarChart3 className="h-4 w-4" /> Diário
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Cards */}
      <StatGrid cols={6}>
        <StatCard
          label="Gasto"
          value={`$${totalSpend.toFixed(2)}`}
          hint={`${totalClicks} cliques`}
          tone="negative"
          icon={<DollarSign className="h-5 w-5" />}
        />
        <StatCard
          label="Receita"
          value={`$${totalRevenue.toFixed(2)}`}
          hint={`${totalConversions} conversões`}
          tone="positive"
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatCard
          label="Lucro"
          value={`$${profit.toFixed(2)}`}
          hint={profit >= 0 ? 'No positivo' : 'No negativo'}
          tone={profit >= 0 ? 'positive' : 'negative'}
          icon={profit >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
        />
        <StatCard
          label="ROAS"
          value={`${roas.toFixed(2)}x`}
          hint="Receita ÷ gasto"
          tone={roas >= 1 ? 'positive' : 'negative'}
          icon={<Target className="h-5 w-5" />}
        />
        <StatCard
          label="EPC"
          value={`$${epc.toFixed(4)}`}
          hint="Receita por clique"
          tone="warning"
          icon={<MousePointerClick className="h-5 w-5" />}
        />
        <StatCard
          label="CPC"
          value={`$${cpc.toFixed(4)}`}
          hint="Custo por clique"
          tone="info"
          icon={<BarChart3 className="h-5 w-5" />}
        />
      </StatGrid>

      {/* EPC/CPC Indicator + Risk */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="bg-[#1e293b] border-[#334155]">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-300 flex items-center gap-2"><Target className="h-4 w-4" /> EPC vs CPC</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex items-center gap-4">
              <div className={`text-3xl font-bold font-mono ${epc > 0 && epc >= cpc * 1.3 ? 'text-green-400' : epc >= cpc ? 'text-yellow-400' : 'text-red-400'}`}>
                {epc > 0 ? (epc / (cpc || 1)).toFixed(2) : '—'}x
              </div>
              <div className="text-sm text-slate-400">
                {epc >= cpc * 1.3 ? '✅ Pronto para SCALE' : epc >= cpc ? '⚠️ Break-even — otimizar' : totalClicks > 0 ? '🚨 Abaixo do break-even' : 'Sem dados ainda'}
              </div>
            </div>
            <div className="mt-3 text-xs text-slate-500">
              Break-even: ${campaign.epcBreakeven?.toFixed(4) ?? '0'} | CPC Máx: ${campaign.cpcMax?.toFixed(4) ?? '0'} | CPC SCALE: ${campaign.cpcScale?.toFixed(4) ?? '0'}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1e293b] border-[#334155]">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-300 flex items-center gap-2"><Shield className="h-4 w-4" /> Risco de Bloqueio</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16">
                <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r="28" fill="none" stroke="#334155" strokeWidth="4" />
                  <circle cx="32" cy="32" r="28" fill="none" stroke={riskScore >= 80 ? '#22c55e' : riskScore >= 50 ? '#f59e0b' : '#ef4444'} strokeWidth="4" strokeDasharray={`${(riskScore / 100) * 175.9} 175.9`} strokeLinecap="round" />
                </svg>
                <span className={`absolute inset-0 flex items-center justify-center text-sm font-bold ${riskColors[riskLevel]}`}>{riskScore}</span>
              </div>
              <div>
                <Badge className={`${riskLevel === 'LOW' ? 'bg-green-500/20 text-green-400' : riskLevel === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>{riskLevel}</Badge>
                <p className="text-xs text-slate-500 mt-1">{criticalUnchecked} itens críticos pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1e293b] border-[#334155]">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-300 flex items-center gap-2"><Zap className="h-4 w-4" /> Progresso Geral</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16">
                <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r="28" fill="none" stroke="#334155" strokeWidth="4" />
                  <circle cx="32" cy="32" r="28" fill="none" stroke="#22c55e" strokeWidth="4" strokeDasharray={`${(overallProgress / 100) * 175.9} 175.9`} strokeLinecap="round" />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-green-400">{overallProgress}%</span>
              </div>
              <div>
                <p className="text-sm text-white">{totalChecked}/{totalCheckItems} itens</p>
                <p className="text-xs text-slate-500">Wizard step: {campaign.wizardStep}/9</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Checklist Progress per Step */}
      <Card className="bg-[#1e293b] border-[#334155]">
        <CardHeader><CardTitle className="text-white flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-green-400" /> Progresso dos Checklists</CardTitle></CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {Object.entries(stepNames).map(([stepNum, stepName]) => {
              const data = checklistByStep[parseInt(stepNum)];
              const pct = data ? Math.round((data.checked / data.total) * 100) : 0;
              const criticalOk = data ? data.criticalChecked === data.criticalTotal : true;
              return (
                <div key={stepNum} className="bg-[#0f172a] rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-white font-medium">{stepName}</span>
                    {criticalOk ? <CheckCircle2 className="h-4 w-4 text-green-400" /> : <AlertTriangle className="h-4 w-4 text-red-400" />}
                  </div>
                  <Progress value={pct} className="h-2 bg-[#334155] mb-1" />
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">{data?.checked ?? 0}/{data?.total ?? 0}</span>
                    <span className={criticalOk ? 'text-green-400' : 'text-red-400'}>
                      {criticalOk ? 'Críticos OK' : `${(data?.criticalTotal ?? 0) - (data?.criticalChecked ?? 0)} críticos`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Campaign Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-[#1e293b] border-[#334155]">
          <CardHeader><CardTitle className="text-white text-sm">Dados da Campanha</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0 space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-slate-400">Plataforma:</span> <span className="text-white">{campaign.platform}</span></div>
              <div><span className="text-slate-400">Vertical:</span> <span className="text-white">{campaign.vertical}</span></div>
              <div><span className="text-slate-400">Geo:</span> <span className="text-white">{campaign.geo}</span></div>
              <div><span className="text-slate-400">Canal:</span> <span className="text-white">{campaign.channel}</span></div>
              <div><span className="text-slate-400">Funil:</span> <span className="text-white">{campaign.funnel}</span></div>
              <div><span className="text-slate-400">AOV:</span> <span className="text-white">${campaign.aov}</span></div>
              <div><span className="text-slate-400">Comissão:</span> <span className="text-green-400">${campaign.commission}</span></div>
              <div><span className="text-slate-400">Refund:</span> <span className="text-white">{campaign.refundPct}%</span></div>
              <div><span className="text-slate-400">Budget teste:</span> <span className="text-white">${campaign.budgetTest}</span></div>
              <div><span className="text-slate-400">Budget diário:</span> <span className="text-white">${campaign.budgetDaily?.toFixed(2)}/dia</span></div>
            </div>
            {campaign.offerUrl && (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-slate-400">Oferta:</span>
                <span className="text-xs text-blue-400 truncate flex-1 cursor-pointer hover:underline" onClick={() => window.open(campaign.offerUrl, '_blank')}>{campaign.offerUrl}</span>
                <button onClick={() => copyText(campaign.offerUrl)} className="text-slate-500 hover:text-white shrink-0"><Copy className="h-3 w-3" /></button>
              </div>
            )}
            {!campaign.name?.includes('_') && affiliateMarketplaceUrl(campaign.platform, campaign.name) && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Marketplace:</span>
                <span className="text-xs text-purple-400 truncate flex-1 cursor-pointer hover:underline" onClick={() => window.open(affiliateMarketplaceUrl(campaign.platform, campaign.name)!, '_blank')}>Página de afiliado no ClickBank</span>
                <ExternalLink className="h-3 w-3 text-slate-500 shrink-0" />
              </div>
            )}
            {campaign.presellUrl && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Pré-sell:</span>
                <span className="text-xs text-blue-400 truncate flex-1 cursor-pointer hover:underline" onClick={() => window.open(campaign.presellUrl, '_blank')}>{campaign.presellUrl}</span>
                <ExternalLink className="h-3 w-3 text-slate-500 shrink-0" />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-[#1e293b] border-[#334155]">
          <CardHeader><CardTitle className="text-white text-sm">Naming & Tracking</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0 space-y-3">
            {campaign.campaignNameGenerated && (
              <div className="bg-[#0f172a] rounded-lg p-3">
                <p className="text-xs text-slate-400 mb-1">Nome da Campanha</p>
                <div className="flex items-center gap-2">
                  <code className="text-green-400 font-mono text-sm">{campaign.campaignNameGenerated}</code>
                  <button onClick={() => copyText(campaign.campaignNameGenerated)} className="text-slate-500 hover:text-white"><Copy className="h-3 w-3" /></button>
                </div>
              </div>
            )}
            {campaign.utmString && (
              <div className="bg-[#0f172a] rounded-lg p-3">
                <p className="text-xs text-slate-400 mb-1">UTM</p>
                <div className="flex items-center gap-2">
                  <code className="text-blue-400 font-mono text-xs break-all">{campaign.utmString}</code>
                  <button onClick={() => copyText(campaign.utmString)} className="text-slate-500 hover:text-white shrink-0"><Copy className="h-3 w-3" /></button>
                </div>
              </div>
            )}
            {campaign.postbackUrl && (
              <div className="bg-[#0f172a] rounded-lg p-3">
                <p className="text-xs text-slate-400 mb-1">Postback URL</p>
                <div className="flex items-center gap-2">
                  <code className="text-green-400 font-mono text-xs break-all">{campaign.postbackUrl}</code>
                  <button onClick={() => copyText(campaign.postbackUrl)} className="text-slate-500 hover:text-white shrink-0"><Copy className="h-3 w-3" /></button>
                </div>
              </div>
            )}
            {campaign.clickidToken && (
              <div className="bg-[#0f172a] rounded-lg p-3">
                <p className="text-xs text-slate-400 mb-1">Token ClickID</p>
                <div className="flex items-center gap-2">
                  <code className="text-green-400 font-mono text-xs break-all">{campaign.clickidToken}</code>
                  <button onClick={() => copyText(campaign.clickidToken)} className="text-slate-500 hover:text-white shrink-0"><Copy className="h-3 w-3" /></button>
                </div>
              </div>
            )}
            <div>
              <p className="text-xs text-slate-400 mb-2">Keywords ({campaign.keywords?.filter((k: any) => k.isSelected)?.length ?? 0})</p>
              <div className="flex flex-wrap gap-1">
                {campaign.keywords?.filter((k: any) => k.isSelected)?.map((k: any) => (
                  <Badge key={k.id} className="bg-[#0f172a] text-slate-300 text-xs">[{k.matchType}] {k.keyword}</Badge>
                ))}
                {(!campaign.keywords || campaign.keywords.filter((k: any) => k.isSelected).length === 0) && (
                  <span className="text-xs text-slate-500">Nenhuma keyword selecionada</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agent Automation Loops */}
      <Card className="bg-[#1e293b]/85 border-[#334155] shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-base flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-400" /> Automação por Agentes (Loop de Monitoramento)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between flex-wrap gap-6 bg-[#0f172a] p-4 rounded-lg border border-[#334155]/40">
            <div className="space-y-1.5 flex-1 min-w-[280px]">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="loop-active"
                  checked={loopEnabled}
                  onCheckedChange={(checked) => {
                    setLoopEnabled(!!checked);
                    saveLoopConfig(!!checked, loopInterval, loopAgents);
                  }}
                />
                <Label htmlFor="loop-active" className="text-sm font-semibold text-white cursor-pointer select-none">
                  Ativar Loop de Execução Automática dos Agentes
                </Label>
              </div>
              <p className="text-xs text-slate-400 pl-6 leading-relaxed">
                Quando ativado, os agentes de Ads e Compliance monitoram periodicamente as métricas, os lances de CPC e a integridade da ponte de destino.
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-slate-400 uppercase tracking-wider block">Intermitência do Loop</Label>
                <Select
                  value={loopInterval}
                  onValueChange={(val) => {
                    setLoopInterval(val);
                    saveLoopConfig(loopEnabled, val, loopAgents);
                  }}
                >
                  <SelectTrigger className="w-36 bg-[#1e293b] border-[#334155] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1e293b] border-[#334155]">
                    <SelectItem value="12h" className="text-white">A cada 12h</SelectItem>
                    <SelectItem value="24h" className="text-white">A cada 24h (Sugerido)</SelectItem>
                    <SelectItem value="48h" className="text-white">A cada 48h (Econômico)</SelectItem>
                    <SelectItem value="72h" className="text-white">A cada 72h</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button
                onClick={runLoopAction}
                disabled={executingLoop || (!loopEnabled && campaign.status !== 'EM_TESTE')}
                className="bg-yellow-600 hover:bg-yellow-700 text-white gap-1.5 self-end"
                size="sm"
              >
                {executingLoop ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                Executar Agora
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="bg-[#0f172a]/60 p-3 rounded-lg border border-[#334155]/20 space-y-1">
              <span className="text-xs font-bold text-yellow-400 uppercase tracking-wide">💡 Economia de Tokens</span>
              <p className="text-[11px] text-slate-400 leading-normal">
                Loops rápidos gastam créditos de API desnecessariamente. Recomendamos intermitência de <strong>24h ou 48h</strong> como o equilíbrio ideal de segurança e economia.
              </p>
            </div>
            
            <div className="bg-[#0f172a]/60 p-3 rounded-lg border border-[#334155]/20 space-y-1">
              <span className="text-xs font-bold text-green-400 uppercase tracking-wide">🔍 Monitoramento Ativo</span>
              <p className="text-[11px] text-slate-400 leading-normal">
                {campaign.loopEnabled
                  ? <>Loop LIGADO ({campaign.loopInterval}, agentes: {campaign.loopAgents}){campaign.lastLoopRunAt ? <> — última execução {new Date(campaign.lastLoopRunAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</> : ' — ainda não rodou'}.</>
                  : <>Loop DESLIGADO — ative acima para o <strong>Agente de Ads</strong> validar CPC real e o <strong>Compliance Sentinel</strong> auditar a presell automaticamente.</>}
              </p>
            </div>

            <div className="bg-[#0f172a]/60 p-3 rounded-lg border border-[#334155]/20 space-y-1">
              <span className="text-xs font-bold text-blue-400 uppercase tracking-wide">⚠️ Quando é Necessário?</span>
              <p className="text-[11px] text-slate-400 leading-normal">
                Altamente necessário quando a campanha está <strong>Em Teste / Andamento</strong>. Evita gastos ocultos com CPC acima do máximo desta campanha ({campaign.cpcMax > 0 ? `$${Number(campaign.cpcMax).toFixed(2)}` : 'não definido — complete o Wizard'}).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Audit Results */}
      {audit && (
        <Card className="bg-[#1e293b] border-[#334155]">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-400" /> Resultado da Auditoria IA
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-4">
            {/* Score and verdict */}
            <div className="flex items-center gap-6 flex-wrap">
              <div className="relative w-20 h-20">
                <svg className="w-20 h-20 -rotate-90" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r="28" fill="none" stroke="#334155" strokeWidth="4" />
                  <circle cx="32" cy="32" r="28" fill="none" stroke={(audit.audit_score ?? 0) >= 80 ? '#22c55e' : (audit.audit_score ?? 0) >= 50 ? '#f59e0b' : '#ef4444'} strokeWidth="4" strokeDasharray={`${((audit.audit_score ?? 0) / 100) * 175.9} 175.9`} strokeLinecap="round" />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-white">{audit.audit_score ?? 0}</span>
              </div>
              <div>
                <Badge className={audit.ready_to_launch ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
                  {audit.ready_to_launch ? '✅ Pronto para lançar' : '❌ Não está pronto'}
                </Badge>
                <Badge className={`ml-2 ${audit.risk_level === 'LOW' ? 'bg-green-500/20 text-green-400' : audit.risk_level === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                  Risco: {audit.risk_level}
                </Badge>
                <p className="text-sm text-slate-300 mt-2 max-w-md">{audit.summary}</p>
              </div>
            </div>

            {/* Blockers */}
            {audit.blockers?.length > 0 && (
              <div className="bg-red-500/10 rounded-lg p-4">
                <h4 className="text-red-400 font-semibold text-sm mb-2 flex items-center gap-2"><XCircle className="h-4 w-4" /> Bloqueadores (impedem lançamento)</h4>
                <ul className="space-y-1">{audit.blockers.map((b, i) => <li key={i} className="text-sm text-red-300">• {b}</li>)}</ul>
              </div>
            )}

            {/* Warnings */}
            {audit.warnings?.length > 0 && (
              <div className="bg-yellow-500/10 rounded-lg p-4">
                <h4 className="text-yellow-400 font-semibold text-sm mb-2 flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Avisos</h4>
                <ul className="space-y-1">{audit.warnings.map((w, i) => <li key={i} className="text-sm text-yellow-300">• {w}</li>)}</ul>
              </div>
            )}

            {/* Categories */}
            {audit.categories?.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {audit.categories.map((cat, i) => (
                  <div key={i} className="bg-[#0f172a] rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-white font-medium">{cat.name}</span>
                      <div className="flex items-center gap-2">
                        <Badge className={cat.status === 'OK' ? 'bg-green-500/20 text-green-400' : cat.status === 'WARNING' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}>{cat.status}</Badge>
                        <span className="text-sm font-mono text-slate-300">{cat.score}/100</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      {cat.items?.map((item, j) => (
                        <div key={j} className="flex items-start gap-2 text-xs">
                          {item.status === 'PASS' ? <CheckCircle2 className="h-3 w-3 text-green-400 mt-0.5 shrink-0" /> : item.status === 'WARN' ? <AlertTriangle className="h-3 w-3 text-yellow-400 mt-0.5 shrink-0" /> : <XCircle className="h-3 w-3 text-red-400 mt-0.5 shrink-0" />}
                          <div>
                            <span className="text-slate-300">{item.check}</span>
                            {item.detail && <p className="text-slate-500">{item.detail}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Recommendations */}
            {audit.recommendations?.length > 0 && (
              <div className="bg-blue-500/10 rounded-lg p-4">
                <h4 className="text-blue-400 font-semibold text-sm mb-2">Recomendações</h4>
                <ul className="space-y-1">{audit.recommendations.map((r, i) => <li key={i} className="text-sm text-blue-300">• {r}</li>)}</ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Decisions history */}
      {campaign.decisions?.length > 0 && (
        <Card className="bg-[#1e293b] border-[#334155]">
          <CardHeader><CardTitle className="text-white text-sm">Histórico de Decisões</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="space-y-3">
              {campaign.decisions.map((d: any) => (
                <div key={d.id} className="flex items-start gap-3 bg-[#0f172a] rounded-lg p-3">
                  <Badge className={d.decision === 'KILL' ? 'bg-red-500/20 text-red-400' : d.decision === 'SCALE' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}>{d.decision}</Badge>
                  <div className="flex-1">
                    {d.rationale && <p className="text-sm text-slate-300">{d.rationale}</p>}
                    <p className="text-xs text-slate-500 mt-1">{new Date(d.createdAt).toLocaleDateString('pt-BR', { timeZone: 'UTC' })} {new Date(d.createdAt).toLocaleTimeString('pt-BR', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
