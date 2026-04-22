'use client'

import { Trash2 } from 'lucide-react'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteWorkoutAction } from '@/app/(app)/workout/actions'
import { useDialog } from '@/providers/DialogProvider'

export function DeleteWorkoutButton({ workoutId }: { workoutId: string }) {
  const [isPending, startTransition] = useTransition()
  const dialog = useDialog()
  const router = useRouter()

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const confirmed = await dialog.confirm({
      title: 'Delete Workout',
      description: 'Are you sure you want to delete this workout? This action cannot be undone.',
      danger: true,
      confirmText: 'Delete'
    })

    if (!confirmed) return

    startTransition(async () => {
      const result = await deleteWorkoutAction(workoutId)
      
      if (result?.error) {
        dialog.alert({
          title: 'Error',
          description: result.error || 'Failed to delete workout'
        })
      }
    })
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="p-2 rounded-full hover:bg-red-500/10 text-zinc-400 hover:text-red-500 transition-colors disabled:opacity-50"
      title="Delete Workout"
    >
      <Trash2 className="w-5 h-5" />
    </button>
  )
}
