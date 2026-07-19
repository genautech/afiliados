'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Bot, Settings, ShieldCheck, Terminal, CheckCircle2,
  XCircle, Play, Loader2, AlertTriangle, ArrowRight, Zap,
  MessageSquare, Wrench, Radar, Workflow, Coins, RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LlmRoutingPanel } from '@/components/llm-routing-panel';
import { AGENT_REGISTRY } from '@/lib/agents';

// Skills de afiliados instaladas no Claude Code (~/.claude/skills) — operam via chat/CLI, fora do app
const CHAT_SKILLS = [
  {
    id: 'cacador-produtos-afiliados',
    name: 'Caçador de Produtos',
    description: 'Encontra e analisa ofertas (ClickBank, Digistore24, Hotmart, CPA): gravity, EPC, comissão, regra do 3×, shortlist com risco mapeado. Sempre analisa a página de afiliado do produtor.',
    inUse: true,
    note: 'Alimenta a Busca de Produtos e a aba Ofertas',
  },
  {
    id: 'inteligencia-keywords-afiliados',
    name: 'Inteligência de Keywords',
    description: 'Mapa de keywords por intenção e economia, validação de demanda, espionagem de concorrentes e localização internacional.',
    inUse: true,
    note: 'Metodologia usada pelo ATP Keyword Analyst e SEO Architect',
  },
  {
    id: 'afiliado-google-ads-pro',
    name: 'Google Ads Pro',
    description: 'Estrategista e executor de campanhas: estruturas, RSAs prontos, negativas, presells HTML, escala e compliance (BR e internacional).',
    inUse: true,
    note: 'Base dos prompts de RSA e auditoria',
  },
  {
    id: 'affiliate-marketer-strategies',
    name: 'Estratégias de Afiliados',
    description: 'Estratégias por rede (ClickBank, BuyGoods, MaxWeb, Hotmart, Eduzz, Monetizze) com Google Ads: Search, YouTube, Demand Gen, PMax.',
    inUse: true,
    note: 'Estratégia geral da operação',
  },
  {
    id: 'pipeline-produto-clickbank',
    name: 'Pipeline de Produto ClickBank',
    description: 'Orquestra as 3 skills acima num fluxo único: produto → página de afiliado → keywords → campanha, gerando dossiê completo e semeando o AfiliAds.',
    inUse: false,
    note: 'Disponível — dispare via chat (/pipeline-produto-clickbank)',
  },
];

// Agentes de desenvolvimento do Claude Code (~/.claude/agents) — mantêm o app, não operam campanhas
const DEV_AGENTS = [
  { id: 'design-expert', name: 'Design Expert', description: 'UI/UX e componentes React + Tailwind das telas do AfiliAds.' },
  { id: 'refactor-assistant', name: 'Refactor Assistant', description: 'Refatoração e manutenção do código do app sem mudar comportamento.' },
  { id: 'test-engineer', name: 'Test Engineer', description: 'Testes unitários e e2e (Jest/Playwright) quando solicitado.' },
];

interface TestResult {
  response: string;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
  durationMs?: number;
  model?: string;
  task?: string;
  error?: boolean;
}

