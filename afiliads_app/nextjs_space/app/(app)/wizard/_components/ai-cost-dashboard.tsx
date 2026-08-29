'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CircleAlert, Coins, Loader2, RefreshCw } from 'lucide-react';

export type CostStage = 'video_ingest' | 'copy_gen' | 'pdf_gen' | 'image_gen' | 'other';

export const STAGE_META: Record<CostStage, { label: string; bar: string; dot: string }> = {
  video_ingest: { label: 'Ingestão de vídeo', bar: 'bg-rose-500', dot: 'text-rose-400' },
  copy_gen: { label: 'Geração de cópia', bar: 'bg-emerald-500', dot: 'text-emerald-400' },
  pdf_gen: { label: 'Geração de PDF', bar: 'bg-sky-500', dot: 'text-sky-400' },
  image_gen: { label: 'Geração de imagem', bar: 'bg-purple-500', dot: 'text-purple-400' },
  other: { label: 'Outros', bar: 'bg-slate-500', dot: 'text-slate-400' },
};

export interface AiCostEntry {
  id: string;
  createdAt: string | null;
  model: string;
  purpose: string;
  stage: CostStage;
  costUsd: number;
  totalTokens: number | null;
}

export interface AiCostReport {
  totalCostUsd: number;
  runs: number;
  capUsd: number | null;
  usdToBrl: number | null;
  byStage: Array<{ stage: CostStage; costUsd: number; runs: number }>;
  history: AiCostEntry[];
}

const STAGE_HINTS: Array<[RegExp, CostStage]> = [
  [/(video|youtube|transcri|ingest)/i, 'video_ingest'],
  [/(image|imagem|capa|cover|banner|thumb|comfy|higgsfield|visual)/i, 'image_gen'],
  [/(pdf|ebook|e-book|render|reportlab|deploy)/i, 'pdf_gen'],
  [/(copy|cópia|copia|texto|rsa|anúncio|anuncio|creative|criativo|dna|slop|headline)/i, 'copy_gen'],
];

