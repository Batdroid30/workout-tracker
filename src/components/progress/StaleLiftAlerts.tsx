import Link from 'next/link'
import { AlertTriangle, Sparkles } from 'lucide-react'
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
        const promptText = `My ${entry.name} has stalled around ${entry.recentBest.toFixed(1)}kg (${pct >= 0 ? '+' : ''}${pct.toFixed(1)}% change over 3 weeks). What specific changes to volume, intensity, or exercise variations should I make to break through?`

        return (
          <div
            key={entry.name}
            className={`card p-3 flex flex-col gap-2.5 ${isDown ? 'border-negative/40' : ''}`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-7 h-7 rounded-control border flex items-center justify-center shrink-0 mt-0.5 ${
                  isDown ? 'bg-negative-soft border-negative/40' : 'bg-surface-raised border-border'
                }`}
              >
                <AlertTriangle className={`w-3.5 h-3.5 ${isDown ? 'text-negative' : 'text-secondary'}`} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="t-caption font-semibold truncate text-primary">
                    {entry.name}
                  </span>
                  <span className={`mono text-xs font-medium shrink-0 ${isDown ? 'text-negative' : 'text-tertiary'}`}>
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

            {/* Coach Deep-Link Button */}
            <div className="pt-2 border-t border-border flex items-center justify-between">
              <span className="text-xs text-tertiary">
                Plateau solution available
              </span>
              <Link
                href={`/coach?prompt=${encodeURIComponent(promptText)}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-primary bg-surface-raised border border-border-strong active:scale-95 transition-all"
              >
                <Sparkles className="w-3 h-3" />
                <span>Ask Coach</span>
              </Link>
            </div>
          </div>
        )
      })}
    </div>
  )
}
