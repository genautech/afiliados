import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { readIntegrationFieldValue } from '@/lib/integration-secrets';
import { consumirRateLimit, isFinancialEvent, registrarEventId } from '@/lib/tracking-guard';
import crypto from 'crypto';

interface TrackingEventPayload {
  userId?: string;
  pixelId?: string; // Optional if configured in db or env
  // accessToken NÃO é mais aceito no body: era proxy anônimo para a CAPI com credencial
  // de terceiro. A credencial sai sempre da integração do usuário ou do ambiente.
  eventName: string; // e.g. PageView, Lead, Purchase, InitiateCheckout
  eventTime?: number; // Unix timestamp in seconds
  eventSourceUrl?: string;
  eventId?: string; // For deduplication
  userData: {
    ipAddress?: string;
    userAgent?: string;
    email?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    externalId?: string;
  };
  customData?: {
    currency?: string;
    value?: number;
    contentName?: string;
    contentCategory?: string;
    contentIds?: string[];
  };
  testEventCode?: string; // Meta test event code
}

/**
 * SHA-256 helper with Meta Conversions API formatting requirements
 * Values must be lowercase, trimmed, and hashed.
 */
function hashValue(value?: string): string | null {
  if (!value) return null;
  const clean = value.trim().toLowerCase();
  // If it's already an hex SHA-256 string, don't double hash
  if (/^[a-f0-9]{64}$/i.test(clean)) {
    return clean;
  }
  return crypto.createHash('sha256').update(clean).digest('hex');
}

/**
 * Identidade do chamador: sessão do app ou token de integração do MCP. Nunca o `userId` do
 * body — era exatamente por ali que um anônimo disparava conversão na conta de outro.
 */
async function resolveAuthUserId(request: NextRequest): Promise<string | null> {
  const mcpToken = request.headers.get('x-afiliads-token');
  if (mcpToken && process.env.AFILIADS_MCP_TOKEN && mcpToken === process.env.AFILIADS_MCP_TOKEN) {
    const email = process.env.AFILIADS_MCP_USER_EMAIL;
    const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
    return user?.id ?? null;
  }
  const session = await getServerSession(authOptions);
  return session?.user ? ((session.user as any)?.id ?? null) : null;
}

