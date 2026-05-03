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

  let workoutId: string
  let savedSets: Awaited<ReturnType<typeof saveActiveWorkout>>['savedSets']
  let startedAt: string

  try {
    const result = await saveActiveWorkout(userId, activeWorkout)
    workoutId = result.workout.id
    savedSets = result.savedSets
    startedAt = result.workout.started_at
  } catch (error: any) {
    console.error('Failed to save workout:', error)
    return { success: false, error: error.message }
  }

  // Workout is durably saved at this point. PR evaluation is best-effort —
  // a failure here must not pretend the whole save failed (we'd lose the user's
  // workout in localStorage on the client). Report partial success instead.
  try {
    const prs = await evaluateAndSavePRs(userId, workoutId, startedAt, savedSets)
    revalidateAll()
    return { success: true, workoutId, prs }
  } catch (error: any) {
    console.error('PR evaluation failed for workout', workoutId, error)
    revalidateAll()
    return { success: true, workoutId, prs: [], prError: error.message }
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
