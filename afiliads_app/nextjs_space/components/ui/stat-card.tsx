import * as React from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from './card'

type Tone = 'default' | 'positive' | 'negative' | 'warning' | 'info' | 'muted'

const toneValue: Record<Tone, string> = {
  default: 'text-white',
  positive: 'text-green-400',
  negative: 'text-red-400',
  warning: 'text-yellow-400',
  info: 'text-blue-400',
  muted: 'text-slate-300',
}

const toneIcon: Record<Tone, string> = {
  default: 'bg-slate-500/20 text-slate-300',
  positive: 'bg-green-500/20 text-green-400',
  negative: 'bg-red-500/20 text-red-400',
  warning: 'bg-yellow-500/20 text-yellow-400',
  info: 'bg-blue-500/20 text-blue-400',
  muted: 'bg-slate-500/15 text-slate-400',
}

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string
  value: React.ReactNode
  hint?: React.ReactNode
  icon?: React.ReactNode
  tone?: Tone
  /** denser layout for compact rows; default is monitoring-friendly */
  size?: 'md' | 'lg'
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'default',
  size = 'lg',
  className,
  ...props
}: StatCardProps) {
  return (
    <Card
      className={cn(
        'bg-[#1e293b] border-[#334155] h-full min-w-0',
        className
      )}
      {...props}
    >
      <CardContent
        className={cn(
          size === 'lg' ? 'p-5 sm:p-6' : 'p-4',
          'flex h-full flex-col justify-between gap-3'
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-medium text-slate-400 leading-snug">
            {label}
          </p>
          {icon ? (
            <div
              className={cn(
                'shrink-0 rounded-lg flex items-center justify-center',
                size === 'lg' ? 'h-11 w-11' : 'h-9 w-9',
                toneIcon[tone]
              )}
            >
              {icon}
            </div>
          ) : null}
        </div>
        <div className="min-w-0 space-y-1">
          <p
            className={cn(
              'font-bold font-mono tracking-tight tabular-nums break-words',
              size === 'lg' ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl',
              toneValue[tone]
            )}
          >
            {value}
          </p>
          {hint ? (
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              {hint}
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

export function StatGrid({
  children,
  className,
  cols = 4,
}: {
  children: React.ReactNode
  className?: string
  cols?: 2 | 3 | 4 | 5 | 6
}) {
  let colClass: string
  switch (cols) {
    case 2:
      colClass = 'sm:grid-cols-2'
      break
    case 3:
      colClass = 'sm:grid-cols-2 xl:grid-cols-3'
      break
    case 4:
      colClass = 'sm:grid-cols-2 xl:grid-cols-4'
      break
    case 5:
      colClass = 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5'
      break
    case 6:
      colClass = 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6'
      break
    default: {
      const _exhaustive: never = cols
      throw new Error(`Unhandled StatGrid cols: ${String(_exhaustive)}`)
    }
  }

  return (
    <div className={cn('grid grid-cols-1 gap-4 sm:gap-5', colClass, className)}>
      {children}
    </div>
  )
}
