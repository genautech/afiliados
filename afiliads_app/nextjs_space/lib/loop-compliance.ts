import type { Campaign } from '@prisma/client';
import { callAgent } from './llm';
import { judgeBridgeCompliance } from './compliance-judgments';

// Check de compliance da presell dentro do loop de auto-correção.
//
// Antes isto era, nos dois pontos de chamada, um LLM generativo respondendo
// {"aprovado":bool,"alertas":[{"nivel":"critico|atencao","texto":"..."}]} passado por JSON.parse,
// e a contagem de alertas com nivel==='critico' rebaixava SCALE/CONTINUAR para OTIMIZAR. Ou seja:
// decisão sobre orçamento ativo tomada a partir de texto gerado e parseado, com o próprio modelo
// escolhendo o que é "crítico".
//
// Agora a severidade é regra de código sobre nouls (lib/compliance-judgments.ts): claim proibida e
// falta de disclosure de afiliado são críticas porque derrubam conta; FAQ e aviso de variação são
// atenção. 'incerto' nunca rebaixa decisão — vira aviso para revisão humana.
//
// O agente generativo fica como fallback para quando não há TYPESAFE_API_KEY ou o serviço está
// fora: sem isso, o check simplesmente deixaria de existir nesse intervalo.

export type LoopComplianceResult = {
  triggers: string[];
  /** true rebaixa a decisão do loop (CONTINUAR/SCALE → OTIMIZAR). */
  critical: boolean;
  agentsRun: string[];
  totalTokens: number;
  error: string | null;
};

const VAZIO: LoopComplianceResult = { triggers: [], critical: false, agentsRun: [], totalTokens: 0, error: null };

function textoVisivel(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, 10000);
}

export async function checkPresellCompliance(
  userId: string,
  campaign: Campaign,
  contexto: { pausada: boolean },
): Promise<LoopComplianceResult> {
  if (!campaign.presellUrl) return VAZIO;

  const prefixo = contexto.pausada ? 'Compliance (campanha pausada)' : 'Compliance';

  let html: string;
  try {
    const page = await fetch(campaign.presellUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, cache: 'no-store' });
    if (!page.ok) {
      return { ...VAZIO, triggers: [`Presell inacessível (HTTP ${page.status}) em ${campaign.presellUrl} — verificar hospedagem`] };
    }
    html = await page.text();
  } catch (e: any) {
    return {
      ...VAZIO,
      triggers: [`Presell inacessível (${e?.message}) — verificar hospedagem/URL`],
      error: `compliance: ${e?.message}`,
    };
  }

  const judged = await judgeBridgeCompliance(html);
  if (judged) {
    const criticos: string[] = [];
    const atencao: string[] = [];

    // Severidade em código, não escolhida pelo modelo: claim proibida e ausência de disclosure de
    // afiliado são o que derruba conta no Google Ads.
    if (judged.sem_claims.verdict === 'reprovou') criticos.push(judged.sem_claims.note ?? 'claim proibida no texto da presell');
    if (judged.disclaimer.verdict === 'reprovou') criticos.push(judged.disclaimer.note ?? 'disclosure de afiliado ausente');

    if (judged.sem_claims.verdict === 'incerto') atencao.push(judged.sem_claims.note ?? 'possível claim proibida — revisar');
    if (judged.faq.verdict === 'reprovou') atencao.push('sem seção de FAQ');
    if (judged.resultados_variam.verdict === 'reprovou') atencao.push('sem aviso de que resultados variam');

    const triggers: string[] = [];
    if (criticos.length) triggers.push(`${prefixo}: ${criticos.length} item(ns) crítico(s) na presell — ${criticos.join(' | ')}`);
    if (atencao.length) triggers.push(`${prefixo} (atenção, não rebaixa decisão): ${atencao.join(' | ')}`);

    return {
      triggers,
      critical: criticos.length > 0,
      agentsRun: ['compliance-judgment'],
      // O julgamento não passa pelo contador de tokens do callAgent; custo dele não entra no
      // relatório de gasto de IA do app. Se isso passar a importar, é AgentRun que precisa aceitar
      // uma origem que não seja LLM generativo.
      totalTokens: 0,
      error: null,
    };
  }

  // ---- Fallback: agente generativo (sem TYPESAFE_API_KEY ou serviço fora) ----
  try {
    const res = await callAgent(userId, {
      agent: 'compliance-sentinel',
      json: true,
      campaignId: campaign.id,
      campaignTarget: contexto.pausada
        ? { kind: 'campaign', campaignId: campaign.id, purpose: 'paused-compliance' }
        : { kind: 'campaign', campaignId: campaign.id },
      systemPrompt: contexto.pausada
        ? 'Você é o Compliance Sentinel do AfiliAds verificando uma campanha PAUSADA (sem gasto de ads ativo, mas a presell pode continuar publicada e acessível). Audite o texto REAL da presell contra políticas do Google Ads (claims de cura/renda, urgência falsa, depoimentos proibidos). Responda APENAS JSON válido.'
        : 'Você é o Compliance Sentinel do AfiliAds no loop de auto-correção. Audite o texto REAL da presell contra políticas do Google Ads (claims de cura/renda, urgência falsa, depoimentos proibidos). Responda APENAS JSON válido.',
      userPrompt: `Presell da campanha ${campaign.name} (${campaign.presellUrl})${contexto.pausada ? ' — campanha está PAUSADA, este é um check de compliance de rotina, não uma auditoria de ads' : ''}:\n"""${textoVisivel(html)}"""\nRetorne JSON: {"aprovado": true|false, "alertas": [{"nivel": "critico|atencao", "texto": "..."}]}`,
    });
    const criticos = (res.data?.alertas ?? []).filter((a: any) => a?.nivel === 'critico');
    return {
      triggers: criticos.length
        ? [`${prefixo}: ${criticos.length} alerta(s) crítico(s) na presell — ${criticos.map((a: any) => a.texto).join(' | ')}`]
        : [],
      critical: criticos.length > 0,
      agentsRun: ['compliance-sentinel'],
      totalTokens: res.usage.totalTokens ?? 0,
      error: null,
    };
  } catch (e: any) {
    return { ...VAZIO, error: `compliance-sentinel: ${e?.message}` };
  }
}
