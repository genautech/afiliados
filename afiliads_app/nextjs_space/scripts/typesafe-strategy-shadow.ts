/**
 * Mede os julgamentos de estratégia (lib/strategy-judgments.ts) contra as heurísticas de string
 * que decidem isso hoje:
 *   - classifySalesPage()      (lib/salesPageAnalyzer.ts)      → tipo da sales page do vendor
 *   - deriveBlockedChannels()  (lib/campaign-strategy.ts:137)  → canal bloqueado × brand bidding
 *   - inferIntent/fallbackLayer (app/api/atp/analyze/route.ts) → camada A-D de keyword
 *   - includes() do adapter    (lib/launch/google-adapter.ts)  → brand bidding em copy de anúncio
 *
 * Uso: npm run typesafe:strategy
 * Chama a API do TypeSafe de verdade. Não toca no banco, não muda nada no app.
 */
import { analyzeDom, classifySalesPage } from '../lib/salesPageAnalyzer';
import { judgeSalesPageType, judgeVendorProhibitions, judgeKeywords } from '../lib/strategy-judgments';
import { judgeAdCopyBrandBidding } from '../lib/compliance-judgments';
import { isTypeSafeEnabled } from '../lib/typesafe';

const cor = (ok: boolean) => (ok ? '\x1b[32m' : '\x1b[31m');
const reset = '\x1b[0m';
const marca = (ok: boolean) => `${cor(ok)}${ok ? 'ok ' : 'ERRO'}${reset}`;

let heurAcertos = 0;
let jevAcertos = 0;
let total = 0;
const incertos: string[] = [];

function conta(nome: string, esperado: string, heuristica: string, julgamento: string, extra = '') {
  total += 1;
  const hOk = heuristica === esperado;
  const jOk = julgamento === esperado;
  if (hOk) heurAcertos += 1;
  if (jOk) jevAcertos += 1;
  if (julgamento.includes('confiança baixa') || julgamento === 'incerto') incertos.push(nome);
  console.log(
    `    esperado=${esperado.padEnd(22)} heuristica=${marca(hOk)} ${heuristica.padEnd(22)} jev=${marca(jOk)} ${julgamento.padEnd(24)} ${extra}`,
  );
}

// ---------------------------------------------------------------------------
// 1. Tipo da sales page
// ---------------------------------------------------------------------------
const PAGINAS: Array<{ nome: string; origem: string; html: string; esperado: string }> = [
  {
    nome: 'VSL de verdade',
    origem: 'controle: vídeo é o pitch',
    html: `<html><body><h1>Watch this before you order</h1>
      <iframe src="https://www.youtube.com/embed/abc"></iframe>
      <p>Press play. The presentation explains everything.</p>
      <a href="/order">Add to cart</a></body></html>`,
    esperado: 'VSL',
  },
  {
    nome: 'carta de vendas com vídeo de depoimento',
    origem: 'ponto cego: qualquer <video> ⇒ VSL',
    html: `<html><body><h1>Why 12.000 women switched to this morning ritual</h1>
      <p>Long copy section one: the problem, in detail, with several paragraphs of argument.</p>
      <p>Section two: the ingredients, the science, the dosage, the price breakdown.</p>
      <video src="/testimonial-maria.mp4"></video><p>Maria's story, one of many below.</p>
      <p>Section three: pricing tiers, the 60-day refund policy and the order form.</p>
      <a href="/checkout">Buy now — $49</a></body></html>`,
    esperado: 'DIRECT',
  },
  {
    nome: 'sales page direta em inglês',
    origem: 'ponto cego: botão só casa "Compre Agora"/"Comprar" em português',
    html: `<html><body><h1>The 12-second morning method</h1>
      <p>Benefits, proof, testimonials and the offer, all in text.</p>
      <button>Order Now</button><p>60-day money-back policy.</p></body></html>`,
    esperado: 'DIRECT',
  },
  {
    nome: 'quiz de segmentação',
    origem: 'controle',
    html: `<html><body><h1>Answer 4 questions to see your plan</h1>
      <form><label>Your age<select><option>25-34</option></select></label>
      <label><input type="radio" name="goal">Lose weight</label>
      <label><input type="radio" name="goal">More energy</label></form></body></html>`,
    esperado: 'QUIZ',
  },
  {
    nome: 'captura de lead',
    origem: 'controle',
    html: `<html><body><h1>Get the free 7-day guide</h1>
      <form><input type="email" placeholder="your best email"><button>Send me the guide</button></form>
      <p>No credit card needed.</p></body></html>`,
    esperado: 'LEAD_GEN',
  },
  {
    nome: 'artigo de blog sem oferta',
    origem: 'ponto cego: 3+ headings com classe de conteúdo ⇒ advertorial/OTHER por acidente',
    html: `<html><body><article class="blog-post"><h1>Como funciona o sistema linfático</h1>
      <h2>Anatomia</h2><p>Texto informativo.</p><h2>Função</h2><p>Mais texto.</p>
      <h2>Quando procurar um médico</h2><p>Texto final, sem produto nenhum.</p></article></body></html>`,
    esperado: 'OTHER',
  },
];

