/**
 * Mede o caminho de julgamento (lib/compliance-judgments.ts) contra as regex de
 * lib/complianceVerifier.ts nos casos que já quebraram em produção — os que estão documentados
 * nos comentários do próprio complianceVerifier.ts e no histórico em hermes/knowledge/insights/.
 *
 * Uso:
 *   npx tsx --require dotenv/config scripts/typesafe-compliance-shadow.ts
 *
 * Chama a API do TypeSafe de verdade (uma request por caso, todas as perguntas em paralelo dentro
 * dela). Não toca no banco e não muda nada no app: só imprime a comparação.
 */
import { evaluateBridgeHtmlRegex, enforceCompliance } from '../lib/complianceVerifier';
import { judgeBridgeCompliance, judgeClaimReuse } from '../lib/compliance-judgments';
import { isTypeSafeEnabled } from '../lib/typesafe';
import type { AnalyzedClaimItem } from '../lib/validations/market-research';

type Esperado = 'passou' | 'reprovou';

type CasoBridge = {
  nome: string;
  origem: string;
  html: string;
  /** Veredito correto por item, definido por quem conhece a política do Google Ads. */
  esperado: Partial<Record<'disclaimer' | 'sem_claims' | 'faq' | 'resultados_variam', Esperado>>;
};

const DISCLOSURE_PT = 'Este site participa de programas de afiliados e pode receber comissão pelas indicações.';
const DISCLOSURE_EN = 'Affiliate disclosure: we may earn a commission from purchases made through links on this page.';
const FAQ_PT = '<h2>Perguntas frequentes</h2><p>Quanto tempo leva para chegar? De 3 a 7 dias úteis.</p><p>Tem garantia? Sim, 60 dias.</p>';
const FAQ_EN = '<h2>Questions people ask</h2><p>How long does shipping take? Three to seven business days.</p><p>Is there a refund window? Yes, 60 days.</p>';
const VARIAM_PT = 'Resultados individuais podem variar de pessoa para pessoa.';
const VARIAM_EN = 'Results are not the same for everyone and depend on routine and consistency.';

