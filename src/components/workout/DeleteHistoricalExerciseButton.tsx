'use client'

import { Trash2, Loader2 } from 'lucide-react'
import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useDialog } from '@/providers/DialogProvider'
import { deleteHistoricalExerciseAction } from '@/app/(app)/workout/[id]/actions'

export function DeleteHistoricalExerciseButton({ workoutExerciseId, workoutId }: { workoutExerciseId: string, workoutId: string }) {
  const [isPending, startTransition] = useTransition()
  const dialog = useDialog()
  const router = useRouter()

  const handleDelete = async () => {
    const confirmed = await dialog.confirm({
      title: 'Delete Exercise',
      description: 'Are you sure you want to remove this exercise from the workout history?',
      danger: true,
      confirmText: 'Delete'
    })

    if (!confirmed) return

    startTransition(async () => {
      try {
        await deleteHistoricalExerciseAction(workoutExerciseId)
        router.refresh()
      } catch (err: unknown) {
        dialog.alert({ title: 'Error', description: err instanceof Error ? err.message : 'An unexpected error occurred.' })
      }
    })
  }

  return (
    <button 
      onClick={handleDelete}
      disabled={isPending}
      className="p-2.5 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
      style={{ color: 'var(--text-faint)' }}
    >
      {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
    </button>
  )
}
