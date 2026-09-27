import { noul } from '@typesafe-ai/sdk';
import type { AnalyzedClaimItem } from './validations/market-research';
import { askSystemOne, htmlToText, readNoul, type Verdict } from './typesafe';

// Julgamento de compliance de presell — contrapartida das regex de lib/complianceVerifier.ts.
//
// Por que existe: as regex de lá acumularam quatro correções em produção, todas pelo mesmo
// motivo (documentado nos comentários do arquivo): idioma só em português reprovava presell em
// inglês; 'cure'/'garantido' aparecem dentro do disclaimer OBRIGATÓRIO, então precisaram de
// checagem de negação nos 40 caracteres anteriores; \bnot\b não casa "isn't"; e a allowlist de
// frase exata quebrou na primeira variação de texto gerada pela IA. Todas são tentativas de
// emular "esta frase promete resultado?" com casamento de caractere.
//
// Aqui cada item do checklist é uma pergunta fechada. As perguntas rodam em paralelo numa única
// request; os thresholds ficam neste arquivo, em código, e a faixa do meio vira 'incerto' em vez
// de um booleano inventado.
//
// O que NÃO virou pergunta, de propósito: privacy_policy (presença de link) e ga4_configurado
// (presença de gtag config G-) continuam regex em complianceVerifier.ts — são presença literal
// de string, determinística e de graça. Julgamento só onde o significado importa.

/** Presença de um elemento obrigatório no texto (disclosure, FAQ, aviso). Errar pra mais aqui
 * é chato (item pedido de novo ao usuário), errar pra menos é grave (vai ao ar sem o aviso) —
 * por isso a barra de "passou" é alta. */
const PRESENCA_SIM = 0.7;
const PRESENCA_NAO = 0.3;

/** Claim proibida. Deixar passar derruba a conta do Google Ads; reprovar à toa custa uma
 * regeneração de presell. Assimetria proposital: reprova com 0.55. */
const CLAIM_SIM = 0.55;
const CLAIM_NAO = 0.25;

const ISENCAO_EXEMPLOS = [
  'Not intended to diagnose, treat, cure, or prevent any disease.',
  'Este produto não é um medicamento e não cura nenhuma doença.',
  "This isn't a cure — results vary from person to person.",
  'Resultados não são garantidos e variam de pessoa para pessoa.',
];