function fmtTokens(n: number | undefined | null): string {
  if (!n) return '0';
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

export default function AgentesPage() {
  const [activeProvider, setActiveProvider] = useState<string>('abacusai');
  const [providerConfigured, setProviderConfigured] = useState<boolean>(false);
  const [atpConfigured, setAtpConfigured] = useState<boolean>(true);
  const [testing, setTesting] = useState<Record<string, boolean>>({});
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [runStats, setRunStats] = useState<any>(null);

  const loadRuns = useCallback(() => {
    fetch('/api/agent-runs').then(r => r.json()).then(d => { if (d?.byAgent) setRunStats(d); }).catch(console.error);
  }, []);

  useEffect(() => {
    // Status REAL das chaves via roteador (não presume provedor default)
    fetch('/api/llm-routing')
      .then(r => r.json())
      .then(d => {
        const usable = (d?.providers ?? []).filter((p: any) => p?.hasKey && p?.enabled);
        setProviderConfigured(usable.length > 0);
        setActiveProvider(d?.mode === 'manual' ? (d?.manualProvider ?? 'auto') : 'auto');
      })
      .catch(() => setProviderConfigured(false));
    fetch('/api/atp/me').then(r => setAtpConfigured(r.ok)).catch(() => setAtpConfigured(false));
    loadRuns();
  }, [loadRuns]);

  const statsFor = (agentId: string) => (runStats?.byAgent ?? []).find((a: any) => a.agent === agentId);

  const testAgent = async (agentId: string) => {
    setTesting(prev => ({ ...prev, [agentId]: true }));
    setTestResults(prev => { const c = { ...prev }; delete c[agentId]; return c; });
    try {
      const res = await fetch('/api/agent-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentType: agentId })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestResults(prev => ({ ...prev, [agentId]: { response: data.response, usage: data.usage, durationMs: data.durationMs, model: data.model, task: data.task } }));
        toast.success(`${agentId}: teste ok — ${fmtTokens(data?.usage?.totalTokens)} tokens`);
        loadRuns();
      } else {
        toast.error(data.error || 'Erro ao testar agente');
        setTestResults(prev => ({ ...prev, [agentId]: { response: `Erro: ${data.error || 'Falha de conexão'}`, error: true } }));
      }
    } catch {
      toast.error('Erro de rede ao conectar ao agente');
      setTestResults(prev => ({ ...prev, [agentId]: { response: 'Erro de Rede', error: true } }));
    } finally {
      setTesting(prev => ({ ...prev, [agentId]: false }));
    }
  };

  const getProviderName = (key: string) => {
    switch (key) {
      case 'openai': return 'OpenAI (GPT-4o/5.4)';
      case 'anthropic': return 'Anthropic (Claude)';
      case 'google': return 'Google Gemini';
      case 'abacusai':
      default: return 'Abacus.ai';
    }
  };

  const agentName = (id: string) => AGENT_REGISTRY.find(a => a.id === id)?.name ?? id;
  // Contagem REAL: agentes que já executaram pelo menos uma vez (tabela AgentRun)
  const agentsUsed = AGENT_REGISTRY.filter(a => (statsFor(a.id)?.runs ?? 0) > 0).length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-display font-bold text-white tracking-tight flex items-center gap-2">
          <Bot className="h-7 w-7 text-green-500" /> Sala de Controle de Agentes
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Inventário completo: teste cada agente com uma tarefa real e acompanhe o consumo de tokens de cada um.
        </p>
      </div>

      <LlmRoutingPanel />

      {/* Status geral (dados reais) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-[#1e293b] border-[#334155] md:col-span-2">
          <CardContent className="pt-6 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <Settings className="h-4 w-4 text-slate-400" />
              <span className="text-sm text-slate-300">
                Roteamento: <span className="text-white font-medium">{activeProvider === 'auto' ? 'automático por tarefa' : `manual (${getProviderName(activeProvider)})`}</span>
              </span>
              {providerConfigured ? (
                <Badge className="bg-green-500/20 text-green-400 gap-1"><CheckCircle2 className="h-3 w-3" /> Provedor disponível</Badge>
              ) : (
                <Badge className="bg-red-500/20 text-red-400 gap-1"><XCircle className="h-3 w-3" /> Nenhuma chave ativa</Badge>
              )}
            </div>
            <Link href="/configuracoes">
              <Button className="bg-slate-700 hover:bg-slate-600 text-white gap-1.5" size="sm">
                Configurar Chaves <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-[#1e293b] border-[#334155] flex flex-col justify-center p-4">
          <div className="text-center space-y-1">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Agentes já executados</p>
            <p className="text-2xl font-bold text-green-400 flex items-center justify-center gap-1">
              <ShieldCheck className="h-6 w-6 text-green-400" /> {agentsUsed}/{AGENT_REGISTRY.length}
            </p>
            <p className="text-slate-500 text-xs mt-1">com execução registrada</p>
          </div>
        </Card>
      </div>

      {/* Consumo de tokens */}
      <Card className="bg-[#1e293b] border-[#334155]">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base text-white flex items-center gap-2">
              <Coins className="h-4 w-4 text-yellow-400" /> Consumo de Tokens por Agente
            </CardTitle>
            <div className="flex items-center gap-3">
              {runStats?.totals && (
                <span className="text-sm text-slate-300">
                  Total: <span className="font-mono text-yellow-400">{fmtTokens(runStats.totals.totalTokens)}</span> tokens em <span className="font-mono">{runStats.totals.runs}</span> execuções
                </span>
              )}
              <Button size="sm" variant="outline" className="border-[#334155] text-slate-300 gap-1" onClick={loadRuns}>
                <RefreshCw className="h-3 w-3" /> Atualizar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {(runStats?.byAgent ?? []).length === 0 ? (
            <p className="text-sm text-slate-500">Nenhuma execução registrada ainda — teste um agente abaixo ou use qualquer área do app.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-[#334155] text-slate-400 text-xs">
                  <th className="text-left py-2">Agente</th><th className="text-right">Execuções</th><th className="text-right">Tokens (total)</th><th className="text-right">Entrada</th><th className="text-right">Saída</th><th className="text-right">Duração média</th><th className="text-right">Falhas</th><th className="text-right">Última</th>
                </tr></thead>
                <tbody>
                  {runStats.byAgent.map((a: any) => (
                    <tr key={a.agent} className="border-b border-[#334155]/50">
                      <td className="py-2 text-white">{agentName(a.agent)}</td>
                      <td className="text-right text-slate-300 font-mono">{a.runs}</td>
                      <td className="text-right text-yellow-400 font-mono">{fmtTokens(a.totalTokens)}</td>
                      <td className="text-right text-slate-400 font-mono">{fmtTokens(a.promptTokens)}</td>
                      <td className="text-right text-slate-400 font-mono">{fmtTokens(a.completionTokens)}</td>
                      <td className="text-right text-slate-300 font-mono">{(a.avgDurationMs / 1000).toFixed(1)}s</td>
                      <td className={cn('text-right font-mono', a.failures > 0 ? 'text-red-400' : 'text-slate-500')}>{a.failures}</td>
                      <td className="text-right text-slate-400 text-xs">{a.lastRunAt ? new Date(a.lastRunAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Problemas detectados (falhas 24h) */}
      {(runStats?.problems ?? []).length > 0 && (
        <Card className="bg-red-500/5 border-red-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-white flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-400" /> Problemas detectados (últimas 24h)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {runStats.problems.map((p: any, i: number) => (
              <div key={i} className="flex items-start justify-between gap-3 text-sm bg-[#0f172a] rounded-lg p-3">
                <div>
                  <span className="text-white font-medium">{agentName(p.agent)}</span>
                  <span className="text-slate-500 text-xs"> via {p.provider || '?'}</span>
                  <p className="text-slate-300 text-xs mt-0.5">{p.cause}</p>
                </div>
                <Badge className="bg-red-500/20 text-red-400 shrink-0">{p.count}×</Badge>
              </div>
            ))}
            <p className="text-xs text-slate-500">Falhas de provedor caem automaticamente para o próximo da cadeia; falhas de validação são retentadas 1× com o erro anexado. Persistindo, verifique as chaves em Configurações.</p>
          </CardContent>
        </Card>
      )}

      {/* ===== 1. Agentes do App ===== */}
      <div className="flex items-center gap-2 pt-2">
        <Workflow className="h-5 w-5 text-green-400" />
        <h2 className="text-lg font-display font-bold text-white">Agentes do App</h2>
        <Badge className="bg-green-500/20 text-green-400 text-[10px]">rotas de IA — roteador automático de provedores</Badge>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {AGENT_REGISTRY.map(agent => {
          const isAtp = agent.id === 'atp-keyword-analyst';
          const result = testResults[agent.id];
          const stats = statsFor(agent.id);
          return (
            <Card key={agent.id} className="bg-[#1e293b] border-[#334155] hover:border-[#475569] transition-all flex flex-col justify-between">
              <div>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-lg text-white font-bold">{agent.name}</CardTitle>
                        {!providerConfigured ? (
                          <Badge className="bg-red-500/20 text-red-400 text-[10px]">SEM CHAVE</Badge>
                        ) : (stats?.runs ?? 0) > 0 ? (
                          <Badge className="bg-green-500/20 text-green-400 text-[10px]">EM USO ({stats.runs}×)</Badge>
                        ) : (
                          <Badge className="bg-blue-500/20 text-blue-400 text-[10px]">PRONTO — nunca executado</Badge>
                        )}
                      </div>
                      <span className="text-xs text-green-400 font-medium">{agent.role}</span>
                    </div>
                    {isAtp ? <Radar className="h-6 w-6 text-slate-400 shrink-0" /> : <Bot className="h-6 w-6 text-slate-400 shrink-0" />}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-slate-300 leading-relaxed">{agent.description}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {agent.skills.map(skill => (
                      <Badge key={skill} variant="secondary" className="bg-[#0f172a] text-slate-400 border border-[#334155]/40 text-[10px]">✦ {skill}</Badge>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span className="font-mono">{agent.route}</span>
                    {stats && (
                      <span className="text-yellow-400/80 font-mono">{fmtTokens(stats.totalTokens)} tokens · {stats.runs}×</span>
                    )}
                  </div>
                  {result && (
                    <div className="bg-[#0f172a] border border-[#334155]/60 rounded-lg p-3 font-mono text-[11px] leading-normal text-slate-300 space-y-1.5">
                      <div className="flex items-start gap-2">
                        <Terminal className={cn('h-4 w-4 shrink-0 mt-0.5', result.error ? 'text-red-500' : 'text-green-500')} />
                        <div className="min-w-0 flex-1">
                          {result.task && <span className="text-slate-500 block text-[9px] uppercase tracking-wider font-sans">Teste: {result.task}</span>}
                          <pre className="whitespace-pre-wrap break-words max-h-44 overflow-y-auto">{result.response}</pre>
                        </div>
                      </div>
                      {result.usage && (
                        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#334155]/40 text-[10px]">
                          <Badge className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">{fmtTokens(result.usage.totalTokens)} tokens</Badge>
                          <span className="text-slate-500">entrada {fmtTokens(result.usage.promptTokens)} · saída {fmtTokens(result.usage.completionTokens)} · {((result.durationMs ?? 0) / 1000).toFixed(1)}s · {result.model}</span>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </div>
              <CardContent className="pt-0 pb-4 space-y-2">
                <div className="flex gap-2">
                  <Button
                    onClick={() => testAgent(agent.id)}
                    disabled={testing[agent.id] || !providerConfigured}
                    className={cn('flex-1 text-xs gap-1.5', providerConfigured ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-slate-800 text-slate-500 cursor-not-allowed')}
                    size="sm"
                    title={agent.testTask.describe}
                  >
                    {testing[agent.id]
                      ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Testando…</>
                      : <><Play className="h-3 w-3" /> Testar agente</>}
                  </Button>
                  <Link href={agent.page} className="flex-1">
                    <Button size="sm" variant="outline" className="w-full text-xs border-[#334155] text-slate-300 gap-1">
                      <ArrowRight className="h-3 w-3" /> {agent.pageLabel}
                    </Button>
                  </Link>
                </div>
                {isAtp && !atpConfigured && (
                  <p className="text-[10px] text-red-400 text-center flex items-center justify-center gap-1">
                    <AlertTriangle className="h-3 w-3 shrink-0" /> Configure a API Key do AnswerThePublic em Configurações
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ===== 2. Skills de Afiliados (Claude Code) ===== */}
      <div className="flex items-center gap-2 pt-2">
        <MessageSquare className="h-5 w-5 text-blue-400" />
        <h2 className="text-lg font-display font-bold text-white">Skills de Afiliados — Claude Code</h2>
        <Badge className="bg-blue-500/20 text-blue-400 text-[10px]">operam via chat/CLI, fora do app</Badge>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CHAT_SKILLS.map(skill => (
          <Card key={skill.id} className="bg-[#1e293b] border-[#334155]">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-base text-white font-bold">{skill.name}</CardTitle>
                {skill.inUse
                  ? <Badge className="bg-green-500/20 text-green-400 text-[10px]">INSTALADA — integrada ao fluxo</Badge>
                  : <Badge className="bg-slate-500/20 text-slate-400 text-[10px]">INSTALADA — sob demanda</Badge>}
              </div>
              <p className="text-[11px] text-slate-500 font-mono">~/.claude/skills/{skill.id}</p>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-slate-300 leading-relaxed">{skill.description}</p>
              <p className="text-xs text-blue-300/80">{skill.note}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ===== 3. Agentes de Desenvolvimento ===== */}
      <div className="flex items-center gap-2 pt-2">
        <Wrench className="h-5 w-5 text-yellow-400" />
        <h2 className="text-lg font-display font-bold text-white">Agentes de Desenvolvimento — Claude Code</h2>
        <Badge className="bg-yellow-500/20 text-yellow-400 text-[10px]">mantêm o app, sob demanda</Badge>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {DEV_AGENTS.map(agent => (
          <Card key={agent.id} className="bg-[#1e293b] border-[#334155]">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm text-white font-bold">{agent.name}</CardTitle>
                <Badge className="bg-slate-500/20 text-slate-400 text-[10px]">SOB DEMANDA</Badge>
              </div>
              <p className="text-[11px] text-slate-500 font-mono">~/.claude/agents/{agent.id}.md</p>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-300 leading-relaxed">{agent.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Nota sobre roteamento */}
      <Card className="bg-[#1e293b]/70 backdrop-blur border border-blue-500/30 shadow-lg">
        <CardContent className="p-5 flex gap-4 items-start">
          <Zap className="h-6 w-6 text-yellow-400 shrink-0 mt-1" />
          <div className="space-y-1">
            <h3 className="text-white font-semibold text-base">Como os provedores são escolhidos</h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              Tarefas <strong>premium</strong> (compliance, auditoria, página de afiliado) priorizam Claude (Anthropic); tarefas <strong>standard</strong> (keywords, RSA, hunter) e <strong>light</strong> (chat, validações) usam Gemini/GPT primeiro para poupar tokens Claude. Se um provedor falhar ou estourar o orçamento mensal, o roteador cai para o próximo automaticamente — cada execução fica registrada na tabela acima com o modelo realmente usado.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
