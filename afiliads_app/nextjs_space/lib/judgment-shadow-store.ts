import { prisma } from './prisma';

// Persistência do modo sombra. Regra única e não negociável: gravar telemetria NUNCA pode
// atrapalhar o fluxo que está sendo medido. Qualquer erro aqui é engolido com um warn — uma
// campanha não falha porque a medição falhou.
//
// Roda em lote (createMany) porque uma verificação de checklist produz 4 comparações de uma vez.

export type ShadowRow = {
  scope: 'bridge-checklist' | 'claim-reuse' | 'sales-page' | 'vendor-proibicao' | 'normalizacao';
  item: string;
  heuristic: string;
  judgment: string;
  agrees: boolean;
  probability?: number | null;
  contextId?: string | null;
  note?: string | null;
};

export async function recordShadowRows(rows: ShadowRow[]): Promise<void> {
  if (rows.length === 0) return;
  try {
    await prisma.judgmentShadow.createMany({
      data: rows.map((r) => ({
        scope: r.scope,
        item: r.item.slice(0, 200),
        heuristic: r.heuristic,
        judgment: r.judgment,
        agrees: r.agrees,
        probability: r.probability ?? null,
        contextId: r.contextId?.slice(0, 200) ?? null,
        note: r.note?.slice(0, 500) ?? null,
      })),
    });
  } catch (error: any) {
    // Tabela ainda não migrada, banco fora, proxy com porta velha — nada disso é problema do
    // chamador. Ver ~/.claude/CLAUDE.md sobre a porta do proxy Railway ficar desatualizada no .env.
    console.warn(`[typesafe-shadow] não foi possível gravar ${rows.length} linha(s): ${error?.message ?? error}`);
  }
}