export async function POST(request: NextRequest) {
  try {
    const body: TrackingEventPayload = await request.json();
    const {
      eventName,
      eventTime,
      eventSourceUrl,
      eventId,
      userData,
      customData,
      testEventCode
    } = body;

    if (!eventName) {
      return NextResponse.json({ error: 'eventName é obrigatório' }, { status: 400 });
    }

    // Credencial nunca vem do cliente. Sem isso, a rota era proxy aberto para a CAPI.
    if ((body as any).accessToken) {
      return NextResponse.json(
        { error: 'accessToken não é aceito no corpo da requisição' },
        { status: 400 },
      );
    }

    const authUserId = await resolveAuthUserId(request);
    const financeiro = isFinancialEvent(eventName);

    // Evento financeiro move dinheiro e otimização: exige chamador autenticado e integração
    // Meta ativa na conta dele. Evento de navegação segue público, com rate limit por IP.
    if (financeiro && !authUserId) {
      return NextResponse.json(
        { error: `Evento ${eventName} exige autenticação` },
        { status: 401 },
      );
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'desconhecido';
    if (!financeiro && !consumirRateLimit(ip)) {
      return NextResponse.json({ error: 'Limite de eventos excedido' }, { status: 429 });
    }

    // Deduplicação por eventId: retry do cliente não pode virar duas conversões.
    if (eventId && !registrarEventId(eventId)) {
      return NextResponse.json({ success: true, eventId, deduplicated: true });
    }

    // Para evento financeiro, a conta é a do chamador autenticado — nunca a que veio no body.
    // Para navegação, o body ainda pode apontar a conta dona do pixel (não expõe credencial).
    const userId = financeiro ? authUserId : (authUserId ?? body.userId);

    // Retrieve Meta credentials from DB integrations or Environment Variables
    let pixelId = body.pixelId || process.env.META_PIXEL_ID;
    let accessToken = process.env.META_ACCESS_TOKEN || process.env.FACEBOOK_ACCESS_TOKEN;
    let temIntegracao = false;

    if (userId && (!pixelId || !accessToken)) {
      try {
        // access_token é gravado criptografado por /api/integrations; ler o
        // fieldValue cru mandaria "enc:v1:..." para a CAPI do Meta.
        const rows = await prisma.integration.findMany({ where: { userId, serviceName: 'meta' } });
        const read = (r?: { fieldName: string; fieldValue: string | null }) => {
          if (!r?.fieldValue) return undefined;
          try { return readIntegrationFieldValue(r.fieldName, r.fieldValue).trim() || undefined; }
          catch { return undefined; }
        };
        const dbPixel = read(rows.find(r => r.fieldName === 'pixel_id' || r.fieldName === 'meta_pixel_id'));
        const dbToken = read(rows.find(r => r.fieldName === 'access_token' || r.fieldName === 'meta_access_token'));
        if (dbPixel) pixelId = dbPixel;
        if (dbToken) accessToken = dbToken;
        temIntegracao = Boolean(dbPixel && dbToken);
      } catch (err) {
        console.warn('Failed to retrieve Meta credentials from DB integrations:', err);
      }
    }

    if (financeiro && !temIntegracao) {
      return NextResponse.json(
        { error: 'Nenhuma integração Meta ativa vinculada a esta conta' },
        { status: 403 },
      );
    }

    if (!pixelId) {
      return NextResponse.json({ error: 'pixelId não configurado ou fornecido' }, { status: 422 });
    }
    if (!accessToken) {
      return NextResponse.json({ error: 'accessToken do Meta não configurado ou fornecido' }, { status: 422 });
    }

    // Hash user data fields to comply with Meta CAPI requirements
    const formattedUserData: Record<string, any> = {
      client_ip_address: userData?.ipAddress || request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1',
      client_user_agent: userData?.userAgent || request.headers.get('user-agent') || 'Unknown',
    };

    if (userData?.email) {
      const hashedEmail = hashValue(userData.email);
      if (hashedEmail) formattedUserData.em = [hashedEmail];
    }
    if (userData?.phone) {
      const hashedPhone = hashValue(userData.phone);
      if (hashedPhone) formattedUserData.ph = [hashedPhone];
    }
    if (userData?.firstName) {
      const hashedFn = hashValue(userData.firstName);
      if (hashedFn) formattedUserData.fn = [hashedFn];
    }
    if (userData?.lastName) {
      const hashedLn = hashValue(userData.lastName);
      if (hashedLn) formattedUserData.ln = [hashedLn];
    }
    if (userData?.externalId) {
      const hashedExt = hashValue(userData.externalId);
      if (hashedExt) formattedUserData.external_id = [hashedExt];
    }

    // Construct the Conversion Event contract
    const serverEvent = {
      event_name: eventName,
      event_time: eventTime || Math.floor(Date.now() / 1000),
      event_source_url: eventSourceUrl || request.headers.get('referer') || 'https://afiliads.app',
      action_source: 'website',
      event_id: eventId || crypto.randomUUID(),
      user_data: formattedUserData,
      custom_data: customData ? {
        currency: customData.currency || 'BRL',
        value: customData.value !== undefined ? Number(customData.value) : undefined,
        content_name: customData.contentName,
        content_category: customData.contentCategory,
        content_ids: customData.contentIds,
      } : undefined
    };

    const payload: Record<string, any> = {
      data: [serverEvent]
    };

    if (testEventCode || process.env.META_TEST_EVENT_CODE) {
      payload.test_event_code = testEventCode || process.env.META_TEST_EVENT_CODE;
    }

    // Post to Meta conversions graph API
    // standard is pixel_id/events, support both pixel_id or ad_account_id if mapped
    const targetId = pixelId;
    const url = `https://graph.facebook.com/v19.0/${targetId}/events?access_token=${accessToken}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const resultText = await response.text();
    let resultJson: any = {};
    try {
      resultJson = JSON.parse(resultText);
    } catch {
      resultJson = { raw: resultText };
    }

    if (!response.ok) {
      console.error('Meta CAPI API Error response:', resultJson);
      return NextResponse.json({
        success: false,
        error: `Meta API retornou erro ${response.status}`,
        details: resultJson
      }, { status: response.status });
    }

    return NextResponse.json({
      success: true,
      eventId: serverEvent.event_id,
      metaResponse: resultJson
    });
  } catch (err: any) {
    console.error('Meta CAPI proxy error:', err);
    return NextResponse.json({ error: err?.message ?? 'Erro interno ao processar Conversions API' }, { status: 500 });
  }
}
