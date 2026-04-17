import { getExercises } from '@/lib/data/exercises'
import { ExerciseListClient } from './ExerciseListClient'

export default async function ExercisesPage() {
  const exercises = await getExercises()

  return (
    <div className="flex flex-col h-full bg-black text-white">
      <ExerciseListClient initialExercises={exercises} />
    </div>
  )
}