/** O backend pode mandar `stage` pronto; se não mandar, inferimos do agente/objetivo. */
export function inferStage(...hints: Array<string | null | undefined>): CostStage {
  const haystack = hints.filter(Boolean).join(' ');
  if (!haystack.trim()) return 'other';
  const direct = haystack.trim().toLowerCase();
  if (direct in STAGE_META) return direct as CostStage;
  for (const [pattern, stage] of STAGE_HINTS) {
    if (pattern.test(haystack)) return stage;
  }
  return 'other';
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/**
 * Tolera três formas: relatório pronto, `{ rows: [...] }` cru do AgentRun, ou um
 * array direto. Quando só vêm as linhas, totais e breakdown são derivados aqui —
 * assim a UI não depende do backend ter feito a agregação.
 */
export function normalizeAiCosts(raw: unknown, fallbackCapUsd: number | null = null): AiCostReport | null {
  if (!raw) return null;
  const root = (Array.isArray(raw) ? { history: raw } : raw) as Record<string, unknown>;
  if (typeof root !== 'object') return null;

  // `logs` é a chave usada por GET /api/campaigns/[id]/ai-costs (AICostLog).
  const rawRows = [root.logs, root.history, root.rows, root.runs, root.entries, root.items].find(
    (candidate) => Array.isArray(candidate),
  ) as unknown[] | undefined;

  const history: AiCostEntry[] = (rawRows ?? []).map((row, index) => {
    const r = (row ?? {}) as Record<string, unknown>;
    const purpose =
      text(r.purpose) ?? text(r.objective) ?? text(r.agent) ?? text(r.label) ?? 'Execução de agente';
    return {
      id: text(r.id) ?? `run-${index}`,
      createdAt: text(r.createdAt) ?? text(r.created_at) ?? text(r.date),
      model: text(r.model) ?? text(r.provider) ?? '—',
      purpose,
      stage: inferStage(text(r.stage), text(r.agent), purpose),
      costUsd: num(r.costUsd) ?? num(r.cost_usd) ?? num(r.cost) ?? 0,
      totalTokens:
        num(r.totalTokens) ??
        num(r.total_tokens) ??
        num(r.tokens) ??
        // AICostLog só guarda os dois lados separados.
        (num(r.promptTokens) !== null || num(r.completionTokens) !== null
          ? (num(r.promptTokens) ?? 0) + (num(r.completionTokens) ?? 0)
          : null),
    };
  });

  const derivedTotal = history.reduce((sum, entry) => sum + entry.costUsd, 0);
  const totalCostUsd = num(root.totalCostUsd) ?? num(root.total_cost_usd) ?? num(root.costUsd) ?? derivedTotal;

  const byStageMap = new Map<CostStage, { stage: CostStage; costUsd: number; runs: number }>();
  const declaredStages = Array.isArray(root.byStage) ? (root.byStage as unknown[]) : null;
  if (declaredStages) {
    for (const row of declaredStages) {
      const r = (row ?? {}) as Record<string, unknown>;
      const stage = inferStage(text(r.stage), text(r.label));
      const current = byStageMap.get(stage) ?? { stage, costUsd: 0, runs: 0 };
      current.costUsd += num(r.costUsd) ?? num(r.cost_usd) ?? 0;
      current.runs += num(r.runs) ?? 0;
      byStageMap.set(stage, current);
    }
  } else {
    for (const entry of history) {
      const current = byStageMap.get(entry.stage) ?? { stage: entry.stage, costUsd: 0, runs: 0 };
      current.costUsd += entry.costUsd;
      current.runs += 1;
      byStageMap.set(entry.stage, current);
    }
  }

  return {
    totalCostUsd,
    runs: num(root.runs) ?? history.length,
    capUsd: num(root.capUsd) ?? num(root.cap_usd) ?? fallbackCapUsd,
    // Sem cotação vinda do backend não inventamos câmbio: a UI mostra só USD.
    usdToBrl: num(root.usdToBrl) ?? num(root.usd_to_brl) ?? num(root.brlRate),
    byStage: [...byStageMap.values()].sort((a, b) => b.costUsd - a.costUsd),
    history: history.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '')),
  };
}

function formatUsd(value: number): string {
  return `$${value.toFixed(value < 1 ? 4 : 2)} USD`;
}

function formatBrl(usd: number, rate: number): string {
  return `R$ ${(usd * rate).toFixed(2).replace('.', ',')}`;
}

function formatMoment(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  return Number.isFinite(date.getTime())
    ? date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : '—';
}

interface AICostDashboardProps {
  campaignId: string | null;
  /** Teto usado quando o backend não devolve `capUsd`. */
  capUsd?: number;
  className?: string;
}

