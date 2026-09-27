import type { AnalyzedClaimItem } from './validations/market-research';
import { judgeBridgeCompliance, judgeClaimReuse, type JudgedVerdict } from './compliance-judgments';
import { isShadowModeOn } from './typesafe';
import { recordShadowRows } from './judgment-shadow-store';

// Modo sombra: roda o julgamento ao lado da heurística de regex/n-grama e registra a divergência,
// sem mudar nenhuma decisão. A regex continua sendo a autoridade até a concordância estar medida
// em campanhas reais — trocar primeiro e medir depois é como o app já se queimou antes
// (SAFE_DISCLAIMER_BOILERPLATE, 2026-07-27).
//
// Só roda com TYPESAFE_SHADOW=1. Fora isso, as funções retornam null na hora e não somam latência
// nem custo ao caminho do usuário.

const LOG_PREFIX = '[typesafe-shadow]';

export type ShadowDivergence = {
  item: string;
  regex: 'passou' | 'reprovou';
  judgment: JudgedVerdict;
  probability: number;
  note?: string;
};

export type ShadowReport = {
  scope: 'bridge-checklist' | 'claim-reuse';
  contextId?: string;
  total: number;
  agreements: number;
  divergences: ShadowDivergence[];
};

function logReport(report: ShadowReport) {
  const ctx = report.contextId ? ` ctx=${report.contextId}` : '';
  if (report.divergences.length === 0) {
    console.info(`${LOG_PREFIX} ${report.scope}${ctx} concordância total (${report.agreements}/${report.total})`);
    return;
  }
  for (const d of report.divergences) {
    console.warn(
      `${LOG_PREFIX} ${report.scope}${ctx} item=${d.item} regex=${d.regex} jev=${d.judgment} p=${d.probability.toFixed(2)}` +
        (d.note ? ` — ${d.note}` : ''),
    );
  }
  console.warn(
    `${LOG_PREFIX} ${report.scope}${ctx} ${report.divergences.length} divergência(s) de ${report.total} item(ns)`,
  );
}

/** Itens do checklist de bridge que existem nos dois caminhos. privacy_policy/ga4/ssl ficam fora
 * porque continuam determinísticos em código (presença de string/HTTP), sem julgamento. */
const ITENS_COMPARAVEIS = ['disclaimer', 'sem_claims', 'faq', 'resultados_variam'] as const;

export async function shadowBridgeChecklist(
  html: string | null,
  regexResults: Record<string, { passed: boolean; note?: string }>,
  contextId?: string,
): Promise<ShadowReport | null> {
  if (!isShadowModeOn() || !html) return null;

  const judged = await judgeBridgeCompliance(html);
  if (!judged) return null;

  const divergences: ShadowDivergence[] = [];
  let agreements = 0;
  for (const item of ITENS_COMPARAVEIS) {
    const regexPassed = regexResults[item]?.passed === true;
    const j = judged[item];
    const regexVerdict = regexPassed ? 'passou' : 'reprovou';
    if (j.verdict === regexVerdict) agreements += 1;
    else divergences.push({ item, regex: regexVerdict, judgment: j.verdict, probability: j.probability, note: j.note });
  }

  const report: ShadowReport = {
    scope: 'bridge-checklist',
    contextId,
    total: ITENS_COMPARAVEIS.length,
    agreements,
    divergences,
  };
  logReport(report);
  await recordShadowRows(
    ITENS_COMPARAVEIS.map((item) => {
      const j = judged[item];
      const regexVerdict = regexResults[item]?.passed === true ? 'passou' : 'reprovou';
      return {
        scope: 'bridge-checklist' as const,
        item,
        heuristic: regexVerdict,
        judgment: j.verdict,
        agrees: j.verdict === regexVerdict,
        probability: j.probability,
        contextId,
        note: j.note,
      };
    }),
  );
  return report;
}

export async function shadowClaimReuse(
  copy: unknown,
  claims: AnalyzedClaimItem[],
  regexViolations: Array<{ claim: string }>,
  contextId?: string,
): Promise<ShadowReport | null> {
  if (!isShadowModeOn()) return null;

  const judged = await judgeClaimReuse(copy, claims);
  if (!judged || judged.length === 0) return null;

  const flaggedByRegex = new Set(regexViolations.map((v) => v.claim));
  const divergences: ShadowDivergence[] = [];
  let agreements = 0;
  judged.forEach((j, index) => {
    const regexVerdict = flaggedByRegex.has(j.claim.claim) ? 'reprovou' : 'passou';
    if (j.verdict === regexVerdict) agreements += 1;
    else {
      divergences.push({
        item: `claim_${index}`,
        regex: regexVerdict,
        judgment: j.verdict,
        probability: j.probability,
        note: `"${j.claim.claim.slice(0, 80)}"`,
      });
    }
  });

  const report: ShadowReport = {
    scope: 'claim-reuse',
    contextId,
    total: judged.length,
    agreements,
    divergences,
  };
  logReport(report);
  await recordShadowRows(
    judged.map((j, index) => {
      const regexVerdict = flaggedByRegex.has(j.claim.claim) ? 'reprovou' : 'passou';
      return {
        scope: 'claim-reuse' as const,
        item: `claim_${index}`,
        heuristic: regexVerdict,
        judgment: j.verdict,
        agrees: j.verdict === regexVerdict,
        probability: j.probability,
        contextId,
        note: j.claim.claim,
      };
    }),
  );
  return report;
}
