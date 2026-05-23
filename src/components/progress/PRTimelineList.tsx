import { Trophy } from 'lucide-react'
import type { PRHistoryEntry } from '@/lib/data/insights'
import type { PRType } from '@/types/database'

interface PRTimelineListProps {
  history: PRHistoryEntry[]
  /** Max entries to show */
  limit?: number
}

const PR_TYPE_LABELS: Record<PRType, string> = {
  best_1rm:    'e1RM',
  best_weight: 'Max Weight',
  best_volume: 'Best Volume',
}

const PR_TYPE_UNIT: Record<PRType, string> = {
  best_1rm:    'kg',
  best_weight: 'kg',
  best_volume: 'kg',
}

function formatValue(prType: PRType, value: number): string {
  if (prType === 'best_1rm' || prType === 'best_weight') return `${value.toFixed(1)} kg`
  // best_volume is total volume — format with k suffix if large
  return value >= 1000 ? `${(value / 1000).toFixed(1)}k kg` : `${Math.round(value)} kg`
}

export function PRTimelineList({ history, limit = 12 }: PRTimelineListProps) {
  const items = history.slice(0, limit)

  if (items.length === 0) {
    return (
      <div className="glass p-4 flex items-center justify-center h-[80px]">
        <p className="t-caption">No PRs logged yet. Keep lifting!</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {items.map((entry, i) => {
        // achieved_at is a full ISO timestamp — parse directly, no suffix needed
        const date    = new Date(entry.achievedAt)
        const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })

        return (
          <div
            key={i}
            className="glass p-3 flex items-center gap-3"
            style={{ borderColor: 'var(--border)' }}
          >
            <div
              className="w-7 h-7 rounded-[var(--radius-inner)] flex items-center justify-center shrink-0"
              style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-line)' }}
            >
              <Trophy className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-1.5">
                <span
                  className="text-[13px] font-semibold truncate"
                  style={{ color: 'var(--text-hi)' }}
                >
                  {entry.exerciseName}
                </span>
                <span
                  className="text-[10px] font-medium uppercase tracking-wide shrink-0"
                  style={{ color: 'var(--text-lo)' }}
                >
                  {PR_TYPE_LABELS[entry.prType]}
                </span>
              </div>
              <div className="t-caption mt-0.5">{dateStr}</div>
            </div>

            <div className="mono text-sm font-semibold shrink-0" style={{ color: 'var(--accent)' }}>
              {formatValue(entry.prType, entry.value)}
            </div>
          </div>
        )
      })}
    </div>
  )
}
