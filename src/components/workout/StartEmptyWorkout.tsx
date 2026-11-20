'use client'

import { Plus } from 'lucide-react'
import { FocusWorkoutLauncher } from './FocusWorkoutLauncher'
import type { TrainingPhase } from '@/types/database'

interface StartEmptyWorkoutProps {
  trainingPhase?: TrainingPhase | null
}

export function StartEmptyWorkout({ trainingPhase = null }: StartEmptyWorkoutProps) {
  return (
    <FocusWorkoutLauncher trainingPhase={trainingPhase}>
      {open => (
        <button
          onClick={open}
          className="w-full group relative overflow-hidden rounded-card bg-surface border border-border p-5 flex items-center gap-4 text-left active:scale-[0.98] transition-transform"
        >
          <div className="relative z-10 w-12 h-12 rounded-control flex items-center justify-center shrink-0 bg-surface-raised">
            <Plus className="w-5 h-5 text-primary" />
          </div>
          <div className="relative z-10">
            <p className="text-base font-semibold text-primary leading-tight">
              Start empty session
            </p>
            <p className="text-xs text-secondary mt-0.5">
              Build your workout on the fly
            </p>
          </div>
        </button>
      )}
    </FocusWorkoutLauncher>
  )
}
