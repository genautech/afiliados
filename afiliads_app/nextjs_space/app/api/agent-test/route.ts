export const dynamic = 'force-dynamic';
export const maxDuration = 60;
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { callAgent } from '@/lib/llm';
import { getAgent } from '@/lib/agents';
import { parseAgentJson } from '@/lib/json-validation';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const userId = (session.user as any)?.id;
    const body = await request.json();
    const agentDef = getAgent(body?.agentType ?? '');
    if (!agentDef) {
      return NextResponse.json({ error: `Agente desconhecido: ${body?.agentType}` }, { status: 422 });
    }

    const result = await callAgent(userId, {
      agent: agentDef.id,
      campaignTarget: { kind: 'non-campaign' },
      systemPrompt: agentDef.testTask.systemPrompt,
      userPrompt: agentDef.testTask.userPrompt,
    });

    return NextResponse.json({
      success: true,
      agent: agentDef.id,
      task: agentDef.testTask.describe,
      response: (() => {
        const parsed = parseAgentJson(result.text ?? '');
        return parsed ? JSON.stringify(parsed, null, 2) : result.text;
      })(),
      usage: result.usage,
      durationMs: result.durationMs,
      provider: result.provider,
      model: result.model,
    });
  } catch (err: any) {
    console.error('Agent test error:', err);
    return NextResponse.json({ error: err?.message || 'Falha ao conectar com o provedor de IA' }, { status: 500 });
  }
}