const CASOS_BRIDGE: CasoBridge[] = [
  {
    nome: 'presell EN completa e conservadora',
    origem: 'bug de 2026-07-27: regex só em português reprovava os avisos corretos em inglês',
    html: `<html><body><h1>What to know before trying a lymphatic supplement</h1>
      <p>This is an informational review. It may help with fluid retention for some people.</p>
      ${FAQ_EN}
      <p>${VARIAM_EN}</p>
      <p>${DISCLOSURE_EN}</p>
      <p>This product is not intended to diagnose, treat, cure, or prevent any disease.</p>
    </body></html>`,
    esperado: { disclaimer: 'passou', faq: 'passou', resultados_variam: 'passou', sem_claims: 'passou' },
  },
  {
    nome: 'disclaimer de saúde obrigatório (EN)',
    origem: 'bug de 2026-07-27: "cure" dentro da isenção reprovava a presell certa',
    html: `<html><body><p>Understand how the formula works.</p>
      <p>These statements have not been evaluated by the FDA. This product is not intended to diagnose, treat, cure, or prevent any disease.</p>
      ${FAQ_EN}<p>${VARIAM_EN}</p><p>${DISCLOSURE_EN}</p></body></html>`,
    esperado: { sem_claims: 'passou' },
  },
  {
    nome: 'negação com contração ("isn\'t a cure")',
    origem: '2ª ocorrência de 2026-07-27: \\bnot\\b não casa "isn\'t"',
    html: `<html><body><p>Let's be clear: this isn't a cure, and nothing here is guaranteed.</p>
      ${FAQ_EN}<p>${VARIAM_EN}</p><p>${DISCLOSURE_EN}</p></body></html>`,
    esperado: { sem_claims: 'passou' },
  },
  {
    nome: 'promessa de resultado com prazo (PT)',
    origem: 'claim que a regex BANNED_CLAIM_RE pega — controle de verdadeiro positivo',
    html: `<html><body><h1>Perca 10kg em duas semanas com este ritual matinal</h1>
      <p>Resultado garantido ou seu dinheiro de volta.</p>${FAQ_PT}<p>${DISCLOSURE_PT}</p></body></html>`,
    esperado: { sem_claims: 'reprovou', resultados_variam: 'reprovou' },
  },
  {
    nome: 'promessa de cura afirmada (PT)',
    origem: 'testTask do Compliance Sentinel em lib/agents.ts',
    html: `<html><body><h1>Este suplemento cura o inchaço em 7 dias, garantido</h1>
      <p>Restam 3 unidades.</p>${FAQ_PT}<p>${VARIAM_PT}</p><p>${DISCLOSURE_PT}</p></body></html>`,
    esperado: { sem_claims: 'reprovou' },
  },
  {
    nome: 'promessa implícita sem termo banido (EN)',
    origem: 'ponto cego da regex: promete resultado sem usar nenhuma palavra da lista',
    html: `<html><body><h1>Drop two dress sizes before the holidays — every single reader who tried it did</h1>
      <p>You will see the difference in the mirror by day ten.</p>${FAQ_EN}<p>${DISCLOSURE_EN}</p></body></html>`,
    esperado: { sem_claims: 'reprovou', resultados_variam: 'reprovou' },
  },
  {
    nome: 'presell PT sem disclosure nem FAQ',
    origem: 'caso simples de ausência real — os dois caminhos deveriam reprovar',
    html: '<html><body><h1>Entenda como funciona o suplemento</h1><p>Pode ajudar na retenção de líquido.</p></body></html>',
    esperado: { disclaimer: 'reprovou', faq: 'reprovou', resultados_variam: 'reprovou', sem_claims: 'passou' },
  },
  {
    nome: 'FAQ sem o título "Perguntas frequentes"',
    origem: 'ponto cego da regex FAQ_RE: bloco de perguntas com outro título',
    html: `<html><body><h1>Análise honesta</h1>
      <h2>Dúvidas de quem já comprou</h2><p>Funciona para homens? Sim.</p><p>Tem efeito colateral? Não relatado.</p><p>Quanto custa o frete? Grátis acima de R$200.</p>
      <p>${VARIAM_PT}</p><p>${DISCLOSURE_PT}</p></body></html>`,
    esperado: { faq: 'passou', sem_claims: 'passou' },
  },
];

const claimPT: AnalyzedClaimItem = {
  claim: 'Elimina a gordura abdominal em 7 dias sem dieta',
  sourceCompetitor: 'concorrente-x.com',
  riskLevel: 'HIGH',
  justification: 'Promessa de resultado com prazo definido, sem base.',
};

type CasoClaim = { nome: string; origem: string; copy: Record<string, string>; esperado: Esperado };

const CASOS_CLAIM: CasoClaim[] = [
  {
    nome: 'cópia literal da claim',
    origem: 'controle: o shingle pega',
    copy: { headline: 'Elimina a gordura abdominal em 7 dias sem dieta', secao1_texto: 'Veja como.' },
    esperado: 'reprovou',
  },
  {
    nome: 'paráfrase com a ordem preservada',
    origem: 'controle: o shingle de 4 palavras pega',
    copy: { headline: 'O método promete eliminar a gordura abdominal em 7 dias de forma natural' },
    esperado: 'reprovou',
  },
  {
    nome: 'mesma claim traduzida pro inglês',
    origem: 'ponto cego do n-grama: nenhuma janela de 4 palavras casa entre idiomas',
    copy: { headline: 'Burn belly fat in one week with no diet at all' },
    esperado: 'reprovou',
  },
  {
    nome: 'mesma promessa reescrita com sinônimos',
    origem: 'ponto cego do n-grama: promessa igual, palavras diferentes',
    copy: { headline: 'Barriga chapada em uma semana sem mudar o que você come' },
    esperado: 'reprovou',
  },
  {
    nome: 'mesmo tema, sem a promessa',
    origem: 'controle de falso positivo: fala da mesma dor em linguagem condicional',
    copy: { headline: 'O que a ciência diz sobre gordura abdominal', secao1_texto: 'Entenda os fatores que podem influenciar.' },
    esperado: 'passou',
  },
];

