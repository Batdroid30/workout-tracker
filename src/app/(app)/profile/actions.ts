'use server'

import { requireAuth, signOutUser } from '@/lib/auth'
import { updateProfile as updateProfileData } from '@/lib/data/profile'
import { getSupabaseServer } from '@/lib/supabase/server'
import { revalidateAll } from '@/lib/cache'
import { getWorkoutHistoryPage } from '@/lib/data/workouts'
import type { HistoryCursor } from '@/lib/data/history-page'
import type { WorkoutItem } from '@/types/workout-history'
import { z } from 'zod'
import type { TrainingGoal, TrainingPhase, TrainingStyle, ExperienceLevel } from '@/types/database'

export async function updateProfileAction(formData: FormData) {
  const { userId, session } = await requireAuth()

  try {
    const heightRaw = formData.get('heightCm') as string | null
    const ageRaw    = formData.get('ageYears')  as string | null
    const sexRaw    = formData.get('sex')       as string | null

    const updates: Parameters<typeof updateProfileData>[1] = {
      first_name: formData.get('firstName') as string,
      last_name:  formData.get('lastName')  as string,
    }
    if (heightRaw) updates.height_cm = parseInt(heightRaw, 10)
    if (ageRaw)    updates.age_years  = parseInt(ageRaw,    10)
    if (sexRaw === 'male' || sexRaw === 'female') updates.sex = sexRaw

    await updateProfileData(userId, updates)
    revalidateAll()
    return { success: true }
  } catch (error: any) {
    console.error('Error updating profile:', error)
    return { success: false, error: error.message }
  }
}

export async function uploadAvatarAction(base64Image: string, fileName: string) {
  const { userId, session } = await requireAuth()
  const supabase = await getSupabaseServer()
  const buffer   = Buffer.from(base64Image.split(',')[1], 'base64')
  const path     = `${userId}/${Date.now()}-${fileName}`

  try {
    const { error } = await supabase.storage
      .from('avatars')
      .upload(path, buffer, { contentType: 'image/png', upsert: true })

    if (error) {
      if (error.message.includes('Bucket not found')) {
        throw new Error('Storage bucket "avatars" not found. Please create it in your Supabase dashboard.')
      }
      throw error
    }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
    await updateProfileData(userId, { avatar_url: publicUrl })

    revalidateAll()

    return { success: true, url: publicUrl }
  } catch (error: any) {
    console.error('Upload error:', error)
    return { success: false, error: error.message }
  }
}

export async function logoutAction() {
  await signOutUser()
}

export async function updateWeeklyGoalAction(sessions: number) {
  const { userId, session } = await requireAuth()
  const clamped  = Math.max(1, Math.min(14, sessions))
  const supabase = await getSupabaseServer()

  await supabase
    .from('profiles')
    .upsert(
      { id: userId, weekly_goal_sessions: clamped, updated_at: new Date().toISOString() },
      { onConflict: 'id' },
    )

  revalidateAll()
}

export async function refreshCacheAction() {
  const { session } = await requireAuth()

  revalidateAll()

  return { success: true }
}

export async function updateTrainingProfileAction(updates: {
  training_goal?:    TrainingGoal
  training_phase?:   TrainingPhase
  training_style?:   TrainingStyle
  experience_level?: ExperienceLevel
}) {
  const { session } = await requireAuth()

  // When phase changes, reset the mesocycle clock so deload timing
  // starts fresh from today rather than carrying over from the previous phase.
  const payload = updates.training_phase
    ? { ...updates, phase_started_at: new Date().toISOString() }
    : updates



  await updateProfileData(session.user.id, payload)
  revalidateAll()
  return { success: true }
}

// Postgres foreign_key_violation: a custom exercise is still referenced by a
// program (program_exercises.exercise_id is ON DELETE RESTRICT).
const FOREIGN_KEY_VIOLATION = '23503'

export async function clearAllWorkoutDataAction(): Promise<{ success: true } | { success: false; error: string }> {
  const { userId } = await requireAuth()
  const supabase = await getSupabaseServer()

  // PRs first, then workouts: deleting a workout cascades to its
  // workout_exercises and sets, so no child rows need to be listed by id.
  // Custom exercises go last, once no workout references them.
  const { error: prError } = await supabase.from('personal_records').delete().eq('user_id', userId)
  if (prError) return failClearData(prError.message)

  const { error: workoutError } = await supabase.from('workouts').delete().eq('user_id', userId)
  if (workoutError) return failClearData(workoutError.message)

  const { error: exerciseError } = await supabase
    .from('exercises')
    .delete()
    .eq('is_custom', true)
    .eq('created_by', userId)

  if (exerciseError) {
    revalidateAll()
    if (exerciseError.code === FOREIGN_KEY_VIOLATION) {
      return failClearData(
        'Your workouts were cleared, but some custom exercises are still used in a program. ' +
        'Remove them from your programs, then try again.',
      )
    }
    return failClearData(exerciseError.message)
  }

  revalidateAll()
  return { success: true }
}

function failClearData(message: string): { success: false; error: string } {
  console.error('Error clearing data:', message)
  return { success: false, error: message }
}

const LoadMoreCursorSchema = z
  .object({ startedAt: z.iso.datetime({ offset: true }), id: z.uuid() })
  .nullable()

export async function loadMoreWorkoutsAction(
  cursor: HistoryCursor | null,
): Promise<{ workouts: WorkoutItem[]; hasMore: boolean } | { error: string }> {
  const { userId } = await requireAuth()

  const parsed = LoadMoreCursorSchema.safeParse(cursor)
  if (!parsed.success) return { error: 'Invalid cursor' }

  try {
    return await getWorkoutHistoryPage(userId, parsed.data)
  } catch (error: unknown) {
    console.error('Error loading more workouts:', error)
    return { error: 'Failed to load more workouts' }
  }
}
