import { requireAuth } from '@/lib/auth'
import { getExercises } from '@/lib/data/exercises'
import { BackButton } from '@/components/ui/BackButton'
import { ExerciseListClient } from './ExerciseListClient'

export default async function ExercisesPage() {
  await requireAuth()
  const exercises = await getExercises()

  return (
    <div className="flex flex-col h-full bg-bg text-primary">
      <div className="px-2 pt-3">
        <BackButton fallbackHref="/progress" />
      </div>
      <ExerciseListClient initialExercises={exercises} />
    </div>
  )
}
