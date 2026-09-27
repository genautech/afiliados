import { isShadowModeOn } from './typesafe';
import { recordShadowRows } from './judgment-shadow-store';
import { judgeSalesPageType, judgeVendorProhibitions, type VendorProhibitionJudgment } from './strategy-judgments';

// Modo sombra das decisões de estratégia: julgamento roda ao lado da heurística de string e a
// divergência vai pro log. A heurística continua decidindo — igual ao piloto de compliance
// (lib/compliance-shadow.ts). Só com TYPESAFE_SHADOW=1.

const LOG_PREFIX = '[typesafe-shadow]';

export type SalesPageShadow = {
  heuristica: string;
  julgamento: string;
  confidence: number;
  concorda: boolean;
};

/** classifySalesPage() decide por presença de tag (<video> ⇒ VSL) e por texto de botão em
 * português. O valor vira ProductResearch.salesPageType e decide o tipo de presell. */
export async function shadowSalesPageType(
  html: string | null,
  heuristica: string,
  contextId?: string,
): Promise<SalesPageShadow | null> {
  if (!isShadowModeOn() || !html) return null;

  const judged = await judgeSalesPageType(html);
  if (!judged) return null;

  const julgamento = judged.usable ? judged.value! : `${judged.raw}(confiança baixa)`;
  const concorda = judged.usable && judged.value === heuristica;
  const ctx = contextId ? ` ctx=${contextId}` : '';
  if (concorda) {
    console.info(`${LOG_PREFIX} sales-page${ctx} os dois dizem ${heuristica} (conf=${judged.confidence.toFixed(2)})`);
  } else {
    console.warn(
      `${LOG_PREFIX} sales-page${ctx} heuristica=${heuristica} jev=${julgamento} conf=${judged.confidence.toFixed(2)} probs=${JSON.stringify(judged.probabilities)}`,
    );
  }
  await recordShadowRows([{
    scope: 'sales-page',
    item: 'tipo_sales_page',
    heuristic: heuristica,
    judgment: julgamento,
    agrees: concorda,
    probability: judged.confidence,
    contextId,
  }]);
  return { heuristica, julgamento, confidence: judged.confidence, concorda };
}

export type ProhibitionShadow = {
  regra: string;
  heuristica: 'canal_inteiro' | 'apenas_termo_de_marca';
  julgamento: string;
  confidence: number;
  concorda: boolean;
};

/**
 * deriveBlockedChannels() decide o escopo da proibição do vendor com
 * /\b(bid|keyword|termo|marca|palavra)\b/: se casar, trata como brand bidding; se não, bloqueia o
 * canal inteiro. `heuristicaPorRegra` é o veredito atual por regra, na mesma ordem de `regras`.
 */
export async function shadowVendorProhibitions(
  regras: string[],
  produto: string,
  heuristicaPorRegra: Array<'canal_inteiro' | 'apenas_termo_de_marca'>,
  contextId?: string,
): Promise<ProhibitionShadow[] | null> {
  if (!isShadowModeOn() || regras.length === 0) return null;

  const judged = await judgeVendorProhibitions(regras, produto);
  if (!judged || judged.length === 0) return null;
  return compareVendorProhibitions(judged, heuristicaPorRegra, contextId);
}

/** Mesma comparação, para quem já tem o julgamento em mão — deriveCampaignStrategy pede as
 * proibições na mesma request da normalização (judgeStrategyInputs), então não pode disparar
 * outra. Roda mesmo fora do modo sombra: quem já pagou pela resposta deve registrar a divergência. */
export async function compareVendorProhibitions(
  judged: VendorProhibitionJudgment[],
  heuristicaPorRegra: Array<'canal_inteiro' | 'apenas_termo_de_marca'>,
  contextId?: string,
): Promise<ProhibitionShadow[] | null> {
  if (judged.length === 0) return null;
  const ctx = contextId ? ` ctx=${contextId}` : '';
  const out: ProhibitionShadow[] = judged.map((j, index) => {
    const heuristica = heuristicaPorRegra[index] ?? 'canal_inteiro';
    const julgamento = j.escopo.usable ? j.escopo.value! : `${j.escopo.raw}(confiança baixa)`;
    const concorda = j.escopo.usable && j.escopo.value === heuristica;
    if (!concorda) {
      const canal = j.escopo.value === 'canal_inteiro' && j.canal.usable ? ` canal=${j.canal.value}` : '';
      console.warn(
        `${LOG_PREFIX} vendor-proibicao${ctx} regra="${j.regra.slice(0, 70)}" heuristica=${heuristica} jev=${julgamento}${canal} conf=${j.escopo.confidence.toFixed(2)}`,
      );
    }
    return { regra: j.regra, heuristica, julgamento, confidence: j.escopo.confidence, concorda };
  });

  const divergentes = out.filter((o) => !o.concorda).length;
  if (divergentes === 0) {
    console.info(`${LOG_PREFIX} vendor-proibicao${ctx} concordância total (${out.length}/${out.length})`);
  }
  await recordShadowRows(
    out.map((o, index) => ({
      scope: 'vendor-proibicao' as const,
      item: `regra_${index}`,
      heuristic: o.heuristica,
      judgment: o.julgamento,
      agrees: o.concorda,
      probability: o.confidence,
      contextId,
      note: o.regra,
    })),
  );
  return out;
}

/** Divergência na normalização de texto livre → enum (tipo de presell, funil, canal). O julgamento
 * é o caminho principal nesses três; a heurística de includes() ficou como fallback. Registrar a
 * divergência é o que permite auditar depois se a troca foi boa. */
export async function logNormalizationDivergence(
  campo: 'tipo_presell' | 'funil' | 'canal',
  heuristica: string | null,
  julgamento: string | null,
  confidence: number,
  contextId?: string,
): Promise<void> {
  const concorda = heuristica === julgamento;
  if (!concorda) {
    const ctx = contextId ? ` ctx=${contextId}` : '';
    console.warn(
      `${LOG_PREFIX} normalizacao${ctx} campo=${campo} heuristica=${heuristica ?? 'null'} jev=${julgamento ?? 'null'} conf=${confidence.toFixed(2)}`,
    );
  }
  // Grava concordância também: a taxa de acerto só significa algo com o denominador inteiro.
  await recordShadowRows([{
    scope: 'normalizacao',
    item: campo,
    heuristic: heuristica ?? 'null',
    judgment: julgamento ?? 'null',
    agrees: concorda,
    probability: confidence,
    contextId,
  }]);
}
