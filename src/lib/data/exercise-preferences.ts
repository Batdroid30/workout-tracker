import { getSupabaseClient } from '@/lib/supabase/client'

interface ExercisePreference {
  exercise_id: string
  rest_seconds: number
}

/**
 * Fetches all per-exercise rest-timer preferences for the current user.
 * Returns a map of exercise_id → rest_seconds.
 */
export async function getExercisePreferences(): Promise<Record<string, number>> {
  const supabase = getSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return {}

  const { data, error } = await supabase
    .from('user_exercise_preferences')
    .select('exercise_id, rest_seconds')
    .eq('user_id', user.id)

  if (error || !data) return {}

  return Object.fromEntries(data.map((r: ExercisePreference) => [r.exercise_id, r.rest_seconds]))
}

/**
 * Saves (upserts) a rest-timer preference for a specific exercise.
 * Fire-and-forget — callers shouldn't await this for UI updates.
 */
export async function upsertExercisePreference(
  exerciseId: string,
  restSeconds: number,
): Promise<void> {
  const supabase = getSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from('user_exercise_preferences')
    .upsert(
      {
        user_id:      user.id,
        exercise_id:  exerciseId,
        rest_seconds: Math.max(10, Math.min(600, restSeconds)),
        updated_at:   new Date().toISOString(),
      },
      { onConflict: 'user_id,exercise_id' },
    )
}
