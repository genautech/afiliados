#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import pg from 'pg';
import { listarEmails, lerEmail, criarRascunhoResposta } from './gmail.mjs';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error('DATABASE_URL não definida — configure no settings.json do MCP (o app usa Postgres na nuvem)'); process.exit(1); }
const APP_URL = process.env.AFILIADS_APP_URL || 'http://localhost:3001';
const MCP_TOKEN = process.env.AFILIADS_MCP_TOKEN || '';
const USER_EMAIL = process.env.AFILIADS_USER_EMAIL;
if (!USER_EMAIL) { console.error('AFILIADS_USER_EMAIL não definida — configure o e-mail da conta que o MCP deve operar'); process.exit(1); }

const pool = new pg.Pool({ connectionString: DATABASE_URL });

async function userId() {
  const r = await pool.query('SELECT id FROM "User" WHERE email = $1', [USER_EMAIL]);
  if (!r.rows[0]) throw new Error(`Usuário ${USER_EMAIL} não encontrado no banco afiliads`);
  return r.rows[0].id;
}

const text = (obj) => ({ content: [{ type: 'text', text: typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2) }] });

const server = new McpServer({ name: 'afiliads', version: '1.0.0' });

server.tool(
  'listar_produtos',
  'Lista os produtos pesquisados na área Busca de Produtos do AfiliAds (nome, score, risco, vertical, payout, status), ordenados por score.',
  { vertical: z.string().optional().describe('Filtrar por vertical (parcial, case-insensitive)'), status: z.enum(['novo', 'analisado', 'escolhido']).optional() },
  async ({ vertical, status }) => {
    const uid = await userId();
    const conds = ['"userId" = $1'];
    const params = [uid];
    if (vertical) { params.push(`%${vertical}%`); conds.push(`vertical ILIKE $${params.length}`); }
    if (status) { params.push(status); conds.push(`status = $${params.length}`); }
    const r = await pool.query(
      `SELECT name, network, vertical, gravity, "avgPayout", "commissionPct", rebill, score, "riskLevel", status, "chosenKeyword"
       FROM "ProductResearch" WHERE ${conds.join(' AND ')} ORDER BY score DESC`, params);
    return text(r.rows);
  }
);

server.tool(
  'dossie_produto',
  'Retorna o dossiê completo de um produto (keywords em camadas A-D, negativas, estratégia de presell/campanha, compliance, insights da página de afiliado).',
  { nome: z.string().describe('Nome do produto (busca parcial)') },
  async ({ nome }) => {
    const uid = await userId();
    const r = await pool.query(
      `SELECT * FROM "ProductResearch" WHERE "userId" = $1 AND name ILIKE $2 ORDER BY "updatedAt" DESC LIMIT 1`,
      [uid, `%${nome}%`]);
    if (!r.rows[0]) return text(`Produto "${nome}" não encontrado. Use listar_produtos para ver os disponíveis.`);
    return text(r.rows[0]);
  }
);

server.tool(
  'uso_llm',
  'Consumo de tokens LLM do mês corrente por provedor (Claude/GPT/Gemini/Abacus) e por agente, com falhas. Use para decidir se o Claude está gastando demais e o roteamento precisa de ajuste.',
  {},
  async () => {
    const uid = await userId();
    const monthStart = new Date();
    monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const byProvider = await pool.query(
      `SELECT provider, COUNT(*)::int AS runs, SUM("totalTokens")::int AS tokens,
              COUNT(*) FILTER (WHERE NOT success)::int AS falhas
       FROM "AgentRun" WHERE "userId" = $1 AND "createdAt" >= $2 GROUP BY provider ORDER BY tokens DESC NULLS LAST`,
      [uid, monthStart]);
    const byAgent = await pool.query(
      `SELECT agent, provider, COUNT(*)::int AS runs, SUM("totalTokens")::int AS tokens
       FROM "AgentRun" WHERE "userId" = $1 AND "createdAt" >= $2 GROUP BY agent, provider ORDER BY tokens DESC NULLS LAST LIMIT 30`,
      [uid, monthStart]);
    return text({ mes: monthStart.toISOString().slice(0, 7), porProvedor: byProvider.rows, porAgente: byAgent.rows });
  }
);

