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

// ─── Google Ads: Read-only tools (Postgres) ─────────────────────────────────

server.tool(
  'listar_campanhas',
  'Lista as campanhas do usuário no AfiliAds com status, orçamento, Google Ads ID, e configuração do loop. Somente leitura (Postgres).',
  {
    status: z.string().optional().describe('Filtrar por status (ex.: EM_TESTE, ATIVA, PAUSADO, KILL, RASCUNHO)'),
    limit: z.number().int().min(1).max(50).default(20),
  },
  async ({ status, limit }) => {
    const uid = await userId();
    const conds = ['"userId" = $1'];
    const params = [uid];
    if (status) { params.push(status); conds.push(`status = $${params.length}`); }
    const r = await pool.query(
      `SELECT id, name, status, platform, vertical, funnel, geo, channel,
              "budgetDaily", "budgetTest", "bidStrategy",
              "googleCampaignId", "googleCampaignName",
              "loopEnabled", "loopInterval", "lastLoopRunAt",
              "presellUrl", "offerUrl", "createdAt", "updatedAt"
       FROM "Campaign" WHERE ${conds.join(' AND ')} ORDER BY "updatedAt" DESC LIMIT $${params.length + 1}`,
      [...params, limit]);
    if (!r.rows.length) return text('Nenhuma campanha encontrada.');
    return text(r.rows);
  }
);

server.tool(
  'keywords_campanha',
  'Lista as keywords de uma campanha (texto, match type, selecionadas, métricas reais se sincronizadas). Somente leitura (Postgres).',
  { campanha: z.string().describe('Nome (parcial) da campanha') },
  async ({ campanha }) => {
    const uid = await userId();
    const c = await pool.query(
      `SELECT id, name FROM "Campaign" WHERE "userId" = $1 AND name ILIKE $2 LIMIT 1`,
      [uid, `%${campanha}%`]);
    if (!c.rows[0]) return text(`Campanha "${campanha}" não encontrada.`);
    const kws = await pool.query(
      `SELECT keyword, "matchType", "isSelected", clicks, "cpcReal", conversions, "createdAt"
       FROM "Keyword" WHERE "campaignId" = $1 ORDER BY "isSelected" DESC, keyword ASC`,
      [c.rows[0].id]);
    return text({ campanha: c.rows[0].name, keywords: kws.rows });
  }
);

server.tool(
  'google_ads_config_status',
  'Verifica se as credenciais do Google Ads (customer_id, developer_token, client_id, client_secret, refresh_token) estão configuradas no AfiliAds. Retorna quais campos estão presentes (nunca valores). Somente leitura (Postgres).',
  {},
  async () => {
    const uid = await userId();
    const r = await pool.query(
      `SELECT "fieldName" FROM "Integration" WHERE "userId" = $1 AND "serviceName" = 'google_ads'`,
      [uid]);
    const present = new Set(r.rows.map(row => row.fieldName));
    const required = ['customer_id', 'developer_token', 'client_id', 'client_secret', 'refresh_token'];
    const fields = required.map(f => ({ field: f, configured: present.has(f) }));
    const allConfigured = fields.every(f => f.configured);
    return text({
      configured: allConfigured,
      fields,
      loginCustomerId: present.has('login_customer_id'),
    });
  }
);

// ─── Google Ads: Readiness check (Postgres) ──────────────────────────────────

