/**
 * R01: este helper morava dentro de app/api/daily-logs/route.ts. Um route handler do Next
 * só pode exportar os verbos HTTP e a config de rota; qualquer outro export quebra o build
 * com TS2344 na checagem de tipos das rotas. Mora aqui e é importado pela rota.
 */

/** Campos numéricos do DailyLog: ausentes no body ficam de fora do update (não viram 0). */
const CAMPOS_NUMERICOS = ['impressions', 'spend', 'clicks', 'hops', 'conversions', 'revenue', 'refunds'] as const;
/** Campos de texto: ausentes ficam de fora (não viram null). */
const CAMPOS_TEXTO = ['network', 'offerName', 'vertical', 'geo', 'channel', 'funnel', 'decision', 'notes'] as const;

export function buildPartialUpdate(body: Record<string, any>): Record<string, any> {
  const update: Record<string, any> = {};
  for (const campo of CAMPOS_NUMERICOS) {
    const valor = body?.[campo];
    if (valor === undefined || valor === null) continue;
    const n = Number(valor);
    if (Number.isFinite(n)) update[campo] = n;
  }
  for (const campo of CAMPOS_TEXTO) {
    const valor = body?.[campo];
    if (valor === undefined) continue;
    update[campo] = valor;
  }
  return update;
}
