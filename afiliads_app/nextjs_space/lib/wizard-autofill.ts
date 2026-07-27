import { PLATFORMS, VERTICALS, GEOS, CHANNELS } from '@/lib/wizard-data';

export const FUNNELS = ['BRIDGE', 'DIRECT', 'REVIEW', 'SL'] as const;

export const SYSTEM_PROMPT = `Você é o Campaign Setup Strategist do AfiliAds. Sua tarefa é pegar o dossiê de pesquisa de um produto de afiliados (ou os dados de uma campanha em andamento) e preencher os campos operacionais do Wizard de Nova Campanha com os melhores valores possíveis, para que o afiliado possa revisar e lançar rapidamente.

REGRAS:
- Escolha "platform", "vertical", "geo", "channel" e "funnel" ESTRITAMENTE dentre as opções permitidas fornecidas. Nunca invente uma opção fora da lista.
- Quando o dossiê já trouxer um valor numérico real (comissão, payout, CVR estimada), use exatamente esse valor — não invente um diferente.
- Quando faltar um dado, estime com base nas melhores práticas de marketing de afiliados (regra de 3x CPA, refund rate típico da vertical).
- Se o dossiê trouxer "estrategia_derivada", ela é RESTRIÇÃO, não sugestão: NUNCA escolha um "channel" presente em "canais_bloqueados" (é gate de compliance do vendor, não preferência). Prefira "canal_recomendado" e "funil_recomendado" quando fizerem sentido com o resto do dossiê.
- "testDuration", "budgetTest" e "budgetScale" devem seguir o "guia_de_budget" de "estrategia_derivada" quando presente — ele já ajusta a régua abaixo pelo estágio de funil (fundo de funil converte rápido e testa em menos dias; topo de funil precisa de mais amostra antes de julgar). Na ausência desse guia, use a régua padrão:
- "budgetTest" deve ficar entre $50 e $150, normalmente 1x a 2x o valor da comissão — nunca sugira valores muito acima disso para um teste inicial.
- "budgetScale" é o orçamento DIÁRIO só aplicado depois que o teste validar (decisão SCALE humana) — sugira 3x a 5x o budget diário de teste (budgetTest/dias de teste) se a economia da oferta (payout, CVR estimada) sustentar esse CPC; nunca sugira scale maior que o afiliado consegue perder com segurança.
- O nome da campanha deve seguir o padrão [REDE]_[VERTICAL]_[GEO]_[CANAL]_[FUNIL]_v1, usando as SIGLAS abaixo (nunca o nome por extenso):
  Rede: ClickBank=CB, BuyGoods=BG, MaxWeb=MW, Hotmart=HT, Eduzz=ED, Monetizze=MZ.
  Vertical: Weight Loss=WL, Nutra=NUTRA, Make Money=MMO, Relationships=REL, Health=HEALTH, Beauty=BEAUTY, Cursos BR=CURSO, Outro=OTHER.
  Exemplo correto: CB_WL_US_SEARCH_BRIDGE_v1.
- Para cada campo devolvido, escreva 1 frase curta em português explicando o porquê da escolha (rationale).
- Responda APENAS com JSON válido, sem markdown.`;

export function buildSchemaHint() {
  return `Responda no formato:
{
  "name": "string, nome de campanha no padrão REDE_VERTICAL_GEO_CANAL_FUNIL_v1",
  "platform": "uma de: ${PLATFORMS.join(', ')}",
  "vertical": "uma de: ${VERTICALS.join(', ')}",
  "geo": "uma de: ${GEOS.join(', ')}",
  "channel": "uma de: ${CHANNELS.join(', ')}",
  "funnel": "uma de: ${FUNNELS.join(', ')}",
  "commission": 0.0,
  "refundPct": 0.0,
  "aov": 0.0,
  "cvrExpected": 0.0,
  "budgetTest": 0.0,
  "testDuration": "48h|72h|5|7",
  "budgetScale": 0.0,
  "summary": "2-3 frases explicando a estratégia geral escolhida para essa campanha, incluindo a lógica de teste vs. scale",
  "rationale": {
    "name": "...", "platform": "...", "vertical": "...", "geo": "...", "channel": "...", "funnel": "...",
    "commission": "...", "refundPct": "...", "aov": "...", "cvrExpected": "...", "budgetTest": "...", "testDuration": "...", "budgetScale": "..."
  }
}`;
}

export function pickKeywordsFromResearch(keywords: any, chosenKeyword?: string | null) {
  if (!keywords || typeof keywords !== 'object') return { selected: [], negatives: [] };
  const selected: Array<{ keyword: string; layer: string; matchType: string; relevance: number; selected: boolean }> = [];
  const seen = new Set<string>();
  if (chosenKeyword) {
    selected.push({ keyword: chosenKeyword, layer: 'A', matchType: 'exact', relevance: 5, selected: true });
    seen.add(chosenKeyword.toLowerCase());
  }
  for (const layer of ['A', 'B', 'C', 'D']) {
    const items = keywords[`camada_${layer}`];
    if (!Array.isArray(items)) continue;
    const sorted = [...items].sort((a: any, b: any) => (b?.score ?? 0) - (a?.score ?? 0));
    for (const item of sorted.slice(0, 2)) {
      const kw = String(item?.kw ?? '').trim();
      if (!kw || seen.has(kw.toLowerCase())) continue;
      seen.add(kw.toLowerCase());
      selected.push({ keyword: kw, layer, matchType: layer === 'A' ? 'exact' : 'phrase', relevance: Math.max(1, Math.round((item?.score ?? 50) / 20)), selected: true });
    }
  }
  const negatives = Array.isArray(keywords.negativas) ? keywords.negativas.filter((n: any) => typeof n === 'string') : [];
  return { selected: selected.slice(0, 8), negatives };
}
