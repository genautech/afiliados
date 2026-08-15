export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ACTIVE_PROVIDERS, assertAllowedProviderModel, type Provider } from '@/lib/llm';
import { encryptIntegrationSecret, isSensitiveIntegrationField } from '@/lib/integration-secrets';

const IDENTIFIER = /^[a-z0-9_-]{1,64}$/;


function validateLlmField(fieldName: string, fieldValue: string): string | null {
  const match = fieldName.match(/^(api_key|model)_([a-z0-9_-]+)$/);
  if (!match || !ACTIVE_PROVIDERS.includes(match[2] as Provider)) return 'Campo LLM não permitido';
  if (match[1] === 'model') {
    try {
      assertAllowedProviderModel(match[2] as Provider, fieldValue);
    } catch {
      return 'Modelo LLM não permitido';
    }
  }
  return null;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const userId = (session.user as any)?.id;
    const integrations = await prisma.integration.findMany({ where: { userId }, orderBy: { serviceName: 'asc' } });
    // Mask values only for sensitive fields
    const masked = (integrations ?? []).map((i: any) => {
      const isSensitive = typeof i?.fieldName === 'string' && isSensitiveIntegrationField(i.fieldName);
      return {
        ...i,
        fieldValue: i?.fieldValue && isSensitive
          ? '••••••••'
          : (i?.fieldValue ?? ''),
      };
    });
    return NextResponse.json(masked);
  } catch (err: any) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const userId = (session.user as any)?.id;
    const body = await request.json();
    const serviceName = typeof body?.serviceName === 'string' ? body.serviceName : '';
    const fieldName = typeof body?.fieldName === 'string' ? body.fieldName : '';
    const rawFieldValue = typeof body?.fieldValue === 'string' ? body.fieldValue : '';
    if (!IDENTIFIER.test(serviceName) || !IDENTIFIER.test(fieldName) || rawFieldValue.length > 20_000) {
      return NextResponse.json({ error: 'Configuração de integração inválida' }, { status: 400 });
    }
    if (serviceName === 'llm') {
      const validationError = validateLlmField(fieldName, rawFieldValue);
      if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });
    }
    const fieldValue = isSensitiveIntegrationField(fieldName)
      ? encryptIntegrationSecret(rawFieldValue)
      : rawFieldValue;
    const result = await prisma.integration.upsert({
      where: { userId_serviceName_fieldName: { userId, serviceName, fieldName } },
      update: { fieldValue },
      create: { userId, serviceName, fieldName, fieldValue },
    });
    return NextResponse.json({ id: result?.id, serviceName: result?.serviceName, fieldName: result?.fieldName, saved: true });
  } catch (err: any) {
    console.error('POST integration error:', err);
    if (err instanceof Error && err.message.startsWith('INTEGRATION_ENCRYPTION_KEY')) {
      return NextResponse.json({ error: 'Criptografia de integrações não configurada' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
