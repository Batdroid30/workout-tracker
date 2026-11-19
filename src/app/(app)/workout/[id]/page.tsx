import { ArrowLeft, Clock, Dumbbell, Trophy } from 'lucide-react'
import Link from 'next/link'
import { getWorkoutById } from '@/lib/data/workouts'
import { getWorkoutSetPRs } from '@/lib/data/stats'
import { notFound } from 'next/navigation'
import { DeleteWorkoutButton } from '@/components/workout/DeleteWorkoutButton'
import { DuplicateWorkoutButton } from '@/components/workout/DuplicateWorkoutButton'
import { EditWorkoutMetaModal } from '@/components/workout/EditWorkoutMetaModal'
import { EditSetModal } from '@/components/workout/EditSetModal'
import { DeleteHistoricalExerciseButton } from '@/components/workout/DeleteHistoricalExerciseButton'
import { WorkoutCoachInsightCard } from '@/components/workout/WorkoutCoachInsightCard'
import { WorkoutBodyMapCard } from '@/components/workout/WorkoutBodyMapCard'
import { toSessionExercises } from '@/lib/body-map'
import { cn } from '@/lib/utils'
import { formatVolume, setVolume, workoutBodyweight, isWeightedBodyweight, formatWeightedSet } from '@/lib/load'

