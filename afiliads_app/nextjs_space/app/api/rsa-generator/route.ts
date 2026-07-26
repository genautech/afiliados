export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateRsaCopy } from '@/lib/rsa';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }
    const userId = (session.user as any)?.id;
    const body = await request.json();
    const { keyword, benefit, angle, vertical } = body ?? {};
    if (!keyword) {
      return new Response(JSON.stringify({ error: 'Keyword é obrigatória' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const finalResult = await generateRsaCopy(userId, { keyword, benefit, angle, vertical });
    const finalData = JSON.stringify({ status: 'completed', result: finalResult });
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(`data: ${finalData}\n\n`));
        controller.close();
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (err: any) {
    console.error('RSA generator error:', err);
    return new Response(JSON.stringify({ error: 'Erro interno' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
