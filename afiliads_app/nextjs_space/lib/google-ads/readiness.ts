import { getForbiddenAdTerms } from '@/lib/campaign-strategy';

export type ReadinessDependencies = {
  findCampaign: (id: string, userId: string) => Promise<any | null>;
  findChecklists: (campaignId: string) => Promise<any[]>;
  getAdsConfig: (userId: string) => Promise<any | null>;
  findProduct: (productId: string) => Promise<any | null>;
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
    selectedKeywords: any[];
  };
};

export async function checkGoogleAdsReadiness(
  campaignId: string,
  userId: string,
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
  const criticalUnchecked = checklists.filter((c: any) => c.isCritical && !c.isChecked && c.step !== 9);
  if (criticalUnchecked.length > 0) {
    errors.push(
      `Complete os itens críticos do checklist antes de criar a campanha no Google Ads (${
        criticalUnchecked.length
      } pendente(s)): ${criticalUnchecked.map((c: any) => c.itemLabel).join(', ')}.`
    );
  }

  const finalUrl = campaign.presellUrl || campaign.offerUrl || '';
  if (!finalUrl) {
    errors.push('Configure a URL da pré-sell ou da oferta (Wizard, passo 4) antes de criar a campanha no Google Ads.');
  }

  const config = await deps.getAdsConfig(userId);
  if (!config) {
    errors.push(
      'Credenciais do Google Ads não configuradas. Vá em Configurações → Google Ads e cadastre customer_id, developer_token, client_id, client_secret e refresh_token.'
    );
  }

  const selectedKeywords = (campaign.keywords ?? []).filter((k: any) => k.isSelected);
  if (selectedKeywords.length === 0) {
    errors.push('Selecione ao menos uma keyword no Wizard (passo 5) antes de criar a campanha no Google Ads.');
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
      .filter((k: any) => containsForbiddenTerm(k.keyword))
      .map((k: any) => k.keyword);
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
      campaignName,
      budgetDaily,
      geo: campaign.geo,
      finalUrl,
      keywords: selectedKeywords.map((k: any) => ({
        text: k.keyword,
        matchType: (k.matchType || 'phrase').toUpperCase() as 'EXACT' | 'PHRASE' | 'BROAD',
      })),
      forbiddenTerms,
      selectedKeywords,
    },
  };
}
