import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ExerciseTallyRowProps {
  name: string
  muscle: string
  tally: { done: number; total: number; complete: boolean }
  onOpen: () => void
  /** The drag handle, when the list is reorderable. */
  handle?: ReactNode
}

// A closed exercise card: one row with a tally, tap to open.
export function ExerciseTallyRow({ name, muscle, tally, onOpen, handle = null }: ExerciseTallyRowProps) {
  return (
    <div className="flex min-h-16 items-center gap-1 rounded-card border border-border bg-surface pr-4">
      {handle ?? <span className="w-4" aria-hidden="true" />}
      <button type="button" onClick={onOpen} aria-label={`Open ${name}`} className="focus-ring flex min-h-16 min-w-0 flex-1 items-center gap-3 rounded-card text-left">
        <span className="min-w-0 flex-1">
          <span className="t-title-3 block truncate">{name}</span>
          <span className="t-caption block capitalize">{muscle}</span>
        </span>
        <span className={cn('mono shrink-0 text-sm', tally.complete ? 'text-positive' : 'text-secondary')}>
          {tally.done}/{tally.total}{tally.complete ? ' ✓' : ''}
        </span>
      </button>
    </div>
  )
}
