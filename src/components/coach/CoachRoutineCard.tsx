import Link from 'next/link'
import { Dumbbell, CheckCircle2, ArrowRight } from 'lucide-react'
import type { ProposedRoutine } from '@/types/coach'

interface CoachRoutineCardProps {
  routine: ProposedRoutine
  savedRoutineId?: string
}

export function CoachRoutineCard({ routine, savedRoutineId }: CoachRoutineCardProps) {
  return (
    <div className="mt-3 rounded-xl border border-teal-500/30 bg-teal-950/20 p-4 backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-teal-500/20 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/20 text-teal-400">
            <Dumbbell className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-zinc-100">{routine.title}</h4>
            {routine.notes && (
              <p className="text-xs text-zinc-400 line-clamp-1">{routine.notes}</p>
            )}
          </div>
        </div>

        {savedRoutineId && (
          <span className="flex items-center gap-1 rounded-full bg-teal-500/10 px-2 py-0.5 text-[11px] font-medium text-teal-400 border border-teal-500/20">
            <CheckCircle2 className="h-3 w-3" /> Saved
          </span>
        )}
      </div>

      <div className="mt-3 space-y-2">
        {routine.exercises.map((ex, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between rounded-lg bg-zinc-900/60 px-3 py-2 text-xs"
          >
            <span className="font-medium text-zinc-200">
              {idx + 1}. {ex.exercise_name}
            </span>
            <div className="flex items-center gap-2 text-zinc-400">
              <span className="font-mono text-teal-400">
                {ex.target_sets} × {ex.target_reps}
              </span>
              {ex.progression_model === 'rep_sum' && (
                <span className="text-[10px] text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">
                  Rep Bank
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 pt-2 flex items-center justify-end">
        <Link
          href="/routines"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-400 hover:text-teal-300 transition-colors"
        >
          View in Routines <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  )
}
