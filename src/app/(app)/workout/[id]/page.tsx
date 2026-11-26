import { ChevronLeft, Trophy } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAuth } from '@/lib/auth'
import { getWorkoutById } from '@/lib/data/workouts'
import { getWorkoutSetPRs } from '@/lib/data/stats'
import { Card } from '@/components/ui'
import { DuplicateWorkoutButton } from '@/components/workout/DuplicateWorkoutButton'
import { WorkoutActionsMenu } from '@/components/workout/WorkoutActionsMenu'
import { EditWorkoutMetaModal } from '@/components/workout/EditWorkoutMetaModal'
import { EditSetModal } from '@/components/workout/EditSetModal'
import { DeleteHistoricalExerciseButton } from '@/components/workout/DeleteHistoricalExerciseButton'
import { WorkoutCoachInsightCard } from '@/components/workout/WorkoutCoachInsightCard'
import { WorkoutBodyMapCard } from '@/components/workout/WorkoutBodyMapCard'
import { toSessionExercises } from '@/lib/body-map'
import { workoutSummary } from '@/lib/workout-summary'
import { setVolume, workoutBodyweight, isWeightedBodyweight, formatWeightedSet } from '@/lib/load'

function startedLabel(startedAt: string): string {
  return new Date(startedAt).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default async function WorkoutHistoryDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { session } = await requireAuth()
  const [workout, prMap] = await Promise.all([
    getWorkoutById(id, session.user.id),
    getWorkoutSetPRs(id, session.user.id),
  ])

  if (!workout) notFound()

  const allSets = workout.workout_exercises.flatMap((we: any) => we.sets ?? [])

  const bodyweightKg = workoutBodyweight(workout.bodyweight_kg)
  const workoutVolume = workout.workout_exercises.reduce((acc: number, we: any) => {
    const exerciseVolume = we.sets?.reduce((sum: number, set: any) => sum + setVolume(set.weight_kg, set.reps, we.exercise?.name ?? '', bodyweightKg), 0) || 0
    return acc + exerciseVolume
  }, 0)

  const summary = workoutSummary({
    durationSeconds: workout.duration_seconds,
    volumeKg: workoutVolume,
    sets: allSets,
    prSetIds: new Set(prMap.keys()),
  })

  const muscleGroups = Array.from(
    new Set<string>(workout.workout_exercises.map((we: any) => we.exercise?.muscle_group).filter(Boolean)),
  )

  const stats = [
    { label: 'Time', value: summary.duration },
    { label: 'Volume', value: summary.volume },
    { label: 'Sets', value: String(summary.workingSets) },
    { label: 'PRs', value: String(summary.prCount), accent: summary.prCount > 0 },
  ]

  return (
    <div className="mx-auto min-h-screen max-w-[600px] pb-28 text-primary">
      <div className="sticky top-0 z-30 flex items-center justify-between bg-bg px-2 py-1">
        <Link href="/history" aria-label="Back to history" className="focus-ring inline-flex size-11 items-center justify-center rounded-pill text-secondary hover:text-primary">
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </Link>
        <div className="flex items-center gap-1">
          <DuplicateWorkoutButton workout={workout} />
          <WorkoutActionsMenu
            workoutId={workout.id}
            title={workout.title}
            durationSeconds={workout.duration_seconds}
            notes={workout.notes}
          />
        </div>
      </div>

      <div className="space-y-4 px-4">
        <EditWorkoutMetaModal
          workoutId={workout.id}
          initialTitle={workout.title}
          initialDuration={workout.duration_seconds}
          initialNotes={workout.notes}
        >
          <p className="t-caption">{startedLabel(workout.started_at)}</p>
          <h1 className="t-display mt-0.5 pr-8">{workout.title || 'Workout'}</h1>
          {workout.notes && <p className="t-body-sm mt-1">{workout.notes}</p>}
        </EditWorkoutMetaModal>

        <Card padding="none" className="grid grid-cols-4">
          {stats.map((stat, index) => (
            <div key={stat.label} className={index > 0 ? 'border-l border-border px-3 py-3' : 'px-3 py-3'}>
              <p className="t-caption">{stat.label}</p>
              <p className={stat.accent ? 'mono mt-0.5 text-lg text-accent' : 'mono mt-0.5 text-lg'}>{stat.value}</p>
            </div>
          ))}
        </Card>

        <WorkoutBodyMapCard exercises={toSessionExercises(workout.workout_exercises)} />

        {workout.workout_exercises.map((we: any) => {
          const weighted = isWeightedBodyweight(we.exercise.name, we.exercise.equipment)
          return (
            <Card key={we.id} padding="none" as="section">
              <div className="flex items-start justify-between gap-2 py-2 pl-4 pr-1">
                <div className="min-w-0 pt-1">
                  <Link href={`/exercises/${we.exercise.id}`} className="t-body font-semibold hover:underline underline-offset-2">
                    {we.exercise.name}
                  </Link>
                  <p className="t-caption capitalize">{we.exercise.muscle_group}</p>
                </div>
                <DeleteHistoricalExerciseButton workoutExerciseId={we.id} workoutId={workout.id} />
              </div>

              <ul>
                {we.sets.map((set: any) => (
                  <li key={set.id} className="grid min-h-11 grid-cols-[28px_1fr_28px] items-center border-t border-border px-4">
                    {set.is_warmup
                      ? <span className="text-xs font-semibold text-caution">W</span>
                      : <span className="mono text-xs text-tertiary">{set.set_number}</span>}
                    <EditSetModal setId={set.id} initialWeight={set.weight_kg} initialReps={set.reps} addedOnTopOfKg={weighted ? bodyweightKg : undefined}>
                      <span className="mono text-base">
                        {weighted ? formatWeightedSet(set.weight_kg, bodyweightKg) : set.weight_kg} × {set.reps}
                      </span>
                    </EditSetModal>
                    <span className="flex justify-end">
                      {prMap.has(set.id) && (
                        <Trophy className="h-4 w-4 text-accent" aria-label={`PR: ${prMap.get(set.id)?.join(', ')}`} />
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )
        })}

        <WorkoutCoachInsightCard
          workoutTitle={workout.title}
          workoutVolume={workoutVolume}
          totalSets={summary.workingSets}
          prCount={summary.prCount}
          muscleGroups={muscleGroups}
          durationSeconds={workout.duration_seconds}
        />
      </div>
    </div>
  )
}
