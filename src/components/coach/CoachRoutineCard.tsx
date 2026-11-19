import Link from 'next/link'
import { Dumbbell, CheckCircle2, ArrowRight } from 'lucide-react'
import { Chip } from '@/components/ui'
import type { ProposedRoutine } from '@/types/coach'

interface CoachRoutineCardProps {
  routine: ProposedRoutine
  savedRoutineId?: string
}

export function CoachRoutineCard({ routine, savedRoutineId }: CoachRoutineCardProps) {
  return (
    <div className="mt-3 card p-4">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-control bg-surface-raised text-secondary">
            <Dumbbell className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-primary">{routine.title}</h4>
            {routine.notes && (
              <p className="text-xs text-secondary line-clamp-1">{routine.notes}</p>
            )}
          </div>
        </div>

        {savedRoutineId && (
          <Chip tone="positive" icon={<CheckCircle2 className="h-3 w-3" />}>Saved</Chip>
        )}
      </div>

      <div className="mt-3 space-y-2">
        {routine.exercises.map((ex, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between gap-2 rounded-control bg-surface-raised px-3 py-2 text-xs"
          >
            <span className="font-medium text-primary">
              {idx + 1}. {ex.exercise_name}
            </span>
            <div className="flex items-center gap-2 text-secondary">
              <span className="mono text-primary">
                {ex.target_sets} × {ex.target_reps}
              </span>
              {ex.progression_model === 'rep_sum' && (
                <span className="text-xs text-tertiary bg-surface px-1.5 py-0.5 rounded">
                  Rep bank
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 pt-2 flex items-center justify-end">
        <Link
          href="/routines"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-secondary hover:text-primary transition-colors"
        >
          View in Routines <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  )
}
