'use client';

import React, { useState } from 'react';
import { Loader2, ShieldCheck, Cpu, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface Step7LeadingStreamProps {
  campaignId: string;
  budgetDaily: number;
  onSuccess?: () => void;
}

export function Step7LeadingStream({ campaignId, budgetDaily, onSuccess }: Step7LeadingStreamProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<{ time: string; message: string }[]>([]);
  const [progress, setProgress] = useState(0);
  const [tokensEstimated, setTokensEstimated] = useState(0);
  const [costUSD, setCostUSD] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [result, setResult] = useState<any>(null);

  const startAgentFix = () => {
    setIsRunning(true);
    setLogs([]);
    setProgress(0);
    setIsCompleted(false);

    const eventSource = new EventSource(`/api/campaigns/${campaignId}/fix-gads`);

    eventSource.addEventListener('log', (e: any) => {
      const data = JSON.parse(e.data);
      setLogs((prev) => [...prev, { time: data.time, message: data.message }]);
    });

    eventSource.addEventListener('progress', (e: any) => {
      const data = JSON.parse(e.data);
      setProgress(data.percent);
      setTokensEstimated(data.tokensEstimated);
      setCostUSD(data.costEstimatedUSD);
    });

    eventSource.addEventListener('complete', (e: any) => {
      const data = JSON.parse(e.data);
      setProgress(100);
      setIsRunning(false);
      setIsCompleted(true);
      setResult(data);
      eventSource.close();
      if (onSuccess) onSuccess();
    });

    eventSource.addEventListener('error', (e: any) => {
      setIsRunning(false);
      eventSource.close();
    });
  };

  return (
    <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-5 space-y-4 shadow-xl my-4">
      {/* Header Budget-First */}
      <div className="flex items-center justify-between pb-3 border-b border-[#1e293b] flex-wrap gap-2">
        <div>
          <span className="text-xs uppercase tracking-wider text-blue-400 font-semibold">Estratégia Budget-First</span>
          <h3 className="text-base font-bold text-white flex items-center gap-2 mt-0.5">
            Orçamento Selecionado: <span className="font-mono text-green-400">${budgetDaily?.toFixed?.(2) ?? '30.00'} USD/dia</span>
          </h3>
        </div>
        <Button
          onClick={startAgentFix}
          disabled={isRunning || !campaignId}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium gap-2 shadow-lg shadow-emerald-900/20"
        >
          {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          {isRunning ? 'Agente Otimizando...' : 'Corrigir Lances com Agente (SkillClaw)'}
        </Button>
      </div>

      {/* Painel do Leading Stream SSE */}
      {(isRunning || logs.length > 0) && (
        <div className="space-y-3 bg-[#090d16] rounded-lg p-4 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 flex-wrap gap-2">
            <span className="flex items-center gap-1.5 font-mono text-blue-300">
              <Cpu className="h-3.5 w-3.5 animate-pulse" />
              Processando: Otimização de Lances de Palavras-Chave (SkillClaw Proxy :30000)
            </span>
            <div className="flex items-center gap-3 font-mono">
              <span>Tokens: <strong className="text-slate-200">{tokensEstimated}</strong></span>
              <span>Custo Est.: <strong className="text-green-400">${costUSD.toFixed(4)}</strong></span>
            </div>
          </div>

          {/* Barra de Progresso */}
          <div className="space-y-1">
            <Progress value={progress} className="h-2 bg-slate-800" />
            <div className="flex justify-between text-[11px] font-mono text-slate-500">
              <span>Progresso</span>
              <span>{progress}%</span>
            </div>
          </div>

          {/* Terminal de Logs */}
          <div className="bg-[#030712] font-mono text-xs p-3 rounded border border-slate-800/80 max-h-40 overflow-y-auto space-y-1 text-slate-300">
            {logs.map((log, idx) => (
              <div key={idx} className="flex gap-2">
                <span className="text-slate-500 shrink-0">[{log.time}]</span>
                <span className={log.message.includes('✅') ? 'text-green-400 font-semibold' : ''}>{log.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resultado da Otimização */}
      {isCompleted && result && (
        <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-300 space-y-1">
            <p className="font-semibold text-emerald-300 text-sm">Otimização concluída com sucesso!</p>
            <p><strong>Estratégia Aplicada:</strong> {result.strategyApplied} (Teto CPC: ${result.cpcTarget} USD)</p>
            <p className="text-slate-400 italic">"{result.justification}"</p>
          </div>
        </div>
      )}
    </div>
  );
}