server.tool(
  'analisar_produto',
  'Dispara o pipeline multi-agente (Product Hunter → SEO Architect → Compliance Sentinel) para um produto no app AfiliAds. Demora ~1-3 min. Requer o app rodando e AFILIADS_MCP_TOKEN configurado.',
  { nome: z.string().describe('Nome exato do produto a analisar'), network: z.string().default('clickbank') },
  async ({ nome, network }) => {
    if (!MCP_TOKEN) return text('AFILIADS_MCP_TOKEN não configurado — defina a mesma variável no .env do app e na config do MCP.');
    const res = await fetch(`${APP_URL}/api/product-research`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-afiliads-token': MCP_TOKEN },
      body: JSON.stringify({ productName: nome, network }),
    });
    if (!res.ok || !res.body) return text(`Erro ${res.status}: ${await res.text()}`);
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    const steps = [];
    let final = null;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const evt = JSON.parse(line.slice(6));
        if (evt.status === 'step') steps.push(`${evt.agent}: ${evt.state}`);
        else if (evt.status === 'completed') final = evt.product;
        else if (evt.status === 'error') return text(`Pipeline falhou: ${evt.error}\nEtapas: ${steps.join(' | ')}`);
      }
    }
    if (!final) return text(`Pipeline terminou sem resultado. Etapas: ${steps.join(' | ')}`);
    return text({
      produto: final.name, score: final.score, risco: final.riskLevel,
      melhorKeyword: final.chosenKeyword, resumo: final.summary,
      estrategia: final.strategy, alertas: final.compliance?.alertas,
    });
  }
);

server.tool(
  'configurar_roteamento',
  'Configura a orquestração de LLMs do AfiliAds: ativa/desativa provedores (anthropic, openai, google, ollama), modo auto/manual, provedor manual e orçamento mensal de tokens do Claude. Ex.: quando o usuário adicionar créditos na OpenAI, chame com ativar:["openai"].',
  {
    ativar: z.array(z.enum(['anthropic', 'openai', 'google', 'ollama'])).optional().describe('Provedores a reativar nas cadeias'),
    desativar: z.array(z.enum(['anthropic', 'openai', 'google', 'ollama'])).optional().describe('Provedores a tirar das cadeias (ex.: sem créditos)'),
    modo: z.enum(['auto', 'manual']).optional(),
    provedor_manual: z.enum(['anthropic', 'openai', 'google', 'ollama']).optional(),
    orcamento_claude_tokens: z.number().int().min(0).optional().describe('Orçamento mensal de tokens do Claude (0 = ilimitado)'),
  },
  async ({ ativar, desativar, modo, provedor_manual, orcamento_claude_tokens }) => {
    const uid = await userId();
    const upsert = async (fieldName, fieldValue) => {
      await pool.query(
        `INSERT INTO "Integration" (id, "userId", "serviceName", "fieldName", "fieldValue", "createdAt", "updatedAt")
         VALUES ('mcp_' || substr(md5(random()::text), 1, 20), $1, 'llm', $2, $3, now(), now())
         ON CONFLICT ("userId", "serviceName", "fieldName") DO UPDATE SET "fieldValue" = $3, "updatedAt" = now()`,
        [uid, fieldName, fieldValue]);
    };
    const changes = [];
    if (ativar?.length || desativar?.length) {
      const r = await pool.query(
        `SELECT "fieldValue" FROM "Integration" WHERE "userId" = $1 AND "serviceName" = 'llm' AND "fieldName" = 'disabled_providers'`, [uid]);
      const current = new Set((r.rows[0]?.fieldValue ?? '').split(',').map(x => x.trim()).filter(Boolean));
      for (const p of ativar ?? []) current.delete(p);
      for (const p of desativar ?? []) current.add(p);
      await upsert('disabled_providers', [...current].join(','));
      changes.push(`desativados agora: ${[...current].join(', ') || '(nenhum)'}`);
    }
    if (modo) { await upsert('routing', modo); changes.push(`modo: ${modo}`); }
    if (provedor_manual) { await upsert('provider', provedor_manual); changes.push(`provedor manual: ${provedor_manual}`); }
    if (orcamento_claude_tokens !== undefined) {
      await upsert('budget_tokens_anthropic', String(orcamento_claude_tokens));
      changes.push(`orçamento Claude: ${orcamento_claude_tokens} tokens/mês`);
    }
    return text(changes.length ? `Roteamento atualizado — ${changes.join('; ')}` : 'Nada a alterar (informe ativar/desativar/modo/orçamento).');
  }
);

