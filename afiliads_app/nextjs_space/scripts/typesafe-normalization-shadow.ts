/**
 * Terceira rodada: mede as heurísticas de normalização contra o julgamento.
 *   - normalizePresellTipo / normalizeChannel (lib/campaign-strategy.ts:56-77)
 *   - classificação de intenção do baseline   (lib/autocompleteService.ts)
 *   - causa de falha de agente                (lib/error-cause.ts, antes inline em api/agent-runs)
 *
 * Uso: npm run typesafe:normalizacao
 */
import { judgeStrategyInputs, judgeSearchIntents } from '../lib/strategy-judgments';
import { resolveErrorCauses, classifyErrorCauseHeuristic } from '../lib/error-cause';
import { isTypeSafeEnabled } from '../lib/typesafe';

const cor = (ok: boolean) => (ok ? '\x1b[32m' : '\x1b[31m');
const reset = '\x1b[0m';
const marca = (ok: boolean) => `${cor(ok)}${ok ? 'ok ' : 'ERRO'}${reset}`;

let heur = 0, jev = 0, total = 0;
function conta(esperado: string, heuristica: string, julgamento: string, extra = '') {
  total++;
  const h = heuristica === esperado, j = julgamento === esperado;
  if (h) heur++; if (j) jev++;
  console.log(`    esperado=${esperado.padEnd(14)} heuristica=${marca(h)} ${heuristica.padEnd(14)} jev=${marca(j)} ${julgamento.padEnd(16)} ${extra}`);
}

// --- réplicas exatas das heurísticas atuais, pra comparar ---------------------
function normalizeChannelHeur(raw: string): string {
  const s = raw.toLowerCase();
  if (s.includes('search')) return 'SEARCH';
  if (s.includes('youtube') || s === 'yt') return 'YOUTUBE';
  if (s.includes('demand')) return 'DEMAND_GEN';
  if (s.includes('pmax') || s.includes('performance max')) return 'PMAX';
  return 'nao_informado';
}
function normalizePresellHeur(raw: string): string {
  const s = raw.toLowerCase();
  if (s.includes('cookie') || s.includes('popup')) return 'cookie_popup';
  if (s.includes('tsl') || s.includes('text sales letter')) return 'tsl';
  if (s.includes('review') && !s.includes('cookie')) return 'review';
  if (s.includes('vsl')) return 'vsl';
  if (s.includes('pogo')) return 'pogo';
  if (s.includes('lead')) return 'advertorial';
  if (s.includes('advertorial') || s.includes('quiz')) return 'advertorial';
  if (s.includes('direct')) return 'advertorial';
  return 'nao_informado';
}
const PT_MODS = {
  questions: ['como', 'qual', 'onde', 'por que', 'quem', 'quando'],
  commercial: ['onde comprar', 'preço', 'valor', 'comprar', 'cupom', 'desconto', 'frete', 'garantia'],
  informational: ['vale a pena', 'funciona', 'depoimentos', 'efeitos colaterais', 'antes e depois', 'bula', 'reclame aqui', 'resenha'],
  brand: ['oficial', 'site oficial', 'original', 'fabricante'],
};
function intentHeur(s: string): string {
  if (PT_MODS.questions.some(q => s.includes(q))) return 'questions';
  if (PT_MODS.commercial.some(c => s.includes(c))) return 'commercial';
  if (PT_MODS.informational.some(i => s.includes(i))) return 'informational';
  if (PT_MODS.brand.some(b => s.includes(b))) return 'brand';
  return 'informational';
}

const PRESELL: Array<{ texto: string; esperado: string; origem: string }> = [
  { texto: 'advertorial em formato de matéria', esperado: 'advertorial', origem: 'controle' },
  { texto: 'vsl com vídeo curto', esperado: 'vsl', origem: 'controle' },
  { texto: 'página de captura de leads com iscas', esperado: 'advertorial', origem: "'lead' vem antes de 'advertorial' na cadeia" },
  { texto: 'resenha do produto com prós e contras', esperado: 'review', origem: "ponto cego: 'resenha' não é 'review'" },
  { texto: 'matéria jornalística que pré-vende', esperado: 'advertorial', origem: 'ponto cego: descreve sem usar o termo' },
  { texto: 'screenshot da página do vendor com popup de país', esperado: 'interstitial', origem: "ponto cego: 'popup' ⇒ cookie_popup" },
  { texto: 'carta de vendas só em texto, sem vídeo', esperado: 'tsl', origem: 'ponto cego: descreve TSL sem a sigla' },
  { texto: 'a definir com o cliente', esperado: 'nao_informado', origem: 'controle' },
];

