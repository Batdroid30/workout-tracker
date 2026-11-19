import type { PRType } from './database'

export interface WorkoutItem {
  id: string
  title: string | null
  started_at: string
  duration_seconds: number | null
  bodyweight_kg?: number | null
  prTypes: PRType[]
  workout_exercises: Array<{
    exercise: { name: string; muscle_group: string | null; secondary_muscles: string[] | null }
    sets: Array<{ weight_kg: number; reps: number; is_warmup: boolean | null }>
  }>
}
