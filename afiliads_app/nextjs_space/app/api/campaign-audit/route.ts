export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { runAgentSequence } from '@/lib/agentSequence';
import { fetchPageText } from '@/lib/html';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }
    const userId = (session.user as any)?.id;
    const body = await request.json();
    const { campaignId } = body ?? {};

    if (!campaignId) {
      return new Response(JSON.stringify({ error: 'Campaign ID obrigatório' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, userId },
      include: {
        checklists: true,
        keywords: true,
        dailyLogs: { orderBy: { logDate: 'desc' }, take: 7 },
        decisions: { orderBy: { createdAt: 'desc' }, take: 3 },
      },
    });

    if (!campaign) {
      return new Response(JSON.stringify({ error: 'Campanha não encontrada' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    // Economia e regras calculadas em código — mesma régua do loop (lib/campaign-rules)
    const { computeEconomics, evaluateRules } = await import('@/lib/campaign-rules');
    const econ = computeEconomics(campaign, campaign.dailyLogs ?? []);
    const rules = evaluateRules(econ, campaign);
    const isPreLaunch = body?.mode === 'pre-launch' || (campaign.dailyLogs?.length ?? 0) === 0;
    if (!isPreLaunch && rules.decision === 'CONFIG_INCOMPLETA') {
      return new Response(JSON.stringify({ error: `Campanha sem campos de economia: ${rules.missingFields?.join(', ')}. Complete no Wizard antes de auditar.` }), { status: 422, headers: { 'Content-Type': 'application/json' } });
    }

    const totalChecks = campaign.checklists?.length ?? 0;
    const checkedItems = campaign.checklists?.filter((c: any) => c.isChecked)?.length ?? 0;
    const criticalUnchecked = campaign.checklists?.filter((c: any) => c.isCritical && !c.isChecked) ?? [];
    const keywordsSelected = campaign.keywords?.filter((k: any) => k.isSelected)?.length ?? 0;
    const totalSpend = econ.spend;
    const totalRevenue = econ.revenue;
    const totalClicks = econ.clicks;
    const totalConversions = econ.conversions;

    const systemPrompt = `Você é um auditor sênior de campanhas de afiliados e tráfego pago via Google Ads.
Sua função é realizar uma auditoria pré-lançamento minuciosa da campanha fornecida para identificar riscos estratégicos, técnicos e de compliance.

CRITÉRIOS DE AVALIAÇÃO DA AUDITORIA:
1. **Estrutura e Nomenclatura (Padrão do Projeto):**
   - O nome da campanha deve seguir o padrão: \`[REDE]_[VERTICAL]_[GEO]_[CANAL]_[FUNIL]_vN\` (ex: \`CB_WL_US_SEARCH_BRIDGE_v1\`).
   - Os UTMs de rastreamento devem estar presentes e corretos: \`utm_source=google\`, \`utm_medium=cpc\`, \`utm_campaign=[NAMING_DA_CAMPANHA]\`, \`utm_content={creative}\`, \`utm_term={keyword}\`.

2. **Rastreamento e Integração de Redes (Crítico):**
   - **MaxWeb:** Exige obrigatoriamente a validação do postback com envio de \`clickid\` (subid). O lançamento sem postback testado deve ser um BLOQUEADOR (FAIL).
   - **ClickBank:** Verifique se o HopLink está correto. Exige verificação se o produtor proíbe Trademark Bidding (anunciar para a palavra-chave da marca do produto). Se proibido, as keywords não devem conter a marca.
   - **BuyGoods:** Exige verificação se a página de pré-sell recebeu aprovação da rede (LP Approval) ou se cumpre as diretrizes de claims rígidas.

3. **Orçamento e Fase de Teste (Validação/Scale):**
   - **Orçamento de Teste:** Recomendado de $50 a $80 por campanha (ou 1-2x o valor da comissão por dia).
   - **Regra de Desistência (Kill):** Se o gasto atingir 3x o valor da comissão da oferta sem nenhuma venda confirmada e com o rastreamento funcionando, a campanha deve ser pausada (KILL).
   - **Regra de Escala (Scale):** Só sugira escala (+20% a 30% de orçamento) se o EPC real da campanha for maior ou igual a 1.3x o CPC real da campanha.

4. **Diretrizes de Keywords:**
   - Palavras-chave positivas devem focar em intenção transacional/comparativa e estar nas correspondências Exata (Exact) ou de Frase (Phrase) para o início da validação. Broad match sem histórico de conversões é um Warning.
   - Negativas base obrigatórias devem estar configuradas (grátis, download, reclame aqui, etc.).

ANALISE a campanha e responda com JSON:
{
  "audit_score": number (0-100),
  "risk_level": "LOW|MEDIUM|HIGH|CRITICAL",
  "categories": [
    {
      "name": "string",
      "score": number,
      "status": "OK|WARNING|FAIL",
      "items": [
        { "check": "string", "status": "PASS|WARN|FAIL", "detail": "string" }
      ]
    }
  ],
  "blockers": ["string se houver - erros impeditivos como falta de postback no MaxWeb ou falta de disclaimer"],
  "warnings": ["string - avisos importantes como uso de broad match ou orçamento baixo"],
  "recommendations": ["string - sugestões de otimização"],
  "ready_to_launch": boolean,
  "summary": "string - resumo em 2-3 frases contendo o veredito"
}`;

    const dataAtualAuditoria = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    const userPrompt = `Audite esta campanha de afiliado (data real de hoje: ${dataAtualAuditoria} — datas/anos nesse valor ou na presell real não são conteúdo futuro fabricado, são a data corrente):
${campaign.bidStrategy
  ? `[GOOGLE ADS SYNC]: dados de status/orçamento/lances ("${campaign.bidStrategy}") vieram do último pull da API do Google Ads — podem estar defasados desde então.`
  : `[GOOGLE ADS SYNC]: esta campanha NUNCA foi sincronizada com a API do Google Ads — os dados abaixo são o registro local; trate divergências com o Google Ads como possíveis.`}

**Dados da Campanha:**
- Nome: ${campaign.name}
- Plataforma: ${campaign.platform}
- Vertical: ${campaign.vertical}
- Geo: ${campaign.geo}
- Canal: ${campaign.channel}
- Funil: ${campaign.funnel}
- Comissão: $${campaign.commission}
- Refund estimado: ${campaign.refundPct}%
- Comissão líquida: $${campaign.commissionNet}
- CPC Máx: $${campaign.cpcMax?.toFixed(4)}
- CPC SCALE: $${campaign.cpcScale?.toFixed(4)}
- EPC Break-even: $${campaign.epcBreakeven?.toFixed(4)}
- URL da oferta: ${campaign.offerUrl ?? 'não informada'}
- URL pré-sell: ${campaign.presellUrl ?? 'não informada'}
- FlowPage: ${campaign.flowpageUrl ?? 'não configurado'}
- Budget teste: $${campaign.budgetTest}
- Budget diário: $${campaign.budgetDaily?.toFixed(2)}
- Duração teste: ${campaign.testDuration}
- Status: ${campaign.status}
- Wizard completo: ${campaign.wizardCompleted ? 'Sim' : 'Não'}
- Wizard step atual: ${campaign.wizardStep}

**Checklists:**
- Total: ${totalChecks} itens, ${checkedItems} marcados
- Itens CRÍTICOS não marcados: ${criticalUnchecked.length > 0 ? criticalUnchecked.map((c: any) => c.itemLabel).join(', ') : 'Nenhum'}

**Keywords:**
- ${keywordsSelected} keywords selecionadas
- Keywords: ${(campaign.keywords?.filter((k: any) => k.isSelected).map((k: any) => '"' + k.keyword + '" (' + k.matchType + ')').join(', ')) || 'nenhuma'}

**Performance (calculada em código — use ESTES números, não recalcule):**
- Gasto total: $${totalSpend.toFixed(2)} (${econ.budgetBurnPct.toFixed(0)}% do budget de teste)
- Receita total: $${totalRevenue.toFixed(2)} · Lucro: $${econ.profit.toFixed(2)}
- Cliques: ${totalClicks} · Conversões: ${totalConversions} · CVR real: ${econ.cvrRealPct.toFixed(2)}%
- EPC real: $${econ.epcReal.toFixed(4)} · CPC real: $${econ.cpcReal.toFixed(4)}
- Dias com gasto: ${econ.daysWithSpend} · Dias com CPC acima do máximo: ${econ.daysOverCpcMax}

**Decisão pelas REGRAS OFICIAIS (código): ${rules.decision}**
Gatilhos: ${rules.triggers.join(' | ')}
Sua auditoria deve partir dessa decisão — concorde ou aponte por que divergir.

**Naming:** ${campaign.campaignNameGenerated ?? 'não gerado'}
**UTMs:** ${campaign.utmString ?? 'não configurados'}`;

    // Encadeamento real: o ads-auditor faz a auditoria estrutural/econômica sem ler a presell de
    // verdade; se a campanha já tem presellUrl, o compliance-sentinel roda em seguida usando o
    // TEXTO REAL da página pra confirmar (ou refutar) os riscos que o ads-auditor só inferiu pelos
    // dados estruturados — mesmo padrão de dois agentes que já existe em lib/loop-engine.ts, mas
    // aqui o segundo agente recebe o diagnóstico do primeiro como contexto, não roda isolado.
    let presellText = '';
    if (campaign.presellUrl) {
      try { presellText = await fetchPageText(campaign.presellUrl, 10000); } catch { /* presell inacessível não derruba a auditoria */ }
    }

    const seq = await runAgentSequence(userId, userPrompt, [
      {
        agent: 'ads-auditor',
        systemPrompt,
        buildUserPrompt: ({ baseContext }) => baseContext,
      },
      ...(presellText.length > 200 ? [{
        agent: 'compliance-sentinel',
        systemPrompt: 'Você é o Compliance Sentinel do AfiliAds, chamado logo após o Ads Auditor auditar uma campanha pré-lançamento. Sua função: ler o TEXTO REAL da presell e confirmar ou refutar os riscos que o Ads Auditor só inferiu sem acesso à página (disclaimers, claims proibidos, links obrigatórios). Responda APENAS JSON válido.',
        buildUserPrompt: ({ previous }: { previous: any[] }) => {
          const adsResult = previous[0]?.data;
          const flagged = [...(adsResult?.blockers ?? []), ...(adsResult?.warnings ?? [])].join(' | ') || 'nenhum risco específico levantado';
          return `O Ads Auditor levantou estes riscos sem ler a presell de verdade: ${flagged}\n\nTEXTO REAL da presell (${campaign.presellUrl}):\n"""${presellText}"""\n\nRetorne JSON: {"alertas": [{"nivel": "critico|atencao", "texto": "..."}]}`;
        },
      }] : []),
    ], campaignId);

    const adsStep = seq.steps[0];
    let result: any;
    if (adsStep.error || !adsStep.data) {
      result = { audit_score: 0, error: adsStep.error ?? 'Falha ao parsear resposta' };
    } else {
      result = adsStep.data;
    }

    const complianceStep = seq.steps[1];
    if (complianceStep && !complianceStep.error && complianceStep.data) {
      const criticos = (complianceStep.data.alertas ?? []).filter((a: any) => a?.nivel === 'critico');
      if (criticos.length > 0) {
        const nota = `Compliance Sentinel (leu a presell real): ${criticos.map((a: any) => a.texto).join(' | ')}`;
        result.blockers = Array.isArray(result.blockers) ? [...result.blockers, nota] : [nota];
        result.ready_to_launch = false;
      }
    }

    // Consistência forçada: as métricas/regras determinísticas (código, calculadas acima) sempre
    // vencem a opinião do LLM — ele pode enriquecer com contexto/recomendações, mas nunca pode dar
    // "pronto pra lançar" quando há blocker real (checklist crítico pendente ou regra KILL).
    if (result && typeof result === 'object' && !result.error) {
      const hasCriticalBlocker = criticalUnchecked.length > 0;
      const rulesBlocker = rules.decision === 'KILL';
      if (hasCriticalBlocker || rulesBlocker) {
        const forcedNote = hasCriticalBlocker
          ? `Nota do sistema: ${criticalUnchecked.length} item(ns) crítico(s) do checklist ainda pendente(s) (${criticalUnchecked.map((c: any) => c.itemLabel).join(', ')}) — veredito limitado automaticamente, NÃO é seguro lançar.`
          : `Nota do sistema: as regras determinísticas (economia real da campanha) indicam KILL — veredito limitado automaticamente.`;
        result.ready_to_launch = false;
        if (typeof result.audit_score === 'number' && result.audit_score > 40) result.audit_score = 40;
        if (result.risk_level === 'LOW' || result.risk_level === 'MEDIUM') result.risk_level = hasCriticalBlocker ? 'CRITICAL' : 'HIGH';
        result.summary = `${result.summary ?? ''} ${forcedNote}`.trim();
        result.blockers = Array.isArray(result.blockers) ? [...result.blockers, forcedNote] : [forcedNote];
      }
    }

    return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    console.error('Campaign audit error:', err);
    return new Response(JSON.stringify({ error: 'Erro interno' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
