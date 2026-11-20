import { requireAuth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getExercises } from '@/lib/data/exercises'
import { ExerciseListClient } from './ExerciseListClient'

export default async function ExercisesPage() {
  const {  session } = await requireAuth()
  const exercises = await getExercises()

  return (
    <div className="flex flex-col h-full bg-bg text-primary">
      <ExerciseListClient initialExercises={exercises} />
    </div>
  )
}