export const BRIDGE_JUDGMENT_QUESTIONS = {
  promete_resultado_garantido: noul(
    {
      question: 'O texto em `presell.texto` promete um resultado como certo, garantido ou com prazo definido?',
      focus: 'Julgue a promessa afirmada ao leitor, não a presença de uma palavra específica.',
    },
    {
      true: {
        what: 'Afirma que o leitor vai obter um resultado, ou garante resultado, perda de peso, ganho de dinheiro ou prazo',
        examples: [
          'Perca 10kg em duas semanas.',
          'Resultado garantido ou seu dinheiro de volta.',
          'Você vai eliminar a gordura abdominal em 7 dias.',
        ],
      },
      false: {
        what: 'Fala em possibilidade, entendimento ou comparação, ou nega a garantia',
        not_for: 'Frase de isenção de responsabilidade que só menciona garantia para negá-la',
        examples: [
          'Entenda como o suplemento funciona.',
          'Pode ajudar na retenção de líquido.',
          ...ISENCAO_EXEMPLOS,
        ],
      },
    },
  ),
  promete_cura_ou_tratamento: noul(
    {
      question: 'O texto em `presell.texto` afirma que o produto cura, trata ou elimina uma doença ou condição de saúde?',
      focus:
        'Distinga a afirmação de cura da frase de isenção obrigatória, que cita as mesmas palavras justamente para negá-las.',
    },
    {
      true: {
        what: 'Afirma cura, tratamento ou eliminação de doença/condição como efeito do produto',
        examples: [
          'Este suplemento cura o inchaço em 7 dias.',
          'Elimina a ansiedade de forma definitiva.',
          'Trata a causa raiz do diabetes.',
        ],
      },
      false: {
        what: 'Não afirma cura, ou cita cura/tratamento apenas dentro de uma isenção de responsabilidade',
        not_for: 'O disclaimer de saúde obrigatório, em qualquer fraseado ou idioma',
        examples: ISENCAO_EXEMPLOS,
      },
    },
  ),
  tem_disclosure_afiliado: noul(
    {
      question: 'O texto em `presell.texto` avisa que quem publica a página pode receber comissão de afiliado?',
      focus: 'Vale em qualquer idioma e qualquer fraseado, inclusive dentro de rodapé ou texto legal.',
    },
    {
      true: {
        what: 'Declara relação de afiliado, participação em programa de afiliados ou recebimento de comissão',
        examples: [
          'Este site participa de programas de afiliados e pode receber comissão.',
          'We may earn a commission from links on this page.',
          'Affiliate disclosure: we are compensated for referrals.',
        ],
      },
      false: {
        what: 'Não há aviso de relação de afiliado em nenhum ponto do texto',
        not_for: 'Aviso genérico de direitos autorais, política de privacidade ou termos de uso',
        examples: ['© 2026 Todos os direitos reservados.', 'Leia nossa política de privacidade.'],
      },
    },
  ),
  tem_faq: noul(
    {
      question: 'O texto em `presell.texto` tem uma seção de perguntas frequentes?',
      focus: 'Procure um bloco de perguntas com respostas, com ou sem o título "FAQ".',
    },
    {
      true: {
        what: 'Traz um conjunto de perguntas do leitor com as respostas correspondentes',
        examples: ['Perguntas frequentes: Quanto tempo leva para chegar? ...', 'FAQ — Is it safe? Yes, ...'],
      },
      false: {
        what: 'Não há bloco de perguntas e respostas',
        not_for: 'Uma pergunta retórica solta em headline ou copy',
        examples: ['Cansado de acordar inchada?'],
      },
    },
  ),
  avisa_resultados_variam: noul(
    {
      question: 'O texto em `presell.texto` avisa que os resultados individuais podem variar?',
      focus: 'Vale em qualquer idioma e fraseado, inclusive dentro do disclaimer.',
    },
    {
      true: {
        what: 'Declara que o resultado muda de pessoa para pessoa ou não é o mesmo para todos',
        examples: [
          'Resultados individuais podem variar.',
          'Individual results may vary.',
          'O que funcionou para ela pode não funcionar para você.',
        ],
      },
      false: {
        what: 'Não há aviso de variação de resultado',
        examples: ['Funciona para todo mundo.', 'Sem menção a resultados.'],
      },
    },
  ),
} as const;

export type JudgedVerdict = 'passou' | 'reprovou' | 'incerto';

export type JudgedItem = {
  verdict: JudgedVerdict;
  /** Probabilidade que decidiu o veredito (a maior, quando o item combina duas perguntas). */
  probability: number;
  note?: string;
};

/** Mesmas chaves dos itens de BRIDGE_CHECKLIST que hoje são regex de significado. */
export type JudgedBridgeChecklist = {
  disclaimer: JudgedItem;
  sem_claims: JudgedItem;
  faq: JudgedItem;
  resultados_variam: JudgedItem;
};

function presenca(probability: number, faltaNote: string): JudgedItem {
  const v: Verdict = readNoul(probability, PRESENCA_SIM, PRESENCA_NAO);
  if (v === 'sim') return { verdict: 'passou', probability };
  if (v === 'nao') return { verdict: 'reprovou', probability, note: faltaNote };
  return { verdict: 'incerto', probability, note: `${faltaNote} (julgamento inconclusivo, p=${probability.toFixed(2)})` };
}

/**
 * Julga os itens de significado do checklist de bridge page a partir do HTML da presell.
 * Devolve null quando não há chave configurada ou o serviço falhou — quem chama segue com regex.
 */
