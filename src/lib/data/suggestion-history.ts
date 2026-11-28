import { z } from 'zod'
import { getCurrentUserId, getSupabaseClient } from '@/lib/supabase/client'
import { DatabaseError } from '@/lib/errors'
import { effectiveLoad, workoutBodyweight } from '@/lib/load'
import type { LoggedSet, PastSession } from '@/lib/suggestions/types'
import type { SuggestionProfile } from '@/lib/suggestions/exercise-plan-input'

const MAX_SESSIONS = 8
const HISTORY_WEEKS = 16
const MAX_ROWS = 200
const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000
// effectiveLoad detects assisted lifts by exercise name; the real name is not needed here.
const ASSISTED_EXERCISE_NAME = 'assisted'

interface HistoryOptions {
  isAssisted: boolean
  isBodyweightOnly: boolean
}

/** PostgREST returns a to-one join as an object or a single-element array depending on inference. */
function oneOrSingleElementArray<T extends z.ZodTypeAny>(schema: T) {
  return z
    .union([schema, z.array(schema).length(1)])
    .transform((value): z.infer<T> => (Array.isArray(value) ? value[0] : value))
}

const WorkoutSchema = z.object({
  id: z.string(),
  started_at: z.string(),
  bodyweight_kg: z.coerce.number().nullable(),
  week_type: z.enum(['strength', 'hypertrophy', 'volume']).nullable(),
  is_deload: z.boolean().nullable(),
})

const WorkoutExerciseSchema = z.object({
  workouts: oneOrSingleElementArray(WorkoutSchema),
})

const HistoryRowSchema = z.object({
  set_number: z.coerce.number(),
  weight_kg: z.coerce.number(),
  reps: z.coerce.number(),
  rpe: z.coerce.number().nullable(),
  rpe_source: z.enum(['entered', 'prompt']).nullable(),
  suggested_weight_kg: z.coerce.number().nullable(),
  suggested_reps: z.coerce.number().nullable(),
  workout_exercises: oneOrSingleElementArray(WorkoutExerciseSchema),
})

type HistoryRow = z.infer<typeof HistoryRowSchema>

const HISTORY_SELECT = `
  set_number, weight_kg, reps, rpe, rpe_source, suggested_weight_kg, suggested_reps,
  workout_exercises!inner(
    exercise_id,
    workouts!inner(id, user_id, started_at, bodyweight_kg, week_type, is_deload, completed_at)
  )
`

function toLoadKg(weightKg: number, row: HistoryRow, { isAssisted, isBodyweightOnly }: HistoryOptions): number {
  if (isAssisted) {
    const bodyweight = workoutBodyweight(row.workout_exercises.workouts.bodyweight_kg)
    return effectiveLoad(weightKg, ASSISTED_EXERCISE_NAME, bodyweight)
  }
  // Weighted-bodyweight sets already store the total load, so only pure bodyweight is zeroed.
  return isBodyweightOnly ? 0 : weightKg
}

function toLoggedSet(row: HistoryRow, options: HistoryOptions): LoggedSet {
  return {
    weightKg: toLoadKg(row.weight_kg, row, options),
    reps: row.reps,
    rpe: row.rpe,
    rpeSource: row.rpe_source,
    // Same space as weightKg, so hit-rate compares like with like.
    suggestedWeightKg: row.suggested_weight_kg === null ? null : toLoadKg(row.suggested_weight_kg, row, options),
    suggestedReps: row.suggested_reps,
  }
}

function parseRows(rows: unknown[]): HistoryRow[] {
  const parsed: HistoryRow[] = []
  let skippedCount = 0
  for (const row of rows) {
    const result = HistoryRowSchema.safeParse(row)
    if (result.success) parsed.push(result.data)
    else skippedCount += 1
  }
  if (skippedCount > 0) {
    console.warn(`suggestion-history: skipped ${skippedCount} unreadable set row(s)`)
  }
  return parsed
}

function groupByWorkout(rows: HistoryRow[]): Map<string, HistoryRow[]> {
  const groups = new Map<string, HistoryRow[]>()
  for (const row of rows) {
    const workoutId = row.workout_exercises.workouts.id
    groups.set(workoutId, [...(groups.get(workoutId) ?? []), row])
  }
  return groups
}

