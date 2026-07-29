// Descoberta/mutação genérica de anúncios (RSA) numa campanha — usado pela Tarefa 7 pra achar
// e trocar o finalUrls do in-design treatment campaign de um experimento, mas não é exclusivo
// de experimento: qualquer fluxo que precise localizar/alterar o RSA de uma campanha pode
// reusar. Shape exato de alguns campos (mesma ressalva da Tarefa 6) nunca foi validado contra
// resposta real da API — só contra mocks que o próprio código define.

import { googleAdsRequest, isMockMode, type GoogleAdsCredentials } from './client';
import { assertMutationAllowed } from './mutation-guard';

export interface AdGroupAdSummary {
  resourceName: string;
  adGroupResourceName: string;
  finalUrls: string[];
}

export interface FindAdGroupAdsOptions {
  includeDrafts?: boolean;
}

export async function findAdGroupAdsInCampaign(
  token: string,
  config: GoogleAdsCredentials,
  campaignResourceName: string,
  options: FindAdGroupAdsOptions = {}
): Promise<AdGroupAdSummary[]> {
  if (isMockMode(config)) {
    return [
      {
        resourceName: `${campaignResourceName}/adGroups/MOCK-AG/adGroupAds/MOCK-AD`,
        adGroupResourceName: `${campaignResourceName}/adGroups/MOCK-AG`,
        finalUrls: ['https://example.com/mock-current-url'],
      },
    ];
  }

  const query = `
    SELECT
      ad_group_ad.resource_name,
      ad_group_ad.ad.final_urls,
      ad_group.resource_name
    FROM ad_group_ad
    WHERE campaign.resource_name = '${campaignResourceName.replace(/'/g, "\\'")}'
      AND ad_group_ad.status != 'REMOVED'
  `;

  const data = await googleAdsRequest(token, config, 'googleAds:search', {
    body: { query, includeDrafts: options.includeDrafts ?? false },
  });

  const rows: any[] = data?.results ?? [];
  return rows
    .map((row) => ({
      resourceName: row?.adGroupAd?.resourceName as string | undefined,
      adGroupResourceName: row?.adGroup?.resourceName as string | undefined,
      finalUrls: (row?.adGroupAd?.ad?.finalUrls ?? []) as string[],
    }))
    .filter((ad): ad is AdGroupAdSummary => Boolean(ad.resourceName && ad.adGroupResourceName));
}

export interface UpdateAdFinalUrlsResult {
  resourceName: string;
  finalUrls: string[];
}

// Payload puro (sem rede/guard) — testável direto, separado da orquestração abaixo.
export function buildUpdateAdFinalUrlsOperation(adResourceName: string, finalUrls: string[]) {
  return {
    update: {
      resourceName: adResourceName,
      ad: { finalUrls },
    },
    updateMask: 'ad.final_urls',
  };
}

export function parseUpdateAdFinalUrlsResponse(
  data: any,
  adResourceName: string,
  finalUrls: string[]
): UpdateAdFinalUrlsResult {
  const resultResourceName: string | undefined = data?.results?.[0]?.resourceName;
  if (!resultResourceName) {
    throw new Error(
      `Google Ads API não confirmou a atualização de finalUrls em ${adResourceName}.`
    );
  }
  return { resourceName: resultResourceName, finalUrls };
}

// `final_urls` é um dos poucos campos de Ad mutáveis depois de criado (a maioria dos outros
// campos de Ad são imutáveis na API) — atualiza via ad_group_ad:mutate com updateMask
// restrito a ad.final_urls, sem tocar em headlines/descriptions/status.
export async function updateAdFinalUrls(
  token: string,
  config: GoogleAdsCredentials,
  adResourceName: string,
  finalUrls: string[]
): Promise<UpdateAdFinalUrlsResult> {
  if (isMockMode(config)) {
    return { resourceName: adResourceName, finalUrls };
  }

  const guard = assertMutationAllowed({
    operation: 'updateAdFinalUrls',
    customerId: config.customerId,
    isMock: false,
    confirmed: false, // TODO(Tarefa 10): repassar confirmação real do chamador
  });
  if (!guard.allowed) {
    throw new Error(`Mutação bloqueada pelo guard: ${guard.reason}`);
  }

  const data = await googleAdsRequest(token, config, 'adGroupAds:mutate', {
    body: {
      operations: [buildUpdateAdFinalUrlsOperation(adResourceName, finalUrls)],
    },
  });

  return parseUpdateAdFinalUrlsResponse(data, adResourceName, finalUrls);
}