export async function judgeBridgeCompliance(html: string): Promise<JudgedBridgeChecklist | null> {
  const texto = htmlToText(html);
  if (!texto) return null;

  const res = await askSystemOne({ presell: { texto } }, BRIDGE_JUDGMENT_QUESTIONS, {
    label: 'judgeBridgeCompliance',
  });
  if (!res) return null;

  const a = res.answers;
  const pGarantia = a.promete_resultado_garantido.noul;
  const pCura = a.promete_cura_ou_tratamento.noul;
  // Duas perguntas atômicas, uma decisão: qualquer uma delas alta reprova o item. Regra "any
  // serious violation" — soma ponderada esconderia uma promessa de cura atrás de uma copy
  // conservadora no resto.
  const pClaim = Math.max(pGarantia, pCura);
  const claimVerdict = readNoul(pClaim, CLAIM_SIM, CLAIM_NAO);
  const qualClaim = pCura >= pGarantia ? 'afirmação de cura/tratamento' : 'promessa de resultado garantido';

  return {
    disclaimer: presenca(a.tem_disclosure_afiliado.noul, 'Disclosure de afiliado não encontrada no texto da presell'),
    faq: presenca(a.tem_faq.noul, 'Seção de FAQ não encontrada no texto da presell'),
    resultados_variam: presenca(a.avisa_resultados_variam.noul, 'Aviso de que resultados variam não encontrado no texto da presell'),
    sem_claims:
      claimVerdict === 'sim'
        ? { verdict: 'reprovou', probability: pClaim, note: `Claim proibida no texto: ${qualClaim} (p=${pClaim.toFixed(2)})` }
        : claimVerdict === 'nao'
          ? { verdict: 'passou', probability: pClaim }
          : { verdict: 'incerto', probability: pClaim, note: `Possível ${qualClaim} — revisar manualmente (p=${pClaim.toFixed(2)})` },
  };
}

// ---------------------------------------------------------------------------
// Reuso de claim de concorrente (substitui os n-gramas de significantShingles)
// ---------------------------------------------------------------------------
// O casamento por n-grama de 4 palavras com stopwords só pega paráfrase que preserva a ordem
// das palavras — tradução PT↔EN da mesma claim não casa nenhum shingle, e o dossiê de mercado
// mistura os dois idiomas. Uma pergunta por claim HIGH resolve isso sem lista de stopwords.
//
// O id da pergunta carrega o índice da claim, então a resposta volta já ligada à claim certa:
// nada de reencontrar a frase por string na volta, que é o que quebra no padrão prompt-and-parse.

const REUSO_QUESTION = 'O texto em `copy_gerada` reproduz a ideia de `claim_proibida`, inclusive traduzida, parafraseada ou com sinônimos?';

export type ClaimReuseJudgment = {
  claim: AnalyzedClaimItem;
  probability: number;
  verdict: JudgedVerdict;
};

export function claimReuseQuestions(claims: AnalyzedClaimItem[]) {
  const questions: Record<string, ReturnType<typeof noul>> = {};
  claims.forEach((item, index) => {
    questions[`reusa_claim_${index}`] = noul(
      {
        question: REUSO_QUESTION,
        claim_proibida: {
          frase: item.claim,
          por_que_e_proibida: item.justification,
        },
        focus: 'Julgue se a mesma promessa aparece, não se as palavras coincidem.',
      },
      {
        true: {
          what: 'A mesma promessa aparece no texto, em qualquer fraseado, idioma ou ordem',
          examples: ['a claim copiada literalmente', 'a claim traduzida para outro idioma', 'a claim reescrita com sinônimos'],
        },
        false: {
          what: 'O texto não faz essa promessa',
          not_for: 'Tratar do mesmo assunto ou vertical sem repetir a promessa',
          examples: ['fala da mesma dor mas sem prometer o resultado', 'usa linguagem condicional sobre o mesmo tema'],
        },
      },
    );
  });
  return questions;
}