server.tool(
  'google_ads_readiness',
  'Verifica se uma campanha está pronta para criar/agendar no Google Ads (checklists, URL, credenciais, keywords, brand bidding). Somente leitura. mode=PREPARE é permissivo com a URL; mode=SCHEDULE bloqueia se a URL mudou após aprovação.',
  {
    campanha: z.string().describe('Nome (parcial) da campanha'),
    mode: z.enum(['PREPARE', 'SCHEDULE']).default('PREPARE'),
  },
  async ({ campanha, mode }) => {
    const uid = await userId();
    const c = await pool.query(
      `SELECT id, name, "budgetDaily", "budgetTest", geo, "presellUrl", "offerUrl",
              "productResearchId", "campaignNameGenerated"
       FROM "Campaign" WHERE "userId" = $1 AND name ILIKE $2 LIMIT 1`,
      [uid, `%${campanha}%`]);
    if (!c.rows[0]) return text(`Campanha "${campanha}" não encontrada.`);
    const camp = c.rows[0];

    const kws = await pool.query(
      `SELECT keyword, "matchType", "isSelected" FROM "Keyword" WHERE "campaignId" = $1`,
      [camp.id]);

    const checklists = await pool.query(
      `SELECT step, "itemLabel", "isCritical", "isChecked" FROM "CampaignChecklist" WHERE "campaignId" = $1`,
      [camp.id]);

    const config = await pool.query(
      `SELECT "fieldName" FROM "Integration" WHERE "userId" = $1 AND "serviceName" = 'google_ads'`,
      [uid]);
    const hasConfig = config.rows.some(r => r.fieldName === 'customer_id');

    const errors = [];
    const warnings = [];

    const criticalUnchecked = checklists.rows.filter(cl => cl.isCritical && !cl.isChecked && cl.step !== 9);
    if (criticalUnchecked.length > 0) {
      errors.push(`${criticalUnchecked.length} item(s) crítico(s) do checklist pendente(s): ${criticalUnchecked.map(cl => cl.itemLabel).join(', ')}`);
    }

    const finalUrl = camp.presellUrl || camp.offerUrl || '';
    if (!finalUrl) {
      errors.push('URL final (presell ou oferta) não configurada.');
    } else {
      try {
        const parsed = new URL(finalUrl);
        if (parsed.protocol !== 'https:') errors.push('URL final deve usar HTTPS.');
        if (parsed.username || parsed.password) errors.push('URL final não pode conter credenciais.');
      } catch { errors.push('URL final inválida.'); }

      const urlGapMsg = 'URL pode ter sido modificada após aprovação no checklist (lacuna 10B).';
      if (mode === 'SCHEDULE') errors.push(urlGapMsg);
      else warnings.push(urlGapMsg);
    }

    if (!hasConfig) errors.push('Credenciais do Google Ads não configuradas.');

    const selected = kws.rows.filter(k => k.isSelected);
    if (selected.length === 0) {
      errors.push('Nenhuma keyword selecionada.');
    } else {
      for (const k of selected) {
        const mt = (k.matchType || 'phrase').toUpperCase();
        if (!['EXACT', 'PHRASE', 'BROAD'].includes(mt)) {
          errors.push(`Match type inválido na keyword "${k.keyword}": ${k.matchType}`);
        }
      }
    }

    return text({
      ready: errors.length === 0,
      errors,
      warnings,
      campaign: camp.name,
      mode,
      selectedKeywords: selected.length,
      finalUrl: finalUrl || null,
    });
  }
);

// ─── Google Ads: Mutate proxies (HTTP → app API) ─────────────────────────────
// These tools POST to existing Next.js routes using x-afiliads-token.
// The app routes enforce all guards: route-mutation-authorization,
// mutation-guard env/allowlist, readiness, ownership, claims ledger.
// The MCP server never calls the Google Ads API directly.

/** Resolves campaign ID + updatedAt for building authorization payloads. */
async function resolveCampaign(uid, campanha) {
  const r = await pool.query(
    `SELECT id, name, "updatedAt" FROM "Campaign" WHERE "userId" = $1 AND name ILIKE $2 LIMIT 1`,
    [uid, `%${campanha}%`]);
  return r.rows[0] || null;
}

/** Builds the authorization payload required by route-mutation-authorization.ts. */
function buildAuthorization(operation, resourceId, revision, idempotencyKey) {
  return {
    confirmed: true,
    operation,
    resourceId,
    revision,
    idempotencyKey,
  };
}

