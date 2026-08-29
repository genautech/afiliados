'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Monitor, Tablet, Smartphone, RefreshCw, ExternalLink, MonitorOff } from 'lucide-react';

export type PreviewDevice = 'mobile' | 'tablet' | 'desktop';

const DEVICES: Record<PreviewDevice, { label: string; width: number; height: number; frame: string; icon: typeof Monitor }> = {
  mobile: { label: 'Mobile', width: 390, height: 780, frame: 'rounded-[2rem] p-2', icon: Smartphone },
  tablet: { label: 'Tablet', width: 834, height: 900, frame: 'rounded-[1.25rem] p-2.5', icon: Tablet },
  desktop: { label: 'Desktop', width: 1280, height: 800, frame: 'rounded-lg p-1.5', icon: Monitor },
};

interface PreviewFrameProps {
  /** HTML completo da página (renderizado em srcDoc, sem acesso à origem do app). */
  html?: string | null;
  /** URL já publicada. Usada só quando não há html. */
  url?: string | null;
  title?: string;
  device?: PreviewDevice;
  onDeviceChange?: (device: PreviewDevice) => void;
  /** Altura máxima da área de preview no layout, em px. */
  maxHeight?: number;
  emptyLabel?: string;
  className?: string;
}

export function PreviewFrame({
  html,
  url,
  title = 'Preview da página',
  device,
  onDeviceChange,
  maxHeight = 520,
  emptyLabel = 'Nada para exibir ainda — gere a página para ver o preview.',
  className = '',
}: PreviewFrameProps) {
  const [internalDevice, setInternalDevice] = useState<PreviewDevice>('mobile');
  const [reloadKey, setReloadKey] = useState(0);
  const [scale, setScale] = useState(1);
  const shellRef = useRef<HTMLDivElement | null>(null);

  const active = device ?? internalDevice;
  const spec = DEVICES[active];

  const setDevice = (next: PreviewDevice) => {
    if (onDeviceChange) onDeviceChange(next);
    else setInternalDevice(next);
  };

  const measure = useCallback(() => {
    const el = shellRef.current;
    if (!el) return;
    const available = el.clientWidth;
    if (!available) return;
    const byWidth = available / (spec.width + 24);
    const byHeight = maxHeight / (spec.height + 24);
    setScale(Math.min(1, byWidth, byHeight));
  }, [spec.width, spec.height, maxHeight]);

  useEffect(() => {
    measure();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const observer = new ResizeObserver(measure);
    if (shellRef.current) observer.observe(shellRef.current);
    return () => observer.disconnect();
  }, [measure]);

  const hasContent = Boolean(html?.trim() || url);
  const src = !html?.trim() && url ? url : undefined;

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-lg border border-[#334155] bg-[#0f172a] p-0.5">
          {(Object.keys(DEVICES) as PreviewDevice[]).map((key) => {
            const Icon = DEVICES[key].icon;
            const isActive = key === active;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setDevice(key)}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  isActive ? 'bg-emerald-500/15 text-emerald-300' : 'text-slate-400 hover:text-slate-200'
                }`}
                aria-pressed={isActive}
              >
                <Icon className="h-3.5 w-3.5" />
                {DEVICES[key].label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-[#334155] text-[10px] font-mono text-slate-400">
            {spec.width}×{spec.height} · {Math.round(scale * 100)}%
          </Badge>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setReloadKey((k) => k + 1)}
            disabled={!hasContent}
            className="h-7 gap-1.5 border-[#334155] text-[11px] text-slate-300"
          >
            <RefreshCw className="h-3 w-3" /> Recarregar
          </Button>
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300"
            >
              <ExternalLink className="h-3 w-3" /> Abrir
            </a>
          )}
        </div>
      </div>

      <div
        ref={shellRef}
        className="flex items-start justify-center overflow-hidden rounded-xl border border-[#334155] bg-[#0b1220] p-3"
        style={{ height: maxHeight }}
      >
        {hasContent ? (
          <div
            className={`border border-[#334155] bg-[#020617] shadow-2xl shadow-black/40 ${spec.frame}`}
            style={{
              width: spec.width,
              transform: `scale(${scale})`,
              transformOrigin: 'top center',
            }}
          >
            <iframe
              key={`${active}-${reloadKey}`}
              title={title}
              srcDoc={html?.trim() ? html : undefined}
              src={src}
              sandbox="allow-scripts allow-forms allow-popups"
              className="block w-full rounded-[inherit] bg-white"
              style={{ height: spec.height, border: 0 }}
            />
          </div>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-center">
            <MonitorOff className="h-6 w-6 text-slate-600" />
            <p className="max-w-xs text-xs text-slate-500">{emptyLabel}</p>
          </div>
        )}
      </div>
    </div>
  );
}
