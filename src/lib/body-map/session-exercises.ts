import { readSecondaryMuscles } from '@/lib/muscle-sets'
import type { SessionExerciseInput } from './session-intensity'

interface WorkoutExerciseLike {
  exercise: { muscle_group: string | null; secondary_muscles: unknown }
  sets: Array<{ reps: number; is_warmup: boolean | null }> | null
}

export function toSessionExercises(workoutExercises: WorkoutExerciseLike[]): SessionExerciseInput[] {
  return workoutExercises.map(we => ({
    muscleGroup: we.exercise.muscle_group,
    secondaryMuscles: readSecondaryMuscles(we.exercise.secondary_muscles),
    workingSetCount: (we.sets ?? []).filter(set => !set.is_warmup && set.reps > 0).length,
  }))
}