const cor = (ok: boolean) => (ok ? '\x1b[32m' : '\x1b[31m');
const reset = '\x1b[0m';
const marca = (ok: boolean) => `${cor(ok)}${ok ? 'ok ' : 'ERRO'}${reset}`;

async function main() {
  if (!isTypeSafeEnabled()) {
    console.error('TYPESAFE_API_KEY não encontrada no ambiente. Rode com --require dotenv/config.');
    process.exit(1);
  }

  let regexAcertos = 0;
  let jevAcertos = 0;
  let total = 0;
  const jevIncertos: string[] = [];

  console.log('\n=== Checklist de bridge page (itens de significado) ===\n');
  for (const caso of CASOS_BRIDGE) {
    const regex = evaluateBridgeHtmlRegex(caso.html);
    const judged = await judgeBridgeCompliance(caso.html);
    if (!judged) {
      console.error(`  ${caso.nome}: julgamento indisponível — abortando.`);
      process.exit(1);
    }

    console.log(`• ${caso.nome}`);
    console.log(`  (${caso.origem})`);
    for (const [item, esperado] of Object.entries(caso.esperado) as Array<[keyof typeof judged, Esperado]>) {
      const regexVerdict = regex[item]?.passed ? 'passou' : 'reprovou';
      const j = judged[item];
      const regexOk = regexVerdict === esperado;
      const jevOk = j.verdict === esperado;
      total += 1;
      if (regexOk) regexAcertos += 1;
      if (jevOk) jevAcertos += 1;
      if (j.verdict === 'incerto') jevIncertos.push(`${caso.nome} / ${item}`);
      console.log(
        `    ${String(item).padEnd(18)} esperado=${esperado.padEnd(9)} regex=${marca(regexOk)} ${regexVerdict.padEnd(9)} jev=${marca(jevOk)} ${j.verdict.padEnd(9)} p=${j.probability.toFixed(2)}`,
      );
    }
    console.log('');
  }

  console.log('=== Reuso de claim de concorrente (claim HIGH em pt-BR no dossiê) ===\n');
  for (const caso of CASOS_CLAIM) {
    const regexVerdict = enforceCompliance(JSON.stringify(caso.copy), [claimPT]).violations.length ? 'reprovou' : 'passou';
    const judged = await judgeClaimReuse(caso.copy, [claimPT]);
    if (!judged || judged.length === 0) {
      console.error(`  ${caso.nome}: julgamento indisponível — abortando.`);
      process.exit(1);
    }
    const j = judged[0];
    const regexOk = regexVerdict === caso.esperado;
    const jevOk = j.verdict === caso.esperado;
    total += 1;
    if (regexOk) regexAcertos += 1;
    if (jevOk) jevAcertos += 1;
    if (j.verdict === 'incerto') jevIncertos.push(`claim: ${caso.nome}`);

    console.log(`• ${caso.nome}`);
    console.log(`  (${caso.origem})`);
    console.log(
      `    esperado=${caso.esperado.padEnd(9)} regex=${marca(regexOk)} ${regexVerdict.padEnd(9)} jev=${marca(jevOk)} ${j.verdict.padEnd(9)} p=${j.probability.toFixed(2)}\n`,
    );
  }

  const pct = (n: number) => `${((n / total) * 100).toFixed(0)}%`;
  console.log('=== Resultado ===');
  console.log(`  itens avaliados:      ${total}`);
  console.log(`  regex/n-grama certos: ${regexAcertos} (${pct(regexAcertos)})`);
  console.log(`  julgamento certos:    ${jevAcertos} (${pct(jevAcertos)})`);
  if (jevIncertos.length) {
    console.log(`  itens 'incerto' (iriam pra revisão humana): ${jevIncertos.length}`);
    for (const i of jevIncertos) console.log(`    - ${i}`);
  }
  console.log('');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
