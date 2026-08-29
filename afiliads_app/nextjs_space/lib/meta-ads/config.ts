// Credenciais do Meta Ads.
//
// Lê a mesma fonte que /api/tracking já usa (Integration serviceName='meta'),
// aceitando os dois nomes de campo que existem no banco hoje, e cai para env
// quando o usuário ainda não conectou a conta pela UI.

import { prisma } from '@/lib/prisma';

export interface MetaAdsCredentials {
  accessToken: string;
  adAccountId: string;
  pixelId: string | null;
  pageId: string | null;
}

export interface MetaCredentialCheck {
  credentials: MetaAdsCredentials | null;
  missing: string[];
}

const FIELD_ALIASES: Record<keyof MetaAdsCredentials, string[]> = {
  accessToken: ['access_token', 'meta_access_token'],
  adAccountId: ['ad_account_id', 'meta_ad_account_id'],
  pixelId: ['pixel_id', 'meta_pixel_id'],
  pageId: ['page_id', 'meta_page_id'],
};

/** `act_123` é o formato que a Marketing API exige na URL. */
export function normalizeAdAccountId(raw: string): string {
  const t = raw.trim();
  return t.startsWith('act_') ? t : `act_${t.replace(/^act/, '')}`;
}

export async function getMetaAdsCredentials(userId: string): Promise<MetaCredentialCheck> {
  const rows = await prisma.integration.findMany({ where: { userId, serviceName: 'meta' } });
  const pick = (key: keyof MetaAdsCredentials, envs: string[]): string | null => {
    const hit = rows.find(r => FIELD_ALIASES[key].includes(r.fieldName))?.fieldValue?.trim();
    if (hit) return hit;
    for (const e of envs) { const v = process.env[e]?.trim(); if (v) return v; }
    return null;
  };

  const accessToken = pick('accessToken', ['META_ACCESS_TOKEN', 'FACEBOOK_ACCESS_TOKEN']);
  const adAccountId = pick('adAccountId', ['META_AD_ACCOUNT_ID']);
  const pixelId = pick('pixelId', ['META_PIXEL_ID']);
  const pageId = pick('pageId', ['META_PAGE_ID']);

  const missing: string[] = [];
  if (!accessToken) missing.push('access_token');
  if (!adAccountId) missing.push('ad_account_id');
  // pixel e page não bloqueiam a criação da estrutura, mas sem eles o anúncio
  // não tem para onde reportar conversão nem em nome de quem publicar.
  if (!pixelId) missing.push('pixel_id');
  if (!pageId) missing.push('page_id');

  if (!accessToken || !adAccountId) return { credentials: null, missing };
  return {
    credentials: { accessToken, adAccountId: normalizeAdAccountId(adAccountId), pixelId, pageId },
    missing,
  };
}

/** Sem credencial completa não existe caminho LIVE — o painel roda em MOCK. */
export function isMetaMockMode(check: MetaCredentialCheck): boolean {
  if (process.env.META_MOCK_MODE === 'true') return true;
  return check.credentials === null;
}
