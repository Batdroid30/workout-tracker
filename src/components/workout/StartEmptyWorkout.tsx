'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { useWorkoutStore } from '@/store/workout.store'
import { WorkoutFocusSheet } from './WorkoutFocusSheet'
import { buildWorkoutTemplate } from '@/lib/template-generator'
import { useTrainingCycle } from '@/hooks/useTrainingCycle'
import { getUserExerciseFrequency } from '@/app/(app)/workout/actions'
import type { Exercise, TrainingPhase } from '@/types/database'

interface StartEmptyWorkoutProps {
  trainingPhase?: TrainingPhase | null
}

export function StartEmptyWorkout({ trainingPhase = null }: StartEmptyWorkoutProps) {
  const router            = useRouter()
  const startWorkout      = useWorkoutStore(s => s.startWorkout)
  const startFromTemplate = useWorkoutStore(s => s.startFromTemplate)
  const { cycle }         = useTrainingCycle()

  const [sheetOpen,      setSheetOpen]      = useState(false)
  const [usageFrequency, setUsageFrequency] = useState<Record<string, number>>({})

  const handleOpenSheet = useCallback(async () => {
    setSheetOpen(true)
    // Fetch lazily — sheet renders immediately with empty frequency,
    // then re-ranks exercises once the data arrives (usually <300ms).
    const freq = await getUserExerciseFrequency()
    setUsageFrequency(freq)
  }, [])

  const handlePick = useCallback((exercises: Exercise[]) => {
    if (exercises.length === 0) {
      startWorkout()
    } else {
      startFromTemplate(buildWorkoutTemplate(exercises, trainingPhase, cycle?.scheme ?? null))
    }
    router.push('/workout')
  }, [trainingPhase, startWorkout, startFromTemplate, router, cycle])

  return (
    <>
      <button
        onClick={handleOpenSheet}
        className="w-full group relative overflow-hidden rounded-card bg-surface border border-border p-5 flex items-center gap-4 text-left active:scale-[0.98] transition-transform"
      >
        {/* Icon */}
        <div className="relative z-10 w-12 h-12 rounded-control flex items-center justify-center shrink-0 bg-surface-raised">
          <Plus className="w-5 h-5 text-primary" />
        </div>

        {/* Text */}
        <div className="relative z-10">
          <p className="text-base font-semibold text-primary leading-tight">
            Start empty session
          </p>
          <p className="text-xs text-secondary mt-0.5">
            Build your workout on the fly
          </p>
        </div>
      </button>

      <WorkoutFocusSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        usageFrequency={usageFrequency}
        onPick={handlePick}
      />
    </>
  )
}
