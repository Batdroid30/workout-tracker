'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { useWorkoutStore } from '@/store/workout.store'
import { WorkoutFocusSheet } from './WorkoutFocusSheet'
import { buildWorkoutTemplate } from '@/lib/template-generator'
import { getUserExerciseFrequency } from '@/app/(app)/workout/actions'
import type { Exercise, TrainingPhase } from '@/types/database'

interface StartEmptyWorkoutProps {
  trainingPhase?: TrainingPhase | null
}

export function StartEmptyWorkout({ trainingPhase = null }: StartEmptyWorkoutProps) {
  const router            = useRouter()
  const startWorkout      = useWorkoutStore(s => s.startWorkout)
  const startFromTemplate = useWorkoutStore(s => s.startFromTemplate)

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
      startFromTemplate(buildWorkoutTemplate(exercises, trainingPhase))
    }
    router.push('/workout')
  }, [trainingPhase, startWorkout, startFromTemplate, router])

  return (
    <>
      <button
        onClick={handleOpenSheet}
        className="w-full group relative overflow-hidden rounded-[var(--radius-card)] p-5 flex items-center gap-4 text-left active:scale-[0.98] transition-transform"
        style={{
          background: 'linear-gradient(135deg, rgba(247,37,133,0.14) 0%, rgba(247,37,133,0.05) 100%)',
          border: '1px solid var(--accent-line)',
          boxShadow: '0 0 40px rgba(247,37,133,0.10)',
        }}
      >
        {/* Ambient glow */}
        <div
          className="absolute right-0 top-0 w-48 h-48 -translate-y-1/4 translate-x-1/4 rounded-full opacity-15 blur-3xl pointer-events-none"
          style={{ background: 'var(--accent)' }}
        />

        {/* Icon */}
        <div
          className="relative z-10 w-12 h-12 rounded-[var(--radius-inner)] flex items-center justify-center shrink-0"
          style={{ background: 'var(--accent)' }}
        >
          <Plus className="w-5 h-5" style={{ color: 'var(--accent-on)' }} />
        </div>

        {/* Text */}
        <div className="relative z-10">
          <p className="text-[15px] font-semibold text-[var(--text-hi)] leading-tight">
            Start empty session
          </p>
          <p className="text-[12px] text-[var(--text-mid)] mt-0.5">
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
