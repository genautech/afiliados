'use client';

// Painel por canal do lançamento multicanal.
//
// O console de saga mostra o log corrido; este painel mostra o ESTADO, que é
// o que importa quando algo quebra: qual canal subiu, em que modo, com quais
// IDs remotos, e qual erro parou o outro. Reexecutar um canal isolado usa uma
// idempotencyKey nova — a antiga já está gravada com o resultado dela.

import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, RotateCcw, CheckCircle2, XCircle, CircleDashed, Undo2 } from 'lucide-react';
import { toast } from 'sonner';

type Status = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'COMPENSATED';

interface ChannelState {
  channel: 'GOOGLE_ADS' | 'META_ADS';
  label: string;
  status: Status;
  mode: 'LIVE' | 'MOCK' | null;
  externalIds: Record<string, string>;
  error: string | null;
  logs: string[];
  alreadyExisted: boolean;
  startedAt: string | null;
}

const STATUS_UI: Record<Status, { cls: string; icon: React.ReactNode; label: string }> = {
  PENDING:     { cls: 'bg-slate-500/15 text-slate-300',   icon: <CircleDashed className="h-3.5 w-3.5" />,  label: 'não iniciado' },
  RUNNING:     { cls: 'bg-amber-500/15 text-amber-300',   icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />, label: 'em execução' },
  SUCCESS:     { cls: 'bg-green-500/15 text-green-400',   icon: <CheckCircle2 className="h-3.5 w-3.5" />,  label: 'no ar' },
  FAILED:      { cls: 'bg-red-500/15 text-red-400',       icon: <XCircle className="h-3.5 w-3.5" />,       label: 'falhou' },
  COMPENSATED: { cls: 'bg-orange-500/15 text-orange-300', icon: <Undo2 className="h-3.5 w-3.5" />,         label: 'revertido (pausado)' },
};

export function LaunchChannelsPanel({
  campaignId,
  isMockMode,
  bypassReadiness,
  refreshToken,
}: {
  campaignId: string | null;
  isMockMode: boolean;
  bypassReadiness: boolean;
  /** Muda quando o lançamento principal termina, para reidratar o painel. */
  refreshToken: number;
}) {
  const [channels, setChannels] = useState<ChannelState[]>([]);
  const [loading, setLoading] = useState(false);
  const [retrying, setRetrying] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!campaignId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/launch`);
      const json = await res.json();
      if (res.ok && Array.isArray(json.channels)) setChannels(json.channels);
    } catch {
      // painel de leitura: falha de rede aqui não deve derrubar o passo
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => { void load(); }, [load, refreshToken]);

  const retry = async (channel: string) => {
    if (!campaignId) return;
    setRetrying(channel);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/launch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idempotencyKey: `retry-${channel}-${Date.now()}-${crypto.randomUUID().slice(0, 6)}`,
          channels: [channel],
          isMockMode,
          bypassReadiness,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Falha ao reexecutar o canal.');
      toast.success(`${channel === 'META_ADS' ? 'Meta Ads' : 'Google Ads'} reexecutado.`);
    } catch (err: any) {
      toast.error(err.message || 'Falha ao reexecutar o canal.');
    } finally {
      setRetrying(null);
      void load();
    }
  };

  if (!campaignId) return null;

  return (
    <Card className="bg-[#0b0f19] border-[#334155]">
      <div className="px-4 py-2 border-b border-[#334155] flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-300">ESTADO POR CANAL</span>
        <Button size="sm" variant="ghost" onClick={() => void load()} disabled={loading}
          className="h-7 text-slate-400 gap-1.5 text-xs">
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          Atualizar
        </Button>
      </div>
      <CardContent className="p-4 grid gap-3 md:grid-cols-2">
        {channels.map(c => {
          const ui = STATUS_UI[c.status] ?? STATUS_UI.PENDING;
          const ids = Object.entries(c.externalIds || {});
          return (
            <div key={c.channel} className="rounded-md border border-[#334155] bg-[#0f172a] p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-white">{c.label}</span>
                <div className="flex items-center gap-1.5">
                  {c.mode && (
                    <Badge className={c.mode === 'LIVE'
                      ? 'bg-red-500/15 text-red-300 text-[10px]'
                      : 'bg-sky-500/15 text-sky-300 text-[10px]'}>
                      {c.mode === 'LIVE' ? 'REAL' : 'SIMULADO'}
                    </Badge>
                  )}
                  <Badge className={`${ui.cls} text-[10px] gap-1`}>{ui.icon}{ui.label}</Badge>
                </div>
              </div>

              {ids.length > 0 && (
                <div className="space-y-0.5">
                  {ids.map(([k, v]) => (
                    <div key={k} className="font-mono text-[10px] text-slate-400 truncate">
                      {k}: <span className="text-slate-300">{v}</span>
                    </div>
                  ))}
                </div>
              )}

              {c.error && (
                <p className="text-[11px] text-red-300 leading-snug break-words">{c.error}</p>
              )}

              {c.alreadyExisted && (
                <p className="text-[11px] text-slate-400">Já existia — nada foi recriado.</p>
              )}

              {(c.status === 'FAILED' || c.status === 'COMPENSATED') && (
                <Button size="sm" variant="outline" disabled={retrying === c.channel}
                  onClick={() => void retry(c.channel)}
                  className="h-7 w-full border-[#334155] text-slate-300 gap-1.5 text-xs">
                  {retrying === c.channel
                    ? <Loader2 className="h-3 w-3 animate-spin" />
                    : <RotateCcw className="h-3 w-3" />}
                  Reexecutar só este canal
                </Button>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
