'use server'

import { auth, signOut } from '@/lib/auth'
import { updateProfile as updateProfileData } from '@/lib/data/profile'
import { evaluateAndSaveAllPRs } from '@/lib/data/stats'
import { getSupabaseServer, getSupabaseAdmin } from '@/lib/supabase/server'
import { revalidateAll } from '@/lib/cache'
import type { TrainingGoal, TrainingPhase, TrainingStyle, ExperienceLevel } from '@/types/database'

export async function updateProfileAction(formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Not authenticated')

  const userId = session.user.id
  const accessToken = session.supabaseAccessToken as string | undefined

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

    await updateProfileData(userId, updates, accessToken)
    revalidateAll()
    return { success: true }
  } catch (error: any) {
    console.error('Error updating profile:', error)
    return { success: false, error: error.message }
  }
}

export async function uploadAvatarAction(base64Image: string, fileName: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Not authenticated')

  const userId   = session.user.id
  const accessToken = session.supabaseAccessToken as string | undefined
  const supabase = accessToken ? await getSupabaseServer(accessToken) : getSupabaseAdmin()
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
    await updateProfileData(userId, { avatar_url: publicUrl }, accessToken)

    revalidateAll()

    return { success: true, url: publicUrl }
  } catch (error: any) {
    console.error('Upload error:', error)
    return { success: false, error: error.message }
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: '/login' })
}

export async function updateWeeklyGoalAction(sessions: number) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Not authenticated')

  const userId   = session.user.id
  const clamped  = Math.max(1, Math.min(14, sessions))
  const accessToken = session.supabaseAccessToken as string | undefined
  const supabase = accessToken ? await getSupabaseServer(accessToken) : getSupabaseAdmin()

  await supabase
    .from('profiles')
    .upsert(
      { id: userId, weekly_goal_sessions: clamped, updated_at: new Date().toISOString() },
      { onConflict: 'id' },
    )

  revalidateAll()
}

export async function refreshCacheAction() {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Not authenticated')

  revalidateAll()

  return { success: true }
}

export async function recalculatePRsAction() {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Not authenticated')

  const userId = session.user.id
  const accessToken = session.supabaseAccessToken as string | undefined

  try {
    await evaluateAndSaveAllPRs(userId, accessToken)
    revalidateAll()
    return { success: true }
  } catch (error: any) {
    console.error('Error recalculating PRs:', error)
    return { success: false, error: error.message }
  }
}

export async function updateTrainingProfileAction(updates: {
  training_goal?:    TrainingGoal
  training_phase?:   TrainingPhase
  training_style?:   TrainingStyle
  experience_level?: ExperienceLevel
}) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Not authenticated')

  // When phase changes, reset the mesocycle clock so deload timing
  // starts fresh from today rather than carrying over from the previous phase.
  const payload = updates.training_phase
    ? { ...updates, phase_started_at: new Date().toISOString() }
    : updates

  const accessToken = session.supabaseAccessToken as string | undefined

  await updateProfileData(session.user.id, payload, accessToken)
  revalidateAll()
  return { success: true }
}

export async function clearAllWorkoutDataAction() {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Not authenticated')

  const userId   = session.user.id
  // Admin client: reads here traverse workout_exercises→sets which fail RLS on server client
  const supabase = getSupabaseAdmin()

  try {
    await supabase.from('personal_records').delete().eq('user_id', userId)

    const { data: workouts } = await supabase.from('workouts').select('id').eq('user_id', userId)
    const workoutIds = workouts?.map(w => w.id) || []

    if (workoutIds.length > 0) {
      const { data: wes } = await supabase.from('workout_exercises').select('id').in('workout_id', workoutIds)
      const weIds = wes?.map(we => we.id) || []
      if (weIds.length > 0) {
        await supabase.from('sets').delete().in('workout_exercise_id', weIds)
        await supabase.from('workout_exercises').delete().in('id', weIds)
      }
      await supabase.from('workouts').delete().in('id', workoutIds)
    }

    await supabase.from('exercises').delete().eq('is_custom', true).eq('created_by', userId)

    revalidateAll()

    return { success: true }
  } catch (error: any) {
    console.error('Error clearing data:', error)
    return { success: false, error: error.message }
  }
}
