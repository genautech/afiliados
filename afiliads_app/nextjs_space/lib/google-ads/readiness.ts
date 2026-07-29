import { getForbiddenAdTerms } from '@/lib/campaign-strategy';

export type ReadinessMode = 'PREPARE' | 'SCHEDULE';

export interface ReadinessKeyword {
  keyword: string;
  matchType?: string;
  isSelected?: boolean;
}

export interface ReadinessCampaign {
  id?: string;
  name?: string;
  campaignNameGenerated?: string | null;
  budgetDaily: number;
  budgetTest?: number;
  geo?: string;
  presellUrl?: string | null;
  offerUrl?: string | null;
  productResearchId?: string | null;
  keywords?: ReadinessKeyword[];
}

export interface ReadinessChecklist {
  step: number;
  itemLabel: string;
  isCritical: boolean;
  isChecked: boolean;
}

export interface ReadinessAdsConfig {
  id?: string;
  customerId?: string;
}

export type ReadinessDependencies = {
  findCampaign: (id: string, userId: string) => Promise<ReadinessCampaign | null>;
  findChecklists: (campaignId: string) => Promise<ReadinessChecklist[]>;
  getAdsConfig: (userId: string) => Promise<ReadinessAdsConfig | null>;
  findProduct: (productId: string) => Promise<Parameters<typeof getForbiddenAdTerms>[0] | null>;
};

export type ReadinessResult = {
  ready: boolean;
  errors: string[];
  warnings: string[];
  data?: {
    campaignName: string;
    budgetDaily: number;
    geo: string;
    finalUrl: string;
    keywords: Array<{ text: string; matchType: 'EXACT' | 'PHRASE' | 'BROAD' }>;
    forbiddenTerms: string[];
    selectedKeywords: ReadinessKeyword[];
  };
};

export async function checkGoogleAdsReadiness(
  campaignId: string,
  userId: string,
  mode: ReadinessMode,
  deps: ReadinessDependencies
): Promise<ReadinessResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const campaign = await deps.findCampaign(campaignId, userId);
  if (!campaign) {
    errors.push('Campanha não encontrada');
    return { ready: false, errors, warnings };
  }

  const checklists = await deps.findChecklists(campaignId);
  const criticalUnchecked = checklists.filter((c) => c.isCritical && !c.isChecked && c.step !== 9);
  if (criticalUnchecked.length > 0) {
    errors.push(
      `Complete os itens críticos do checklist antes de criar a campanha no Google Ads (${
        criticalUnchecked.length
      } pendente(s)): ${criticalUnchecked.map((c) => c.itemLabel).join(', ')}.`
    );
  }

  const finalUrl = campaign.presellUrl || campaign.offerUrl || '';
  if (!finalUrl) {
    errors.push('Configure a URL da pré-sell ou da oferta (Wizard, passo 4) antes de criar a campanha no Google Ads.');
  } else {
    try {
      const parsed = new URL(finalUrl);
      if (parsed.protocol !== 'https:') {
        errors.push('A URL final deve utilizar HTTPS (protocolo seguro).');
      }
      if (parsed.username || parsed.password) {
        errors.push('A URL final não pode conter credenciais embutidas.');
      }
      if (!parsed.hostname) {
        errors.push('A URL final deve conter um hostname válido.');
      }
    } catch (e) {
      errors.push('A URL final fornecida é inválida.');
    }

    const msg = 'Não é possível garantir que a URL atual (modificada) foi a mesma aprovada no checklist. Revalidação estrutural necessária (lacuna técnica documentada para a Tarefa 10B).';
    if (mode === 'SCHEDULE') {
      errors.push(msg);
    } else {
      warnings.push(msg);
    }
  }

  const config = await deps.getAdsConfig(userId);
  if (!config) {
    errors.push(
      'Credenciais do Google Ads não configuradas. Vá em Configurações → Google Ads e cadastre customer_id, developer_token, client_id, client_secret e refresh_token.'
    );
  }

  const selectedKeywords = (campaign.keywords ?? []).filter((k) => k.isSelected);
  if (selectedKeywords.length === 0) {
    errors.push('Selecione ao menos uma keyword no Wizard (passo 5) antes de criar a campanha no Google Ads.');
  } else {
    for (const k of selectedKeywords) {
      const mt = (k.matchType || 'phrase').toUpperCase();
      if (!['EXACT', 'PHRASE', 'BROAD'].includes(mt)) {
        errors.push(`Match type desconhecido na keyword "${k.keyword}": ${k.matchType}. Valores permitidos: EXACT, PHRASE, BROAD.`);
      }
    }
  }

  let forbiddenTerms: string[] = [];
  if (campaign.productResearchId) {
    const product = await deps.findProduct(campaign.productResearchId);
    if (product) {
      forbiddenTerms = getForbiddenAdTerms(product);
    }
  }

  const containsForbiddenTerm = (s: string) =>
    forbiddenTerms.some((t) => s.toLowerCase().includes(t.toLowerCase()));

  if (forbiddenTerms.length > 0) {
    const badKeywords = selectedKeywords
      .filter((k) => containsForbiddenTerm(k.keyword))
      .map((k) => k.keyword);
    if (badKeywords.length > 0) {
      errors.push(
        `Brand bidding proibido pelo vendor: remova/deselecione essas keywords antes de criar a campanha (contêm ${forbiddenTerms.join(
          '/'
        )}) — ${badKeywords.join(', ')}.`
      );
    }
  }

  if (errors.length > 0) {
    return { ready: false, errors, warnings };
  }

  const campaignName = campaign.campaignNameGenerated || campaign.name;
  const budgetDaily = campaign.budgetDaily > 0 ? campaign.budgetDaily : Math.max(10, (campaign.budgetTest || 50) / 3);

  return {
    ready: true,
    errors,
    warnings,
    data: {
      campaignName: campaignName || 'Sem nome',
      budgetDaily,
      geo: campaign.geo || '',
      finalUrl,
      keywords: selectedKeywords.map((k) => ({
        text: k.keyword,
        matchType: (k.matchType || 'phrase').toUpperCase() as 'EXACT' | 'PHRASE' | 'BROAD',
      })),
      forbiddenTerms,
      selectedKeywords,
    },
  };
}
