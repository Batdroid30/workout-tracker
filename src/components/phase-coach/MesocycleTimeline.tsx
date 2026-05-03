import { Zap, Check, Minus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Mesocycle, MesocycleCellStatus } from '@/lib/phase-coach'

// ─── Mesocycle timeline ──────────────────────────────────────────────────────
//
// Horizontal strip of week cells representing the user's current training
// block. Compact variant fits inside PhaseCoachCard on the dashboard;
// full variant is used on /progress with per-week session counts visible.

interface MesocycleTimelineProps {
  mesocycle: Mesocycle
  /** Compact = dashboard card. Full = /progress detail. */
  compact?:  boolean
}

const STATUS_STYLES: Record<MesocycleCellStatus, { bg: string; border: string; text: string }> = {
  good:    { bg: 'bg-[var(--teal)]/20',    border: 'border-[var(--teal)]/40',    text: 'text-[var(--teal)]'    },
  low:     { bg: 'bg-orange-400/15',       border: 'border-orange-400/30',       text: 'text-orange-300'        },
  missed:  { bg: 'bg-red-500/10',          border: 'border-red-500/30',          text: 'text-red-400'           },
  current: { bg: 'bg-[var(--accent)]/15',  border: 'border-[var(--accent-line)]', text: 'text-[var(--accent)]' },
  pending: { bg: 'bg-white/[0.02]',        border: 'border-[var(--glass-border)]', text: 'text-[var(--text-faint)]' },
  deload:  { bg: 'bg-purple-400/15',       border: 'border-purple-400/40',       text: 'text-purple-300'        },
}

const STATUS_ICONS: Record<MesocycleCellStatus, React.ReactNode> = {
  good:    <Check className="w-2.5 h-2.5" />,
  low:     <Minus className="w-2.5 h-2.5" />,
  missed:  <X     className="w-2.5 h-2.5" />,
  current: <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />,
  pending: null,
  deload:  <Zap className="w-2.5 h-2.5" />,
}

export function MesocycleTimeline({ mesocycle, compact = false }: MesocycleTimelineProps) {
  return compact
    ? <CompactTimeline mesocycle={mesocycle} />
    : <FullTimeline    mesocycle={mesocycle} />
}

// ── Compact: 16–24px tall row of equal segments ─────────────────────────────

function CompactTimeline({ mesocycle }: { mesocycle: Mesocycle }) {
  return (
    <div className="flex gap-1">
      {mesocycle.cells.map(cell => {
        const styles = STATUS_STYLES[cell.status]
        return (
          <div
            key={cell.weekNumber}
            className={cn(
              'flex-1 h-7 rounded border flex items-center justify-center transition-colors',
              styles.bg, styles.border, styles.text,
              cell.isCurrent && 'ring-1 ring-[var(--accent)]',
            )}
            title={tooltipFor(cell)}
          >
            {STATUS_ICONS[cell.status] ?? (
              <span className="text-[8px] font-medium tabular-nums opacity-60">
                {cell.weekNumber}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Full: stacked cells with week number + session count ────────────────────

function FullTimeline({ mesocycle }: { mesocycle: Mesocycle }) {
  return (
    <div className="flex gap-1.5">
      {mesocycle.cells.map(cell => {
        const styles = STATUS_STYLES[cell.status]
        const showCount = cell.status !== 'pending' && cell.status !== 'deload'
        return (
          <div
            key={cell.weekNumber}
            className={cn(
              'flex-1 rounded-lg border py-2 px-1 flex flex-col items-center gap-0.5',
              styles.bg, styles.border,
              cell.isCurrent && 'ring-1 ring-[var(--accent)]',
            )}
          >
            <span className={cn('text-[8px] font-medium uppercase tracking-widest', styles.text)}>
              W{cell.weekNumber}
            </span>
            <div className="flex items-center justify-center min-h-[16px]">
              {cell.status === 'deload' ? (
                <Zap className="w-3.5 h-3.5 text-purple-300" />
              ) : showCount ? (
                <span className={cn('text-base font-semibold tabular-nums leading-none', styles.text)}>
                  {cell.sessionCount}
                </span>
              ) : (
                <span className="text-[var(--text-faint)] text-xs">·</span>
              )}
            </div>
            <span className={cn('text-[8px] font-medium uppercase tracking-widest opacity-70', styles.text)}>
              {LABEL[cell.status]}
            </span>
          </div>
        )
      })}
    </div>
  )
}

const LABEL: Record<MesocycleCellStatus, string> = {
  good:    'hit',
  low:     'low',
  missed:  'miss',
  current: 'now',
  pending: '—',
  deload:  'deload',
}

function tooltipFor(cell: { weekNumber: number; sessionCount: number; status: MesocycleCellStatus }): string {
  const base = `Week ${cell.weekNumber}`
  switch (cell.status) {
    case 'good':    return `${base} · ${cell.sessionCount} sessions — hit goal`
    case 'low':     return `${base} · ${cell.sessionCount} sessions — under goal`
    case 'missed':  return `${base} · no sessions logged`
    case 'current': return `${base} · in progress (${cell.sessionCount} so far)`
    case 'pending': return `${base} · upcoming`
    case 'deload':  return `${base} · deload — recommended recovery week`
  }
}
