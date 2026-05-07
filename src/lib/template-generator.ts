import type { ActiveExercise, ActiveSet, Exercise, TrainingPhase } from '@/types/database'
import { getCurrentDUPScheme } from '@/lib/workout-intelligence'

// Sets per exercise vary by phase — more volume in surplus, less in deficit
const SETS_BY_PHASE: Record<TrainingPhase, number> = {
  bulking:     4,
  maingaining: 3,
  cutting:     3,
}

/**
 * Converts a flat exercise list into pre-populated ActiveExercises ready
 * for the workout store.
 *
 * Set count is adjusted for the user's current training phase.
 * Rep targets come from today's DUP scheme so the template stays coherent
 * with the periodisation plan already shown in the workout header.
 * Weight starts at 0 — the user fills it in at the bar.
 */
export function buildWorkoutTemplate(
  exercises: Exercise[],
  phase: TrainingPhase | null,
): ActiveExercise[] {
  const dupScheme  = getCurrentDUPScheme()
  const setCount   = SETS_BY_PHASE[phase ?? 'maingaining']
  const targetReps = dupScheme.repRange.min

  return exercises.map((exercise, idx) => {
    const sets: ActiveSet[] = Array.from({ length: setCount }, (_, i) => ({
      id:         crypto.randomUUID(),
      set_number: i + 1,
      weight_kg:  0,
      reps:       targetReps,
      rpe:        null,
      is_warmup:  false,
      completed:  false,
      saved:      false,
    }))

    return {
      workout_exercise_id: null,
      exercise,
      sets,
      order_index: idx,
    }
  })
}
