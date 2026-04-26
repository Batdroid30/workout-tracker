'use server'

import { auth } from '@/lib/auth'
import { saveActiveWorkout, deleteWorkout } from '@/lib/data/workouts'
import { evaluateAndSavePRs } from '@/lib/data/stats'
import { revalidatePath } from 'next/cache'
import { bustAfterWorkout } from '@/lib/cache'

export async function finishWorkoutAction(activeWorkout: any) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('User not authenticated')

  const userId = session.user.id

  try {
    const result = await saveActiveWorkout(userId, activeWorkout)
    const prs    = await evaluateAndSavePRs(userId, result.id)

    bustAfterWorkout(userId)
    revalidatePath('/dashboard')
    revalidatePath('/progress')

    return { success: true, workoutId: result.id, prs }
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

    bustAfterWorkout(userId)
    revalidatePath('/dashboard')
    revalidatePath('/progress')

    return { success: true }
  } catch (error: any) {
    console.error('Failed to delete workout:', error)
    return { success: false, error: error.message }
  }
}
