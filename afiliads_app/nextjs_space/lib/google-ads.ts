import { prisma } from './prisma';
import { assertMutationAllowed } from './google-ads/mutation-guard';

// IDs públicos de geoTargetConstant/languageConstant do Google Ads (estáveis, documentados pelo Google).
const GEO_TARGET_CONSTANTS: Record<string, string> = {
  US: '2840', UK: '2826', GB: '2826', AU: '2036', CA: '2124', BR: '2076',
  DE: '2276', FR: '2250', ES: '2724', IT: '2380', MX: '2484',
};
const LANGUAGE_CONSTANTS: Record<string, string> = { en: '1000', pt: '1014', es: '1003' };

export interface CreateCampaignInput {
  name: string;
  budgetDaily: number;
  geo: string;
  finalUrl: string;
  keywords: Array<{ text: string; matchType: 'EXACT' | 'PHRASE' | 'BROAD' }>;
  negativeKeywords?: string[];
  headlines: string[];
  descriptions: string[];
  cpcBidMicros?: number;
}

export interface CreateCampaignResult {
  success: boolean;
  mock: boolean;
  googleCampaignId?: string;
  googleAdGroupId?: string;
  logs: string[];
}

export interface GoogleAdsCredentials {
  customerId: string;
  developerToken: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  loginCustomerId?: string;
}

export interface SyncedCampaignData {
  googleCampaignId?: string;
  name: string;
  status: 'ENABLED' | 'PAUSED' | 'UNKNOWN';
  budgetDaily: number;
  bidStrategy: string;
}

export interface SyncedKeywordMetric {
  text: string;
  clicks: number;
  costMicros: number;
  conversions: number;
}

// Auxiliar para buscar chaves do Google Ads no banco
export async function getGoogleAdsConfig(userId: string): Promise<GoogleAdsCredentials | null> {
  const rows = await prisma.integration.findMany({
    where: { userId, serviceName: 'google_ads' },
  });
  
  const map: Record<string, string> = {};
  for (const r of rows) {
    if (r.fieldValue) {
      map[r.fieldName] = r.fieldValue;
    }
  }

  // Se não houver chaves de autenticação básicas
  if (!map['customer_id'] || !map['developer_token']) {
    return null;
  }

  return {
    customerId: map['customer_id'].replace(/-/g, '').trim(),
    developerToken: map['developer_token'].trim(),
    clientId: map['client_id']?.trim() || '',
    clientSecret: map['client_secret']?.trim() || '',
    refreshToken: map['refresh_token']?.trim() || '',
    loginCustomerId: map['login_customer_id']?.replace(/-/g, '').trim() || undefined,
  };
}

// Cabeçalhos comuns para chamadas REST da Google Ads API. `login-customer-id` é obrigatório
// quando as credenciais são de uma conta MCC (gerenciadora) operando sobre uma conta filha —
// sem ele a API responde USER_PERMISSION_DENIED mesmo com token/developer-token válidos.
// amount_micros precisa ser múltiplo de 10.000 (1 centavo) — a Google Ads API rejeita frações de centavo.
function toAmountMicros(dollars: number): number {
  return Math.round(dollars * 100) * 10_000;
}

function apiHeaders(token: string, config: GoogleAdsCredentials): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'developer-token': config.developerToken,
  };
  if (config.loginCustomerId) headers['login-customer-id'] = config.loginCustomerId;
  return headers;
}

// Verifica se está rodando em modo Mock/Sandbox
export function isMockMode(config: GoogleAdsCredentials): boolean {
  return (
    config.developerToken.startsWith('DEV_TOKEN_MOCK') ||
    config.clientId.startsWith('CLIENT_ID_MOCK') ||
    config.customerId.includes('@') // Se o ID for um e-mail do seed
  );
}

// Obtém Token de Acesso temporário OAuth2 do Google
async function getAccessToken(config: GoogleAdsCredentials): Promise<string> {
  if (isMockMode(config)) {
    return 'mock_access_token_123';
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: config.refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) {
    throw new Error(`Falha na autenticação OAuth2 do Google: ${await res.text()}`);
  }

  const data = await res.json();
  return data.access_token;
}