export default async function WorkoutHistoryDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { requireAuth } = await import('@/lib/auth')
  const { redirect } = await import('next/navigation')
  const { session } = await requireAuth()
  const workout = await getWorkoutById(id, session.user.id)

  if (!workout) notFound()

  const setIds = workout.workout_exercises.flatMap((we: any) => we.sets?.map((s: any) => s.id) || [])
  const prMap = await getWorkoutSetPRs(setIds)

  const bodyweightKg = workoutBodyweight(workout.bodyweight_kg)
  const workoutVolume = workout.workout_exercises.reduce((acc: number, we: any) => {
    const weVolume = we.sets?.reduce((sAcc: number, set: any) => sAcc + setVolume(set.weight_kg, set.reps, we.exercise?.name ?? '', bodyweightKg), 0) || 0
    return acc + weVolume
  }, 0)

  const muscleGroups = Array.from(
    new Set<string>(
      workout.workout_exercises
        .map((we: any) => we.exercise?.muscle_group)
        .filter(Boolean)
    )
  )

  const totalWorkingSets = workout.workout_exercises.reduce((acc: number, we: any) => {
    return acc + (we.sets?.filter((s: any) => !s.is_warmup).length || 0)
  }, 0)

  const prCount = Array.from(prMap.values()).flat().length

  return (
    <div className="min-h-screen pb-24 text-primary">

      {/* ── Top Nav ──────────────────────────────────────────────────── */}
      <div
        className="sticky top-0 z-30 px-4 py-3 flex items-center justify-between bg-bg border-b border-border"
      >
        <div className="flex items-center gap-3">
          <Link
            href="/profile?tab=history"
            className="p-2.5 rounded-control transition-colors text-secondary hover:bg-surface-raised"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-sm font-semibold text-primary">
            {workout.title || 'Workout Summary'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <DuplicateWorkoutButton workout={workout} />
          <DeleteWorkoutButton workoutId={workout.id} />
        </div>
      </div>

      <div className="p-4 space-y-5 mt-1">

        {/* ── Meta card ────────────────────────────────────────────────── */}
        <EditWorkoutMetaModal
          workoutId={workout.id}
          initialTitle={workout.title}
          initialDuration={workout.duration_seconds}
          initialNotes={workout.notes}
        >
          <div className="glass p-4">
            <h2 className="t-display-m pr-8">{workout.title || 'Workout'}</h2>
            <p className="t-caption mt-1">
              {new Date(workout.started_at).toLocaleString([], { dateStyle: 'full', timeStyle: 'short' })}
            </p>
            {workout.notes && (
              <p className="text-sm mt-2 text-secondary">{workout.notes}</p>
            )}
          </div>
        </EditWorkoutMetaModal>

        {/* ── Body map ─────────────────────────────────────────────────── */}
        <WorkoutBodyMapCard exercises={toSessionExercises(workout.workout_exercises)} />

        {/* ── Stat tiles ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <div className="glass p-4 flex items-center gap-3">
            <div
              className="p-2.5 rounded-control shrink-0 bg-surface-raised border border-border"
            >
              <Clock className="w-4 h-4 text-secondary" />
            </div>
            <div>
              <p className="t-label">Duration</p>
              <p className="mono text-xl mt-0.5 tracking-tight text-primary">
                {workout.duration_seconds ? (
                  <>
                    {Math.floor(workout.duration_seconds / 3600) > 0 && `${Math.floor(workout.duration_seconds / 3600)}h `}
                    {Math.floor((workout.duration_seconds % 3600) / 60)}
                    <span className="text-xs ml-0.5 text-tertiary">m</span>
                  </>
                ) : <span>0<span className="text-xs ml-0.5 text-tertiary">m</span></span>}
              </p>
            </div>
          </div>

          <div className="glass p-4 flex items-center gap-3">
            <div
              className="p-2.5 rounded-control shrink-0 bg-surface-raised border border-border"
            >
              <Dumbbell className="w-4 h-4 text-secondary" />
            </div>
            <div>
              <p className="t-label">Volume</p>
              <p className="mono text-xl mt-0.5 tracking-tight text-primary">
                {formatVolume(workoutVolume)}
                <span className="text-xs ml-0.5 text-tertiary">kg</span>
              </p>
            </div>
          </div>
        </div>

        {/* ── Coach Insights Card ────────────────────────────────────── */}
        <WorkoutCoachInsightCard
          workoutTitle={workout.title}
          workoutVolume={workoutVolume}
          totalSets={totalWorkingSets}
          prCount={prCount}
          muscleGroups={muscleGroups}
          durationSeconds={workout.duration_seconds}
        />

        {/* ── Exercise log ─────────────────────────────────────────────── */}
        <div className="space-y-4">
          <h3 className="t-label">Exercises log</h3>

          {workout.workout_exercises.map((we: any) => (
            <div key={we.id} className="glass overflow-hidden">
              {/* Exercise header */}
              <div
                className="px-4 py-3 flex items-center justify-between bg-surface-raised border-b border-border"
              >
                <div>
                  <Link
                    href={`/exercises/${we.exercise.id}`}
                    className="font-semibold text-base text-primary hover:underline underline-offset-2"
                  >
                    {we.exercise.name}
                  </Link>
                  <p className="t-label mt-0.5">{we.exercise.muscle_group}</p>
                </div>
                <DeleteHistoricalExerciseButton workoutExerciseId={we.id} workoutId={workout.id} />
              </div>

              {/* Sets table */}
              <div className="w-full">
                <div
                  className="flex text-xs font-medium text-tertiary py-2 px-4 border-b border-border"
                >
                  <div className="w-10">Set</div>
                  <div className="flex-1 text-center">kg</div>
                  <div className="flex-1 text-center">Reps</div>
                  <div className="w-10 text-right">PR</div>
                </div>

                {we.sets.map((set: any) => (
                  <div
                    key={set.id}
                    className="flex text-sm py-3 px-4 items-center border-b border-border"
                  >
                    <div className="w-10 flex items-center">
                      <div
                        className={cn(
                          'w-6 h-6 flex items-center justify-center rounded-lg text-xs font-medium border',
                          set.is_warmup
                            ? 'bg-caution-soft text-caution border-transparent'
                            : 'bg-surface-raised text-tertiary border-border',
                        )}
                      >
                        {set.is_warmup ? 'W' : set.set_number}
                      </div>
                    </div>
                    <div className="flex-1 text-center font-semibold text-primary">
                      <EditSetModal setId={set.id} initialWeight={set.weight_kg} initialReps={set.reps} addedOnTopOfKg={isWeightedBodyweight(we.exercise.name, we.exercise.equipment) ? bodyweightKg : undefined}>
                        {isWeightedBodyweight(we.exercise.name, we.exercise.equipment) ? formatWeightedSet(set.weight_kg, bodyweightKg) : set.weight_kg}
                      </EditSetModal>
                    </div>
                    <div className="flex-1 text-center font-semibold text-primary">
                      <EditSetModal setId={set.id} initialWeight={set.weight_kg} initialReps={set.reps} addedOnTopOfKg={isWeightedBodyweight(we.exercise.name, we.exercise.equipment) ? bodyweightKg : undefined}>
                        {set.reps}
                      </EditSetModal>
                    </div>
                    <div className="w-10 flex justify-end items-center">
                      {prMap.has(set.id) && (
                        <div
                          title={`PR: ${prMap.get(set.id)?.join(', ')}`}
                          className="p-1 rounded-lg bg-accent-soft"
                        >
                          <Trophy className="w-3 h-3 text-accent" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
