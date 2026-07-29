import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { syncExperiment } from '@/lib/google-ads-experiments/orchestration';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const userId = (session.user as any).id;

    const result = await syncExperiment(params.id, userId);

    return NextResponse.json(result);
  } catch (error: any) {
    const status = error.status || 500;
    const message = error.message || 'Erro interno';
    return NextResponse.json({ error: message }, { status });
  }
}
