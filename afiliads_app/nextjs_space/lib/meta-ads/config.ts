// Credenciais do Meta Ads.
//
// Lê a mesma fonte que /api/tracking já usa (Integration serviceName='meta'),
// aceitando os dois nomes de campo que existem no banco hoje, e cai para env
// quando o usuário ainda não conectou a conta pela UI.
//
// access_token casa com /(key|secret|token|password)/i, então é gravado
// criptografado por /api/integrations. Ler fieldValue cru mandaria a string
// "enc:v1:..." para a Marketing API. readIntegrationFieldValue é o mesmo
// caminho que getGoogleAdsConfig usa.

import { prisma } from '@/lib/prisma';
import { readIntegrationFieldValue } from '@/lib/integration-secrets';

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
  const rows = await prisma.integration.findMany({
    where: { userId, serviceName: { in: ['meta', 'tracking'] } },
  });
  const pick = (key: keyof MetaAdsCredentials, envs: string[]): string | null => {
    // 'meta' é a fonte canônica; 'tracking' só entra como fallback para não
    // obrigar o operador a digitar o mesmo pixel duas vezes.
    const row = rows.find(r => r.serviceName === 'meta' && FIELD_ALIASES[key].includes(r.fieldName))
      ?? rows.find(r => r.serviceName === 'tracking' && FIELD_ALIASES[key].includes(r.fieldName));
    let hit: string | undefined;
    if (row?.fieldValue) {
      try {
        hit = readIntegrationFieldValue(row.fieldName, row.fieldValue).trim();
      } catch {
        // Segredo ilegível (chave trocada, rollout 'enforced' com plaintext
        // legado) conta como ausente: melhor cair para MOCK do que mandar lixo.
        hit = undefined;
      }
    }
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
