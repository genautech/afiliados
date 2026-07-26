import { callAgent } from './llm';

export interface RsaResult {
  titles: string[];
  descriptions: string[];
  warnings?: string[];
}

function validateRsa(data: any): string | null {
  if (!data || !Array.isArray(data.titles) || !Array.isArray(data.descriptions)) {
    return 'JSON sem os arrays titles/descriptions';
  }
  const badTitles = data.titles.filter((t: any) => typeof t !== 'string' || t.length > 30);
  if (badTitles.length > 0) return `${badTitles.length} título(s) com mais de 30 caracteres: ${badTitles.slice(0, 3).map((t: string) => `"${t}" (${t.length})`).join(', ')}`;
  const badDescs = data.descriptions.filter((d: any) => typeof d !== 'string' || d.length > 90);
  if (badDescs.length > 0) return `${badDescs.length} descrição(ões) com mais de 90 caracteres`;
  return null;
}

const SYSTEM_PROMPT = `Você é um especialista sênior em Google Ads e copywriting para afiliados ClickBank, BuyGoods, MaxWeb e Hotmart.
Gere RSAs (Responsive Search Ads) que maximizam o CTR enquanto mantêm total compliance com as políticas de publicidade do Google Ads.

ESTRUTURA DE TÍTULOS (Gere exatamente 15 títulos, máximo de 30 caracteres cada):
Use fórmulas diversificadas baseadas no nível de consciência e intenção de busca:
1. Keyword + Benefício (ex: {Keyword} Guia Completo)
2. Ação + Resultado (ex: Economize Tempo com {Keyword})
3. Pergunta de Curiosidade (ex: Cansado de Manual {Keyword}?)
4. Número ou Prova Social (ex: +500 Clientes Testaram)
5. CTA Suave/Informativo (ex: Compare Prós e Contras, Veja Como Funciona)

ESTRUTURA DE DESCRIÇÕES (Gere exatamente 4 descrições, máximo de 90 caracteres cada):
Use os seguintes frameworks de copywriting estabelecidos nas estratégias de Paid Ads:
- Descrição 1 - Problem-Agitate-Solve (PAS): Destaque a dor principal, agite o problema e apresente a solução de forma condicional.
- Descrição 2 - Before-After-Bridge (BAB): Contraste o estado antes e depois do uso do produto, usando o produto como ponte.
- Descrição 3 - Social Proof Lead: Testemunho ou estatística de satisfação de clientes que já testaram.
- Descrição 4 - CTA Informativo com Urgência Ética: Incentivo ao clique sem prometer milagres ("Acesse o Guia Completo", "Veja a Análise Oficial").

REGRAS DE COMPLIANCE E TRADEMARK (CRÍTICO):
- NÃO use claims absolutos como "cure", "guaranteed", "100%", "get rich quick", "corta gordura em 1 dia", "renda garantida".
- Use exclusivamente linguagem condicional: "pode ajudar", "entenda como funciona", "descubra opções", "compare alternativas".
- Se houver proibição de Trademark (marca do produto) nos termos do produtor, gere termos genéricos focados no benefício ou na categoria.

Responda APENAS com JSON válido no formato:
{
  "titles": ["titulo1", "titulo2", ...],
  "descriptions": ["desc1", "desc2", "desc3", "desc4"],
  "warnings": ["avisos sobre compliance, limites de caracteres excedidos ou marcas registradas detectadas"]
}

Responda com JSON puro, sem blocos markdown ou explicações.`;

export async function generateRsaCopy(userId: string, args: { keyword: string; benefit?: string; angle?: string; vertical?: string }): Promise<RsaResult> {
  const userPrompt = `Gere um RSA para:
- Keyword principal: ${args.keyword}
- Benefício: ${args.benefit ?? 'geral'}
- Ângulo: ${args.angle ?? 'informativo'}
- Vertical: ${args.vertical ?? 'geral'}

Lembre: títulos max 30 chars, descrições max 90 chars. JSON puro.`;

  let result: RsaResult;
  try {
    const res = await callAgent(userId, { agent: 'cro-copywriter', systemPrompt: SYSTEM_PROMPT, userPrompt, validate: validateRsa });
    result = res.data;
  } catch (e: any) {
    result = { titles: [], descriptions: [], warnings: [e?.message ?? 'Erro na geração'] };
  }

  if (result && Array.isArray(result.titles)) {
    const truncated: string[] = [];
    result.titles = result.titles.map((t: string) => {
      if (t.length > 30) { truncated.push(t); return t.slice(0, 30); }
      return t;
    });
    result.descriptions = (result.descriptions ?? []).map((d: string) => (d.length > 90 ? d.slice(0, 90) : d));
    if (truncated.length > 0) {
      result.warnings = [...(result.warnings ?? []), `${truncated.length} título(s) truncado(s) em 30 chars após falha de validação`];
    }
  }

  return result;
}
