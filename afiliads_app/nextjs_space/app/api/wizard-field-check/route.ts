export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { callAgent } from '@/lib/llm';
import { PLATFORMS, VERTICALS, GEOS, CHANNELS } from '@/lib/wizard-data';
import { getPresellOutcomeReferencia } from '@/lib/presell';
import { getMarketIntelReferencia } from '@/lib/marketIntel';

// Schema real por campo — garante que "valor_sugerido" (texto livre do LLM) só vira uma
// correção aplicável se for de fato compatível com o TIPO do campo no Wizard. Sem isso, uma
// sugestão fora do formato (ex.: enum inválido, número fora de faixa, URL quebrada) seria
// aplicada cegamente pelo AgentHelp no cliente — ver lib/wizard-data.ts / app/(app)/wizard/page.tsx.
type FieldKind =
  | { kind: 'enum'; options: readonly string[] }
  | { kind: 'number'; min?: number; max?: number }
  | { kind: 'url' }
  | { kind: 'text' };

const FIELD_KINDS: Record<string, FieldKind> = {
  platform: { kind: 'enum', options: PLATFORMS },
  vertical: { kind: 'enum', options: VERTICALS },
  geo: { kind: 'enum', options: GEOS },
  channel: { kind: 'enum', options: CHANNELS },
  funnel: { kind: 'enum', options: ['BRIDGE', 'DIRECT', 'REVIEW', 'SL'] },
  pageType: { kind: 'enum', options: ['advertorial', 'pogo', 'vsl', 'interstitial', 'authority', 'authority_v2'] },
  popupGate: { kind: 'enum', options: ['true', 'false'] },
  testDuration: { kind: 'enum', options: ['48h', '72h', '5', '7'] },
  commission: { kind: 'number', min: 0 },
  refundPct: { kind: 'number', min: 0, max: 100 },
  aov: { kind: 'number', min: 0 },
  cvrExpected: { kind: 'number', min: 0, max: 100 },
  budgetTest: { kind: 'number', min: 0 },
  offerUrl: { kind: 'url' },
  presellUrl: { kind: 'url' },
  flowpageUrl: { kind: 'url' },
  postbackUrl: { kind: 'url' },
  videoUrl: { kind: 'url' },
};

function validateSuggestedValue(fieldKey: string, raw: string): { value: string | null; reason?: string } {
  const kind = FIELD_KINDS[fieldKey];
  const v = raw.trim();
  if (!kind) return { value: v }; // sem schema definido pra esse campo — mantém comportamento de texto livre

  if (kind.kind === 'enum') {
    const match = kind.options.find((o) => o.toLowerCase() === v.toLowerCase());
    return match ? { value: match } : { value: null, reason: `"${v}" não é uma opção válida (esperado: ${kind.options.join(', ')})` };
  }
  if (kind.kind === 'number') {
    const n = Number(v.replace(/[^0-9.\-]/g, ''));
    if (!Number.isFinite(n)) return { value: null, reason: `"${v}" não é um número válido` };
    if (kind.min !== undefined && n < kind.min) return { value: null, reason: `valor ${n} abaixo do mínimo permitido (${kind.min})` };
    if (kind.max !== undefined && n > kind.max) return { value: null, reason: `valor ${n} acima do máximo permitido (${kind.max})` };
    return { value: String(n) };
  }
  if (kind.kind === 'url') {
    return /^https?:\/\/\S+$/i.test(v) ? { value: v } : { value: null, reason: `"${v}" não parece uma URL válida (precisa começar com http:// ou https://)` };
  }
  return { value: v };
}

