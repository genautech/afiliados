import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from './auth';
import { ProductAgentSpec, runProductAgent } from './product-agents';

/** Handler POST padrão para os agentes de produto próprio. */
export function productAgentHandler<I extends z.ZodTypeAny, O extends z.ZodTypeAny>(
  spec: ProductAgentSpec<I, O>
) {
  return async function POST(request: NextRequest) {
    try {
      const session = await getServerSession(authOptions);
      const userId = (session?.user as any)?.id;
      if (!userId) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
      }

      const body = await request.json().catch(() => null);
      if (!body || typeof body !== 'object') {
        return NextResponse.json({ error: 'Corpo da requisição inválido' }, { status: 400 });
      }

      const result = await runProductAgent(userId, spec, body);
      return NextResponse.json(result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: 'Parâmetros inválidos',
            issues: error.issues.map((e) => ({ path: e.path.join('.'), message: e.message })),
          },
          { status: 400 }
        );
      }
      console.error(`[${spec.agent}]`, error);
      return NextResponse.json({ error: error?.message ?? 'Erro interno' }, { status: 500 });
    }
  };
}