/** Pure mapping from raw query rows to sessions: newest first, sets by set_number, capped. */
export function toPastSessions(rows: unknown[], options: HistoryOptions): PastSession[] {
  const sessions = [...groupByWorkout(parseRows(rows)).values()].map((setRows): PastSession => {
    const workout = setRows[0].workout_exercises.workouts
    const ordered = [...setRows].sort((a, b) => a.set_number - b.set_number)
    return {
      workoutId: workout.id,
      startedAt: workout.started_at,
      weekKind: workout.week_type,
      isDeload: workout.is_deload ?? false,
      bodyweightKg: workoutBodyweight(workout.bodyweight_kg),
      sets: ordered.map(row => toLoggedSet(row, options)),
    }
  })
  sessions.sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))
  return sessions.slice(0, MAX_SESSIONS)
}

export async function fetchSuggestionHistory(
  exerciseId: string,
  options: HistoryOptions,
): Promise<PastSession[]> {
  const userId = await getCurrentUserId()
  if (!userId) return []

  const since = new Date(Date.now() - HISTORY_WEEKS * MS_PER_WEEK).toISOString()
  const { data, error } = await getSupabaseClient()
    .from('sets')
    .select(HISTORY_SELECT)
    .eq('workout_exercises.exercise_id', exerciseId)
    .eq('workout_exercises.workouts.user_id', userId)
    .gte('workout_exercises.workouts.started_at', since)
    .not('workout_exercises.workouts.completed_at', 'is', null)
    .eq('is_warmup', false)
    .gt('reps', 0)
    .order('completed_at', { ascending: false })
    .limit(MAX_ROWS)

  if (error) throw new DatabaseError(`Failed to fetch suggestion history: ${error.message}`, error)
  return toPastSessions(data ?? [], options)
}

const ReadinessRowSchema = z.object({
  sleep_score: z.coerce.number(),
  soreness_score: z.coerce.number(),
  energy_score: z.coerce.number(),
})

/** Mean of today's sleep, soreness and energy scores; null when nothing was logged today. */
export async function fetchTodayReadinessAverage(): Promise<number | null> {
  const userId = await getCurrentUserId()
  if (!userId) return null

  const today = new Date().toISOString().split('T')[0]
  const { data, error } = await getSupabaseClient()
    .from('readiness_logs')
    .select('sleep_score, soreness_score, energy_score')
    .eq('user_id', userId)
    .eq('logged_at', today)
    .maybeSingle()

  if (error) throw new DatabaseError(`Failed to fetch today readiness: ${error.message}`, error)
  if (!data) return null

  const scores = ReadinessRowSchema.parse(data)
  return (scores.sleep_score + scores.soreness_score + scores.energy_score) / 3
}

const WeightStepRowSchema = z.object({ weight_step_kg: z.coerce.number().nullable() })

export async function fetchWeightStep(exerciseId: string): Promise<number | null> {
  const userId = await getCurrentUserId()
  if (!userId) return null

  const { data, error } = await getSupabaseClient()
    .from('user_exercise_preferences')
    .select('weight_step_kg')
    .eq('user_id', userId)
    .eq('exercise_id', exerciseId)
    .maybeSingle()

  if (error) throw new DatabaseError(`Failed to fetch weight step: ${error.message}`, error)
  if (!data) return null
  return WeightStepRowSchema.parse(data).weight_step_kg
}

const ProfileRowSchema = z.object({
  training_goal: z.enum(['strength', 'muscle', 'both']).nullable(),
  experience_level: z.enum(['beginner', 'intermediate', 'advanced']).nullable(),
  training_phase: z.enum(['bulking', 'cutting', 'maingaining']).nullable(),
})

const EMPTY_PROFILE: SuggestionProfile = { training_goal: null, experience_level: null, training_phase: null }

// No profile row exists until the lifter saves the Profile form, so a missing
// row means "no preferences yet" — suggestions still work on defaults.
export async function fetchSuggestionProfile(): Promise<SuggestionProfile> {
  const userId = await getCurrentUserId()
  if (!userId) return EMPTY_PROFILE

  const { data, error } = await getSupabaseClient()
    .from('profiles')
    .select('training_goal, experience_level, training_phase')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw new DatabaseError(`Failed to fetch profile: ${error.message}`, error)
  if (!data) return EMPTY_PROFILE
  return ProfileRowSchema.parse(data)
}
