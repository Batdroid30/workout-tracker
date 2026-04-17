'use server'

import { auth } from '@/lib/auth'
import { saveActiveWorkout as saveWorkoutData } from '@/lib/data/workouts'
import { revalidatePath } from 'next/cache'

export async function finishWorkoutAction(activeWorkout: any) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('User not authenticated')
  }

  try {
    const result = await saveWorkoutData(session.user.id, activeWorkout)
    revalidatePath('/dashboard')
    revalidatePath('/progress')
    return { success: true, workoutId: result.id }
  } catch (error: any) {
    console.error('Failed to finish workout:', error)
    return { success: false, error: error.message }
  }
}