server.tool(
  'rodar_loop',
  'Roda o loop de auto-correção de uma campanha (ou de todas as vencidas): calcula economia real do diário, aplica as regras KILL/SCALE/PAUSAR/OTIMIZAR em código, roda os agentes configurados (auditor/compliance) e persiste a decisão. Requer o app rodando.',
  { campanha: z.string().optional().describe('Nome (parcial) da campanha; omita para rodar todas as vencidas') },
  async ({ campanha }) => {
    if (!MCP_TOKEN) return text('AFILIADS_MCP_TOKEN não configurado.');
    let campaignId;
    if (campanha) {
      const uid = await userId();
      const r = await pool.query(`SELECT id, name FROM "Campaign" WHERE "userId" = $1 AND name ILIKE $2 LIMIT 1`, [uid, `%${campanha}%`]);
      if (!r.rows[0]) return text(`Campanha "${campanha}" não encontrada.`);
      campaignId = r.rows[0].id;
    }
    const res = await fetch(`${APP_URL}/api/loop/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-afiliads-token': MCP_TOKEN },
      body: JSON.stringify(campaignId ? { campaignId } : {}),
    });
    const data = await res.json();
    if (!res.ok) return text(`Erro ${res.status}: ${data?.error ?? JSON.stringify(data)}`);
    return text(data);
  }
);

server.tool(
  'registrar_diario',
  'Registra os números do dia de uma campanha (dados do Google Ads: gasto, cliques, conversões, receita). Se o loop da campanha estiver habilitado, dispara a reavaliação automática.',
  {
    campanha: z.string().describe('Nome (parcial) da campanha'),
    data: z.string().describe('Data do registro YYYY-MM-DD'),
    gasto: z.number().min(0),
    cliques: z.number().int().min(0),
    conversoes: z.number().int().min(0).default(0),
    receita: z.number().min(0).default(0),
    impressoes: z.number().int().min(0).default(0),
    notas: z.string().optional(),
  },
  async ({ campanha, data, gasto, cliques, conversoes, receita, impressoes, notas }) => {
    if (!MCP_TOKEN) return text('AFILIADS_MCP_TOKEN não configurado.');
    const uid = await userId();
    const r = await pool.query(`SELECT id, name FROM "Campaign" WHERE "userId" = $1 AND name ILIKE $2 LIMIT 1`, [uid, `%${campanha}%`]);
    if (!r.rows[0]) return text(`Campanha "${campanha}" não encontrada.`);
    const res = await fetch(`${APP_URL}/api/daily-logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-afiliads-token': MCP_TOKEN },
      body: JSON.stringify({ campaignId: r.rows[0].id, logDate: data, spend: gasto, clicks: cliques, conversions: conversoes, revenue: receita, impressions: impressoes, notes: notas ?? null }),
    });
    const out = await res.json();
    if (!res.ok) return text(`Erro ${res.status}: ${out?.error ?? JSON.stringify(out)}`);
    return text(`Diário de ${r.rows[0].name} em ${data} registrado. Loop dispara automaticamente se habilitado — consulte decisoes_campanha em seguida.`);
  }
);

server.tool(
  'decisoes_campanha',
  'Lista as últimas decisões e execuções de loop de uma campanha (decisão, gatilhos, agentes, tokens).',
  { campanha: z.string().describe('Nome (parcial) da campanha') },
  async ({ campanha }) => {
    const uid = await userId();
    const c = await pool.query(`SELECT id, name, status FROM "Campaign" WHERE "userId" = $1 AND name ILIKE $2 LIMIT 1`, [uid, `%${campanha}%`]);
    if (!c.rows[0]) return text(`Campanha "${campanha}" não encontrada.`);
    const decisions = await pool.query(
      `SELECT decision, rationale, "createdAt" FROM "CampaignDecision" WHERE "campaignId" = $1 ORDER BY "createdAt" DESC LIMIT 5`, [c.rows[0].id]);
    const loops = await pool.query(
      `SELECT trigger, decision, triggers, "agentsRun", "totalTokens", "createdAt" FROM "LoopRun" WHERE "campaignId" = $1 ORDER BY "createdAt" DESC LIMIT 5`, [c.rows[0].id]);
    return text({ campanha: c.rows[0].name, status: c.rows[0].status, decisoes: decisions.rows, loops: loops.rows });
  }
);

