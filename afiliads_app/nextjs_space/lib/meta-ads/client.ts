// Cliente HTTP da Marketing API do Meta.
//
// AVISO DE PROCEDÊNCIA: este caminho LIVE nunca foi executado contra a API
// real — não há credencial de Meta conectada neste ambiente. O shape dos
// payloads segue a documentação da Marketing API v21.0, mas só será contrato
// verificado depois do primeiro lançamento real. Até lá, o guard
// (lib/meta-ads/mutation-guard.ts) mantém LIVE fechado por padrão.

import { MetaAdsCredentials } from './config';

const API_VERSION = 'v21.0';
const BASE = `https://graph.facebook.com/${API_VERSION}`;

export class MetaApiError extends Error {
  constructor(message: string, readonly status: number, readonly payload?: unknown) {
    super(message);
    this.name = 'MetaApiError';
  }
}

async function post<T>(path: string, creds: MetaAdsCredentials, body: Record<string, unknown>): Promise<T> {
  const form = new URLSearchParams();
  for (const [k, v] of Object.entries(body)) {
    if (v === undefined || v === null) continue;
    form.append(k, typeof v === 'string' ? v : JSON.stringify(v));
  }
  form.append('access_token', creds.accessToken);

  const res = await fetch(`${BASE}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = (json as any)?.error?.error_user_msg || (json as any)?.error?.message || res.statusText;
    throw new MetaApiError(`Meta API ${res.status}: ${detail}`, res.status, json);
  }
  return json as T;
}

/** Campanha sempre PAUSED — ativar é ação manual separada, como no Google. */
export async function createMetaCampaign(
  creds: MetaAdsCredentials,
  input: { name: string; objective?: string },
): Promise<{ id: string }> {
  return post(`${creds.adAccountId}/campaigns`, creds, {
    name: input.name,
    objective: input.objective ?? 'OUTCOME_SALES',
    status: 'PAUSED',
    special_ad_categories: [],
  });
}

export async function createMetaAdSet(
  creds: MetaAdsCredentials,
  input: { name: string; campaignId: string; dailyBudgetCents: number; geo: string; pixelId: string },
): Promise<{ id: string }> {
  return post(`${creds.adAccountId}/adsets`, creds, {
    name: input.name,
    campaign_id: input.campaignId,
    status: 'PAUSED',
    daily_budget: String(input.dailyBudgetCents),
    billing_event: 'IMPRESSIONS',
    optimization_goal: 'OFFSITE_CONVERSIONS',
    promoted_object: { pixel_id: input.pixelId, custom_event_type: 'PURCHASE' },
    targeting: { geo_locations: { countries: [input.geo] } },
  });
}

export async function createMetaAd(
  creds: MetaAdsCredentials,
  input: { name: string; adSetId: string; pageId: string; finalUrl: string; headline: string; description: string },
): Promise<{ id: string }> {
  return post(`${creds.adAccountId}/ads`, creds, {
    name: input.name,
    adset_id: input.adSetId,
    status: 'PAUSED',
    creative: {
      object_story_spec: {
        page_id: input.pageId,
        link_data: {
          link: input.finalUrl,
          message: input.description,
          name: input.headline,
          call_to_action: { type: 'LEARN_MORE', value: { link: input.finalUrl } },
        },
      },
    },
  });
}

export async function pauseMetaObject(creds: MetaAdsCredentials, objectId: string): Promise<void> {
  await post(objectId, creds, { status: 'PAUSED' });
}
