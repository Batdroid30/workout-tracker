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
