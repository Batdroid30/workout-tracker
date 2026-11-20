import { PR_TYPE_LABELS, formatPRValue } from '@/lib/pr-format'
import { Trophy } from 'lucide-react'
import type { PRHistoryEntry } from '@/lib/data/insights'
import type { PRType } from '@/types/database'

interface PRTimelineListProps {
  history: PRHistoryEntry[]
  /** Max entries to show */
  limit?: number
}

const PR_TYPE_UNIT: Record<PRType, string> = {
  best_1rm:    'kg',
  best_weight: 'kg',
  best_volume: 'kg',
}

export function PRTimelineList({ history, limit = 12 }: PRTimelineListProps) {
  const items = history.slice(0, limit)

  if (items.length === 0) {
    return (
      <div className="card p-4 flex items-center justify-center h-[80px]">
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
          <div key={i} className="card p-3 flex items-center gap-3">
            <div className="w-7 h-7 rounded-control bg-surface-raised border border-border flex items-center justify-center shrink-0">
              <Trophy className="w-3.5 h-3.5 text-secondary" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-1.5">
                <span className="t-caption font-semibold truncate text-primary">
                  {entry.exerciseName}
                </span>
                <span className="text-xs font-medium shrink-0 text-tertiary">
                  {PR_TYPE_LABELS[entry.prType]}
                </span>
              </div>
              <div className="t-caption mt-0.5">{dateStr}</div>
            </div>

            <div className="mono text-sm font-semibold shrink-0 text-primary">
              {formatPRValue(entry.prType, entry.value)}
            </div>
          </div>
        )
      })}
    </div>
  )
}
