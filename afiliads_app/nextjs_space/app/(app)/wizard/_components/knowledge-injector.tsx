'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Brain,
  Youtube,
  Github,
  Globe,
  Loader2,
  Plus,
  Trash2,
  CircleAlert,
  CheckCircle2,
} from 'lucide-react';

type SourceKind = 'youtube' | 'github' | 'landing';

const SOURCES: Record<
  SourceKind,
  {
    label: string;
    hint: string;
    placeholder: string;
    icon: typeof Youtube;
    accent: string;
    hosts?: string[];
    stages: string[];
  }
> = {
  youtube: {
    label: 'YouTube',
    hint: 'Vídeo de VSL, review ou aula. O worker extrai a transcrição.',
    placeholder: 'https://www.youtube.com/watch?v=...',
    icon: Youtube,
    accent: 'text-rose-400',
    hosts: ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'],
    stages: [
      'Antigravity baixando a transcrição...',
      'Knowledge Scout separando fatos de promessa...',
      'Fact Steward montando o claim ledger...',
    ],
  },
  github: {
    label: 'Código-fonte (GitHub)',
    hint: 'Repositório do produto ou do template que serve de referência.',
    placeholder: 'https://github.com/org/repo',
    icon: Github,
    accent: 'text-slate-300',
    hosts: ['github.com', 'www.github.com', 'gist.github.com'],
    stages: [
      'Antigravity clonando a árvore do repositório...',
      'Knowledge Scout lendo README e docs...',
      'Content Architect mapeando módulos em capítulos...',
    ],
  },
  landing: {
    label: 'Landing concorrente',
    hint: 'URL de LP, advertorial ou página de vendas para benchmark.',
    placeholder: 'https://concorrente.com/oferta',
    icon: Globe,
    accent: 'text-sky-400',
    stages: [
      'Antigravity capturando o HTML da página...',
      'Knowledge Scout extraindo headline, oferta e prova...',
      'Compliance Sentinel marcando claims de risco...',
    ],
  },
};

interface InjectedSource {
  id: string;
  kind: SourceKind;
  url: string;
  status: 'QUEUED' | 'ERRO';
  detail: string;
  at: string;
}

interface KnowledgeInjectorProps {
  campaignId: string | null;
  /** Tags extras enviadas junto (ex.: vertical da campanha). */
  extraTags?: string[];
  className?: string;
}

