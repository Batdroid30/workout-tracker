'use client'

import { Copy } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui'
import { useWorkoutStore } from '@/store/workout.store'
import { useStartWorkout } from '@/hooks/useStartWorkout'
import type { ActiveSet, Exercise } from '@/types/database'

type DuplicableSet = Pick<ActiveSet, 'set_number' | 'weight_kg' | 'reps' | 'rpe'> & { is_warmup: boolean | null }

type DuplicableExercise = Pick<Exercise, 'id' | 'name' | 'muscle_group' | 'secondary_muscles' | 'equipment'>

interface DuplicableWorkout {
  title: string | null
  workout_exercises: Array<{ exercise: DuplicableExercise; sets: DuplicableSet[] }>
}

export function DuplicateWorkoutButton({ workout }: { workout: DuplicableWorkout }) {
  const router = useRouter()
  const copyWorkout = useWorkoutStore((state) => state.copyWorkout)

  const { start, sheet } = useStartWorkout()

  const handleDuplicate = () => start(() => {
    copyWorkout(workout)
    router.push('/workout')
  }, workout.title ?? 'this workout again')

  return (
    <>
    {sheet}
    <Button
      variant="secondary"
      size="sm"
      fullWidth={false}
      leadingIcon={<Copy className="w-4 h-4" />}
      onClick={handleDuplicate}
    >
      Perform again
    </Button>
    </>
  )
}
