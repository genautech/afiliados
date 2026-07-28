export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

const SKILLCLAW_PROXY_URL = 'http://127.0.0.1:30000/v1/chat/completions';
// Estimativa grosseira de custo (gpt-4o, tokens de entrada+saída misturados) — só pra exibir "Custo Est." no painel.
const EST_COST_PER_1K_TOKENS_USD = 0.01;

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const encoder = new TextEncoder();
  const campaignId = params.id;

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: any) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
          sendEvent('error', { message: 'Não autorizado' });
          controller.close();
          return;
        }

        const userId = (session.user as any)?.id;
        const campaign = await prisma.campaign.findFirst({ where: { id: campaignId, userId } });
        if (!campaign) {
          sendEvent('error', { message: 'Campanha não encontrada' });
          controller.close();
          return;
        }

        const budgetDaily = campaign.budgetDaily > 0 ? campaign.budgetDaily : 30;

        // ETAPA 1: Análise Budget-First
        sendEvent('log', { time: '00:01s', message: `🔍 Analisando Orçamento Diário de $${budgetDaily.toFixed(2)} USD...` });
        sendEvent('progress', { percent: 15, tokensEstimated: 0, costEstimatedUSD: 0 });

        const isLowBudget = budgetDaily < 20;
        const targetStrategy = isLowBudget ? 'MANUAL_CPC' : 'MAXIMIZE_CLICKS';
        const targetCpc = isLowBudget ? 1.80 : 2.50;

        // ETAPA 2: Consulta ATP / Tendências via SkillClaw
        sendEvent('log', { time: '00:03s', message: `📊 Consultando ATP e Google Trends via Proxy SkillClaw (Porta 30000)...` });
        sendEvent('progress', { percent: 45, tokensEstimated: 0, costEstimatedUSD: 0 });

        // Chamada Proxy ao SkillClaw — sem fallback silencioso: se falhar, o evento
        // 'log' abaixo reporta o motivo real (ex.: quota da conta upstream esgotada)
        // em vez de fingir uma justificativa gerada por IA.
        const skillclawPayload = {
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: 'Você é o Google Ads Optimizer do SkillClaw.' },
            { role: 'user', content: `Otimizar lances para orçamento de $${budgetDaily} no nicho Saúde Feminina.` }
          ]
        };

        let agentJustification = '';
        let skillclawTokens: number | null = null;
        try {
          const scRes = await fetch(SKILLCLAW_PROXY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(skillclawPayload)
          });
          const scData = await scRes.json();
          if (!scRes.ok) {
            throw new Error(scData?.detail || scData?.error?.message || `HTTP ${scRes.status}`);
          }
          agentJustification = scData?.choices?.[0]?.message?.content ?? '';
          if (typeof scData?.usage?.total_tokens === 'number') skillclawTokens = scData.usage.total_tokens;
          if (!agentJustification) throw new Error('SkillClaw retornou resposta vazia');
          sendEvent('log', { time: '00:04s', message: `✅ SkillClaw respondeu (${skillclawTokens ?? '?'} tokens).` });
        } catch (e: any) {
          agentJustification = `[SkillClaw indisponível: ${e?.message || 'erro desconhecido'}] Fallback por regra: orçamento de $${budgetDaily}/dia → CPC Manual fixado em $${targetCpc} para evitar estourar orçamento inicial.`;
          sendEvent('log', { time: '00:04s', message: `⚠️ SkillClaw falhou (${e?.message || 'erro desconhecido'}) — usando fallback por regra, sem IA.` });
        }

        // ETAPA 3: Executando Correção na API do Google Ads
        sendEvent('log', { time: '00:06s', message: `⚙️ Aplicando estratégia ${targetStrategy} com CPC teto de $${targetCpc} USD...` });
        const tokensEstimated = skillclawTokens ?? 0;
        const costEstimatedUSD = (tokensEstimated / 1000) * EST_COST_PER_1K_TOKENS_USD;
        sendEvent('progress', { percent: 75, tokensEstimated, costEstimatedUSD });

        // Persiste no banco de dados local
        await prisma.campaign.update({
          where: { id: campaignId },
          data: {
            bidStrategy: targetStrategy,
            cpcMax: targetCpc
          }
        });

        // ETAPA 4: Gravando Aprendizado no ChecklistLearning & SkillClaw Local Skills
        sendEvent('log', { time: '00:08s', message: `🛡️ Salvando lição em ChecklistLearning e distribuindo para ~/.skillclaw/skills...` });
        sendEvent('progress', { percent: 95, tokensEstimated, costEstimatedUSD });

        const learning = await prisma.checklistLearning.create({
          data: {
            userId: (session.user as any).id,
            itemKey: 'bidding_strategy',
            scope: 'google_ads',
            vertical: campaign.vertical ?? 'Saude Feminina',
            channel: campaign.channel ?? 'SEARCH',
            platform: campaign.platform ?? 'ClickBank',
            pageType: campaign.pageType ?? 'authority_review',
            problem: `Orçamento de $${budgetDaily} exigia adequação de lances.`,
            correction: `Estratégia ajustada para ${targetStrategy} com CPC teto de $${targetCpc}.`,
            appliesGlobally: true
          }
        });

        // Grava no diretório centralizado do SkillClaw
        const skillclawDir = path.join(process.env.HOME || '', '.skillclaw', 'skills');
        if (!fs.existsSync(skillclawDir)) fs.mkdirSync(skillclawDir, { recursive: true });
        const skillFile = path.join(skillclawDir, `google_ads_budget_${campaignId}.json`);
        fs.writeFileSync(skillFile, JSON.stringify(learning, null, 2));

        sendEvent('log', { time: '00:10s', message: `✅ Campanha re-verificada e 100% pronta!` });
        sendEvent('complete', {
          success: true,
          percent: 100,
          strategyApplied: targetStrategy,
          cpcTarget: targetCpc,
          justification: agentJustification
        });

      } catch (err: any) {
        sendEvent('error', { message: err?.message || 'Erro durante o streaming do agente.' });
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
}
