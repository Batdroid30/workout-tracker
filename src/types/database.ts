export type MuscleGroup = 
  | 'chest' | 'back' | 'shoulders' 
  | 'biceps' | 'triceps' | 'forearms'
  | 'quads' | 'hamstrings' | 'glutes' | 'calves'
  | 'core' | 'traps' | 'lats'

export type MovementPattern = 'push' | 'pull' | 'hinge' | 'squat' | 'carry' | 'isolation'
export type PRType          = 'best_weight' | 'best_volume' | 'best_1rm'

// Training profile — values must match DB check constraints on profiles table
export type TrainingGoal    = 'strength' | 'muscle' | 'both'
export type TrainingPhase   = 'bulking'  | 'cutting' | 'maingaining'
export type TrainingStyle   = 'volume'   | 'intensity'
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced'

// Mirrors the public.profiles table. Email lives on the auth session, not
// here — read it from session.user.email at the call site.
export interface Profile {
  id: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  rest_timer_seconds: number
  weekly_goal_sessions: number
  updated_at: string | null
  // Training profile — all nullable so existing users are unaffected until they set up
  training_goal:    TrainingGoal    | null
  training_phase:   TrainingPhase   | null
  training_style:   TrainingStyle   | null
  experience_level: ExperienceLevel | null
  phase_started_at: string          | null
}

// Mirrors the public.exercises table. Note muscle_group / movement_pattern
// are typed as the broader `string` here to match the DB columns — the
// MuscleGroup / MovementPattern unions stay useful for UI dispatch but the
// DB doesn't enforce them as enums (custom exercises can carry any string).
export interface Exercise {
  id: string
  name: string
  muscle_group: string
  secondary_muscles: string[] | null
  equipment: string | null
  movement_pattern: string
  is_custom: boolean | null
  created_by: string | null
  created_at: string | null
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
  rest_seconds?: number   // per-exercise rest override (null = use global default)
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