// Busca dados atuais da campanha no Google Ads
export async function fetchGoogleCampaign(
  userId: string,
  campaignName: string
): Promise<SyncedCampaignData | null> {
  const config = await getGoogleAdsConfig(userId);
  if (!config) {
    throw new Error('Configuração do Google Ads não encontrada para o usuário.');
  }

  // --- MOCK MODE ---
  if (isMockMode(config)) {
    console.log(`[Google Ads Mock] Buscando campanha "${campaignName}"`);
    // Simulando um pequeno desvio nos dados locais para demonstrar a sincronização
    return {
      googleCampaignId: '1092837465',
      name: campaignName,
      status: 'ENABLED',
      budgetDaily: 45.0, // Gads tem orçamento ligeiramente diferente do local para simular pull
      bidStrategy: 'MAXIMIZE_CONVERSIONS',
    };
  }

  // --- REAL API MODE ---
  const token = await getAccessToken(config);
  const url = `https://googleads.googleapis.com/v25/customers/${config.customerId}/googleAds:search`;

  const query = `
    SELECT 
      campaign.id, 
      campaign.name, 
      campaign.status, 
      campaign_budget.amount_micros, 
      campaign.bidding_strategy_type 
    FROM campaign 
    WHERE campaign.name = '${campaignName.replace(/'/g, "\\'")}' 
    LIMIT 1
  `;

  const res = await fetch(url, {
    method: 'POST',
    headers: apiHeaders(token, config),
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    throw new Error(`Erro ao buscar campanha no Google Ads: ${await res.text()}`);
  }

  const data = await res.json();
  const row = data?.results?.[0];
  if (!row) return null;

  const gCamp = row.campaign;
  const gBudget = row.campaignBudget;

  const budgetDaily = gBudget?.amountMicros 
    ? Number(gBudget.amountMicros) / 1_000_000 
    : 0;

  return {
    googleCampaignId: gCamp?.id || undefined,
    name: gCamp?.name || campaignName,
    status: gCamp?.status || 'UNKNOWN',
    budgetDaily,
    bidStrategy: gCamp?.biddingStrategyType || 'UNKNOWN',
  };
}

/** Métricas reais por keyword (últimos 30 dias) — achado na revisão de 2026-07-27:
 * Keyword.clicks/cpcReal/conversions eram exibidos em /planilhas mas NUNCA escritos por
 * nenhum código (nem manual, nem automático) — sempre ficavam zerados. `google-ads/sync`
 * (pull) agora chama isso e faz upsert nas keywords locais que baterem por texto. */
export async function fetchGoogleAdsKeywordMetrics(
  userId: string,
  campaignName: string
): Promise<SyncedKeywordMetric[]> {
  const config = await getGoogleAdsConfig(userId);
  if (!config) return [];

  if (isMockMode(config)) {
    console.log(`[Google Ads Mock] Buscando métricas de keyword da campanha "${campaignName}"`);
    return [];
  }

  const token = await getAccessToken(config);
  const url = `https://googleads.googleapis.com/v25/customers/${config.customerId}/googleAds:search`;
  const query = `
    SELECT
      ad_group_criterion.keyword.text,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions
    FROM keyword_view
    WHERE campaign.name = '${campaignName.replace(/'/g, "\\'")}'
      AND segments.date DURING LAST_30_DAYS
  `;

  const res = await fetch(url, {
    method: 'POST',
    headers: apiHeaders(token, config),
    body: JSON.stringify({ query }),
  });
  if (!res.ok) {
    console.error('Erro ao buscar métricas de keyword no Google Ads:', await res.text());
    return [];
  }

  const data = await res.json();
  const byText = new Map<string, SyncedKeywordMetric>();
  for (const row of data?.results ?? []) {
    const text = row?.adGroupCriterion?.keyword?.text;
    if (!text) continue;
    const cur = byText.get(text) ?? { text, clicks: 0, costMicros: 0, conversions: 0 };
    cur.clicks += Number(row?.metrics?.clicks ?? 0);
    cur.costMicros += Number(row?.metrics?.costMicros ?? 0);
    cur.conversions += Number(row?.metrics?.conversions ?? 0);
    byText.set(text, cur);
  }
  return Array.from(byText.values());
}

// Atualiza configurações da campanha no Google Ads (Mutate)
export async function mutateGoogleCampaign(
  userId: string,
  googleCampaignId: string,
  updates: { status?: 'ENABLED' | 'PAUSED'; budgetDaily?: number }
): Promise<{ success: boolean; log: string }> {
  const config = await getGoogleAdsConfig(userId);
  if (!config) {
    throw new Error('Configuração do Google Ads não encontrada para o usuário.');
  }

  // --- MOCK MODE ---
  if (isMockMode(config)) {
    console.log(`[Google Ads Mock] Atualizando campanha GADS-ID ${googleCampaignId} com:`, updates);
    return {
      success: true,
      log: `[Mock] Alterações enviadas com sucesso. Status: ${updates.status || 'sem alteração'}, Orçamento: $${updates.budgetDaily ?? 'sem alteração'}`
    };
  }

  // --- REAL API MODE ---
  if (updates.status) {
    const guard = assertMutationAllowed({
      operation: 'mutateGoogleCampaign.status',
      customerId: config.customerId,
      isMock: false,
      confirmed: false, // TODO(Tarefa 10): repassar confirmação real do chamador
    });
    if (!guard.allowed) {
      throw new Error(`Mutação bloqueada pelo guard: ${guard.reason}`);
    }
  }
  if (updates.budgetDaily !== undefined) {
    const guard = assertMutationAllowed({
      operation: 'mutateGoogleCampaign.budget',
      customerId: config.customerId,
      isMock: false,
      confirmed: false, // TODO(Tarefa 10): repassar confirmação real do chamador
    });
    if (!guard.allowed) {
      throw new Error(`Mutação bloqueada pelo guard: ${guard.reason}`);
    }
  }

  const token = await getAccessToken(config);
  const logs: string[] = [];

  // 1. Atualizar o Status se solicitado
  if (updates.status) {
    const url = `https://googleads.googleapis.com/v25/customers/${config.customerId}/campaigns:mutate`;
    const res = await fetch(url, {
      method: 'POST',
      headers: apiHeaders(token, config),
      body: JSON.stringify({
        operations: [
          {
            update: {
              resourceName: `customers/${config.customerId}/campaigns/${googleCampaignId}`,
              status: updates.status,
            },
            updateMask: 'status',
          },
        ],
      }),
    });

    if (!res.ok) {
      throw new Error(`Erro ao atualizar status no Google Ads: ${await res.text()}`);
    }
    logs.push(`Status alterado para ${updates.status}`);
  }

  // 2. Atualizar o Orçamento Diário se solicitado
  if (updates.budgetDaily !== undefined) {
    // O Google Ads exige mutar o CampaignBudget associado.
    // Para simplificar e evitar requisições extras buscando o ID do orçamento,
    // em produção o ideal seria o googleCampaignId vir acompanhado do budgetResourceId,
    // ou realizarmos uma busca prévia.
    // Aqui realizamos a busca do budget associado primeiro.
    const searchUrl = `https://googleads.googleapis.com/v25/customers/${config.customerId}/googleAds:search`;
    const query = `SELECT campaign.campaign_budget FROM campaign WHERE campaign.id = '${googleCampaignId}' LIMIT 1`;
    const searchRes = await fetch(searchUrl, {
      method: 'POST',
      headers: apiHeaders(token, config),
      body: JSON.stringify({ query }),
    });

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      const budgetResourceName = searchData?.results?.[0]?.campaign?.campaignBudget;
      
      if (budgetResourceName) {
        const mutateBudgetUrl = `https://googleads.googleapis.com/v25/customers/${config.customerId}/campaignBudgets:mutate`;
        const amountMicros = toAmountMicros(updates.budgetDaily);
        
        const budgetRes = await fetch(mutateBudgetUrl, {
          method: 'POST',
          headers: apiHeaders(token, config),
          body: JSON.stringify({
            operations: [
              {
                update: {
                  resourceName: budgetResourceName,
                  amountMicros: String(amountMicros),
                },
                updateMask: 'amount_micros',
              },
            ],
          }),
        });

        if (!budgetRes.ok) {
          throw new Error(`Erro ao atualizar orçamento no Google Ads: ${await budgetRes.text()}`);
        }
        logs.push(`Orçamento diário alterado para $${updates.budgetDaily.toFixed(2)}`);
      }
    } else {
      logs.push(`Falha ao buscar Resource de orçamento para a campanha ${googleCampaignId}`);
    }
  }

  return {
    success: true,
    log: logs.join(', ') || 'Nenhuma atualização enviada',
  };
}