const agentPrompts: Record<string, { agent: string; prompt: string }> = {
  name: {
    agent: 'Paid Ads Strategist',
    prompt: 'Analise o nome da campanha do Google Ads fornecido. O nome deve seguir as melhores práticas para rastreamento de afiliados (ex: indicando rede, produto, país, correspondência de keyword, ex: "CB_Alpilean_US_Exact"). Avalie se o nome fornecido é adequado, e se não for, sugira a nomenclatura correta.'
  },
  platform: {
    agent: 'Affiliate Network Specialist',
    prompt: 'Analise a plataforma de rede de afiliados selecionada (ex: ClickBank, BuyGoods, MaxWeb, Hotmart). Explique as particularidades dessa rede no Google Ads (como políticas de rastreamento, facilidade de link direto vs bridge page e moedas de comissão).'
  },
  vertical: {
    agent: 'Niche Intelligence Agent',
    prompt: 'Analise a vertical de nicho selecionada (ex: Weight Loss, Health, Finance, Wealth). Forneça insights sobre o nível de concorrência no Google Ads para esta vertical, as políticas reguladas que devem ser evitadas para prevenir suspensões e o valor médio aceitável de CPC.'
  },
  geo: {
    agent: 'Paid Ads Strategist',
    prompt: 'Analise a segmentação geográfica (Geo) selecionada (ex: US, BR, UK, CA). Destaque a concorrência média de leilão nesse país, as estimativas gerais de CPC de busca em inglês vs português, e lembre a importância de configurar a segmentação de localidade no Google Ads como "presença apenas" para não atrair cliques irrelevantes.'
  },
  channel: {
    agent: 'Traffic Acquisition Strategist',
    prompt: 'Analise o canal de anúncios selecionado (ex: SEARCH, YOUTUBE, DISPLAY, DEMAND GEN). Explique o nível de intenção de compra desse tráfego, as estratégias iniciais recomendadas (ex: começar com SEARCH exato para keywords de fundo de funil) e se esse canal necessita de criativos gráficos complexos no início.'
  },
  funnel: {
    agent: 'CRO & Conversion Specialist',
    prompt: 'Analise o tipo de funil de vendas (ex: BRIDGE page, DIRECT link, REVIEW page). Explique os riscos de reprovação associados a esse tipo de funil no Google Ads (ex: link direto costuma causar suspensões) e os benefícios da bridge page para conversão e conformidade.'
  },
  commission: {
    agent: 'Affiliate Finance Broker',
    prompt: 'Analise a comissão de afiliado em USD. Avalie se é uma comissão viável para Google Ads na vertical selecionada (geralmente comissões acima de $30 a $40 são recomendadas para cobrir o CPC de teste). Se o valor for baixo, explique como otimizar ou dê sugestões.'
  },
  refundPct: {
    agent: 'Risk Assessment Agent',
    prompt: 'Analise a taxa de reembolso (refund %) estimada para a oferta. Taxas de reembolso acima de 10-15% são de alto risco e podem corroer os lucros. Avalie a porcentagem e informe se está em nível seguro.'
  },
  aov: {
    agent: 'Affiliate Finance Broker',
    prompt: 'Analise o Valor Médio do Pedido (AOV) em USD. Comissões com AOV maior tendem a conter upsells robustos no funil do produtor. Avalie se o valor de AOV inserido é saudável e se favorece lances mais altos de CPC de escala.'
  },
  offerUrl: {
    agent: 'Tracking & Analytics Engineer',
    prompt: `Analise a URL da oferta de afiliado (HopLink ClickBank, Smartlink BuyGoods/MaxWeb etc).
REGRAS IMPORTANTES (não violar): o app AfiliAds já anexa automaticamente "?tid=<utmCampaign da campanha>" (ou "&tid=" se já houver query string) ao HopLink na hora de gerar a presell — normalizado para minúsculas, só a-z/0-9/_, até 100 caracteres (limite real do ClickBank). O campo aqui deve conter o HopLink LIMPO (encrypted ou não), SEM tid/subid manual — adicionar iria duplicar ou conflitar.
NUNCA sugira sintaxe tipo "%{subid1}", "%{clickid}" ou parâmetros de Post Affiliate Pro/iDevAffiliate — ClickBank NÃO usa essa sintaxe, isso é de outra categoria de plataforma e não funciona no link. Se quiser sugerir os parâmetros avançados reais do ClickBank (traffic_source, traffic_type, campaign, creative, ad, extclid), deixe claro que são OPCIONAIS, só alimentam o dashboard de analytics do próprio ClickBank, e não são lidos pelo AfiliAds.
Verifique apenas: (1) é uma URL https válida de hop.clickbank.net ou domínio de smartlink reconhecido; (2) não contém "?tid=" ou "&tid=" já embutido (se contém, alertar que vai conflitar com a auto-injeção); (3) não tem espaços/caracteres quebrados. Se estiver tudo certo, diga isso claramente e não invente correção.`
  },
  cvrExpected: {
    agent: 'CRO & Conversion Specialist',
    prompt: 'Analise a taxa de conversão (CVR %) esperada. Taxas realistas de CVR para tráfego frio em página ponte estão entre 0.5% e 2.0%. Se o usuário inseriu um valor muito alto ou irrealista, explique as implicações financeiras (breakeven EPC artificialmente alto) e sugira o valor recomendado.'
  },
  pageType: {
    agent: 'Compliance Sentinel',
    prompt: `Analise o pageType de presell escolhido (advertorial, pogo, vsl, interstitial) considerando o canal (channel) do contexto da campanha.
REGRA INVIOLÁVEL: pageType "interstitial" (screenshot da sales page real do vendor como fundo + popup de segmentação por país/gênero/idade, SEM conteúdo editorial) só é permitido em canais Native/Display/YouTube/social — no Google Ads isso corresponde a YOUTUBE ou DEMAND_GEN. É PROIBIDO em SEARCH e em PMAX (Performance Max inclui inventário de Search). Se o contexto indicar channel "SEARCH" ou "PMAX" junto com pageType "interstitial", marque correcao_necessaria=true, explique que a página reprova revisão de Search por não ter conteúdo original/editorial, e sugira valor_sugerido="advertorial". Para os demais pageTypes, valide pelas regras normais de bridge page (conteúdo original, disclaimers, sem doorway page).`
  },
  presellUrl: {
    agent: 'Compliance Sentinel',
    prompt: 'Analise a URL da pré-venda (Landing Page). Verifique se o formato da URL parece correto e explique as diretrizes críticas do Google Ads para ponte (Bridge Page): ela deve possuir termos de serviço, política de privacidade, disclaimer no rodapé, não fazer promessas falsas de cura rápida e não clonar diretamente o produtor. Se a URL não for verificável, explique o que falta configurar.'
  },
  popupGate: {
    agent: 'CRO & Conversion Specialist',
    prompt: 'Analise se ativar o pop-up de retenção "pressione e segure" faz sentido pro contexto da campanha (canal, ângulo, vertical). Não é cloaking (mesma experiência pra todo visitante) — avalie só o efeito esperado em conversão/percepção de valor. Valor "true"/"false".'
  },
  videoUrl: {
    agent: 'Presell Builder',
    prompt: 'Analise a URL do vídeo informada (YouTube, Vimeo ou .mp4 direto) pro pageType "vsl". Verifique se o formato é reconhecível (youtube.com/watch, youtu.be, vimeo.com, ou link direto .mp4) — sem isso a geração da presell VSL falha.'
  },
  flowpageUrl: {
    agent: 'CRO & Conversion Specialist',
    prompt: 'Analise o link do FlowPage. Explique que o FlowPage é útil para testes rápidos, mas para tráfego profissional no Google Ads a médio prazo é preferível ter um domínio próprio (ex: Hostinger) para evitar concorrência no domínio compartilhado e reprovações de políticas.'
  },
  hostingerDomain: {
    agent: 'Hosting & Domain Specialist',
    prompt: 'Analise o domínio Hostinger. Explique que ter um domínio próprio é a melhor prática absoluta de afiliados profissionais. Verifique se o formato do domínio está correto e dê as principais recomendações técnicas (como configurar SSL HTTPS ativo e servidores DNS integrados).'
  },
  presellHtml: {
    agent: 'Compliance & SEO Auditor',
    prompt: 'Analise o HTML da pré-venda. Verifique as tags básicas de conformidade exigidas pelo Google Ads: políticas de privacidade, termos de serviço, disclaimers de isenção de responsabilidade médica/financeira e velocidade de carregamento (mobile layout).'
  },
  postbackUrl: {
    agent: 'Tracking & Analytics Engineer',
    prompt: 'Analise a URL de postback. O postback via servidor-para-servidor é a forma mais segura de trackear conversões. Avalie se a URL inserida possui as chaves de substituição corretas (como {clickid} ou click_id) da rede e explique como integrá-lo com a campanha.'
  },
  clickidToken: {
    agent: 'Tracking & Analytics Engineer',
    prompt: 'Analise o token do identificador do clique (ClickID). Explique a importância de repassar esse parâmetro em toda a cadeia de cliques (do anúncio do Google, passando pela pré-sell até o checkout da rede) para bater a conversão perfeitamente.'
  },
  budgetTest: {
    agent: 'Paid Ads Finance Broker',
    prompt: 'Analise o orçamento total de teste (Budget Teste) em USD. Recomenda-se um orçamento mínimo de 1x a 3x o valor da comissão para dar relevância estatística de dados. Avalie se o orçamento inserido é suficiente e explique por quê.'
  },
  testDuration: {
    agent: 'Paid Ads Finance Broker',
    prompt: 'Analise a duração do teste da campanha. O padrão recomendado para acumular cliques suficientes para análise é de 48h a 72h. Avalie se a duração escolhida é adequada.'
  }
};

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    const userId = (session.user as any)?.id;

    const { fieldKey, fieldValue, context } = await request.json();

    if (!fieldKey || fieldValue === undefined || fieldValue === null) {
      return NextResponse.json({ error: 'Parâmetros fieldKey e fieldValue são obrigatórios' }, { status: 400 });
    }

    const config = agentPrompts[fieldKey];
    if (!config) {
      return NextResponse.json({ error: `O campo "${fieldKey}" não foi mapeado para validação automatizada de agente.` }, { status: 400 });
    }

    // Treat empty string check gracefully
    if (String(fieldValue).trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: `O campo "${fieldKey}" está vazio. Preencha-o primeiro para que o agente "${config.agent}" possa fazer a verificação.`
      });
    }

    const systemPrompt = `Você é o agente especialista "${config.agent}" de marketing de afiliados. Sua tarefa é validar o preenchimento de um campo da campanha e, se possível, propor o valor exato corrigido — não só explicar o problema.
Seja direto e traga as regras de negócio de forma prática. Use português brasileiro profissional.
Responda APENAS JSON válido, sem markdown, no formato:
{"diagnostico": "2-3 parágrafos curtos explicando a análise", "correcao_necessaria": true|false, "valor_sugerido": "valor pronto para substituir o campo, ou null se o valor atual já está correto ou se a correção não é um valor único aplicável (ex.: campo é só informativo)"}
"valor_sugerido" só deve vir preenchido quando for um valor literal, seguro e pronto pra aplicar direto no campo (mesmo tipo/formato do campo) — nunca invente sintaxe ou parâmetros que a plataforma real não usa.`;

    // Aprendizado contínuo: campos que se beneficiam de dado histórico real (não só regra
    // estática) recebem o mesmo contexto já usado na geração de presell — resultado real
    // (lucro/EPC por pageType) e sinais de mercado (concorrentes via Firecrawl).
    let learningContext = '';
    if (['commission', 'channel', 'pageType'].includes(fieldKey) && context?.vertical) {
      try {
        const [outcomeRef, marketRef] = await Promise.all([
          getPresellOutcomeReferencia(userId, context.vertical, context?.channel),
          getMarketIntelReferencia(userId, context.vertical, undefined),
        ]);
        learningContext = [outcomeRef, marketRef].filter(Boolean).join('\n');
      } catch {
        // Sem dado histórico suficiente — segue sem esse bloco extra, não bloqueia a validação.
      }
    }

    const userPrompt = `${config.prompt}
Campo analisado: "${fieldKey}"
Valor preenchido pelo usuário: "${fieldValue}"
Contexto extra da campanha: ${JSON.stringify(context ?? {})}
${learningContext ? `\n${learningContext}\n` : ''}
JSON puro.`;

    try {
      const res = await callAgent(userId, { agent: 'wizard-validator', systemPrompt, userPrompt });
      const data = res.data;
      if (!data?.diagnostico) {
        return NextResponse.json({ success: false, error: 'O agente não retornou uma análise válida.' });
      }
      const rawSuggestion = typeof data.valor_sugerido === 'string' ? data.valor_sugerido.trim() : '';
      let valorSugerido: string | null = null;
      let diagnostico = data.diagnostico;
      if (rawSuggestion) {
        const validated = validateSuggestedValue(fieldKey, rawSuggestion);
        if (validated.value !== null) {
          valorSugerido = validated.value;
        } else {
          // Sugestão incompatível com o tipo/formato real do campo — nunca propaga pro cliente
          // aplicar cegamente; some do valorSugerido e o motivo entra no texto do diagnóstico.
          diagnostico = `${diagnostico}\n\n⚠️ O agente sugeriu "${rawSuggestion}", mas isso não é compatível com este campo: ${validated.reason}. Ajuste manualmente.`;
        }
      }
      return NextResponse.json({
        success: true,
        response: diagnostico,
        correcaoNecessaria: !!data.correcao_necessaria,
        valorSugerido,
      });
    } catch (llmErr: any) {
      console.error('Field check LLM error:', llmErr);
      return NextResponse.json({
        success: false,
        error: `⚠️ Não foi possível verificar o campo devido à ausência das chaves de API necessárias (Google Ads ou provedor de IA). Como configurar: Vá na tela de Configurações, cadastre a API Key do seu provedor ativo de IA, e salve.`
      });
    }
  } catch (err: any) {
    console.error('Wizard field check handler error:', err);
    return NextResponse.json({ error: 'Erro interno ao processar a validação' }, { status: 500 });
  }
}
