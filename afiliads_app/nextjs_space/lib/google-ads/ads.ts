// Descoberta/mutação genérica de anúncios (RSA) numa campanha — usado pela Tarefa 7 pra achar
// e trocar o finalUrls do in-design treatment campaign de um experimento, mas não é exclusivo
// de experimento: qualquer fluxo que precise localizar/alterar o RSA de uma campanha pode
// reusar. Shape exato de alguns campos (mesma ressalva da Tarefa 6) nunca foi validado contra
// resposta real da API — só contra mocks que o próprio código define.
//
// Correção A3/A7 (checkpoint pós-Tarefa 8, .hermes/handoffs/2026-07-29_task8-cross-flow-
// quality-gate.md): `SearchGoogleAdsRequest` v25 não tem campo `include_drafts`/`includeDrafts`
// — removido. Resource names do Google Ads nunca são aninhados sob o pai (ex.: NUNCA
// `.../campaigns/X/adGroups/Y/adGroupAds/Z`); são sempre `customers/{cid}/{recurso}/{id
// composto com til}` — ex.: `customers/{cid}/adGroupAds/{adGroupId}~{adId}`. Mocks corrigidos
// pra esse shape.

import {
  googleAdsMutateRequest,
  googleAdsRequest,
  isMockMode,
  type GoogleAdsCredentials,
  type MutationCapability,
} from './client';

export interface AdGroupAdSummary {
  resourceName: string;
  adGroupResourceName: string;
  finalUrls: string[];
}

export async function findAdGroupAdsInCampaign(
  token: string,
  config: GoogleAdsCredentials,
  campaignResourceName: string
): Promise<AdGroupAdSummary[]> {
  if (isMockMode(config)) {
    return [
      {
        resourceName: `customers/${config.customerId}/adGroupAds/MOCK-AG~MOCK-AD`,
        adGroupResourceName: `customers/${config.customerId}/adGroups/MOCK-AG`,
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
    body: { query },
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

// Payload puro (sem rede/guard) — testável direto, separado da orquestração abaixo. Um
// operation por anúncio; todos vão juntos numa mutate só (A6 — ver applyFinalUrlVariation em
// experiments.ts).
export function buildUpdateAdFinalUrlsOperation(adResourceName: string, finalUrls: string[]) {
  return {
    update: {
      resourceName: adResourceName,
      ad: { finalUrls },
    },
    // updateMask REST usa snake_case do proto (ad.final_urls) — não o camelCase do JSON body
    // (ad.finalUrls). Não validado contra resposta real ainda (ressalva A7).
    updateMask: 'ad.final_urls',
  };
}

export function buildUpdateAdFinalUrlsBatchOperations(adResourceNames: string[], finalUrls: string[]) {
  return adResourceNames.map((resourceName) => buildUpdateAdFinalUrlsOperation(resourceName, finalUrls));
}

export function parseUpdateAdFinalUrlsBatchResponse(
  data: any,
  adResourceNames: string[],
  finalUrls: string[]
): UpdateAdFinalUrlsResult[] {
  const results: any[] = data?.results ?? [];
  if (results.length !== adResourceNames.length) {
    throw new Error(
      `Google Ads API retornou ${results.length} resultado(s) pra ${adResourceNames.length} anúncio(s) enviados em adGroupAds:mutate.`
    );
  }
  return results.map((result, i) => {
    const resultResourceName: string | undefined = result?.resourceName;
    if (!resultResourceName) {
      throw new Error(
        `Google Ads API não confirmou a atualização de finalUrls em ${adResourceNames[i]}.`
      );
    }
    return { resourceName: resultResourceName, finalUrls };
  });
}

// `final_urls` é um dos poucos campos de Ad mutáveis depois de criado (a maioria dos outros
// campos de Ad são imutáveis na API) — atualiza via ad_group_ad:mutate com updateMask
// restrito a ad.final_urls, sem tocar em headlines/descriptions/status.
//
// A6: todos os anúncios do treatment recebem a MESMA newFinalUrl numa ÚNICA mutate request
// (partialFailure:false) — ou todos mudam, ou nenhum, nunca alteração parcial. Exige
// `capability` (A5) emitido por `assertMutationAllowed({operation:'updateAdFinalUrls', ...})`.
export async function updateAdFinalUrlsBatch(
  token: string,
  config: GoogleAdsCredentials,
  adResourceNames: string[],
  finalUrls: string[],
  capability: MutationCapability
): Promise<UpdateAdFinalUrlsResult[]> {
  if (adResourceNames.length === 0) {
    return [];
  }

  if (isMockMode(config)) {
    return adResourceNames.map((resourceName) => ({ resourceName, finalUrls }));
  }

  const data = await googleAdsMutateRequest(token, config, 'adGroupAds:mutate', capability, {
    body: {
      operations: buildUpdateAdFinalUrlsBatchOperations(adResourceNames, finalUrls),
      partialFailure: false,
    },
  });

  return parseUpdateAdFinalUrlsBatchResponse(data, adResourceNames, finalUrls);
}
