import { auth } from '@/lib/auth'
import { getExercises } from '@/lib/data/exercises'
import { ExerciseListClient } from './ExerciseListClient'

export default async function ExercisesPage() {
  const session = await auth()
  const accessToken = session?.supabaseAccessToken as string | undefined
  const exercises = await getExercises(accessToken)

  return (
    <div className="flex flex-col h-full bg-black text-white">
      <ExerciseListClient initialExercises={exercises} />
    </div>
  )
}