const CANAL: Array<{ texto: string; esperado: string; origem: string }> = [
  { texto: 'Google Search com match exato', esperado: 'SEARCH', origem: 'controle' },
  { texto: 'anúncio em vídeo no YouTube', esperado: 'YOUTUBE', origem: 'controle' },
  { texto: 'rede de pesquisa do Google', esperado: 'SEARCH', origem: 'ponto cego: pt-BR sem a palavra "search"' },
  { texto: 'Discovery/feeds nativos', esperado: 'DEMAND_GEN', origem: "ponto cego: sem 'demand'" },
  { texto: 'campanha máxima performance', esperado: 'PMAX', origem: "ponto cego: pt-BR sem 'pmax'" },
];

const SUGESTOES: Array<{ s: string; esperado: string; origem: string }> = [
  { s: 'diet caps preço', esperado: 'commercial', origem: 'controle' },
  { s: 'diet caps 3 potes promoção', esperado: 'commercial', origem: 'ponto cego: cai no default informational' },
  { s: 'diet caps faz mal', esperado: 'informational', origem: 'ponto cego: cai no default (certo por acidente)' },
  { s: 'diet caps site do fabricante', esperado: 'brand', origem: "'fabricante' está na lista brand" },
  { s: 'quanto custa diet caps', esperado: 'commercial', origem: "ponto cego: 'quanto' não está em questions e 'custa' não está em commercial" },
  { s: 'diet caps é bom mesmo', esperado: 'informational', origem: 'default acerta' },
];

const ERROS: Array<{ raw: string; esperado: string; origem: string }> = [
  { raw: 'insufficient_quota: You exceeded your current quota', esperado: 'sem_credito', origem: 'controle' },
  { raw: 'HTTP 429 Too Many Requests', esperado: 'rate_limit', origem: 'controle' },
  { raw: 'socket hang up', esperado: 'timeout_ou_rede', origem: 'ponto cego: virava a própria mensagem' },
  { raw: 'kimi-k2.6 is not a valid model ID', esperado: 'modelo_ou_payload_invalido', origem: 'ponto cego: armadilha conhecida do Hermes' },
  { raw: 'maximum context length exceeded (262144 tokens)', esperado: 'modelo_ou_payload_invalido', origem: 'ponto cego' },
  { raw: 'HTTP 402 no remaining credits on this account', esperado: 'sem_credito', origem: 'controle (OpenRouter zerado)' },
  { raw: 'Resposta não é JSON válido (nem dentro de cerca de código).', esperado: 'validacao_de_output', origem: 'controle' },
  { raw: 'authentication_error: invalid x-api-key', esperado: 'chave_invalida', origem: "ponto cego: sem '401' nem 'API Key'" },
];

async function main() {
  if (!isTypeSafeEnabled()) { console.error('TYPESAFE_API_KEY ausente'); process.exit(1); }

  console.log('\n=== 1. Texto do dossiê → pageType de presell ===\n');
  for (const c of PRESELL) {
    const j = await judgeStrategyInputs({ produto: 'FemiCore', presellTipoTexto: c.texto });
    const v = j?.presellTipo;
    console.log(`• "${c.texto}"  (${c.origem})`);
    conta(c.esperado, normalizePresellHeur(c.texto), v?.usable ? v.value! : `${v?.raw}(conf.baixa)`, `conf=${(v?.confidence ?? 0).toFixed(2)}`);
  }

  console.log('\n=== 2. Texto do dossiê → canal do Google Ads ===\n');
  for (const c of CANAL) {
    const j = await judgeStrategyInputs({ produto: 'FemiCore', canalTexto: c.texto });
    const v = j?.canal;
    console.log(`• "${c.texto}"  (${c.origem})`);
    conta(c.esperado, normalizeChannelHeur(c.texto), v?.usable ? v.value! : `${v?.raw}(conf.baixa)`, `conf=${(v?.confidence ?? 0).toFixed(2)}`);
  }

  console.log('\n=== 3. Intenção de sugestão do autocomplete ===\n');
  const intents = await judgeSearchIntents(SUGESTOES.map(s => s.s), { keyword: 'diet caps', idioma: 'pt' });
  SUGESTOES.forEach((c, i) => {
    const v = intents?.[i];
    console.log(`• "${c.s}"  (${c.origem})`);
    conta(c.esperado, intentHeur(c.s), v?.usable ? v.value! : `${v?.raw}(conf.baixa)`, `conf=${(v?.confidence ?? 0).toFixed(2)}`);
  });

  console.log('\n=== 4. Causa de falha de agente ===\n');
  const causas = await resolveErrorCauses(ERROS.map(e => e.raw));
  for (const c of ERROS) {
    console.log(`• "${c.raw.slice(0, 64)}"  (${c.origem})`);
    conta(c.esperado, classifyErrorCauseHeuristic(c.raw) ?? 'outro', causas.get(c.raw) ?? 'outro');
  }

  const pct = (n: number) => `${((n / total) * 100).toFixed(0)}%`;
  console.log('\n=== Resultado ===');
  console.log(`  itens avaliados:      ${total}`);
  console.log(`  heurística de string: ${heur} (${pct(heur)})`);
  console.log(`  julgamento:           ${jev} (${pct(jev)})\n`);
}
main().catch((e) => { console.error(e); process.exit(1); });
