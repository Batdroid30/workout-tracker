'use client'

import { useMemo } from 'react'
import { Sparkles } from 'lucide-react'
import type { Exercise, ActiveExercise } from '@/types/database'
import { useExerciseStore } from '@/store/exercise.store'
import { getNextExerciseSuggestions } from '@/lib/workout-intelligence'

// ─── "Suggest next" chips ─────────────────────────────────────────────────────
//
// Shown above the "Add Exercise" button on blank workouts that already have
// at least one exercise logged. Tap a chip → the exercise is added to the
// active workout in one click, no modal.
//
// Logic is entirely client-side — exercises come from the Zustand cache and
// the frequency map is loaded once at workout-page mount via the Step 8
// Server Action. Zero DB calls happen here.

interface SuggestNextChipProps {
  /** The active workout's exercise list — used to find the last entry and exclude already-added ones. */
  workoutExercises: ActiveExercise[]
  /** exercise_id → set count (last 90 days). Empty for new users — that's fine. */
  usageFrequency: Record<string, number>
  /** Add the chosen exercise to the active workout. */
  onAdd: (exercise: Exercise) => void
}

export function SuggestNextChip({
  workoutExercises,
  usageFrequency,
  onAdd,
}: SuggestNextChipProps) {
  const { exercises } = useExerciseStore()

  const suggestions = useMemo<Exercise[]>(() => {
    if (workoutExercises.length === 0 || exercises.length === 0) return []

    const lastExercise    = workoutExercises[workoutExercises.length - 1].exercise
    const alreadyInWorkout = workoutExercises.map(we => we.exercise.id)
    const frequencyMap     = new Map(Object.entries(usageFrequency))

    return getNextExerciseSuggestions(
      lastExercise,
      exercises,
      alreadyInWorkout,
      frequencyMap,
      3,
    )
  }, [workoutExercises, exercises, usageFrequency])

  if (suggestions.length === 0) return null

  return (
    <div className="mt-4">
      <div className="flex items-center gap-1.5 mb-2 px-1">
        <Sparkles className="w-3 h-3 text-[#CCFF00]/60" />
        <span className="text-[10px] font-black uppercase tracking-widest text-[#4a5568]">
          Suggested next
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {suggestions.map(ex => (
          <button
            key={ex.id}
            onClick={() => onAdd(ex)}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#CCFF00]/5 border border-[#CCFF00]/20 hover:bg-[#CCFF00]/10 hover:border-[#CCFF00]/40 active:scale-95 transition-all"
          >
            <span className="text-[11px] font-black text-[#CCFF00] uppercase tracking-tight">
              {ex.name}
            </span>
            <span className="text-[9px] font-body text-[#4a5568]">
              {ex.muscle_group}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