server.tool(
  'sincronizar_clickbank',
  'Puxa vendas/refunds reais da API do ClickBank (orders2) e grava nos DailyLogs das campanhas casando pelo trackingId (utmCampaign ou nome da campanha). Use antes de analisar performance ou quando o usuário perguntar "vendeu algo?".',
  { dias: z.number().int().min(1).max(30).default(3).describe('Janela de dias para trás') },
  async ({ dias }) => {
    if (!MCP_TOKEN) return text('AFILIADS_MCP_TOKEN não configurado.');
    const res = await fetch(`${APP_URL}/api/clickbank/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-afiliads-token': MCP_TOKEN },
      body: JSON.stringify({ days: dias }),
    });
    const data = await res.json();
    return text(data);
  }
);

server.tool(
  'gerar_presell',
  'Gera e publica uma página de presell (bridge page compliance-friendly) para um produto. Por padrão publica no app Railway (/p/<slug>); com destino=wordpress publica direto num site WordPress (Hostinger). tipo_pagina define a ESTRUTURA da página (advertorial = artigo completo; pogo = curta, vende o clique; vsl = vídeo + CTA, exige video_url); angulo é só o tom do texto. popup ativa um gate de retenção (segure 2s pra continuar) igual pra todo visitante — não é cloaking. Requer hopLink de afiliado real. Se tracking_id vier de uma campanha, use o utmCampaign/name exato dela (é o que sincronizar_clickbank casa depois).',
  {
    produto: z.string().describe('Nome do produto'),
    hoplink: z.string().url().describe('HopLink de afiliado (https://...)'),
    tracking_id: z.string().optional().describe('TID da campanha (ex.: CB_SURV_US_SEARCH_BRIDGE_v1) — vira &tid= no hoplink. Use o utmCampaign exato da campanha para o ClickBank sync casar depois.'),
    angulo: z.string().default('review').describe('Tom/ângulo editorial do texto (livre, ex.: "review honesto", "advertorial focado em causa raiz")'),
    tipo_pagina: z.enum(['advertorial', 'pogo', 'vsl']).default('advertorial').describe('Estrutura da página. advertorial = artigo completo (padrão). pogo = curta e direta. vsl = vídeo + CTA (exige video_url).'),
    video_url: z.string().url().optional().describe('Obrigatório se tipo_pagina=vsl — link do vídeo (YouTube, Vimeo ou .mp4)'),
    popup: z.boolean().default(false).describe('Ativa pop-up "segure para continuar" antes de revelar a página — mesma experiência pra todo visitante'),
    geo: z.string().default('US'),
    destino: z.enum(['railway', 'wordpress']).default('railway').describe('Onde publicar a presell'),
    dominio: z.string().optional().describe('Domínio WordPress de destino (obrigatório se destino=wordpress, ex.: orangepeelmorning.com — precisa estar configurado em WP_SITES_JSON)'),
  },
  async ({ produto, hoplink, tracking_id, angulo, tipo_pagina, video_url, popup, geo, destino, dominio }) => {
    if (!MCP_TOKEN) return text('AFILIADS_MCP_TOKEN não configurado.');
    if (destino === 'wordpress' && !dominio) return text('Informe "dominio" quando destino=wordpress.');
    if (tipo_pagina === 'vsl' && !video_url) return text('tipo_pagina=vsl exige video_url (link do vídeo).');
    const res = await fetch(`${APP_URL}/api/presells`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-afiliads-token': MCP_TOKEN },
      body: JSON.stringify({ productName: produto, hopLink: hoplink, trackingId: tracking_id, angle: angulo, pageType: tipo_pagina, videoUrl: video_url, popupGate: popup, geo, destino, dominio }),
    });
    const data = await res.json();
    if (!res.ok) return text(`Erro ${res.status}: ${JSON.stringify(data)}`);
    const urlCompleta = data.publishTarget === 'wordpress' ? data.url : `${APP_URL}${data.url}`;
    return text({ ...data, urlCompleta });
  }
);

server.tool(
  'gmail_listar_emails',
  'Lista e-mails da caixa genaujunior@gmail.com (a conta usada para falar com afiliados/ClickBank). Por padrão traz os não lidos; use query no formato de busca do Gmail (ex.: "from:clickbank.com", "is:unread label:afiliados") para filtrar. Só leitura — não marca como lido nem move nada.',
  {
    query: z.string().default('is:unread').describe('Filtro no formato de busca do Gmail'),
    max: z.number().int().min(1).max(50).default(10),
  },
  async ({ query, max }) => {
    const emails = await listarEmails({ query, max });
    if (!emails.length) return text('Nenhum e-mail encontrado para esse filtro.');
    return text(emails);
  }
);

server.tool(
  'gmail_ler_email',
  'Lê o corpo completo de um e-mail específico (use o "id" retornado por gmail_listar_emails).',
  { id: z.string().describe('ID da mensagem') },
  async ({ id }) => text(await lerEmail(id))
);

server.tool(
  'gmail_criar_rascunho_resposta',
  'Cria uma RESPOSTA EM RASCUNHO (não envia) para um e-mail de afiliado, na thread correta. O rascunho fica salvo em Rascunhos no Gmail de genaujunior@gmail.com para revisão e envio manual — este tool nunca envia e-mail sozinho (a conexão não tem escopo de envio).',
  {
    id: z.string().describe('ID da mensagem original a responder (de gmail_listar_emails/gmail_ler_email)'),
    corpo: z.string().describe('Texto da resposta (texto puro)'),
  },
  async ({ id, corpo }) => {
    const draft = await criarRascunhoResposta({ messageId: id, corpo });
    return text(`Rascunho criado para ${draft.para} — assunto "${draft.assunto}". Revise e envie manualmente pelo Gmail (draftId: ${draft.draftId}).`);
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
