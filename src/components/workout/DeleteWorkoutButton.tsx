'use client'

import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteWorkoutAction } from '@/app/(app)/workout/actions'

export function DeleteWorkoutButton({ workoutId }: { workoutId: string }) {
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!confirm('Are you sure you want to delete this workout? This action cannot be undone.')) {
      return
    }

    setIsDeleting(true)
    const result = await deleteWorkoutAction(workoutId)
    
    if (result.success) {
      router.push('/dashboard')
    } else {
      alert(result.error || 'Failed to delete workout')
      setIsDeleting(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="p-2 rounded-full hover:bg-red-500/10 text-zinc-400 hover:text-red-500 transition-colors disabled:opacity-50"
      title="Delete Workout"
    >
      <Trash2 className="w-5 h-5" />
    </button>
  )
}