/** Posts to an app API route with MCP token auth. */
async function appPost(path, body) {
  if (!MCP_TOKEN) throw new Error('AFILIADS_MCP_TOKEN não configurado.');
  const res = await fetch(`${APP_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-afiliads-token': MCP_TOKEN },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
  if (!res.ok) throw new Error(data?.error || `Erro ${res.status}`);
  return data;
}

server.tool(
  'google_ads_create_campaign',
  'Cria uma campanha no Google Ads via API do app (POST /api/google-ads/create). A campanha é sempre criada PAUSED. Exige readiness + mutation guard + authorization. Quando GOOGLE_ADS_MUTATIONS_ENABLED != true, o guard bloqueia (ou roda em mock).',
  {
    campanha: z.string().describe('Nome (parcial) da campanha no AfiliAds'),
    idempotency_key: z.string().min(10).max(100).regex(/^[a-zA-Z0-9_-]+$/).describe('Chave de idempotência única (ex.: create_campX_20260905)'),
    headlines: z.array(z.string()).optional().describe('Títulos RSA (auto-gerados se omitido)'),
    descriptions: z.array(z.string()).optional().describe('Descrições RSA (auto-geradas se omitido)'),
  },
  async ({ campanha, idempotency_key, headlines, descriptions }) => {
    if (!MCP_TOKEN) return text('AFILIADS_MCP_TOKEN não configurado.');
    const uid = await userId();
    const camp = await resolveCampaign(uid, campanha);
    if (!camp) return text(`Campanha "${campanha}" não encontrada.`);
    try {
      const data = await appPost('/api/google-ads/create', {
        campaignId: camp.id,
        authorization: buildAuthorization('CREATE_CAMPAIGN', camp.id, String(new Date(camp.updatedAt).getTime()), idempotency_key),
        ...(headlines?.length ? { headlines } : {}),
        ...(descriptions?.length ? { descriptions } : {}),
      });
      return text(data);
    } catch (err) {
      return text(`Erro: ${err.message}`);
    }
  }
);

server.tool(
  'google_ads_sync',
  'Sincroniza uma campanha com o Google Ads via API do app (POST /api/google-ads/sync). direction=pull importa dados do Google; direction=push envia alterações (exige authorization). Quando GOOGLE_ADS_MUTATIONS_ENABLED != true, push é bloqueado pelo guard (ou mock).',
  {
    campanha: z.string().describe('Nome (parcial) da campanha'),
    direction: z.enum(['pull', 'push']).default('pull'),
    status: z.string().optional().describe('Novo status local para push (PAUSADO, EM_TESTE, SCALE, ATIVO, KILL)'),
    budget_daily: z.number().min(0).optional().describe('Novo orçamento diário para push'),
    idempotency_key: z.string().min(10).max(100).regex(/^[a-zA-Z0-9_-]+$/).optional().describe('Chave de idempotência (obrigatória para push)'),
  },
  async ({ campanha, direction, status, budget_daily, idempotency_key }) => {
    if (!MCP_TOKEN) return text('AFILIADS_MCP_TOKEN não configurado.');
    const uid = await userId();
    const camp = await resolveCampaign(uid, campanha);
    if (!camp) return text(`Campanha "${campanha}" não encontrada.`);

    const body = { campaignId: camp.id, direction };
    if (direction === 'push') {
      if (!idempotency_key) return text('idempotency_key é obrigatória para push.');
      body.authorization = buildAuthorization('MUTATE_CAMPAIGN', camp.id, String(new Date(camp.updatedAt).getTime()), idempotency_key);
      body.updates = {};
      if (status) body.updates.status = status;
      if (budget_daily !== undefined) body.updates.budgetDaily = budget_daily;
      if (!Object.keys(body.updates).length) return text('push exige pelo menos status ou budget_daily.');
    }

    try {
      const data = await appPost('/api/google-ads/sync', body);
      return text(data);
    } catch (err) {
      return text(`Erro: ${err.message}`);
    }
  }
);

server.tool(
  'google_ads_experiment_setup',
  'Cria um experimento A/B no Google Ads via API do app (POST /api/google-ads/experiments). Proxy para a orquestração de experimentos existente.',
  {
    campanha: z.string().describe('Nome (parcial) da campanha'),
    idempotency_key: z.string().min(10).max(100).regex(/^[a-zA-Z0-9_-]+$/).describe('Chave de idempotência'),
    treatment_split: z.number().int().min(10).max(90).default(50).describe('% de tráfego para o tratamento'),
    variation_type: z.string().default('FINAL_URL').describe('Tipo de variação (FINAL_URL)'),
    variation_value: z.string().optional().describe('Valor da variação (ex.: nova URL)'),
  },
  async ({ campanha, idempotency_key, treatment_split, variation_type, variation_value }) => {
    if (!MCP_TOKEN) return text('AFILIADS_MCP_TOKEN não configurado.');
    const uid = await userId();
    const camp = await resolveCampaign(uid, campanha);
    if (!camp) return text(`Campanha "${campanha}" não encontrada.`);
    try {
      const data = await appPost('/api/google-ads/experiments', {
        campaignId: camp.id,
        authorization: buildAuthorization('SETUP_EXPERIMENT', camp.id, String(new Date(camp.updatedAt).getTime()), idempotency_key),
        treatmentSplit: treatment_split,
        variationType: variation_type,
        ...(variation_value ? { variationValue: variation_value } : {}),
      });
      return text(data);
    } catch (err) {
      return text(`Erro: ${err.message}`);
    }
  }
);

server.tool(
  'google_ads_experiment_action',
  'Executa ação em um experimento (END, PROMOTE, GRADUATE) via API do app (POST /api/google-ads/experiments/:id/actions).',
  {
    experiment_id: z.string().describe('ID do experimento no AfiliAds'),
    action: z.enum(['END', 'PROMOTE', 'GRADUATE']).describe('Ação a executar'),
    idempotency_key: z.string().min(10).max(100).regex(/^[a-zA-Z0-9_-]+$/).describe('Chave de idempotência'),
  },
  async ({ experiment_id, action, idempotency_key }) => {
    if (!MCP_TOKEN) return text('AFILIADS_MCP_TOKEN não configurado.');
    try {
      const operationMap = { END: 'END_EXPERIMENT', PROMOTE: 'PROMOTE_EXPERIMENT', GRADUATE: 'GRADUATE_EXPERIMENT' };
      const data = await appPost(`/api/google-ads/experiments/${experiment_id}/actions`, {
        action,
        authorization: buildAuthorization(operationMap[action], experiment_id, String(Date.now()), idempotency_key),
      });
      return text(data);
    } catch (err) {
      return text(`Erro: ${err.message}`);
    }
  }
);

server.tool(
  'google_ads_experiment_schedule',
  'Agenda um experimento para início via API do app (POST /api/google-ads/experiments/:id/schedule).',
  {
    experiment_id: z.string().describe('ID do experimento no AfiliAds'),
    idempotency_key: z.string().min(10).max(100).regex(/^[a-zA-Z0-9_-]+$/).describe('Chave de idempotência'),
  },
  async ({ experiment_id, idempotency_key }) => {
    if (!MCP_TOKEN) return text('AFILIADS_MCP_TOKEN não configurado.');
    try {
      const data = await appPost(`/api/google-ads/experiments/${experiment_id}/schedule`, {
        authorization: buildAuthorization('SCHEDULE_EXPERIMENT', experiment_id, String(Date.now()), idempotency_key),
      });
      return text(data);
    } catch (err) {
      return text(`Erro: ${err.message}`);
    }
  }
);

server.tool(
  'google_ads_experiment_sync',
  'Sincroniza estado remoto de um experimento (métricas, status) via API do app (POST /api/google-ads/experiments/:id/sync). Somente leitura no sentido de Google Ads.',
  {
    experiment_id: z.string().describe('ID do experimento no AfiliAds'),
  },
  async ({ experiment_id }) => {
    if (!MCP_TOKEN) return text('AFILIADS_MCP_TOKEN não configurado.');
    try {
      const data = await appPost(`/api/google-ads/experiments/${experiment_id}/sync`, {});
      return text(data);
    } catch (err) {
      return text(`Erro: ${err.message}`);
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