// ---------------------------------------------------------------------------
// Brand bidding em copy de anúncio (título/descrição de RSA)
// ---------------------------------------------------------------------------
// O gate determinístico de lib/launch/google-adapter.ts:119 compara por substring exata e roda
// no lançamento — pega "Compre MarcaX hoje" e derruba o lançamento inteiro, mas passa batido em
// "Marca X", "marcax oficial", "MarkaX" ou plural. Aqui a mesma proibição é julgada na hora da
// GERAÇÃO, pra o item sair da lista antes de chegar ao lançamento. O gate do adapter continua
// sendo a última barreira — julgamento não substitui o bloqueio determinístico, antecipa.

const BRAND_QUESTION = 'O texto em `anuncio` usa o nome da marca ou do produto listado em `termos_proibidos`?';

export type AdCopyJudgment = { texto: string; probability: number; verdict: JudgedVerdict };

export function adCopyBrandQuestions(itens: string[]) {
  const questions: Record<string, ReturnType<typeof noul>> = {};
  itens.forEach((texto, index) => {
    questions[`usa_marca_${index}`] = noul(
      {
        anuncio: texto,
        question: BRAND_QUESTION,
        focus: 'Conta qualquer forma de citar a marca, não só a grafia exata.',
      },
      {
        true: {
          what: 'Cita a marca/produto proibido em qualquer forma: grafia errada, plural, separado, junto, com ou sem acento',
          examples: ['Compre MarcaX hoje', 'Marca X original', 'marcax funciona?', 'MarkaX oficial'],
        },
        false: {
          what: 'Fala só da categoria, do benefício ou do problema, sem nomear a marca proibida',
          not_for: 'Citar a marca de forma disfarçada',
          examples: ['Suplemento para retenção de líquido', 'Compare opções naturais', 'Entenda como funciona'],
        },
      },
    );
  });
  return questions;
}

/** Julga cada título/descrição contra os termos que o vendor proíbe (brand bidding). */
export async function judgeAdCopyBrandBidding(
  itens: string[],
  termosProibidos: string[],
): Promise<AdCopyJudgment[] | null> {
  const termos = termosProibidos.map((t) => String(t ?? '').trim()).filter(Boolean);
  const textos = itens.map((t) => String(t ?? '').trim()).filter(Boolean);
  if (termos.length === 0 || textos.length === 0) return [];

  const res = await askSystemOne({ termos_proibidos: termos }, adCopyBrandQuestions(textos), {
    label: 'judgeAdCopyBrandBidding',
    timeoutMs: 15000,
  });
  if (!res) return null;

  const answers = res.answers as Record<string, { noul: number }>;
  return textos.map((texto, index) => {
    const probability = answers[`usa_marca_${index}`]?.noul ?? 0;
    const v = readNoul(probability, CLAIM_SIM, CLAIM_NAO);
    return { texto, probability, verdict: v === 'sim' ? 'reprovou' : v === 'nao' ? 'passou' : 'incerto' };
  });
}

/**
 * Julga, claim por claim, se a copy gerada reproduz uma claim de risco ALTO.
 * `copy` pode ser o objeto de conteúdo da presell — o estado estruturado é melhor pergunta que
 * o JSON.stringify que a regex recebe.
 */
export async function judgeClaimReuse(
  copy: unknown,
  claims: AnalyzedClaimItem[],
): Promise<ClaimReuseJudgment[] | null> {
  const high = claims.filter((c) => c.riskLevel === 'HIGH' && c.claim.trim());
  if (high.length === 0) return [];

  const res = await askSystemOne(
    { copy_gerada: (copy ?? null) as any },
    claimReuseQuestions(high),
    { label: 'judgeClaimReuse' },
  );
  if (!res) return null;

  return high.map((claim, index) => {
    const probability = (res.answers as Record<string, { noul: number }>)[`reusa_claim_${index}`]?.noul ?? 0;
    const v = readNoul(probability, CLAIM_SIM, CLAIM_NAO);
    return {
      claim,
      probability,
      verdict: v === 'sim' ? 'reprovou' : v === 'nao' ? 'passou' : 'incerto',
    };
  });
}
