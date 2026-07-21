'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Workflow, Loader2, CheckCircle2, XCircle, AlertTriangle, ArrowRight } from 'lucide-react';

interface ProviderInfo {
  provider: string;
  hasKey: boolean;
  enabled: boolean;
  budgetTokens: number;
  monthTokens: number;
  overBudget: boolean;
}

interface RoutingData {
  mode: 'auto' | 'manual';
  manualProvider: string | null;
  providers: ProviderInfo[];
  chains: Record<string, { provider: string; model: string; overBudget: boolean }[]>;
}

const PROVIDER_LABELS: Record<string, string> = {
  anthropic: 'Claude',
  openai: 'GPT',
  google: 'Gemini',
  grok: 'Grok',
  ollama: 'Ollama (grátis)',
};

const TIER_LABELS: Record<string, { label: string; desc: string }> = {
  premium: { label: 'Premium', desc: 'Compliance, auditorias, análise de página de afiliado' },
  standard: { label: 'Standard', desc: 'Product Hunter, keywords, RSA' },
  light: { label: 'Light', desc: 'Chat, validações de formulário' },
};

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return String(n);
}

export function LlmRoutingPanel() {
  const [data, setData] = useState<RoutingData | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    fetch('/api/llm-routing')
      .then(r => r.json())
      .then(d => { if (!d?.error) setData(d); })
      .catch(console.error);
  }, []);

  useEffect(() => { load(); }, [load]);

  function toggleProvider(prov: string) {
    if (!data) return;
    const target = data.providers.find(p => p.provider === prov);
    if (!target) return;
    const enabledCount = data.providers.filter(p => p.hasKey && p.enabled).length;
    if (target.enabled && enabledCount <= 1) {
      toast.error('Mantenha ao menos um provedor ativo');
      return;
    }
    const disabled = data.providers
      .filter(p => (p.provider === prov ? p.enabled : !p.enabled))
      .map(p => p.provider);
    patch({ disabledProviders: disabled });
  }

  async function patch(body: any) {
    setSaving(true);
    try {
      const r = await fetch('/api/llm-routing', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (r.ok) { toast.success('Orquestração atualizada'); load(); }
      else toast.error('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  if (!data) {
    return (
      <Card className="bg-[#1e293b] border-[#334155]">
        <CardContent className="pt-6 flex items-center gap-2 text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando orquestração de LLMs...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-[#1e293b] border-[#334155]">
      <CardContent className="pt-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Workflow className="h-5 w-5 text-green-400" />
            <span className="text-white font-semibold">Orquestração de LLMs</span>
            <Badge className={cn('border', data.mode === 'auto' ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-blue-500/10 text-blue-300 border-blue-500/30')}>
              {data.mode === 'auto' ? 'Automática (custo-otimizada)' : 'Manual'}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={data.mode}
              onValueChange={v => patch({ mode: v })}
              disabled={saving}
            >
              <SelectTrigger className="bg-[#0f172a] border-[#334155] text-white w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Modo automático</SelectItem>
                <SelectItem value="manual">Modo manual</SelectItem>
              </SelectContent>
            </Select>
            {data.mode === 'manual' && (
              <Select
                value={data.manualProvider ?? 'anthropic'}
                onValueChange={v => patch({ manualProvider: v })}
                disabled={saving}
              >
                <SelectTrigger className="bg-[#0f172a] border-[#334155] text-white w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {data.providers.filter(p => p.hasKey).map(p => (
                    <SelectItem key={p.provider} value={p.provider}>{PROVIDER_LABELS[p.provider] ?? p.provider}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {data.providers.map(p => {
            const pct = p.budgetTokens > 0 ? Math.min(100, Math.round((p.monthTokens / p.budgetTokens) * 100)) : null;
            return (
              <div key={p.provider} className={cn('bg-[#0f172a] border rounded-lg p-3 space-y-1.5', p.enabled ? 'border-[#334155]' : 'border-red-500/20 opacity-70')}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">{PROVIDER_LABELS[p.provider] ?? p.provider}</span>
                  <div className="flex items-center gap-2">
                    {p.hasKey
                      ? p.overBudget
                        ? <Badge className="bg-red-500/10 text-red-400 border-red-500/30 gap-1"><AlertTriangle className="h-3 w-3" /> Orçamento</Badge>
                        : <CheckCircle2 className="h-4 w-4 text-green-500" />
                      : <XCircle className="h-4 w-4 text-slate-600" />}
                    <button
                      onClick={() => toggleProvider(p.provider)}
                      disabled={saving || !p.hasKey}
                      className={cn('text-[11px] px-2 py-0.5 rounded-full border transition-colors',
                        p.enabled
                          ? 'bg-green-500/10 text-green-400 border-green-500/30 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/30'
                          : 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-green-500/10 hover:text-green-300 hover:border-green-500/30')}
                      title={p.enabled ? 'Clique para desativar' : 'Clique para ativar'}
                    >
                      {p.enabled ? 'Ativo' : 'Desativado'}
                    </button>
                  </div>
                </div>
                <div className="text-xs text-slate-400 font-mono">
                  {fmt(p.monthTokens)} tokens no mês
                  {p.budgetTokens > 0 && <> / {fmt(p.budgetTokens)}</>}
                </div>
                {pct !== null && (
                  <div className="h-1.5 bg-[#1e293b] rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full', pct >= 100 ? 'bg-red-500' : pct >= 75 ? 'bg-yellow-500' : 'bg-green-500')}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}
                {!p.hasKey && <div className="text-[11px] text-slate-500">Sem API key</div>}
                {p.hasKey && !p.enabled && <div className="text-[11px] text-red-400/70">Fora das cadeias — reative quando tiver créditos</div>}
              </div>
            );
          })}
        </div>

        <div className="space-y-2">
          {Object.entries(data.chains).map(([tier, chain]) => (
            <div key={tier} className="flex flex-wrap items-center gap-2 text-sm">
              <Badge className="bg-[#0f172a] border border-[#334155] text-slate-300 w-[86px] justify-center">{TIER_LABELS[tier]?.label ?? tier}</Badge>
              <div className="flex items-center gap-1.5 flex-wrap">
                {chain.map((s, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <ArrowRight className="h-3 w-3 text-slate-600" />}
                    <span className={cn('font-mono text-xs px-2 py-0.5 rounded border',
                      i === 0 ? 'bg-green-500/10 text-green-300 border-green-500/30' : 'bg-[#0f172a] text-slate-400 border-[#334155]',
                      s.overBudget && 'opacity-50 line-through')}>
                      {PROVIDER_LABELS[s.provider]} · {s.model}
                    </span>
                  </React.Fragment>
                ))}
              </div>
              <span className="text-xs text-slate-500">{TIER_LABELS[tier]?.desc}</span>
            </div>
          ))}
        </div>

        <p className="text-xs text-slate-500">
          Modo automático poupa tokens do Claude: ele fica reservado para os agentes Premium e entra por último nas demais cadeias.
          Se um provedor falhar ou estourar o orçamento mensal, a chamada cai para o próximo automaticamente.
        </p>
      </CardContent>
    </Card>
  );
}
