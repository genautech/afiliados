import { createHash } from 'node:crypto';

export type FacebookCapiParams = {
  pixelId: string;
  accessToken: string;
  eventName: string;
  eventId: string;
  email?: string;
  phone?: string;
  clientIp?: string;
  userAgent?: string;
  value?: number;
  isMockMode?: boolean;
};

export type FacebookCapiResult = {
  success: boolean;
  mock: boolean;
  eventId: string;
  response?: unknown;
};

function sha256(value: string): string {
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

export async function sendFacebookCapiEvent(params: FacebookCapiParams): Promise<FacebookCapiResult> {
  const mock = params.isMockMode === true || !params.pixelId.trim() || !params.accessToken.trim();
  if (mock) {
    console.log(`[FACEBOOK-CAPI] [MOCK] Evento ${params.eventName} simulado com ID ${params.eventId} e valor ${params.value ?? 0}.`);
    return { success: true, mock: true, eventId: params.eventId };
  }

  if (!/^[A-Za-z0-9_.-]{1,128}$/.test(params.pixelId)) throw new Error('pixelId inválido');
  if (!params.eventName.trim() || params.eventName.length > 100) throw new Error('eventName inválido');
  if (!params.eventId.trim() || params.eventId.length > 255) throw new Error('eventId inválido');
  if (params.value !== undefined && (!Number.isFinite(params.value) || params.value < 0)) throw new Error('value inválido');

  const body = {
    data: [{
      event_name: params.eventName,
      event_time: Math.floor(Date.now() / 1000),
      event_id: params.eventId,
      action_source: 'website',
      user_data: {
        ...(params.email ? { em: [sha256(params.email)] } : {}),
        ...(params.phone ? { ph: [sha256(params.phone)] } : {}),
        ...(params.clientIp ? { client_ip_address: params.clientIp } : {}),
        ...(params.userAgent ? { client_user_agent: params.userAgent } : {}),
      },
      ...(params.value !== undefined ? { custom_data: { value: params.value, currency: 'BRL' } } : {}),
    }],
    access_token: params.accessToken,
  };
  const response = await fetch(`https://graph.facebook.com/v19.0/${params.pixelId}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let parsed: unknown = {};
  try { parsed = JSON.parse(text); } catch { parsed = { raw: text.slice(0, 2000) }; }
  if (!response.ok) throw new Error(`Facebook CAPI retornou HTTP ${response.status}`);
  return { success: true, mock: false, eventId: params.eventId, response: parsed };
}
