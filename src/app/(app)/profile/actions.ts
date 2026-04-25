'use server'

import { auth, signOut } from '@/lib/auth'
import { updateProfile as updateProfileData } from '@/lib/data/profile'
import { revalidatePath } from 'next/cache'
import { getSupabaseServer } from '@/lib/supabase/server'

export async function updateProfileAction(formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Not authenticated')

  const firstName = formData.get('firstName') as string
  const lastName = formData.get('lastName') as string
  
  try {
    await updateProfileData(session.user.id, {
      first_name: firstName,
      last_name: lastName,
    })
    revalidatePath('/profile')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (error: any) {
    console.error('Error updating profile:', error)
    return { success: false, error: error.message }
  }
}

export async function uploadAvatarAction(base64Image: string, fileName: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Not authenticated')

  const supabase = await getSupabaseServer()
  
  // Convert base64 to buffer
  const buffer = Buffer.from(base64Image.split(',')[1], 'base64')
  
  const path = `${session.user.id}/${Date.now()}-${fileName}`
  
  try {
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(path, buffer, {
        contentType: 'image/png',
        upsert: true
      })

    if (error) {
      if (error.message.includes('Bucket not found')) {
        throw new Error('Storage bucket "avatars" not found. Please create it in your Supabase dashboard.')
      }
      throw error
    }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(path)

    await updateProfileData(session.user.id, {
      avatar_url: publicUrl
    })

    revalidatePath('/profile')
    revalidatePath('/dashboard')
    
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

  const clamped = Math.max(1, Math.min(14, sessions))
  const supabase = await getSupabaseServer()

  await supabase
    .from('profiles')
    .upsert(
      { id: session.user.id, weekly_goal_sessions: clamped, updated_at: new Date().toISOString() },
      { onConflict: 'id' }
    )

  revalidatePath('/dashboard')
  revalidatePath('/profile')
}

export async function clearAllWorkoutDataAction() {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Not authenticated')
  const userId = session.user.id

  const supabase = await getSupabaseServer()

  try {
    // 1. Delete Personal Records
    await supabase.from('personal_records').delete().eq('user_id', userId)

    // 2. Delete Sets (nested join delete is tricky, so we do it in order)
    // First find all workout IDs
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

    // 3. Delete Custom Exercises
    await supabase.from('exercises').delete().eq('is_custom', true).eq('created_by', userId)

    revalidatePath('/profile')
    revalidatePath('/dashboard')
    revalidatePath('/progress')
    
    return { success: true }
  } catch (error: any) {
    console.error('Error clearing data:', error)
    return { success: false, error: error.message }
  }
}
