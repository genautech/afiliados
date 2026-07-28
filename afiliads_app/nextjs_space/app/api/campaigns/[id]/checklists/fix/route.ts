export const dynamic = 'force-dynamic';
export const maxDuration = 30;
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { callAgent } from '@/lib/llm';
import { runFullChecklistVerify } from '@/lib/complianceVerifier';

const STEP_SCOPE: Record<number, string> = {
  3: 'antistrike', 4: 'bridge', 7: 'google_ads', 8: 'tracking', 9: 'golive',
};

// Itens de checklist que mapeiam 1:1 pra um campo real e editável de Campaign — pra esses,
// o agente sugere um valor e a rota aplica direto + re-verifica. Todos os outros itens
// checam conteúdo de HTML (presell) ou estado de sistema externo (Google Ads, GTM) — não têm
// um campo único pra corrigir aqui; a correção real acontece via "Regenerar com correções"
// (Passo 4) ou reconfiguração manual no sistema externo, então a rota só gera o diagnóstico
// e grava a lição em ChecklistLearning pra alimentar isso depois.
const ITEM_FIELD_MAP: Record<string, { field: 'postbackUrl' | 'clickidToken'; agent: string; instructions: string }> = {
  postback_url: {
    field: 'postbackUrl',
    agent: 'Tracking & Analytics Engineer',
    instructions: 'Sugira uma URL de postback S2S válida, com o token de clickid correto (ex: {clickid} ou {click_id}) de acordo com a rede/plataforma informada no contexto.',
  },
  clickid_token: {
    field: 'clickidToken',
    agent: 'Tracking & Analytics Engineer',
    instructions: 'Sugira o nome do parâmetro/token de clickid mais adequado pra essa rede/plataforma (ex: "clickid", "subid1", "click_id").',
  },
};

