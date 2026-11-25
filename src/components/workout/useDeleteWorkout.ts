'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteWorkoutAction } from '@/app/(app)/workout/actions'
import { useDialog } from '@/providers/DialogProvider'
import { useToast } from '@/providers/ToastProvider'

// Confirms, deletes, and returns to history. A PR rebuild problem is a warning,
// not a failure: the workout is gone either way.
export function useDeleteWorkout(workoutId: string): { deleteWorkout: () => Promise<void>; isDeleting: boolean } {
  const [isDeleting, startTransition] = useTransition()
  const dialog = useDialog()
  const toast = useToast()
  const router = useRouter()

  const deleteWorkout = async () => {
    const confirmed = await dialog.confirm({
      title: 'Delete workout?',
      description: 'Every set in it will be lost. This can’t be undone.',
      danger: true,
      confirmText: 'Delete',
    })
    if (!confirmed) return

    startTransition(async () => {
      const result = await deleteWorkoutAction(workoutId)
      if (!result.success) {
        toast.error(result.error || 'Couldn’t delete the workout.')
        return
      }
      if (result.prError) toast.error(result.prError)
      else toast.success('Workout deleted')
      router.push('/history')
    })
  }

  return { deleteWorkout, isDeleting }
}
