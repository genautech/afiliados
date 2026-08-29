'use client';

import React, { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Sparkles, Loader2, Play, CheckCircle2, XCircle } from 'lucide-react';
import { CVR_DEFAULTS } from '@/lib/wizard-data';
import { AJUDA_CAMPOS } from '@/lib/generated/catalogo-conhecimento';

// A ajuda de campo vem de subsidios/catalogo/ajuda-campos.yaml, compilada por
// `yarn subsidios:build`. Este objeto é só a adaptação de nome de campo para o
// formato que o popover já usava.
export const FIELD_HELP: Record<string, {
  agent: string; what: string; why: string; steps: string; apiKeyHelp?: string;
}> = Object.fromEntries(
  Object.entries(AJUDA_CAMPOS).map(([campo, a]) => [campo, {
    agent: a.agente,
    what: a.o_que,
    why: a.por_que,
    steps: a.como,
    ...(a.ajuda_api_key ? { apiKeyHelp: a.ajuda_api_key } : {}),
  }]),
);

export const AutofillContext = React.createContext<Record<string, string>>({});

export const AgentHelp = ({
  fieldKey,
  fieldValue,
  context,
  onApply,
}: {
  fieldKey: string;
  fieldValue?: string;
  context?: any;
  onApply?: (value: string) => void;
}) => {
  const help = FIELD_HELP[fieldKey];
  const [analysing, setAnalysing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [suggestedValue, setSuggestedValue] = useState<string | null>(null);
  const autofillRationale = React.useContext(AutofillContext);
  const searchParams = useSearchParams();
  const campaignId = searchParams?.get('campaignId') ?? undefined;
  const autoSuggestion = autofillRationale?.[fieldKey];

  if (!help) return null;

  const handleVerify = async () => {
    if (!fieldValue || fieldValue.trim().length === 0) {
      toast.error('Preencha o campo primeiro antes de solicitar a verificação do agente.');
      return;
    }
    setAnalysing(true);
    setResult(null);
    setSuggestedValue(null);
    try {
      const res = await fetch('/api/wizard-field-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fieldKey, fieldValue, context, campaignId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResult(data.response);
        if (data.valorSugerido && data.valorSugerido !== fieldValue) setSuggestedValue(data.valorSugerido);
        toast.success('Análise de campo concluída pelo agente!');
      } else {
        setResult(data.error || 'Erro ao validar campo.');
      }
    } catch {
      setResult('Erro de rede ao falar com o agente.');
    } finally {
      setAnalysing(false);
    }
  };

  const handleApply = () => {
    if (!suggestedValue || !onApply) return;
    onApply(suggestedValue);
    toast.success('Correção aplicada ao campo.');
    setSuggestedValue(null);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="ml-1.5 inline-flex items-center justify-center text-slate-400 hover:text-green-400 transition-colors focus:outline-none" title={`Consultar ${help.agent}`}>
          <Sparkles className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 bg-[#1e293b] border-[#334155] text-white p-4 shadow-xl z-50 rounded-lg">
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-[#334155] pb-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-green-400 shrink-0" />
              <span className="text-xs font-semibold text-green-400 uppercase tracking-wider">{help.agent}</span>
            </div>
            <Button
              type="button"
              onClick={handleVerify}
              disabled={analysing}
              className="bg-green-600 hover:bg-green-700 text-white text-[10px] px-2 py-0.5 h-6 rounded flex items-center gap-1 shrink-0"
            >
              {analysing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-2.5 w-2.5" />}
              Analisar Campo
            </Button>
          </div>
          <div className="space-y-1.5 text-xs max-h-[320px] overflow-y-auto pr-1">
            <p className="text-slate-300"><strong className="text-white">O que preencher:</strong> {help.what}</p>
            <p className="text-slate-300"><strong className="text-white">Por que:</strong> {help.why}</p>
            <div className="text-slate-300">
              <strong className="text-white">Passo a passo:</strong>
              <div className="whitespace-pre-line mt-1 bg-[#0f172a] p-2 rounded text-[11px] font-mono leading-normal border border-[#334155]/50">
                {help.steps}
              </div>
            </div>
            {help.apiKeyHelp && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 p-2 rounded text-[11px] text-yellow-300 mt-2">
                <strong>Onde encontrar:</strong> {help.apiKeyHelp}
              </div>
            )}
            {autoSuggestion && (
              <div className="bg-purple-500/10 border border-purple-500/20 p-2 rounded text-[11px] text-purple-200 mt-2">
                <strong className="text-purple-300 block mb-0.5">💡 Sugestão do agente (já aplicada):</strong>
                {autoSuggestion}
              </div>
            )}
            {result && (
              <div className="mt-3 bg-[#0f172a] border border-[#334155]/60 p-3 rounded-lg text-[11px] leading-relaxed space-y-1 text-slate-300">
                <span className="text-green-400 font-bold block mb-1">🤖 Análise do Agente:</span>
                <p className="whitespace-pre-line">{result}</p>
              </div>
            )}
            {suggestedValue && (
              <div className="mt-2 bg-green-500/10 border border-green-500/30 p-3 rounded-lg text-[11px] space-y-2">
                <div className="text-green-300 font-semibold">Correção sugerida:</div>
                <div className="font-mono text-white bg-[#0f172a] rounded p-2 break-all">{suggestedValue}</div>
                {onApply ? (
                  <Button type="button" onClick={handleApply} className="bg-green-600 hover:bg-green-700 text-white text-[11px] h-7 w-full">
                    Aplicar correção no campo
                  </Button>
                ) : (
                  <p className="text-slate-400">Copie e cole manualmente — esse campo ainda não suporta aplicação direta.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export const ChecklistItemRow = ({
  item, checked, onToggle, meta, step, onFix,
}: {
  item: { key: string; label: string; critical: boolean };
  checked: boolean;
  onToggle: (v: boolean) => void;
  meta?: { verificationType: string; note?: string | null };
  step?: number;
  onFix?: (step: number, itemKey: string) => Promise<any>;
}) => {
  const isAuto = meta?.verificationType === 'auto';
  const [fixing, setFixing] = useState(false);
  const [fixResult, setFixResult] = useState<any>(null);

  const handleFix = async () => {
    if (!onFix || step === undefined) return;
    setFixing(true);
    setFixResult(null);
    try {
      setFixResult(await onFix(step, item.key));
    } finally {
      setFixing(false);
    }
  };

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${checked ? 'bg-green-500/5 border border-green-500/20' : item.critical ? 'bg-red-500/5' : 'bg-[#0f172a]'}`}>
      {isAuto ? (
        checked ? <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 shrink-0" /> : <XCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
      ) : (
        <Checkbox checked={checked} onCheckedChange={(v: any) => onToggle(!!v)} className="mt-0.5 border-slate-600 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500" />
      )}
      <div className="flex-1 min-w-0">
        <span className={`text-sm ${checked ? 'text-green-300' : 'text-white'}`}>{item.label}</span>
        {isAuto
          ? <Badge className="ml-2 bg-blue-500/20 text-blue-300 text-[10px] hover:bg-blue-500/30">VERIFICADO</Badge>
          : <Badge className="ml-2 bg-slate-500/20 text-slate-300 text-[10px] hover:bg-slate-500/30">AUTOATESTADO</Badge>}
        {item.critical && !checked && <Badge className="ml-2 bg-red-500/20 text-red-400 text-[10px] hover:bg-red-500/30">CRÍTICO</Badge>}
        {isAuto && !checked && meta?.note && <p className="text-xs text-red-300 mt-1">{meta.note}</p>}
        {isAuto && !checked && onFix && step !== undefined && (
          <div className="mt-2">
            <Button type="button" size="sm" variant="outline" onClick={handleFix} disabled={fixing} className="h-7 text-[11px] border-[#334155] text-slate-300 gap-1.5">
              {fixing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />} Corrigir com agente
            </Button>
            {fixResult && (
              <div className="mt-2 bg-blue-500/10 border border-blue-500/30 rounded-lg p-2 text-[11px] space-y-1">
                {fixResult.error && <p className="text-red-300">{fixResult.error}</p>}
                {fixResult.diagnostico && <p className="text-slate-300">{fixResult.diagnostico}</p>}
                {fixResult.valorAplicado && (
                  <p className={fixResult.passouAVerificar ? 'text-green-300' : 'text-yellow-300'}>
                    Campo "{fixResult.campoAlterado}" atualizado para <span className="font-mono">{fixResult.valorAplicado}</span> —
                    {fixResult.passouAVerificar ? ' passou na verificação ✅' : ' ainda não passou, revise manualmente.'}
                  </p>
                )}
                {fixResult.correcao && <p className="text-white">{fixResult.correcao}</p>}
                {fixResult.proximaAcao && <p className="text-slate-400">{fixResult.proximaAcao}</p>}
                {fixResult.alreadyPassing && <p className="text-green-300">Este item já está passando.</p>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export function applyEnumIfValid(options: readonly string[], setter: (v: any) => void, label: string) {
  return (v: string) => {
    if (options.includes(v)) {
      setter(v);
    } else {
      toast.error(`Sugestão do agente ("${v}") não é uma opção válida pra ${label} — ignorada.`);
    }
  };
}
