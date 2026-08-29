'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Check,
  CircleAlert,
  Copy,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { validateCompliance, type ComplianceResult } from '@/lib/validators/complianceValidator';
import { evaluateClaimGate, type ClaimGateResult } from '@/lib/subsidios/ebook-os/claim-gate';

const MIN_COMPLIANCE_SCORE = 85;

type IssueType = 'CLICHE_IA' | 'VAGO' | 'HYPE' | 'REDUNDANTE' | 'CLAIM_SEM_FONTE' | 'JARGAO';

interface CopyQaIssue {
  excerpt: string;
  type: IssueType;
  why: string;
  rewrite: string;
}

interface CopyQaProposal {
  score: number;
  issues: CopyQaIssue[];
  rewritten: string;
}

const ISSUE_LABEL: Record<IssueType, string> = {
  CLICHE_IA: 'Clichê de IA',
  VAGO: 'Vago',
  HYPE: 'Hype',
  REDUNDANTE: 'Redundante',
  CLAIM_SEM_FONTE: 'Claim sem fonte',
  JARGAO: 'Jargão',
};

interface AiProposalPanelProps {
  campaignId: string | null;
  /** Texto atualmente publicado — headline, copy da landing ou miolo do e-book. */
  activeCopy: string;
  /** Contexto do produto passado ao agente (nicho, canal, tipo de página). */
  context?: string;
  /** Chamado quando o operador aprova a proposta. Recebe o texto reescrito. */
  onApprove?: (rewritten: string, issues: CopyQaIssue[]) => void | Promise<void>;
  className?: string;
}

interface DiffLine {
  kind: 'same' | 'removed' | 'added';
  text: string;
}

/** Diff por linha (LCS). Suficiente para blocos de copy — não é diff de código. */
function diffLines(before: string, after: string): DiffLine[] {
  const a = before.split('\n');
  const b = after.split('\n');
  const table: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));

  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      table[i][j] = a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }

  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      out.push({ kind: 'same', text: a[i] });
      i++;
      j++;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      out.push({ kind: 'removed', text: a[i] });
      i++;
    } else {
      out.push({ kind: 'added', text: b[j] });
      j++;
    }
  }
  while (i < a.length) out.push({ kind: 'removed', text: a[i++] });
  while (j < b.length) out.push({ kind: 'added', text: b[j++] });

  return out.filter((line) => line.text.trim() !== '' || line.kind !== 'same');
}

function scoreTone(score: number): string {
  if (score >= MIN_COMPLIANCE_SCORE) return 'text-emerald-400';
  if (score >= 70) return 'text-amber-400';
  return 'text-rose-400';
}

