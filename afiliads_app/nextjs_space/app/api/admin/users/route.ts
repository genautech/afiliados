export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin';

// Mascara o valor de uma credencial: só os 4 últimos caracteres ficam visíveis.
function maskValue(value: string): string {
  if (!value) return '';
  if (value.length <= 4) return '••••';
  return `••••${value.slice(-4)}`;
}

export async function GET(_request: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: 'Acesso restrito ao admin' }, { status: 403 });

    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true, name: true, email: true, role: true, isActive: true, createdAt: true,
        metaReceitaMensal: true, metaRoi: true, budgetMensalAds: true,
        _count: { select: { campaigns: true, agentRuns: true } },
        integrations: { select: { serviceName: true, fieldName: true, fieldValue: true, updatedAt: true } },
      },
    });

    const result = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
      createdAt: u.createdAt,
      metaReceitaMensal: u.metaReceitaMensal,
      metaRoi: u.metaRoi,
      budgetMensalAds: u.budgetMensalAds,
      campaignCount: u._count.campaigns,
      agentRunCount: u._count.agentRuns,
      // Chaves pré-definidas pelo usuário, sempre mascaradas (últimos 4 caracteres)
      keys: u.integrations.map((i) => ({
        service: i.serviceName,
        field: i.fieldName,
        maskedValue: maskValue(i.fieldValue),
        updatedAt: i.updatedAt,
      })),
    }));

    return NextResponse.json({ users: result });
  } catch (err) {
    console.error('GET admin/users error:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: 'Acesso restrito ao admin' }, { status: 403 });

    const body = await request.json();
    const { userId, isActive } = body ?? {};
    if (!userId || typeof isActive !== 'boolean') {
      return NextResponse.json({ error: 'userId e isActive são obrigatórios' }, { status: 400 });
    }
    if (userId === admin.userId && !isActive) {
      return NextResponse.json({ error: 'O admin não pode desativar a própria conta' }, { status: 400 });
    }
    const user = await prisma.user.update({
      where: { id: userId },
      data: { isActive },
      select: { id: true, email: true, isActive: true },
    });
    return NextResponse.json(user);
  } catch (err) {
    console.error('PATCH admin/users error:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
