'use server'

import { requireAuth } from '@/lib/auth'
import { saveActiveWorkout, deleteWorkout, type WorkoutWeek } from '@/lib/data/workouts'
import { getTrainingCycle } from '@/lib/data/training-cycle'
import { evaluateAndSavePRs, evaluateAndSaveAllPRs } from '@/lib/data/stats'
import { getSupabaseServer } from '@/lib/supabase/server'
import { revalidateAll } from '@/lib/cache'
import { DatabaseError } from '@/lib/errors'
import { parseFinishPayload } from '@/lib/workout-session'

// The week type is derived from when the workout started, not when it was
// saved. A failed lookup must not block the save: the workout is the user's
// data, the week label is only context.
async function resolveWorkoutWeek(userId: string, startedAtIso: string): Promise<WorkoutWeek> {
  try {
    const cycle = await getTrainingCycle(userId, startedAtIso)
    return { weekType: cycle.scheme.kind, isDeload: cycle.isDeloadWeek }
  } catch (error) {
    console.error('Failed to resolve training cycle for workout', error)
    return { weekType: null, isDeload: null }
  }
}

export async function finishWorkoutAction(input: unknown) {
  const { userId, session } = await requireAuth()

  const activeWorkout = parseFinishPayload(input)
  if (!activeWorkout) return { success: false, error: 'Invalid workout data' }

  let workoutId: string
  let savedSets: Awaited<ReturnType<typeof saveActiveWorkout>>['savedSets']
  let startedAt: string

  try {
    const week = await resolveWorkoutWeek(userId, activeWorkout.started_at.toISOString())
    const result = await saveActiveWorkout(userId, activeWorkout, week)
    workoutId = result.workout.id
    savedSets = result.savedSets
    startedAt = result.workout.started_at
  } catch (error: unknown) {
    console.error('Failed to save workout:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to save workout' }
  }

  // Workout is durably saved at this point. PR evaluation is best-effort —
  // a failure here must not pretend the whole save failed (we'd lose the user's
  // workout in localStorage on the client). Report partial success instead.
  try {
    const prs = await evaluateAndSavePRs(userId, workoutId, startedAt, savedSets)
    revalidateAll()
    return { success: true, workoutId, prs }
  } catch (error: unknown) {
    console.error('PR evaluation failed for workout', workoutId, error)
    revalidateAll()
    return { success: true, workoutId, prs: [], prError: error instanceof Error ? error.message : 'PR evaluation failed' }
  }
}

const PR_REBUILD_FAILED_MESSAGE = 'Workout deleted, but your personal records could not be updated.'

export async function deleteWorkoutAction(workoutId: string) {
  const { userId } = await requireAuth()

  try {
    await deleteWorkout(workoutId, userId)
  } catch (error: unknown) {
    console.error('Failed to delete workout:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to delete workout' }
  }

  // The workout is gone from here on, so never report failure: the history
  // list would put it back on screen. A PR problem is a warning, like the
  // partial success in finishWorkoutAction.
  try {
    await rebuildPersonalRecords(userId)
    revalidateAll()
    return { success: true }
  } catch (error: unknown) {
    console.error('PR rebuild failed after deleting workout', workoutId, error)
    revalidateAll()
    return { success: true, prError: PR_REBUILD_FAILED_MESSAGE }
  }
}

// The deleted workout may have contained PR-setting sets. Those set rows are
// gone (cascade), but personal_records rows pointing to them are orphaned.
// Wipe the user's PRs and rebuild from the remaining sets so the dashboard
// reflects reality without requiring a manual recalculate.
async function rebuildPersonalRecords(userId: string): Promise<void> {
  const supabase = await getSupabaseServer()
  const { error } = await supabase.from('personal_records').delete().eq('user_id', userId)
  if (error) throw new DatabaseError(`Failed to reset PRs: ${error.message}`, error)
  await evaluateAndSaveAllPRs(userId)
}

// ─── Exercise frequency for "suggest next" ───────────────────────────────────
//
// Returns a map of { exercise_id → set_count } for the calling user over the
// last 90 days. Used by getNextExerciseSuggestions / getDefaultExercisesForFocus
// to bias toward exercises the user actually trains.
//
// The RPC runs as the signed-in user (security invoker) and scopes itself by
// auth.uid(), so it takes no user id and can only ever return the caller's data.
// Returns a plain object so the client can read frequencies in O(1).
//
// Cost: one grouped aggregate per workout-screen mount (cached client-side
// for the session, so effectively one query per workout).
export async function getUserExerciseFrequency(): Promise<Record<string, number>> {
  await requireAuth()
  const supabase = await getSupabaseServer()
  const { data, error } = await supabase.rpc('get_user_exercise_frequency')

  if (error || !data) {
    console.error('Failed to fetch exercise frequency:', error)
    return {}
  }

  const frequency: Record<string, number> = {}
  for (const row of data) {
    frequency[row.exercise_id] = Number(row.set_count)
  }
  return frequency
}

export async function getUserLatestBodyweight(): Promise<number | null> {
  const { session } = await requireAuth()
  const supabase = await getSupabaseServer()
  
  const { data, error } = await supabase
    .from('bodyweight_log')
    .select('weight_kg')
    .eq('user_id', session.user.id)
    .order('logged_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) return null
  return Number(data.weight_kg)
}