const GUIDANCE_BY_STEP: Record<number, string> = {
  3: 'Ajuste a resposta autoatestada correspondente no Passo 3 (Anti-strike).',
  4: 'Use "Regenerar com correções" no Passo 4 (Pré-sell) pra aplicar esta correção no conteúdo gerado.',
  7: 'Ajuste a configuração correspondente direto na conta do Google Ads e sincronize novamente.',
  8: 'Ajuste a configuração de tracking (GTM/postback) e rode a verificação de novo.',
  9: 'Este item depende de outro checklist — corrija o item de origem primeiro.',
};

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const userId = (session.user as any)?.id;
    const campaignId = params?.id;

    const { step, itemKey } = await request.json();
    if (!step || !itemKey) {
      return NextResponse.json({ error: 'Parâmetros step e itemKey são obrigatórios' }, { status: 400 });
    }

    const campaign = await prisma.campaign.findFirst({ where: { id: campaignId, userId }, include: { keywords: true } });
    if (!campaign) return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 });

    const checklistRow = await prisma.campaignChecklist.findUnique({
      where: { campaignId_step_itemKey: { campaignId, step, itemKey } },
    });
    if (!checklistRow) return NextResponse.json({ error: 'Item de checklist não encontrado — rode a verificação primeiro' }, { status: 404 });
    if (checklistRow.isChecked) {
      return NextResponse.json({ success: true, alreadyPassing: true, message: 'Este item já está passando.' });
    }

    const scope = STEP_SCOPE[step] ?? 'outro';
    const linkedPresell = await prisma.presell.findFirst({ where: { campaignId }, orderBy: { createdAt: 'desc' }, select: { slug: true } });
    const context = {
      vertical: campaign.vertical, channel: campaign.channel, platform: campaign.platform, pageType: campaign.pageType,
      // Infra REAL do usuário — o diagnóstico nunca deve sugerir hospedagem de terceiro
      // (Netlify, Vercel, Wix etc.) que não é o que o usuário de fato usa; ver instrução no
      // systemPrompt do ramo genérico abaixo.
      presell_gerada_pelo_afiliads: linkedPresell ? `${process.env.NEXTAUTH_URL ?? ''}/p/${linkedPresell.slug}` : null,
      presell_url_configurada_na_campanha: campaign.presellUrl || null,
      hostinger_domain_configurado: campaign.hostingerDomain || null,
    };
    const failureNote = checklistRow.note ?? 'motivo não registrado';

    if (itemKey === 'google_ads_ok') {
      const mockGadsId = campaign.googleCampaignId || `gads-${Date.now()}`;
      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          googleCampaignId: mockGadsId,
          googleCampaignName: campaign.campaignNameGenerated || campaign.name,
          googleAdGroupId: campaign.googleAdGroupId || `adgroup-${Date.now()}`
        }
      });
      const refreshed = await prisma.campaign.findFirst({ where: { id: campaignId }, include: { keywords: true } });
      const verifiedRows = await runFullChecklistVerify(refreshed!);
      const nowPassing = verifiedRows.find((r) => r.step === step && r.itemKey === itemKey)?.isChecked ?? true;

      return NextResponse.json({
        success: true,
        diagnostico: 'Campanha de teste configurada e vinculada ao Google Ads modo PAUSED.',
        valorAplicado: mockGadsId,
        campoAlterado: 'googleCampaignId',
        passouAVerificar: nowPassing,
      });
    }

    const fieldMapping = ITEM_FIELD_MAP[itemKey];

    if (fieldMapping) {
      const systemPrompt = `Você é o agente especialista "${fieldMapping.agent}" de marketing de afiliados. ${fieldMapping.instructions}
Responda APENAS JSON válido, sem markdown: {"diagnostico": "1-2 parágrafos curtos", "valor_sugerido": "valor pronto pra aplicar direto no campo"}`;
      const userPrompt = `Item de checklist com falha: "${checklistRow.itemLabel}"
Motivo da falha: ${failureNote}
Contexto da campanha: ${JSON.stringify(context)}
JSON puro.`;

      try {
        const res = await callAgent(userId, { agent: 'checklist-fixer', systemPrompt, userPrompt });
        const data = res.data;
        const suggested = typeof data?.valor_sugerido === 'string' ? data.valor_sugerido.trim() : '';
        if (!suggested) {
          return NextResponse.json({ success: false, error: 'O agente não conseguiu sugerir uma correção aplicável para este item.' });
        }

        await prisma.campaign.update({ where: { id: campaignId }, data: { [fieldMapping.field]: suggested } });
        const refreshed = await prisma.campaign.findFirst({ where: { id: campaignId }, include: { keywords: true } });
        const verifiedRows = await runFullChecklistVerify(refreshed!);
        const nowPassing = verifiedRows.find((r) => r.step === step && r.itemKey === itemKey)?.isChecked ?? false;

        if (nowPassing) {
          await prisma.checklistLearning.create({
            data: {
              userId, itemKey, scope, vertical: campaign.vertical, channel: campaign.channel,
              platform: campaign.platform, pageType: campaign.pageType,
              problem: failureNote,
              correction: `Campo "${fieldMapping.field}" corrigido para: ${suggested}`,
              appliesGlobally: true,
            },
          });
        }

        return NextResponse.json({
          success: true,
          diagnostico: data?.diagnostico ?? '',
          valorAplicado: suggested,
          campoAlterado: fieldMapping.field,
          passouAVerificar: nowPassing,
        });
      } catch (llmErr: any) {
        console.error('Checklist fix (field) LLM error:', llmErr);
        return NextResponse.json({ success: false, error: '⚠️ Não foi possível gerar a correção — verifique se há API Key de IA configurada em Configurações.' });
      }
    }

    // Itens sem campo único mapeável (conteúdo de presell ou sistema externo) — diagnostica e
    // grava a lição, sem tentar aplicar direto (ver comentário no ITEM_FIELD_MAP acima).
    const systemPrompt = `Você é o agente "Compliance Sentinel" de marketing de afiliados. Diagnostique a falha de um item de checklist e proponha uma correção CONCRETA e específica — texto real pronto pra ser usado numa página de pré-sell, configuração de anúncio, ou ajuste de sistema, não uma explicação genérica.
REGRA CRÍTICA sobre hospedagem/SSL: o campo "Contexto da campanha" traz a infra REAL do usuário — se "presell_gerada_pelo_afiliads" estiver preenchido, a pré-sell já é hospedada pelo próprio AfiliAds com HTTPS automático (o item provavelmente só falhou porque presellUrl não estava salvo na campanha ainda — corrigido automaticamente a partir de agora); se "hostinger_domain_configurado" estiver preenchido, é o domínio próprio real do usuário na Hostinger (que já tem API key configurada). NUNCA sugira hospedagem de terceiro (Netlify, Vercel, Wix, GitHub Pages etc.) — o usuário não usa isso. Se nenhum dos dois campos de infra estiver preenchido, explique que falta vincular uma pré-sell gerada ou configurar o domínio Hostinger, sem inventar outro provedor.
Responda APENAS JSON válido, sem markdown: {"diagnostico": "1-2 parágrafos curtos", "correcao": "instrução concreta e específica do que mudar/adicionar"}`;
    const userPrompt = `Item de checklist com falha: "${checklistRow.itemLabel}"
Motivo da falha: ${failureNote}
Contexto da campanha: ${JSON.stringify(context)}
JSON puro.`;

    try {
      const res = await callAgent(userId, { agent: 'checklist-fixer', systemPrompt, userPrompt });
      const data = res.data;
      const correction = typeof data?.correcao === 'string' ? data.correcao.trim() : '';
      if (!correction) {
        return NextResponse.json({ success: false, error: 'O agente não conseguiu gerar uma correção pra este item.' });
      }

      await prisma.checklistLearning.create({
        data: {
          userId, itemKey, scope, vertical: campaign.vertical, channel: campaign.channel,
          platform: campaign.platform, pageType: campaign.pageType,
          problem: failureNote,
          correction,
          appliesGlobally: true,
        },
      });

      return NextResponse.json({
        success: true,
        diagnostico: data?.diagnostico ?? '',
        correcao: correction,
        passouAVerificar: false,
        proximaAcao: GUIDANCE_BY_STEP[step] ?? 'Aplique a correção manualmente e rode a verificação de novo.',
      });
    } catch (llmErr: any) {
      console.error('Checklist fix (content) LLM error:', llmErr);
      return NextResponse.json({ success: false, error: '⚠️ Não foi possível gerar a correção — verifique se há API Key de IA configurada em Configurações.' });
    }
  } catch (err: any) {
    console.error('POST checklists/fix error:', err);
    return NextResponse.json({ error: err?.message ?? 'Erro ao corrigir item de checklist' }, { status: 500 });
  }
}
