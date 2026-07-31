'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Award,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'react-hot-toast';
import {
  getExperimentActionFeasibility,
  getDetailedStatusVocabulary,
  type ExperimentDashboardReport,
} from './experiment-dashboard-helpers';

interface ExperimentDashboardCardProps {
  experimentId: string;
  hasGoogleCampaignId?: boolean;
  onActionComplete?: () => void;
}

export function ExperimentDashboardCard({
  experimentId,
  hasGoogleCampaignId = true,
  onActionComplete,
}: ExperimentDashboardCardProps) {
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [executingAction, setExecutingAction] = useState(false);
  const [experimentData, setExperimentData] = useState<any>(null);

  // Modal para ações humanas (END | PROMOTE | GRADUATE)
  const [actionModal, setActionModal] = useState<{
    open: boolean;
    action: 'END' | 'PROMOTE' | 'GRADUATE' | null;
    title: string;
    description: string;
  }>({
    open: false,
    action: null,
    title: '',
    description: '',
  });
  const [confirmedAction, setConfirmedAction] = useState(false);

  const loadData = async () => {
    if (!experimentId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/google-ads/experiments/${experimentId}`);
      if (res.ok) {
        const data = await res.json();
        setExperimentData(data);
      }
    } catch {
      // Falha de leitura
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [experimentId]);

  const handleSyncMetrics = async () => {
    if (!experimentId) return;
    setSyncing(true);
    try {
      const res = await fetch(`/api/google-ads/experiments/${experimentId}/sync`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? 'Falha ao sincronizar métricas remotas');
        return;
      }
      toast.success('Métricas do Google Ads atualizadas!');
      await loadData();
    } catch {
      toast.error('Erro de rede ao sincronizar métricas');
    } finally {
      setSyncing(false);
    }
  };

  const handleExecuteAction = async () => {
    if (!experimentId || !actionModal.action || !confirmedAction) return;
    setExecutingAction(true);
    try {
      const res = await fetch(`/api/google-ads/experiments/${experimentId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionModal.action,
          reason: `Ação ${actionModal.action} solicitada via interface humana no AfiliAds`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? `Falha ao executar ${actionModal.action}`);
        return;
      }

      toast.success(`Ação ${actionModal.action} concluída no Google Ads!`);
      setActionModal({ open: false, action: null, title: '', description: '' });
      setConfirmedAction(false);
      await loadData();
      if (onActionComplete) onActionComplete();
    } catch {
      toast.error('Erro de rede ao executar ação no experimento');
    } finally {
      setExecutingAction(false);
    }
  };

  const exp = experimentData?.experiment;
  const report: ExperimentDashboardReport | null = experimentData?.report ?? null;
  const feasibility = getExperimentActionFeasibility(report);
  const statusVocab = getDetailedStatusVocabulary({
    status: exp?.status ?? 'RASCUNHO',
    hasGoogleCampaignId,
    isLroPending: exp?.operations?.some((op: any) => op.status === 'PENDING'),
  });

  const totalClicks = (report?.controlClicks ?? 0) + (report?.treatmentClicks ?? 0);
  const targetClicks = report?.targetClicks ?? 100;
  const samplePercent = Math.min(100, Math.round((totalClicks / targetClicks) * 100));

  return (
    <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-5 space-y-5 shadow-xl text-white my-4">
      {/* Header com Vocabulário Transparente (B4) */}
      <div className="flex items-center justify-between pb-3 border-b border-[#1e293b] flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-emerald-400" />
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              Painel de Desempenho A/B
            </h3>
            <p className="text-xs text-slate-400">{statusVocab.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleSyncMetrics}
            disabled={syncing || loading}
            className="border-slate-700 text-slate-300 hover:text-white text-xs gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
            Sincronizar Google Ads
          </Button>
          <Badge className={`bg-${statusVocab.badgeColor}-950/80 text-${statusVocab.badgeColor}-300 border border-${statusVocab.badgeColor}-500/40 px-3 py-1 font-mono text-xs`}>
            {statusVocab.label}
          </Badge>
        </div>
      </div>

      {/* Progresso de Amostra Estocástica */}
      <div className="bg-[#090d16] p-4 rounded-lg border border-slate-800 space-y-2">
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-300 font-medium flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-blue-400" />
            Progresso de Amostra do Teste
          </span>
          <span className="font-mono text-slate-400">
            {totalClicks} / {targetClicks} cliques necessários ({samplePercent}%)
          </span>
        </div>
        <Progress value={samplePercent} className="h-2 bg-slate-800" />

        {feasibility.reason && (
          <p className="text-[11px] text-amber-400 flex items-center gap-1 font-mono pt-1">
            <Info className="h-3.5 w-3.5 shrink-0" />
            {feasibility.reason}
          </p>
        )}
      </div>

      {/* Tabela Comparativa de Métricas (Controle vs Tratamento) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card Controle */}
        <div className="bg-[#030712] p-4 rounded-lg border border-slate-800 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Braço Controle (A)</span>
            <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-400">Original</Badge>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-2">
            <div>
              <span className="text-slate-500 block text-[10px]">Cliques</span>
              <strong className="text-white text-sm">{report?.controlClicks ?? 0}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">Conversões</span>
              <strong className="text-white text-sm">{experimentData?.metrics?.controlConversions ?? 0}</strong>
            </div>
          </div>
        </div>

        {/* Card Tratamento */}
        <div className="bg-[#030712] p-4 rounded-lg border border-slate-800 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Braço Tratamento (B)</span>
            <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-300">Variante</Badge>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-2">
            <div>
              <span className="text-slate-500 block text-[10px]">Cliques</span>
              <strong className="text-white text-sm">{report?.treatmentClicks ?? 0}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">Uplift Estimado</span>
              <strong className={report?.conversionsUplift && report.conversionsUplift > 0 ? 'text-emerald-400 text-sm' : 'text-slate-300 text-sm'}>
                {report?.conversionsUplift ? `${(report.conversionsUplift * 100).toFixed(1)}%` : 'N/A'}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* Ações Finais com Confirmação Humana (END / PROMOTE / GRADUATE) */}
      <div className="bg-[#090d16] p-4 rounded-lg border border-slate-800 space-y-3">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <Award className="h-4 w-4 text-amber-400" />
          Ações Finais de Conclusão do Experimento
        </h4>

        <div className="flex flex-wrap gap-3">
          {/* Promover Vencedor */}
          <Button
            size="sm"
            disabled={!feasibility.canPromote || executingAction}
            onClick={() =>
              setActionModal({
                open: true,
                action: 'PROMOTE',
                title: 'Promover Tratamento a Vencedor (PROMOTE)',
                description: 'Esta ação substituirá a campanha de controle pela variação de tratamento vencedora no Google Ads.',
              })
            }
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium gap-1.5 disabled:opacity-50"
          >
            <Award className="h-3.5 w-3.5" />
            Promover Vencedor (PROMOTE)
          </Button>

          {/* Graduar como Nova Campanha */}
          <Button
            size="sm"
            variant="outline"
            disabled={!feasibility.canGraduate || executingAction}
            onClick={() =>
              setActionModal({
                open: true,
                action: 'GRADUATE',
                title: 'Graduar como Campanha Independente (GRADUATE)',
                description: 'Esta ação converterá a campanha de tratamento em uma nova campanha independente no Google Ads.',
              })
            }
            className="border-purple-600/50 text-purple-300 hover:bg-purple-950/40 text-xs font-medium gap-1.5 disabled:opacity-50"
          >
            <Award className="h-3.5 w-3.5" />
            Graduar Nova Campanha (GRADUATE)
          </Button>

          {/* Encerrar sem Mudanças */}
          <Button
            size="sm"
            variant="outline"
            disabled={executingAction}
            onClick={() =>
              setActionModal({
                open: true,
                action: 'END',
                title: 'Encerrar Experimento sem Alterações (END)',
                description: 'Esta ação encerrará o experimento mantendo a campanha de controle original intacta.',
              })
            }
            className="border-slate-700 text-slate-400 hover:text-white text-xs font-medium gap-1.5"
          >
            <XCircle className="h-3.5 w-3.5" />
            Encerrar (END)
          </Button>
        </div>
      </div>

      {/* Modal de Confirmação Humana para Ações */}
      <Dialog
        open={actionModal.open}
        onOpenChange={(open: boolean) => setActionModal((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="bg-[#0f172a] border-[#1e293b] text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-emerald-400">
              <Award className="h-5 w-5 shrink-0 text-emerald-400" />
              {actionModal.title}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-300 mt-2 space-y-2">
              <p>{actionModal.description}</p>
              <p className="bg-slate-900 border border-slate-800 p-2.5 rounded text-slate-300">
                Esta é uma alteração estrutural no Google Ads. Confirme sua intenção abaixo para autorizar.
              </p>
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-start gap-2 pt-2 text-xs">
            <Checkbox
              id="confirm-action"
              checked={confirmedAction}
              onCheckedChange={(checked: boolean | 'indeterminate') => setConfirmedAction(!!checked)}
              className="mt-0.5 border-slate-600 data-[state=checked]:bg-emerald-600"
            />
            <label htmlFor="confirm-action" className="text-slate-300 leading-tight cursor-pointer">
              Confirmo a execução desta ação de encerramento/promoção no Google Ads.
            </label>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button
              variant="outline"
              onClick={() => setActionModal((prev) => ({ ...prev, open: false }))}
              className="border-slate-700 text-slate-300 text-xs"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleExecuteAction}
              disabled={!confirmedAction || executingAction}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs gap-1.5"
            >
              {executingAction ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              Executar Ação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
