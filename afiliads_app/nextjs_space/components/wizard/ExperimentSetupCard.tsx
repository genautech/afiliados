'use client';

import React, { useState, useEffect } from 'react';
import {
  FlaskConical,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Calendar,
  Info,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
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
  validateExperimentSetupForm,
  getExperimentStatusBadge,
  type ExperimentSetupUIState,
} from './experiment-setup-helpers';

interface ExperimentSetupCardProps {
  campaignId: string;
  controlPresellUrl?: string;
  onExperimentUpdated?: () => void;
}

export function ExperimentSetupCard({
  campaignId,
  controlPresellUrl,
  onExperimentUpdated,
}: ExperimentSetupCardProps) {
  const [loading, setLoading] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [experiment, setExperiment] = useState<any>(null);

  // Form states
  const [trafficSplit, setTrafficSplit] = useState<number>(50);
  const [treatmentUrl, setTreatmentUrl] = useState<string>('');

  // Schedule Modal
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [hasConfirmedSpend, setHasConfirmedSpend] = useState(false);

  // Carrega estado do experimento vinculado à campanha
  const loadExperiment = async () => {
    if (!campaignId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/google-ads/experiments?campaignId=${campaignId}`);
      if (res.ok) {
        const data = await res.json();
        const exp = data.experiments?.[0] ?? null;
        setExperiment(exp);
        if (exp?.arms) {
          const treatment = exp.arms.find((a: any) => !a.isControl);
          if (treatment?.finalUrl) setTreatmentUrl(treatment.finalUrl);
          if (treatment?.trafficSplit) setTrafficSplit(treatment.trafficSplit);
        }
      }
    } catch {
      // Sem experimento criado ainda
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExperiment();
  }, [campaignId]);

  const handlePrepare = async () => {
    const val = validateExperimentSetupForm(trafficSplit, treatmentUrl);
    if (!val.valid) {
      toast.error(val.error ?? 'Dados inválidos');
      return;
    }

    setPreparing(true);
    try {
      const res = await fetch('/api/google-ads/experiments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId,
          name: `Experimento A/B - Pré-sell`,
          variationType: 'PRESELL_URL',
          treatmentUrl: treatmentUrl.trim(),
          trafficSplit,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? 'Falha ao preparar experimento');
        return;
      }

      toast.success('Experimento A/B preparado com sucesso (Modo SETUP / Sem custo)');
      await loadExperiment();
      if (onExperimentUpdated) onExperimentUpdated();
    } catch {
      toast.error('Erro de rede ao conectar com o servidor');
    } finally {
      setPreparing(false);
    }
  };

  const handleScheduleConfirm = async () => {
    if (!experiment?.id) return;
    if (!hasConfirmedSpend) {
      toast.error('Confirme a ciência dos custos de anúncios para prosseguir');
      return;
    }

    setScheduling(true);
    try {
      const res = await fetch(`/api/google-ads/experiments/${experiment.id}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmed: true }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? 'Falha ao agendar experimento no Google Ads');
        return;
      }

      toast.success('Agendamento enviado ao Google Ads com sucesso!');
      setShowScheduleModal(false);
      setHasConfirmedSpend(false);
      await loadExperiment();
      if (onExperimentUpdated) onExperimentUpdated();
    } catch {
      toast.error('Erro de rede ao agendar experimento');
    } finally {
      setScheduling(false);
    }
  };

  const status: ExperimentSetupUIState['status'] = experiment?.status ?? 'NONE';
  const badge = getExperimentStatusBadge(status);

  return (
    <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-5 space-y-5 shadow-xl my-4 text-white">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#1e293b] flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-indigo-400" />
          <div>
            <h3 className="text-base font-bold text-white">Teste Controlado A/B (Google Ads Experiments)</h3>
            <p className="text-xs text-slate-400">Validação estatística de pré-sells concorrentes no Google Search</p>
          </div>
        </div>
        <Badge className={`bg-${badge.color}-950/80 text-${badge.color}-300 border border-${badge.color}-500/40 px-3 py-1 font-mono text-xs`}>
          {badge.label}
        </Badge>
      </div>

      {/* Alerta de transparência B4 parte 1 */}
      <div className="bg-blue-950/30 border border-blue-500/30 rounded-lg p-3.5 flex items-start gap-3 text-xs text-blue-200">
        <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
        <div>
          <strong className="font-semibold text-blue-300">Garantia de Segurança de Custo:</strong>
          <p className="mt-0.5 text-blue-200/90">
            A etapa de <strong>Preparar (SETUP)</strong> cria o experimento e a campanha de tratamento no Google Ads em modo <strong>PAUSED</strong>.
            Nenhum anúncio é veiculado e <strong>custo R$ 0.00 / $ 0.00</strong> é gerado até que o agendamento seja explicitamente ativado por você.
          </p>
        </div>
      </div>

      {/* Exibição de erros anteriores se houver */}
      {experiment?.lastError && (
        <div className="bg-red-950/40 border border-red-500/40 rounded-lg p-3.5 flex items-start gap-2 text-xs text-red-200">
          <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
          <div>
            <strong className="font-semibold text-red-300">Erro na Operação do Google Ads:</strong>
            <p className="mt-0.5 font-mono">{experiment.lastError}</p>
          </div>
        </div>
      )}

      {/* Form de Preparação */}
      {status === 'NONE' || status === 'SETUP' ? (
        <div className="space-y-4 bg-[#090d16] p-4 rounded-lg border border-slate-800">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Controle (Atual) */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300 font-semibold flex items-center justify-between">
                <span>Controle (Braço A - Pré-sell Original)</span>
                <span className="font-mono text-indigo-400">{100 - trafficSplit}% do Tráfego</span>
              </Label>
              <Input
                value={controlPresellUrl ?? 'Pré-sell principal da campanha'}
                readOnly
                className="bg-[#030712] border-slate-800 text-slate-400 text-xs font-mono"
              />
            </div>

            {/* Tratamento (Variante) */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300 font-semibold flex items-center justify-between">
                <span>Tratamento (Braço B - Nova Variante) *</span>
                <span className="font-mono text-emerald-400">{trafficSplit}% do Tráfego</span>
              </Label>
              <Input
                value={treatmentUrl}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTreatmentUrl(e.target.value)}
                placeholder="https://seu-dominio.com/p/variante-2"
                className="bg-[#030712] border-slate-700 text-white text-xs font-mono focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Controle do Split */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex justify-between text-xs text-slate-300 font-medium">
              <span>Divisão de Tráfego Recomendada</span>
              <span className="font-mono">Controle {100 - trafficSplit}% / Tratamento {trafficSplit}%</span>
            </div>
            <Slider
              value={[trafficSplit]}
              min={10}
              max={90}
              step={5}
              onValueChange={(val: number[]) => setTrafficSplit(val[0])}
              className="py-1"
            />
          </div>

          {/* Botões de Ação */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              onClick={handlePrepare}
              disabled={preparing || loading}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs gap-2"
            >
              {preparing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              {status === 'SETUP' ? 'Atualizar Preparação (SETUP)' : 'Preparar Experimento A/B (SETUP)'}
            </Button>

            {status === 'SETUP' && (
              <Button
                onClick={() => setShowScheduleModal(true)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs gap-2"
              >
                <Calendar className="h-4 w-4" />
                Agendar no Google Ads...
              </Button>
            )}
          </div>
        </div>
      ) : (
        /* Estado Já Agendado / Em Execução */
        <div className="bg-[#090d16] p-4 rounded-lg border border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">ID do Experimento Remoto:</span>
            <span className="font-mono text-indigo-300">{experiment?.googleExperimentId ?? 'Pendente'}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Distribuição de Tráfego:</span>
            <span className="font-mono text-emerald-400">50% Controle / 50% Tratamento</span>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Agendamento */}
      <Dialog open={showScheduleModal} onOpenChange={setShowScheduleModal}>
        <DialogContent className="bg-[#0f172a] border-[#1e293b] text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-amber-400">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              Confirmação de Agendamento de Anúncios
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-300 mt-2 space-y-2">
              <p>
                Você está prestes a agendar a veiculação do Experimento A/B na API do Google Ads.
              </p>
              <p className="bg-amber-950/40 border border-amber-500/30 p-2.5 rounded text-amber-200 font-medium">
                ⚠️ A partir da data de início do experimento, a campanha de tratamento poderá servir anúncios pagos
                e gerar custos reais na sua conta do Google Ads conforme o orçamento configurado.
              </p>
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-start gap-2 pt-2 text-xs">
            <Checkbox
              id="confirm-spend"
              checked={hasConfirmedSpend}
              onCheckedChange={(checked: boolean | 'indeterminate') => setHasConfirmedSpend(!!checked)}
              className="mt-0.5 border-slate-600 data-[state=checked]:bg-emerald-600"
            />
            <label htmlFor="confirm-spend" className="text-slate-300 leading-tight cursor-pointer">
              Estou ciente de que o agendamento ativará a veiculação no Google Ads e concordo em prosseguir.
            </label>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowScheduleModal(false)}
              className="border-slate-700 text-slate-300 text-xs"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleScheduleConfirm}
              disabled={!hasConfirmedSpend || scheduling}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs gap-1.5"
            >
              {scheduling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              Confirmar e Agendar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
