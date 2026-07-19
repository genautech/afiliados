export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const userId = (session.user as any)?.id;
    const integrations = await prisma.integration.findMany({ where: { userId }, orderBy: { serviceName: 'asc' } });
    // Mask values only for sensitive fields
    const masked = (integrations ?? []).map((i: any) => {
      const isSensitive = i?.fieldName?.includes?.('key') || 
                          i?.fieldName?.includes?.('secret') || 
                          i?.fieldName?.includes?.('token') || 
                          i?.fieldName?.includes?.('password');
      return {
        ...i,
        fieldValue: i?.fieldValue && isSensitive
          ? '••••' + (i.fieldValue?.slice?.(-4) ?? '')
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
    const result = await prisma.integration.upsert({
      where: { userId_serviceName_fieldName: { userId, serviceName: body?.serviceName ?? '', fieldName: body?.fieldName ?? '' } },
      update: { fieldValue: body?.fieldValue ?? '' },
      create: { userId, serviceName: body?.serviceName ?? '', fieldName: body?.fieldName ?? '', fieldValue: body?.fieldValue ?? '' },
    });
    return NextResponse.json({ id: result?.id, serviceName: result?.serviceName, fieldName: result?.fieldName, saved: true });
  } catch (err: any) {
    console.error('POST integration error:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
