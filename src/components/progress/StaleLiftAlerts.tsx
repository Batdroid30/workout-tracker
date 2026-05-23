import { AlertTriangle } from 'lucide-react'
import type { StalenessEntry } from '@/lib/data/progress-snapshot'

interface StaleLiftAlertsProps {
  staleness: StalenessEntry[]
}

function pctChange(recent: number, previous: number): number {
  if (previous === 0) return 0
  return ((recent - previous) / previous) * 100
}

export function StaleLiftAlerts({ staleness }: StaleLiftAlertsProps) {
  if (staleness.length === 0) return null

  return (
    <div className="space-y-2">
      {staleness.map(entry => {
        const pct    = pctChange(entry.recentBest, entry.previousBest)
        const isDown = pct < -1

        return (
          <div
            key={entry.name}
            className="glass p-3 flex items-start gap-3"
            style={{ borderColor: isDown ? 'var(--error-line, #f8717140)' : 'var(--border)' }}
          >
            <div
              className="w-7 h-7 rounded-[var(--radius-inner)] flex items-center justify-center shrink-0 mt-0.5"
              style={{
                background: isDown ? 'rgba(248,113,113,0.1)' : 'var(--accent-soft)',
                border:     '1px solid ' + (isDown ? 'rgba(248,113,113,0.25)' : 'var(--accent-line)'),
              }}
            >
              <AlertTriangle
                className="w-3.5 h-3.5"
                style={{ color: isDown ? '#f87171' : 'var(--accent)' }}
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <span
                  className="text-[13px] font-semibold truncate"
                  style={{ color: 'var(--text-hi)' }}
                >
                  {entry.name}
                </span>
                <span
                  className="mono text-[11px] font-medium shrink-0"
                  style={{ color: isDown ? '#f87171' : 'var(--text-lo)' }}
                >
                  {pct >= 0 ? '+' : ''}{pct.toFixed(1)}%
                </span>
              </div>
              <p className="t-caption mt-0.5">
                {isDown
                  ? `e1RM dropped from ${entry.previousBest.toFixed(1)} → ${entry.recentBest.toFixed(1)} kg over 3 weeks. Consider a deload or rep-range change.`
                  : `No e1RM gain in 3 weeks (${entry.recentBest.toFixed(1)} kg). Try adjusting sets, reps, or adding a variation.`
                }
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
