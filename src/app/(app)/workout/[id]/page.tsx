import { ArrowLeft, Clock, Dumbbell, Trophy } from 'lucide-react'
import Link from 'next/link'
import { getWorkoutById } from '@/lib/data/workouts'
import { notFound } from 'next/navigation'
import { DeleteWorkoutButton } from '@/components/workout/DeleteWorkoutButton'
import { DuplicateWorkoutButton } from '@/components/workout/DuplicateWorkoutButton'
import { EditWorkoutMetaModal } from '@/components/workout/EditWorkoutMetaModal'
import { EditSetModal } from '@/components/workout/EditSetModal'
import { DeleteHistoricalExerciseButton } from '@/components/workout/DeleteHistoricalExerciseButton'

export default async function WorkoutHistoryDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { auth } = await import('@/lib/auth')
  const session = await auth()
  const workout = await getWorkoutById(id, session?.user?.id ?? '')

  if (!workout) notFound()

  const { getSupabaseServer } = await import('@/lib/supabase/server')
  const supabase = await getSupabaseServer()

  const setIds = workout.workout_exercises.flatMap((we: any) => we.sets?.map((s: any) => s.id) || [])

  const { data: prs } = await supabase
    .from('personal_records')
    .select('pr_type, set_id')
    .in('set_id', setIds)

  const prMap = new Map<string, string[]>()
  if (prs) {
    prs.forEach(pr => {
      if (pr.set_id) {
        const existing = prMap.get(pr.set_id) || []
        prMap.set(pr.set_id, [...existing, pr.pr_type])
      }
    })
  }

  const workoutVolume = workout.workout_exercises.reduce((acc: number, we: any) => {
    const weVolume = we.sets?.reduce((sAcc: number, set: any) => sAcc + (set.weight_kg * set.reps), 0) || 0
    return acc + weVolume
  }, 0)

  return (
    <div className="min-h-screen pb-24" style={{ color: 'var(--text-hi)' }}>

      {/* ── Top Nav ──────────────────────────────────────────────────── */}
      <div
        className="sticky top-0 z-30 px-4 py-3 flex items-center justify-between"
        style={{
          background: 'rgba(6,7,13,0.85)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--glass-border)',
        }}
      >
        <div className="flex items-center gap-3">
          <Link
            href="/profile?tab=history"
            className="p-2.5 rounded-[var(--radius-inner)] transition-colors hover:bg-white/[0.06]"
            style={{ color: 'var(--text-mid)' }}
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-sm font-semibold uppercase tracking-widest" style={{ color: 'var(--text-hi)' }}>
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
              <p className="text-sm mt-2" style={{ color: 'var(--text-mid)' }}>{workout.notes}</p>
            )}
          </div>
        </EditWorkoutMetaModal>

        {/* ── Stat tiles ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <div className="glass p-4 flex items-center gap-3">
            <div
              className="p-2.5 rounded-[var(--radius-inner)] shrink-0"
              style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-line)' }}
            >
              <Clock className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <p className="t-label">Duration</p>
              <p className="mono text-xl mt-0.5 tracking-tight" style={{ color: 'var(--text-hi)' }}>
                {workout.duration_seconds ? (
                  <>
                    {Math.floor(workout.duration_seconds / 3600) > 0 && `${Math.floor(workout.duration_seconds / 3600)}h `}
                    {Math.floor((workout.duration_seconds % 3600) / 60)}
                    <span className="text-xs ml-0.5" style={{ color: 'var(--text-faint)' }}>m</span>
                  </>
                ) : <span>0<span className="text-xs ml-0.5" style={{ color: 'var(--text-faint)' }}>m</span></span>}
              </p>
            </div>
          </div>

          <div className="glass p-4 flex items-center gap-3">
            <div
              className="p-2.5 rounded-[var(--radius-inner)] shrink-0"
              style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-line)' }}
            >
              <Dumbbell className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <p className="t-label">Volume</p>
              <p className="mono text-xl mt-0.5 tracking-tight" style={{ color: 'var(--text-hi)' }}>
                {workoutVolume >= 1000 ? `${(workoutVolume / 1000).toFixed(1)}k` : workoutVolume}
                <span className="text-xs ml-0.5" style={{ color: 'var(--text-faint)' }}>kg</span>
              </p>
            </div>
          </div>
        </div>

        {/* ── Exercise log ─────────────────────────────────────────────── */}
        <div className="space-y-4">
          <h3 className="t-label">Exercises Log</h3>

          {workout.workout_exercises.map((we: any) => (
            <div key={we.id} className="glass overflow-hidden">
              {/* Exercise header */}
              <div
                className="px-4 py-3 flex items-center justify-between"
                style={{ background: 'var(--bg-1)', borderBottom: '1px solid var(--glass-border)' }}
              >
                <div>
                  <Link
                    href={`/exercises/${we.exercise.id}`}
                    className="font-semibold text-base uppercase tracking-tight hover:underline underline-offset-2"
                    style={{ color: 'var(--accent)' }}
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
                  className="flex text-[9px] font-medium uppercase tracking-widest py-2 px-4"
                  style={{ color: 'var(--text-faint)', borderBottom: '1px solid var(--glass-border)' }}
                >
                  <div className="w-10">Set</div>
                  <div className="flex-1 text-center">kg</div>
                  <div className="flex-1 text-center">Reps</div>
                  <div className="w-10 text-right">PR</div>
                </div>

                {we.sets.map((set: any) => (
                  <div
                    key={set.id}
                    className="flex text-sm py-3 px-4 items-center"
                    style={{ borderBottom: '1px solid var(--glass-border)' }}
                  >
                    <div className="w-10 flex items-center">
                      <div
                        className="w-6 h-6 flex items-center justify-center rounded-lg text-[11px] font-medium"
                        style={set.is_warmup
                          ? { background: 'rgba(251,146,60,0.10)', color: '#fb923c', border: '1px solid rgba(251,146,60,0.20)' }
                          : { background: 'rgba(255,255,255,0.04)', color: 'var(--text-faint)', border: '1px solid var(--glass-border)' }
                        }
                      >
                        {set.is_warmup ? 'W' : set.set_number}
                      </div>
                    </div>
                    <div className="flex-1 text-center font-semibold" style={{ color: 'var(--text-hi)' }}>
                      <EditSetModal setId={set.id} initialWeight={set.weight_kg} initialReps={set.reps}>
                        {set.weight_kg}
                      </EditSetModal>
                    </div>
                    <div className="flex-1 text-center font-semibold" style={{ color: 'var(--text-hi)' }}>
                      <EditSetModal setId={set.id} initialWeight={set.weight_kg} initialReps={set.reps}>
                        {set.reps}
                      </EditSetModal>
                    </div>
                    <div className="w-10 flex justify-end items-center">
                      {prMap.has(set.id) && (
                        <div
                          title={`PR: ${prMap.get(set.id)?.join(', ')}`}
                          className="p-1 rounded-lg"
                          style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-line)' }}
                        >
                          <Trophy className="w-3 h-3" style={{ color: 'var(--accent)' }} />
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
