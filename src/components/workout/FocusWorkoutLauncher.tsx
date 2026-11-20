'use client'

import { useCallback, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useWorkoutStore } from '@/store/workout.store'
import { WorkoutFocusSheet } from './WorkoutFocusSheet'
import { buildWorkoutTemplate } from '@/lib/template-generator'
import { useTrainingCycle } from '@/hooks/useTrainingCycle'
import { getUserExerciseFrequency } from '@/app/(app)/workout/actions'
import { useStartWorkout } from '@/hooks/useStartWorkout'
import type { Exercise, TrainingPhase } from '@/types/database'

interface FocusWorkoutLauncherProps {
  trainingPhase: TrainingPhase | null
  /** Renders the control that opens the focus picker. */
  children: (open: () => void) => ReactNode
}

// "What are you hitting?" → a starter workout for that focus. Shared by the
// empty-session tile on Train and a focus suggestion on Home.
export function FocusWorkoutLauncher({ trainingPhase, children }: FocusWorkoutLauncherProps) {
  const router = useRouter()
  const startWorkout = useWorkoutStore(state => state.startWorkout)
  const startFromTemplate = useWorkoutStore(state => state.startFromTemplate)
  const { cycle } = useTrainingCycle()
  const [isOpen, setIsOpen] = useState(false)
  const [usageFrequency, setUsageFrequency] = useState<Record<string, number>>({})

  const { start, sheet } = useStartWorkout()

  const openPicker = useCallback(async () => {
    setIsOpen(true)
    // The sheet renders at once; exercises re-rank when frequency arrives.
    setUsageFrequency(await getUserExerciseFrequency())
  }, [])

  const open = () => start(() => { void openPicker() }, 'a new workout')

  const pick = useCallback((exercises: Exercise[]) => {
    if (exercises.length === 0) startWorkout()
    else startFromTemplate(buildWorkoutTemplate(exercises, trainingPhase, cycle?.scheme ?? null))
    router.push('/workout')
  }, [trainingPhase, startWorkout, startFromTemplate, router, cycle])

  return (
    <>
      {children(open)}
      {sheet}
      <WorkoutFocusSheet isOpen={isOpen} onClose={() => setIsOpen(false)} usageFrequency={usageFrequency} onPick={pick} />
    </>
  )
}
