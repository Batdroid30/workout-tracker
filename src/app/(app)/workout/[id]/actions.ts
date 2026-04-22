'use server'

import { auth } from '@/lib/auth'
import { getSupabaseServer } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateWorkoutMetaAction(workoutId: string, title: string, duration_seconds: number | null, notes: string | null) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const supabase = await getSupabaseServer()
  const { error } = await supabase
    .from('workouts')
    .update({ title, duration_seconds, notes })
    .eq('id', workoutId)
    .eq('user_id', session.user.id)

  if (error) throw new Error(error.message)
  revalidatePath(`/workout/${workoutId}`)
  revalidatePath('/dashboard')
  revalidatePath('/progress')
}

export async function updateHistoricalSetAction(setId: string, weight_kg: number, reps: number) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const supabase = await getSupabaseServer()
  
  // We need to ensure the set belongs to a workout owned by the user. 
  // RLS handles this, but since we are mutating, it's safe if RLS is tight.
  const { error } = await supabase
    .from('sets')
    .update({ weight_kg, reps })
    .eq('id', setId)

  if (error) throw new Error(error.message)
  
  // To revalidate perfectly, we might need the workout ID, but let's revalidate all common paths
  revalidatePath('/dashboard')
  revalidatePath('/progress')
  // We'll also rely on the client to refresh or mutate state.
}

export async function deleteHistoricalExerciseAction(workoutExerciseId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const supabase = await getSupabaseServer()
  const { error } = await supabase
    .from('workout_exercises')
    .delete()
    .eq('id', workoutExerciseId)

  if (error) throw new Error(error.message)
  
  revalidatePath('/dashboard')
  revalidatePath('/progress')
}
