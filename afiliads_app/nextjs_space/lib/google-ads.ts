import { prisma } from './prisma';

export interface GoogleAdsCredentials {
  customerId: string;
  developerToken: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

export interface SyncedCampaignData {
  googleCampaignId?: string;
  name: string;
  status: 'ENABLED' | 'PAUSED' | 'UNKNOWN';
  budgetDaily: number;
  bidStrategy: string;
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
  };
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
  const url = `https://googleads.googleapis.com/v17/customers/${config.customerId}/googleAds:search`;

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
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'developer-token': config.developerToken,
    },
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
  const token = await getAccessToken(config);
  const logs: string[] = [];

  // 1. Atualizar o Status se solicitado
  if (updates.status) {
    const url = `https://googleads.googleapis.com/v17/customers/${config.customerId}/campaigns:mutate`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'developer-token': config.developerToken,
      },
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
    const searchUrl = `https://googleads.googleapis.com/v17/customers/${config.customerId}/googleAds:search`;
    const query = `SELECT campaign.campaign_budget FROM campaign WHERE campaign.id = '${googleCampaignId}' LIMIT 1`;
    const searchRes = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'developer-token': config.developerToken,
      },
      body: JSON.stringify({ query }),
    });

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      const budgetResourceName = searchData?.results?.[0]?.campaign?.campaignBudget;
      
      if (budgetResourceName) {
        const mutateBudgetUrl = `https://googleads.googleapis.com/v17/customers/${config.customerId}/campaignBudgets:mutate`;
        const amountMicros = Math.round(updates.budgetDaily * 1_000_000);
        
        const budgetRes = await fetch(mutateBudgetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'developer-token': config.developerToken,
          },
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
