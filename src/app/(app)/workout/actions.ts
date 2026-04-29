'use server'

import { auth } from '@/lib/auth'
import { saveActiveWorkout, deleteWorkout } from '@/lib/data/workouts'
import { evaluateAndSavePRs, evaluateAndSaveAllPRs } from '@/lib/data/stats'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { revalidateAll } from '@/lib/cache'

export async function finishWorkoutAction(activeWorkout: any) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('User not authenticated')

  const userId = session.user.id

  try {
    const { workout, savedSets } = await saveActiveWorkout(userId, activeWorkout)
    const prs = await evaluateAndSavePRs(userId, workout.id, workout.started_at, savedSets)

    revalidateAll()

    return { success: true, workoutId: workout.id, prs }
  } catch (error: any) {
    console.error('Failed to finish workout:', error)
    return { success: false, error: error.message }
  }
}

export async function deleteWorkoutAction(workoutId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('User not authenticated')

  const userId = session.user.id

  try {
    await deleteWorkout(workoutId, userId)

    // The deleted workout may have contained PR-setting sets. Those set rows are
    // now gone (cascade), but personal_records rows pointing to them are orphaned.
    // Wipe the user's PRs and rebuild from the remaining sets so the dashboard
    // reflects reality without requiring a manual recalculate.
    const supabase = getSupabaseAdmin()
    await supabase.from('personal_records').delete().eq('user_id', userId)
    await evaluateAndSaveAllPRs(userId)

    revalidateAll()

    return { success: true }
  } catch (error: any) {
    console.error('Failed to delete workout:', error)
    return { success: false, error: error.message }
  }
}

// ─── Exercise frequency for "suggest next" ───────────────────────────────────
//
// Returns a map of { exercise_id → set_count } for the calling user over the
// last 90 days. Used by getNextExerciseSuggestions / getDefaultExercisesForFocus
// to bias toward exercises the user actually trains.
//
// Why a Server Action (not a client query):
//   • userId is derived from the server session — never trust a client-passed id
//   • The RPC is service_role only, so it can't be called from the browser
//   • Returns a plain object so the client can read frequencies in O(1)
//
// Cost: one grouped aggregate per workout-screen mount (cached client-side
// for the session, so effectively one query per workout).
export async function getUserExerciseFrequency(): Promise<Record<string, number>> {
  const session = await auth()
  if (!session?.user?.id) return {}

  const supabase = getSupabaseAdmin()
  // user_id is server-derived from the session — never trust a client-passed id.
  const { data, error } = await supabase.rpc('get_user_exercise_frequency', {
    p_user_id: session.user.id,
  })

  if (error || !data) {
    console.error('Failed to fetch exercise frequency:', error)
    return {}
  }

  const frequency: Record<string, number> = {}
  for (const row of data as { exercise_id: string; set_count: number }[]) {
    frequency[row.exercise_id] = Number(row.set_count)
  }
  return frequency
}