// ---------------------------------------------------------------------------
// 2. Escopo da proibição do vendor
// ---------------------------------------------------------------------------
const REGRAS: Array<{ regra: string; origem: string; esperado: 'canal_inteiro' | 'apenas_termo_de_marca' | 'nao_e_proibicao' }> = [
  { regra: 'No brand bidding — do not bid on our product name', origem: 'contém "bid": a regex acerta', esperado: 'apenas_termo_de_marca' },
  { regra: 'Our trademark must never appear in your ad copy or search terms', origem: 'ponto cego: descreve brand bidding sem bid/keyword/marca', esperado: 'apenas_termo_de_marca' },
  { regra: 'Trademark bidding is strictly prohibited', origem: 'contém "bid"', esperado: 'apenas_termo_de_marca' },
  { regra: 'No Google Search advertising allowed for affiliates', origem: 'controle: canal mesmo', esperado: 'canal_inteiro' },
  { regra: 'Proibido anunciar no YouTube', origem: 'controle: canal mesmo', esperado: 'canal_inteiro' },
  { regra: 'Não use a marca em palavra-chave; negative match obrigatório', origem: 'contém marca/palavra: a regex acerta', esperado: 'apenas_termo_de_marca' },
  { regra: 'Envie seus criativos para aprovação antes de subir', origem: 'ponto cego: nem é proibição, e a regex bloqueia canal', esperado: 'nao_e_proibicao' },
];

// ---------------------------------------------------------------------------
// 3. Camada de keyword (taxonomia canônica A=fundo ... D=informacional)
// ---------------------------------------------------------------------------
const KEYWORDS: Array<{ kw: string; esperado: 'A' | 'B' | 'C' | 'D'; origem: string }> = [
  { kw: 'buy lymphflow supplement', esperado: 'A', origem: 'compra direta' },
  { kw: 'lymphflow preço', esperado: 'A', origem: 'preço = fundo' },
  { kw: 'lymphflow review', esperado: 'B', origem: 'comparação/avaliação' },
  { kw: 'melhor suplemento para retenção de líquido', esperado: 'B', origem: 'comparação sem termo de review' },
  { kw: 'pernas inchadas o tempo todo', esperado: 'C', origem: 'dor, sem produto: inferIntent chuta "commercial"' },
  { kw: 'how to reduce lymphedema swelling', esperado: 'C', origem: 'dor em inglês' },
  { kw: 'o que é sistema linfático', esperado: 'D', origem: 'informacional' },
  { kw: 'anatomia do sistema linfático', esperado: 'D', origem: 'informacional sem "o que é": cai no default "commercial"' },
];

// heurística atual do route (inferIntent + fallbackLayer, já corrigida pra taxonomia canônica)
function heuristicaLayer(kw: string): string {
  const trans = ['comprar', 'preco', 'preço', 'desconto', 'cupom', 'buy', 'price', 'discount', 'deal', 'oficial', 'official', 'order'];
  const comp = ['review', 'funciona', 'e bom', 'vale a pena', 'melhor', 'best', ' vs ', 'legit', 'worth', 'alternative', 'opiniao', 'results', 'scam'];
  const info = ['como ', 'o que e', 'how to', 'what is', 'dicas', 'tips', 'guide', 'gratis', 'free', 'for beginners', 'why ', 'when '];
  let intent = 'commercial';
  if (trans.some((t) => kw.includes(t))) intent = 'transactional';
  else if (comp.some((t) => kw.includes(t))) intent = 'commercial';
  else if (info.some((t) => kw.includes(t))) intent = 'informational';
  if (intent === 'transactional') return 'A';
  if (/how to|como |stop |relief|remedy|sintoma|dor /.test(kw)) return 'C';
  if (/what is|o que e|o que é|why |por que/.test(kw)) return 'D';
  return 'B';
}