export function KnowledgeInjector({ campaignId, extraTags = [], className = '' }: KnowledgeInjectorProps) {
  const [kind, setKind] = useState<SourceKind>('youtube');
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [stage, setStage] = useState('');
  const [sources, setSources] = useState<InjectedSource[]>([]);
  const stageTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (stageTimer.current) clearInterval(stageTimer.current);
  }, []);

  const validate = (value: string): string | null => {
    const trimmed = value.trim();
    if (!trimmed) return 'Cole uma URL antes de injetar.';
    let parsed: URL;
    try {
      parsed = new URL(trimmed);
    } catch {
      return 'URL inválida — precisa começar com http:// ou https://.';
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return 'Só aceito http ou https.';
    }
    const hosts = SOURCES[kind].hosts;
    if (hosts && !hosts.includes(parsed.hostname)) {
      return `Esse link não é de ${SOURCES[kind].label} (${parsed.hostname}).`;
    }
    return null;
  };

  const startStages = () => {
    const list = SOURCES[kind].stages;
    let index = 0;
    setStage(list[0]);
    stageTimer.current = setInterval(() => {
      index = (index + 1) % list.length;
      setStage(list[index]);
    }, 1400);
  };

  const stopStages = () => {
    if (stageTimer.current) clearInterval(stageTimer.current);
    stageTimer.current = null;
    setStage('');
  };

  const inject = async () => {
    const problem = validate(url);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setSending(true);
    startStages();
    const target = url.trim();
    try {
      const res = await fetch('/api/knowledge/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl: target,
          ...(campaignId ? { campaignId } : {}),
          tags: [kind, ...extraTags.filter(Boolean)].slice(0, 50),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const detail = data?.error || `Falhou com HTTP ${res.status}`;
        setSources((prev) => [
          { id: `${Date.now()}`, kind, url: target, status: 'ERRO', detail, at: new Date().toISOString() },
          ...prev,
        ]);
        toast.error(detail);
        return;
      }
      setSources((prev) => [
        {
          id: `${Date.now()}`,
          kind,
          url: target,
          status: 'QUEUED',
          detail: 'Aceito pela fila do worker Antigravity',
          at: data?.acceptedAt ?? new Date().toISOString(),
        },
        ...prev,
      ]);
      setUrl('');
      toast.success('Referência enfileirada para análise.');
    } catch (e: any) {
      const detail = e?.message || 'Erro de rede ao enfileirar a referência';
      setSources((prev) => [
        { id: `${Date.now()}`, kind, url: target, status: 'ERRO', detail, at: new Date().toISOString() },
        ...prev,
      ]);
      toast.error(detail);
    } finally {
      stopStages();
      setSending(false);
    }
  };

  const Icon = SOURCES[kind].icon;

  return (
    <Card className={`bg-[#1e293b] border-[#334155] ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Brain className="h-5 w-5 text-purple-400" />
          Injetar conhecimento
          {sources.some((s) => s.status === 'QUEUED') && (
            <Badge className="bg-purple-500/15 text-[10px] text-purple-300 hover:bg-purple-500/20">
              {sources.filter((s) => s.status === 'QUEUED').length} na fila
            </Badge>
          )}
        </CardTitle>
        <CardDescription className="text-slate-400">
          YouTube, código-fonte ou landing de concorrente. Os agentes leem em background e devolvem
          a proposta de ajuste na etapa da landing page.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="inline-flex flex-wrap gap-1 rounded-lg border border-[#334155] bg-[#0f172a] p-1">
          {(Object.keys(SOURCES) as SourceKind[]).map((key) => {
            const Tab = SOURCES[key].icon;
            const isActive = key === kind;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setKind(key);
                  setError(null);
                }}
                disabled={sending}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                  isActive ? 'bg-purple-500/15 text-purple-300' : 'text-slate-400 hover:text-slate-200'
                }`}
                aria-pressed={isActive}
              >
                <Tab className="h-3.5 w-3.5" />
                {SOURCES[key].label}
              </button>
            );
          })}
        </div>

        <div className="space-y-2">
          <Label className="text-slate-300">URL da referência</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Icon className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${SOURCES[kind].accent}`} />
              <Input
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (error) setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !sending) inject();
                }}
                placeholder={SOURCES[kind].placeholder}
                disabled={sending}
                className="bg-[#0f172a] border-[#334155] pl-9 text-white placeholder:text-slate-500 focus:border-purple-500/50 focus:ring-purple-500/10"
              />
            </div>
            <Button
              type="button"
              onClick={inject}
              disabled={sending}
              className="gap-2 bg-purple-600 text-white hover:bg-purple-700 sm:w-44"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {sending ? 'Enfileirando' : 'Injetar referência'}
            </Button>
          </div>
          <p className="text-[11px] text-slate-500">{SOURCES[kind].hint}</p>
          {error && (
            <p className="flex items-center gap-1.5 text-[11px] text-rose-400">
              <CircleAlert className="h-3 w-3" /> {error}
            </p>
          )}
        </div>

        {sending && (
          <div className="space-y-2 rounded-lg border border-purple-500/20 bg-purple-500/5 p-3">
            <div className="flex items-center gap-2 text-xs text-purple-300">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {stage || 'Enviando para a fila...'}
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-[#0f172a]">
              <div className="h-full w-1/3 animate-pulse rounded-full bg-purple-500" />
            </div>
          </div>
        )}

        {sources.length > 0 && (
          <div className="space-y-2">
            {sources.map((source) => {
              const RowIcon = SOURCES[source.kind].icon;
              const ok = source.status === 'QUEUED';
              return (
                <div
                  key={source.id}
                  className={`flex items-start gap-3 rounded-lg border p-3 ${
                    ok ? 'border-[#334155]/60 bg-[#0f172a]' : 'border-rose-500/30 bg-rose-500/5'
                  }`}
                >
                  <RowIcon className={`mt-0.5 h-4 w-4 shrink-0 ${SOURCES[source.kind].accent}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs text-white" title={source.url}>
                      {source.url}
                    </p>
                    <p className={`mt-0.5 flex items-center gap-1 text-[11px] ${ok ? 'text-slate-400' : 'text-rose-400'}`}>
                      {ok ? <CheckCircle2 className="h-3 w-3 text-emerald-400" /> : <CircleAlert className="h-3 w-3" />}
                      {source.detail}
                    </p>
                  </div>
                  <Badge
                    className={`shrink-0 text-[10px] ${
                      ok
                        ? 'bg-amber-500/15 text-amber-300 hover:bg-amber-500/20'
                        : 'bg-rose-500/15 text-rose-300 hover:bg-rose-500/20'
                    }`}
                  >
                    {source.status}
                  </Badge>
                  <button
                    type="button"
                    onClick={() => setSources((prev) => prev.filter((s) => s.id !== source.id))}
                    className="shrink-0 text-slate-500 transition-colors hover:text-rose-400"
                    aria-label="Remover referência da lista"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
            <p className="text-[11px] text-slate-500">
              A fila roda fora do app: o endpoint devolve <code>202 QUEUED</code> e o worker Antigravity
              processa depois. A lista acima é desta sessão.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