export function AiProposalPanel({
  campaignId,
  activeCopy,
  context,
  onApprove,
  className = '',
}: AiProposalPanelProps) {
  const [tab, setTab] = useState<'active' | 'proposal'>('active');
  const [draft, setDraft] = useState(activeCopy);
  const [proposal, setProposal] = useState<CopyQaProposal | null>(null);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [approved, setApproved] = useState(false);
  const [running, setRunning] = useState(false);
  const [approving, setApproving] = useState(false);
  const [claimGate, setClaimGate] = useState<ClaimGateResult | null>(null);

  useEffect(() => {
    setDraft(activeCopy);
  }, [activeCopy]);

  useEffect(() => {
    if (!campaignId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/product-studio?campaignId=${campaignId}`);
        if (!res.ok) return;
        const data = await res.json();
        const ledger = data?.results?.claims?.ledger;
        if (cancelled || !Array.isArray(ledger) || ledger.length === 0) return;
        setClaimGate(
          evaluateClaimGate(
            ledger.map((row: any) => ({
              id: row.id,
              claim: row.claim,
              status: row.status,
              source: row.source,
              allowedChannels: row.allowedChannels,
            })),
          ),
        );
      } catch {
        // O gate de claims é informativo aqui: sem ledger, o painel segue só com o Sentinel.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  const activeCompliance: ComplianceResult = useMemo(() => validateCompliance(draft), [draft]);
  const proposalCompliance: ComplianceResult | null = useMemo(
    () => (proposal ? validateCompliance(proposal.rewritten) : null),
    [proposal],
  );

  const diff = useMemo(
    () => (proposal ? diffLines(draft, proposal.rewritten) : []),
    [draft, proposal],
  );

  const visibleIssues = useMemo(
    () => (proposal?.issues ?? []).filter((issue) => !dismissed.includes(issue.excerpt)),
    [proposal, dismissed],
  );

  const complianceScore = proposalCompliance
    ? Math.min(proposal!.score, proposalCompliance.score)
    : activeCompliance.score;

  const gateBlocked = claimGate ? !claimGate.allowed : false;
  const canApprove =
    !!proposal &&
    !approved &&
    complianceScore >= MIN_COMPLIANCE_SCORE &&
    proposalCompliance?.riskLevel !== 'HIGH' &&
    !gateBlocked;

  const runAgents = useCallback(async () => {
    if (!draft.trim()) {
      toast.error('Cole ou gere a copy ativa antes de pedir a revisão.');
      return;
    }
    setRunning(true);
    setApproved(false);
    setDismissed([]);
    try {
      const res = await fetch('/api/copy-qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: draft,
          ...(context ? { context } : {}),
          ...(campaignId ? { campaignId } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error || `Revisão falhou com HTTP ${res.status}`);
        return;
      }
      const payload = data?.data as CopyQaProposal | undefined;
      if (!payload?.rewritten) {
        toast.error('O agente respondeu sem proposta de reescrita.');
        return;
      }
      setProposal(payload);
      setTab('proposal');
      toast.success('Proposta de ajuste pronta para revisão.');
    } catch (e: any) {
      toast.error(e?.message || 'Erro de rede ao chamar o revisor.');
    } finally {
      setRunning(false);
    }
  }, [draft, context, campaignId]);

  const approve = async () => {
    if (!proposal || approving) return;
    setApproving(true);
    try {
      // O consumidor grava (ou lança). Só marcamos como aprovado depois que voltou.
      await onApprove?.(proposal.rewritten, visibleIssues);
      setApproved(true);
      setDraft(proposal.rewritten);
      setTab('active');
      toast.success(
        onApprove
          ? 'Correções aprovadas e gravadas na página.'
          : 'Correções aprovadas na versão em edição.',
      );
    } catch (e: any) {
      toast.error(e?.message || 'Não foi possível gravar a aprovação.');
    } finally {
      setApproving(false);
    }
  };

  const ignore = () => {
    setProposal(null);
    setDismissed([]);
    setApproved(false);
    setTab('active');
  };

  return (
    <Card className={`bg-[#1e293b] border-[#334155] ${className}`}>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-white">
              <Sparkles className="h-5 w-5 text-purple-400" />
              Proposta de ajuste dos agentes
            </CardTitle>
            <CardDescription className="text-slate-400">
              O revisor anti-slop compara a copy publicada com o que as referências injetadas sugerem.
              Nada entra na página sem a sua aprovação.
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Compliance Score</p>
            <p className={`text-2xl font-bold ${scoreTone(complianceScore)}`}>{complianceScore}%</p>
            <p className="text-[10px] text-slate-500">mínimo {MIN_COMPLIANCE_SCORE}% para aprovar</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="inline-flex rounded-lg border border-[#334155] bg-[#0f172a] p-1">
          <button
            type="button"
            onClick={() => setTab('active')}
            aria-pressed={tab === 'active'}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === 'active' ? 'bg-emerald-500/15 text-emerald-300' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Versão ativa
          </button>
          <button
            type="button"
            onClick={() => setTab('proposal')}
            disabled={!proposal}
            aria-pressed={tab === 'proposal'}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40 ${
              tab === 'proposal' ? 'bg-purple-500/15 text-purple-300' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Nova proposta da IA
            {proposal && visibleIssues.length > 0 && (
              <span className="ml-1.5 rounded bg-purple-500/25 px-1 text-[10px]">{visibleIssues.length}</span>
            )}
          </button>
        </div>

        {tab === 'active' && (
          <div className="space-y-2">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={10}
              placeholder="Cole aqui a headline e a copy que estão no ar. O agente compara com as referências injetadas."
              className="bg-[#0f172a] border-[#334155] font-mono text-xs text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:ring-emerald-500/10"
            />
            <p className="text-[11px] text-slate-500">
              {draft.trim().length} caracteres · {draft.trim() ? draft.trim().split(/\s+/).length : 0} palavras
            </p>
          </div>
        )}

        {tab === 'proposal' && proposal && (
          <div className="space-y-4">
            {visibleIssues.length === 0 ? (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-3 text-xs text-emerald-300">
                <ShieldCheck className="h-4 w-4" />
                O revisor não encontrou trechos a reescrever nesta versão.
              </div>
            ) : (
              <div className="space-y-2">
                {visibleIssues.map((issue, index) => (
                  <div key={`${issue.excerpt}-${index}`} className="rounded-lg border border-[#334155]/60 bg-[#0f172a] p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <Badge className="bg-purple-500/15 text-[10px] text-purple-300 hover:bg-purple-500/20">
                        {ISSUE_LABEL[issue.type] ?? issue.type}
                      </Badge>
                      <button
                        type="button"
                        onClick={() => setDismissed((prev) => [...prev, issue.excerpt])}
                        className="text-[11px] text-slate-500 transition-colors hover:text-slate-300"
                      >
                        descartar
                      </button>
                    </div>
                    <p className="rounded bg-rose-500/5 px-2 py-1 text-xs text-rose-300 line-through decoration-rose-500/60">
                      {issue.excerpt}
                    </p>
                    <p className="mt-1 rounded bg-emerald-500/5 px-2 py-1 text-xs text-emerald-300">
                      {issue.rewrite}
                    </p>
                    <p className="mt-1.5 text-[11px] text-slate-500">{issue.why}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="rounded-lg border border-[#334155]/60 bg-[#0f172a]">
              <p className="border-b border-[#334155]/60 px-3 py-2 text-[11px] uppercase tracking-wide text-slate-500">
                Diff completo
              </p>
              <div className="max-h-72 overflow-auto p-2 font-mono text-[11px] leading-relaxed">
                {diff.map((line, index) => (
                  <div
                    key={index}
                    className={
                      line.kind === 'removed'
                        ? 'whitespace-pre-wrap rounded bg-rose-500/10 px-2 py-0.5 text-rose-300 line-through decoration-rose-500/50'
                        : line.kind === 'added'
                          ? 'whitespace-pre-wrap rounded bg-emerald-500/10 px-2 py-0.5 text-emerald-300'
                          : 'whitespace-pre-wrap px-2 py-0.5 text-slate-500'
                    }
                  >
                    <span className="mr-2 select-none text-slate-600">
                      {line.kind === 'removed' ? '-' : line.kind === 'added' ? '+' : ' '}
                    </span>
                    {line.text || ' '}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {(activeCompliance.issues.length > 0 || proposalCompliance) && (
          <div
            className={`space-y-2 rounded-lg border p-3 ${
              complianceScore >= MIN_COMPLIANCE_SCORE
                ? 'border-emerald-500/25 bg-emerald-500/5'
                : 'border-rose-500/30 bg-rose-500/5'
            }`}
          >
            <p className="flex items-center gap-2 text-xs font-medium text-white">
              {complianceScore >= MIN_COMPLIANCE_SCORE ? (
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
              ) : (
                <ShieldAlert className="h-4 w-4 text-rose-400" />
              )}
              Sentinel de compliance
              <Badge
                className={`text-[10px] ${
                  (proposalCompliance ?? activeCompliance).riskLevel === 'HIGH'
                    ? 'bg-rose-500/15 text-rose-300 hover:bg-rose-500/20'
                    : (proposalCompliance ?? activeCompliance).riskLevel === 'MEDIUM'
                      ? 'bg-amber-500/15 text-amber-300 hover:bg-amber-500/20'
                      : 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/20'
                }`}
              >
                risco {(proposalCompliance ?? activeCompliance).riskLevel}
              </Badge>
            </p>
            {(proposalCompliance ?? activeCompliance).issues.map((issue, index) => (
              <div key={index} className="rounded border border-[#334155]/60 bg-[#0f172a] p-2">
                <p className="text-[11px] text-rose-300">
                  linha {issue.line}: <span className="text-slate-300">{issue.text}</span>
                </p>
                <p className="mt-1 text-[11px] text-slate-500">{issue.explanation}</p>
                <p className="mt-1 text-[11px] text-emerald-400">→ {issue.suggestion}</p>
              </div>
            ))}
          </div>
        )}

        {claimGate && !claimGate.allowed && (
          <div className="space-y-1.5 rounded-lg border border-rose-500/30 bg-rose-500/5 p-3">
            <p className="flex items-center gap-2 text-xs font-medium text-rose-300">
              <CircleAlert className="h-4 w-4" />
              Claim gate (ebook-os) bloqueou {claimGate.issues.length} claim(s)
            </p>
            {claimGate.issues.map((issue, index) => (
              <p key={index} className="text-[11px] text-slate-400">
                <span className="text-rose-400">{issue.code}</span> — {issue.message}
              </p>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 border-t border-[#334155] pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={runAgents}
            disabled={running}
            className="gap-2 border-[#334155] bg-transparent text-slate-200 hover:bg-[#0f172a] hover:text-white"
          >
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {running ? 'Revisando' : proposal ? 'Revisar de novo' : 'Pedir revisão dos agentes'}
          </Button>

          <Button
            type="button"
            onClick={approve}
            disabled={!canApprove || approving}
            className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40"
          >
            {approving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {approving ? 'Gravando' : 'Aprovar correções sugeridas pelos agentes'}
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={ignore}
            disabled={!proposal}
            className="gap-2 text-slate-400 hover:bg-[#0f172a] hover:text-white"
          >
            <X className="h-4 w-4" />
            Ignorar
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              navigator.clipboard.writeText(approved ? draft : (proposal?.rewritten ?? draft));
              toast.success('Copy copiada.');
            }}
            className="gap-2 text-slate-400 hover:bg-[#0f172a] hover:text-white"
          >
            <Copy className="h-4 w-4" />
            Copiar
          </Button>

          {approved && (
            <span className="flex items-center gap-1 text-[11px] text-emerald-400">
              <Check className="h-3 w-3" /> aplicado à versão em edição
            </span>
          )}
        </div>

        {proposal && !canApprove && !approved && (
          <p className="flex items-start gap-1.5 text-[11px] text-rose-400">
            <CircleAlert className="mt-0.5 h-3 w-3 shrink-0" />
            {gateBlocked
              ? 'Aprovação travada pelo claim gate: resolva as claims bloqueadas no Product Studio antes de publicar.'
              : `Aprovação travada: score ${complianceScore}% abaixo do mínimo de ${MIN_COMPLIANCE_SCORE}%. Reescreva os trechos destacados acima e peça nova revisão.`}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default AiProposalPanel;