// ---------------------------------------------------------------------------
// 4. Brand bidding em copy de anúncio
// ---------------------------------------------------------------------------
const TERMO_PROIBIDO = 'FemiCore';
const COPY: Array<{ texto: string; esperado: 'reprovou' | 'passou'; origem: string }> = [
  { texto: 'FemiCore Oficial 2026', esperado: 'reprovou', origem: 'controle: substring exata pega' },
  { texto: 'Femi Core Original', esperado: 'reprovou', origem: 'ponto cego: separado por espaço' },
  { texto: 'femicores funciona?', esperado: 'reprovou', origem: 'ponto cego: plural' },
  { texto: 'Fêmicore vale a pena', esperado: 'reprovou', origem: 'ponto cego: acento' },
  { texto: 'Equilíbrio Hormonal Natural', esperado: 'passou', origem: 'controle: categoria, sem marca' },
  { texto: 'Compare Opções Naturais', esperado: 'passou', origem: 'controle' },
];

async function main() {
  if (!isTypeSafeEnabled()) {
    console.error('TYPESAFE_API_KEY não encontrada. Rode com --require dotenv/config.');
    process.exit(1);
  }

  console.log('\n=== 1. Tipo da sales page do vendor ===\n');
  for (const caso of PAGINAS) {
    const heuristica = classifySalesPage(analyzeDom(caso.html));
    const judged = await judgeSalesPageType(caso.html);
    if (!judged) { console.error('julgamento indisponível'); process.exit(1); }
    console.log(`• ${caso.nome}  (${caso.origem})`);
    conta(caso.nome, caso.esperado, heuristica, judged.usable ? judged.value! : `${judged.raw}(confiança baixa)`, `conf=${judged.confidence.toFixed(2)}`);
  }

  console.log('\n=== 2. Escopo da proibição do vendor ===\n');
  const judgedRegras = await judgeVendorProhibitions(REGRAS.map((r) => r.regra), TERMO_PROIBIDO);
  if (!judgedRegras) { console.error('julgamento indisponível'); process.exit(1); }
  REGRAS.forEach((caso, i) => {
    // regex atual de deriveBlockedChannels: casa bid|keyword|termo|marca|palavra ⇒ brand bidding,
    // qualquer outra coisa ⇒ bloqueia o canal inteiro (inclusive o que não é proibição).
    const heuristica = /\b(bid|keyword|termo|marca|palavra)\b/i.test(caso.regra) ? 'apenas_termo_de_marca' : 'canal_inteiro';
    const j = judgedRegras[i].escopo;
    console.log(`• "${caso.regra}"  (${caso.origem})`);
    conta(caso.regra, caso.esperado, heuristica, j.usable ? j.value! : `${j.raw}(confiança baixa)`, `conf=${j.confidence.toFixed(2)}`);
  });

  console.log('\n=== 3. Camada de keyword ===\n');
  const judgedKws = await judgeKeywords(KEYWORDS.map((k) => k.kw), { vertical: 'saude/linfatico', geo: 'US' });
  if (!judgedKws) { console.error('julgamento indisponível'); process.exit(1); }
  KEYWORDS.forEach((caso, i) => {
    const j = judgedKws[i].layer;
    console.log(`• "${caso.kw}"  (${caso.origem})`);
    conta(caso.kw, caso.esperado, heuristicaLayer(caso.kw), j.usable ? j.value! : `${j.raw}(confiança baixa)`, `conf=${j.confidence.toFixed(2)}`);
  });

  console.log(`\n=== 4. Brand bidding em copy de anúncio (termo proibido: ${TERMO_PROIBIDO}) ===\n`);
  const judgedCopy = await judgeAdCopyBrandBidding(COPY.map((c) => c.texto), [TERMO_PROIBIDO]);
  if (!judgedCopy) { console.error('julgamento indisponível'); process.exit(1); }
  COPY.forEach((caso, i) => {
    const heuristica = caso.texto.toLowerCase().includes(TERMO_PROIBIDO.toLowerCase()) ? 'reprovou' : 'passou';
    const j = judgedCopy[i];
    console.log(`• "${caso.texto}"  (${caso.origem})`);
    conta(caso.texto, caso.esperado, heuristica, j.verdict, `p=${j.probability.toFixed(2)}`);
  });

  const pct = (n: number) => `${((n / total) * 100).toFixed(0)}%`;
  console.log('\n=== Resultado ===');
  console.log(`  itens avaliados:        ${total}`);
  console.log(`  heurística de string:   ${heurAcertos} (${pct(heurAcertos)})`);
  console.log(`  julgamento:             ${jevAcertos} (${pct(jevAcertos)})`);
  if (incertos.length) {
    console.log(`  itens sem confiança suficiente (caem no fallback): ${incertos.length}`);
    for (const i of incertos) console.log(`    - ${i}`);
  }
  console.log('');
}

main().catch((e) => { console.error(e); process.exit(1); });
