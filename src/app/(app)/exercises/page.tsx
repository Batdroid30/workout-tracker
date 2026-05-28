import { requireAuth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getExercises } from '@/lib/data/exercises'
import { ExerciseListClient } from './ExerciseListClient'

export default async function ExercisesPage() {
  const { accessToken, session } = await requireAuth()
  const exercises = await getExercises(accessToken)

  return (
    <div className="flex flex-col h-full bg-black text-white">
      <ExerciseListClient initialExercises={exercises} />
    </div>
  )
}
