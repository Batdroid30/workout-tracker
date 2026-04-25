export type MuscleGroup = 
  | 'chest' | 'back' | 'shoulders' 
  | 'biceps' | 'triceps' | 'forearms'
  | 'quads' | 'hamstrings' | 'glutes' | 'calves'
  | 'core' | 'traps' | 'lats'

export type MovementPattern = 'push' | 'pull' | 'hinge' | 'squat' | 'carry' | 'isolation'
export type PRType = 'best_weight' | 'best_volume' | 'best_1rm'
export type ProgramGoal = 'strength' | 'hypertrophy' | 'powerbuilding' | 'endurance'

export interface Profile {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  rest_timer_seconds: number
  updated_at: string
}

export interface Exercise {
  id: string
  name: string
  muscle_group: MuscleGroup
  secondary_muscles: MuscleGroup[] | null
  equipment: string | null
  movement_pattern: MovementPattern
  is_custom: boolean
  created_by: string | null
  created_at: string
}

export interface Workout {
  id: string
  user_id: string
  title: string | null
  notes: string | null
  duration_seconds: number | null
  started_at: string
  completed_at: string | null
  created_at: string
}

export interface WorkoutExercise {
  id: string
  workout_id: string
  exercise_id: string
  order_index: number
  notes: string | null
  exercise?: Exercise           // populated via JOIN
}

export interface Set {
  id: string
  workout_exercise_id: string
  set_number: number
  weight_kg: number
  reps: number
  rpe: number | null
  rest_seconds: number | null
  is_warmup: boolean
  completed_at: string
}

export interface PersonalRecord {
  id: string
  user_id: string
  exercise_id: string
  pr_type: PRType
  reps: number | null
  value: number
  set_id: string | null
  achieved_at: string
}

export interface PRCheckResult {
  pr_type: PRType
  old_value: number | null
  new_value: number
  is_pr: boolean
}

export interface WeeklyVolume {
  muscle_group: MuscleGroup
  week_start: string
  total_volume: number
  avg_rpe: number | null
  total_sets: number
}

// Active workout state (lives in Zustand, not DB)
export interface ActiveSet {
  id: string                    // temp ID before save
  set_number: number
  weight_kg: number
  reps: number
  rpe: number | null
  is_warmup: boolean
  completed: boolean
  saved: boolean                // false until confirmed by server
}

export interface ActiveExercise {
  workout_exercise_id: string | null
  exercise: Exercise
  sets: ActiveSet[]
  order_index: number
}

export interface ActiveWorkout {
  id: string | null             // null until first set is saved
  title: string
  started_at: Date
  exercises: ActiveExercise[]
  routine_id?: string
  has_routine_been_modified?: boolean
}

export interface Routine {
  id: string
  user_id: string
  title: string
  notes: string | null
  created_at: string
}

export interface RoutineExercise {
  id: string
  routine_id: string
  exercise_id: string
  order_index: number
  target_sets: number
  target_reps: number
  exercise?: Exercise           // populated via JOIN
}