export function AICostDashboard({ campaignId, capUsd = 2, className = '' }: AICostDashboardProps) {
  const [report, setReport] = useState<AiCostReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  const load = useCallback(async () => {
    if (!campaignId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/ai-costs`);
      if (res.status === 404) { setUnavailable(true); return; }
      if (!res.ok) return;
      const data = await res.json().catch(() => null);
      setUnavailable(false);
      setReport(normalizeAiCosts(data, capUsd));
    } catch {
      /* silencioso: o passo continua utilizável sem a auditoria de custo */
    } finally {
      setLoading(false);
    }
  }, [campaignId, capUsd]);

  useEffect(() => { void load(); }, [load]);

  const overCap = useMemo(
    () => Boolean(report && report.capUsd && report.totalCostUsd > report.capUsd),
    [report],
  );
  const maxStageCost = report?.byStage[0]?.costUsd ?? 0;

  return (
    <Card className={`bg-transparent border-[#334155] ${className}`}>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-white">
              <Coins className="h-5 w-5 text-amber-400" />
              Custo de IA desta campanha
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-500" />}
            </CardTitle>
            <CardDescription className="text-slate-400">
              Tudo que os agentes queimaram — ingestão, cópia, PDF e imagem — por execução.
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="font-mono text-2xl font-bold text-amber-400">
              {formatUsd(report?.totalCostUsd ?? 0)}
            </p>
            {report?.usdToBrl ? (
              <p className="font-mono text-xs text-slate-400">
                {formatBrl(report.totalCostUsd, report.usdToBrl)}
              </p>
            ) : (
              <p className="text-[10px] text-slate-600">sem cotação para converter em BRL</p>
            )}
            <p className="text-[10px] text-slate-500">{report?.runs ?? 0} execuções</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {unavailable && (
          <div className="flex items-start gap-2 rounded-lg border border-slate-700 bg-[#0f172a] p-3 text-[11px] text-slate-400">
            <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              <code className="font-mono">GET /api/campaigns/:id/ai-costs</code> ainda não responde. O
              painel liga sozinho assim que a rota subir.
            </span>
          </div>
        )}

        {overCap && report?.capUsd && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-[11px] text-amber-200">
            <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Esta campanha passou do teto de {formatUsd(report.capUsd)} — está em{' '}
              <span className="font-mono font-semibold">{formatUsd(report.totalCostUsd)}</span>. Vale
              conferir se algum agente está reprocessando a mesma fonte.
            </span>
          </div>
        )}

        {report && report.byStage.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-wide text-slate-500">Gasto por etapa</p>
            <div className="flex h-2 overflow-hidden rounded-full bg-[#0f172a]">
              {report.byStage.map((row) => (
                <div
                  key={row.stage}
                  className={STAGE_META[row.stage].bar}
                  style={{
                    width: `${report.totalCostUsd > 0 ? (row.costUsd / report.totalCostUsd) * 100 : 0}%`,
                  }}
                  title={`${STAGE_META[row.stage].label}: ${formatUsd(row.costUsd)}`}
                />
              ))}
            </div>
            <div className="space-y-1.5 pt-1">
              {report.byStage.map((row) => (
                <div key={row.stage} className="flex items-center gap-2 text-[11px]">
                  <span className={`h-1.5 w-1.5 rounded-full ${STAGE_META[row.stage].bar}`} />
                  <span className="text-slate-300">{STAGE_META[row.stage].label}</span>
                  <span className="flex-1 border-b border-dashed border-slate-800" />
                  <span className="font-mono text-slate-400">{formatUsd(row.costUsd)}</span>
                  <span className="w-16 text-right font-mono text-slate-600">
                    {maxStageCost > 0 ? `${Math.round((row.costUsd / report.totalCostUsd) * 100)}%` : '0%'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {report && report.history.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-wide text-slate-500">Histórico</p>
            <div className="max-h-64 overflow-y-auto rounded-lg border border-[#334155]">
              <table className="w-full text-left text-[11px]">
                <thead className="sticky top-0 bg-[#0f172a] text-slate-500">
                  <tr>
                    <th className="px-2.5 py-1.5 font-medium">Data</th>
                    <th className="px-2.5 py-1.5 font-medium">Modelo</th>
                    <th className="px-2.5 py-1.5 font-medium">Objetivo</th>
                    <th className="px-2.5 py-1.5 text-right font-medium">Custo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e293b]">
                  {report.history.map((entry) => (
                    <tr key={entry.id} className="hover:bg-[#0f172a]/60">
                      <td className="px-2.5 py-1.5 font-mono text-slate-500 whitespace-nowrap">
                        {formatMoment(entry.createdAt)}
                      </td>
                      <td className="px-2.5 py-1.5 font-mono text-slate-300">{entry.model}</td>
                      <td className="px-2.5 py-1.5 text-slate-400">
                        <span className={`mr-1.5 ${STAGE_META[entry.stage].dot}`}>•</span>
                        {entry.purpose}
                      </td>
                      <td className="px-2.5 py-1.5 text-right font-mono text-amber-400/90 whitespace-nowrap">
                        {formatUsd(entry.costUsd)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {report && report.history.length === 0 && !unavailable && (
          <p className="text-[11px] text-slate-500">
            Nenhuma execução de agente cobrada nesta campanha ainda.
          </p>
        )}

        <div className="flex justify-end border-t border-[#334155] pt-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void load()}
            disabled={loading || !campaignId}
            className="gap-2 text-slate-400 hover:bg-[#0f172a] hover:text-white"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Atualizar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
