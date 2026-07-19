export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { callLLM } from '@/lib/llm';

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
    prompt: 'Analise a URL da oferta de afiliado (HopLink ou Smartlink). Verifique se o formato da URL parece conter parâmetros de subid/clickid para trackings de cliques e oriente sobre como injetar dinamicamente esses tokens no link para evitar perdas de comissão.'
  },
  cvrExpected: {
    agent: 'CRO & Conversion Specialist',
    prompt: 'Analise a taxa de conversão (CVR %) esperada. Taxas realistas de CVR para tráfego frio em página ponte estão entre 0.5% e 2.0%. Se o usuário inseriu um valor muito alto ou irrealista, explique as implicações financeiras (breakeven EPC artificialmente alto) e sugira o valor recomendado.'
  },
  presellUrl: {
    agent: 'Compliance Sentinel',
    prompt: 'Analise a URL da pré-venda (Landing Page). Verifique se o formato da URL parece correto e explique as diretrizes críticas do Google Ads para ponte (Bridge Page): ela deve possuir termos de serviço, política de privacidade, disclaimer no rodapé, não fazer promessas falsas de cura rápida e não clonar diretamente o produtor. Se a URL não for verificável, explique o que falta configurar.'
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

    const systemPrompt = `Você é o agente especialista "${config.agent}" de marketing de afiliados. sua tarefa é validar o preenchimento de um campo da campanha e dar um feedback conciso ao afiliado.
Seja direto e traga as regras de negócios de forma prática em 2 a 3 parágrafos curtos.
Use português brasileiro de forma profissional.`;

    const userPrompt = `${config.prompt}
Campo analisado: "${fieldKey}"
Valor preenchido pelo usuário: "${fieldValue}"
Contexto extra da campanha: ${JSON.stringify(context ?? {})}

Retorne as diretrizes para corrigir ou configurar se o preenchimento estiver incorreto ou não for viável.`;

    try {
      const responseText = await callLLM(userId, { agent: 'wizard-validator', systemPrompt, userPrompt });
      return NextResponse.json({ success: true, response: responseText });
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