// Cria uma campanha nova do zero: budget -> campanha -> segmentação -> ad group -> keywords -> negativas -> RSA.
// A campanha é SEMPRE criada como PAUSED — ativar (gastar de verdade) é uma ação manual separada,
// feita depois via mutateGoogleCampaign/push ou direto no painel do Google Ads.
export async function createGoogleCampaign(userId: string, input: CreateCampaignInput): Promise<CreateCampaignResult> {
  const config = await getGoogleAdsConfig(userId);
  if (!config) {
    throw new Error('Configuração do Google Ads não encontrada para o usuário.');
  }
  const logs: string[] = [];

  // --- MOCK MODE ---
  if (isMockMode(config)) {
    console.log(`[Google Ads Mock] Criando campanha "${input.name}"`, input);
    logs.push(`[Simulação] Budget diário criado: $${input.budgetDaily.toFixed(2)}`);
    logs.push(`[Simulação] Campanha "${input.name}" criada como PAUSED (Search)`);
    logs.push(`[Simulação] Segmentação geográfica (${input.geo}) e de idioma configurada`);
    logs.push(`[Simulação] Ad group criado com ${input.keywords.length} keyword(s)`);
    if (input.negativeKeywords?.length) logs.push(`[Simulação] ${input.negativeKeywords.length} negativa(s) adicionada(s)`);
    logs.push(`[Simulação] RSA criado com ${input.headlines.length} títulos e ${input.descriptions.length} descrições`);
    return {
      success: true,
      mock: true,
      googleCampaignId: `MOCK-CAMPAIGN-${Date.now()}`,
      googleAdGroupId: `MOCK-ADGROUP-${Date.now()}`,
      logs,
    };
  }

  // --- REAL API MODE ---
  const createGuard = assertMutationAllowed({
    operation: 'createGoogleCampaign',
    customerId: config.customerId,
    isMock: false,
    confirmed: false, // TODO(Tarefa 10): repassar confirmação real do chamador
  });
  if (!createGuard.allowed) {
    throw new Error(`Mutação bloqueada pelo guard: ${createGuard.reason}`);
  }

  const token = await getAccessToken(config);
  const base = `https://googleads.googleapis.com/v25/customers/${config.customerId}`;
  const headers = apiHeaders(token, config);

  async function mutate(resource: string, operations: any[]): Promise<any> {
    const res = await fetch(`${base}/${resource}:mutate`, { method: 'POST', headers, body: JSON.stringify({ operations }) });
    if (!res.ok) throw new Error(`Erro em ${resource}:mutate — ${await res.text()}`);
    return res.json();
  }

  // 1. Orçamento diário
  const budgetRes = await mutate('campaignBudgets', [{
    create: { name: `${input.name} - Budget`, amountMicros: String(toAmountMicros(input.budgetDaily)), deliveryMethod: 'STANDARD' },
  }]);
  const budgetResourceName = budgetRes.results[0].resourceName;
  logs.push(`Orçamento diário criado: $${input.budgetDaily.toFixed(2)}`);

  // 2. Campanha (Search, sempre PAUSED)
  const campaignRes = await mutate('campaigns', [{
    create: {
      name: input.name,
      status: 'PAUSED',
      advertisingChannelType: 'SEARCH',
      campaignBudget: budgetResourceName,
      manualCpc: {},
      networkSettings: { targetGoogleSearch: true, targetSearchNetwork: false, targetContentNetwork: false, targetPartnerSearchNetwork: false },
      geoTargetTypeSetting: { positiveGeoTargetType: 'PRESENCE', negativeGeoTargetType: 'PRESENCE' },
      // Exigido pela API desde set/2025 (EU Political Ads Regulation) — campanhas de afiliados nunca são políticas.
      containsEuPoliticalAdvertising: 'DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING',
    },
  }]);
  const campaignResourceName = campaignRes.results[0].resourceName;
  const googleCampaignId = String(campaignResourceName).split('/').pop();
  logs.push(`Campanha "${input.name}" criada como PAUSED — ative manualmente quando estiver pronta para gastar`);

  // 3. Segmentação geográfica + idioma
  const criteriaOps: any[] = [];
  const geoConstId = GEO_TARGET_CONSTANTS[input.geo?.toUpperCase()];
  if (geoConstId) {
    criteriaOps.push({ create: { campaign: campaignResourceName, location: { geoTargetConstant: `geoTargetConstants/${geoConstId}` } } });
  }
  const langId = input.geo === 'BR' ? LANGUAGE_CONSTANTS.pt : input.geo === 'ES' ? LANGUAGE_CONSTANTS.es : LANGUAGE_CONSTANTS.en;
  criteriaOps.push({ create: { campaign: campaignResourceName, language: { languageConstant: `languageConstants/${langId}` } } });
  await mutate('campaignCriteria', criteriaOps);
  logs.push(`Segmentação geográfica (${input.geo}) e de idioma configurada — "presença apenas"`);

  // 4. Ad group (Criado como PAUSED para revisão de segurança pré-ativação)
  const adGroupRes = await mutate('adGroups', [{
    create: {
      name: `${input.name} - AG1`,
      campaign: campaignResourceName,
      status: 'PAUSED',
      type: 'SEARCH_STANDARD',
      cpcBidMicros: String(Math.round(input.cpcBidMicros ?? 1_000_000)),
    },
  }]);
  const adGroupResourceName = adGroupRes.results[0].resourceName;
  const googleAdGroupId = String(adGroupResourceName).split('/').pop();
  logs.push('Ad group criado como PAUSED');

  // 5. Keywords positivas (Criadas como PAUSED)
  if (input.keywords.length > 0) {
    const kwOps = input.keywords.map(k => ({
      create: { adGroup: adGroupResourceName, status: 'PAUSED', keyword: { text: k.text, matchType: k.matchType } },
    }));
    await mutate('adGroupCriteria', kwOps);
    logs.push(`${input.keywords.length} keyword(s) adicionada(s) ao ad group como PAUSED`);
  }

  // 6. Negativas (nível de campanha)
  if (input.negativeKeywords?.length) {
    const negOps = input.negativeKeywords.map(n => ({
      create: { campaign: campaignResourceName, negative: true, keyword: { text: n, matchType: 'BROAD' } },
    }));
    await mutate('campaignCriteria', negOps);
    logs.push(`${input.negativeKeywords.length} negativa(s) adicionada(s) à campanha`);
  }

  // 7. Anúncio responsivo de pesquisa (RSA criado como PAUSED)
  await mutate('adGroupAds', [{
    create: {
      adGroup: adGroupResourceName,
      status: 'PAUSED',
      ad: {
        finalUrls: [input.finalUrl],
        responsiveSearchAd: {
          headlines: input.headlines.map(h => ({ text: h })),
          descriptions: input.descriptions.map(d => ({ text: d })),
        },
      },
    },
  }]);
  logs.push(`Anúncio responsivo de pesquisa criado como PAUSED com ${input.headlines.length} títulos e ${input.descriptions.length} descrições`);

  return { success: true, mock: false, googleCampaignId, googleAdGroupId, logs };
}
