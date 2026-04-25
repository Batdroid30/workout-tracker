'use client'

import { Trash2, Loader2 } from 'lucide-react'
import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteWorkoutAction } from '@/app/(app)/workout/actions'
import { useDialog } from '@/providers/DialogProvider'
import { useToast } from '@/providers/ToastProvider'

export function DeleteWorkoutButton({ workoutId }: { workoutId: string }) {
  const [isPending, startTransition] = useTransition()
  const dialog = useDialog()
  const toast  = useToast()
  const router = useRouter()

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const confirmed = await dialog.confirm({
      title: 'Delete Workout',
      description: 'Are you sure you want to delete this workout? This action cannot be undone.',
      danger: true,
      confirmText: 'Delete',
    })

    if (!confirmed) return

    startTransition(async () => {
      const result = await deleteWorkoutAction(workoutId)

      if (result?.error) {
        toast.error(result.error || 'Failed to delete workout')
      } else {
        toast.success('Workout deleted')
        router.push('/profile?tab=history')
      }
    })
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="p-2 rounded-lg hover:bg-red-500/10 text-[#4a5568] hover:text-red-400 transition-colors disabled:opacity-50"
      title="Delete Workout"
    >
      {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
    </button>
  )
}
