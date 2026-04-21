'use client'

import { Copy } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useWorkoutStore } from '@/store/workout.store'

export function DuplicateWorkoutButton({ workout }: { workout: any }) {
  const router = useRouter()
  const copyWorkout = useWorkoutStore((state) => state.copyWorkout)

  const handleDuplicate = () => {
    copyWorkout(workout)
    router.push('/workout')
  }

  return (
    <button
      onClick={handleDuplicate}
      className="bg-brand text-white text-sm font-bold px-4 py-2 rounded-lg hover:bg-brand-hover active:scale-95 transition-all flex items-center gap-2"
    >
      <Copy className="w-4 h-4" />
      Perform Again
    </button>
  )
}
