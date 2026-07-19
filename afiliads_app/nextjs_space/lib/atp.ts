import { prisma } from './prisma';

const ATP_BASE = 'https://api.answerthepublic.com/api/public/v1';

export const ATP_PROVIDERS = ['gweb', 'youtube', 'bing', 'amazon', 'tiktok', 'instagram', 'chatgpt', 'gemini'] as const;

export class AtpError extends Error {
  status: number;
  details?: any;
  constructor(message: string, status: number, details?: any) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export async function getAtpKey(userId: string): Promise<string> {
  const integration = await prisma.integration.findFirst({
    where: { userId, serviceName: 'answerthepublic', fieldName: 'api_key' },
  });
  const key = integration?.fieldValue || process.env.ANSWERTHEPUBLIC_API_KEY || '';
  if (!key) {
    throw new AtpError('API key do AnswerThePublic não configurada. Adicione em Configurações.', 400);
  }
  return key;
}

export async function atpFetch(userId: string, path: string, init?: RequestInit): Promise<any> {
  const key = await getAtpKey(userId);
  const res = await fetch(`${ATP_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = body?.error?.message || `Erro ${res.status} na API do AnswerThePublic`;
    throw new AtpError(msg, res.status, body?.error?.details);
  }
  return body;
}

export function atpErrorResponse(err: any) {
  if (err instanceof AtpError) {
    return { error: err.message, details: err.details ?? null, status: err.status };
  }
  return { error: err?.message || 'Erro interno', details: null, status: 500 };
}
