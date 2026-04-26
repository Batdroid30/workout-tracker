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

  if (!workout) {
    notFound()
  }

  // Fetch PRs for this workout
  const { getSupabaseServer } = await import('@/lib/supabase/server')
  const supabase = await getSupabaseServer()
  
  // Get all set IDs in this workout
  const setIds = workout.workout_exercises.flatMap((we: any) => we.sets?.map((s: any) => s.id) || [])
  
  // Fetch PRs that belong to these sets
  const { data: prs } = await supabase
    .from('personal_records')
    .select('pr_type, set_id')
    .in('set_id', setIds)

  // Map of set_id -> array of pr_types
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
    <div className="min-h-screen bg-[#070d1f] text-[#dce1fb] pb-24">
      {/* Top Nav */}
      <div className="sticky top-0 z-30 bg-[#070d1f]/95 backdrop-blur border-b border-[#334155] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/profile?tab=history" className="p-2.5 hover:bg-[#151b2d] rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-[#adb4ce]" />
          </Link>
          <h1 className="text-sm font-black uppercase tracking-widest text-white">
            {workout.title || 'Workout Summary'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <DuplicateWorkoutButton workout={workout} />
          <DeleteWorkoutButton workoutId={workout.id} />
        </div>
      </div>

      <div className="p-4 space-y-5 mt-1">
        {/* Header summary */}
        <EditWorkoutMetaModal
          workoutId={workout.id}
          initialTitle={workout.title}
          initialDuration={workout.duration_seconds}
          initialNotes={workout.notes}
        >
          <div className="glass-panel border border-[#334155] rounded-xl p-4">
            <h2 className="text-2xl font-black uppercase tracking-tight text-white pr-8">{workout.title || 'Workout'}</h2>
            <p className="text-[11px] text-[#4a5568] font-body mt-1 tracking-wide">
              {new Date(workout.started_at).toLocaleString([], { dateStyle: 'full', timeStyle: 'short' })}
            </p>
            {workout.notes && (
              <p className="text-sm text-[#adb4ce] font-body mt-2">{workout.notes}</p>
            )}
          </div>
        </EditWorkoutMetaModal>

        <div className="grid grid-cols-2 gap-3">
          <div className="glass-panel p-4 rounded-xl border border-[#334155] flex items-center gap-3">
            <div className="bg-[#CCFF00]/10 p-2.5 rounded-lg border border-[#CCFF00]/20 shrink-0">
              <Clock className="w-4 h-4 text-[#CCFF00]" />
            </div>
            <div>
              <p className="text-[9px] text-[#4a5568] font-black uppercase tracking-[0.15em]">Duration</p>
              <p className="text-xl font-black text-white mt-0.5 tracking-tight">
                {workout.duration_seconds ? (
                  <>
                    {Math.floor(workout.duration_seconds / 3600) > 0 && `${Math.floor(workout.duration_seconds / 3600)}h `}
                    {Math.floor((workout.duration_seconds % 3600) / 60)}<span className="text-xs text-[#4a5568] ml-0.5">m</span>
                  </>
                ) : <span>0<span className="text-xs text-[#4a5568] ml-0.5">m</span></span>}
              </p>
            </div>
          </div>
          <div className="glass-panel p-4 rounded-xl border border-[#334155] flex items-center gap-3">
            <div className="bg-[#CCFF00]/10 p-2.5 rounded-lg border border-[#CCFF00]/20 shrink-0">
              <Dumbbell className="w-4 h-4 text-[#CCFF00]" />
            </div>
            <div>
              <p className="text-[9px] text-[#4a5568] font-black uppercase tracking-[0.15em]">Volume</p>
              <p className="text-xl font-black text-white mt-0.5 tracking-tight">
                {workoutVolume >= 1000 ? `${(workoutVolume / 1000).toFixed(1)}k` : workoutVolume}
                <span className="text-xs text-[#4a5568] ml-0.5">kg</span>
              </p>
            </div>
          </div>
        </div>

        {/* Exercises */}
        <div className="space-y-4">
          <h3 className="text-xs font-black text-[#adb4ce] uppercase tracking-[0.15em]">Exercises Log</h3>

          {workout.workout_exercises.map((we: any) => (
            <div key={we.id} className="glass-panel border border-[#334155] rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-[#334155] flex items-center justify-between bg-[#0c1324]">
                <div>
                  <Link
                    href={`/exercises/${we.exercise.id}`}
                    className="font-black text-[#CCFF00] text-base uppercase tracking-tight hover:underline underline-offset-2"
                  >
                    {we.exercise.name}
                  </Link>
                  <p className="text-[10px] text-[#4a5568] uppercase tracking-[0.15em] mt-0.5">{we.exercise.muscle_group}</p>
                </div>
                <DeleteHistoricalExerciseButton workoutExerciseId={we.id} workoutId={workout.id} />
              </div>

              <div className="w-full">
                <div className="flex text-[9px] font-black text-[#334155] uppercase tracking-widest py-2 px-4 border-b border-[#1e293b]">
                  <div className="w-10">Set</div>
                  <div className="flex-1 text-center">kg</div>
                  <div className="flex-1 text-center">Reps</div>
                  <div className="w-10 text-right">PR</div>
                </div>

                {we.sets.map((set: any) => (
                  <div key={set.id} className="flex text-sm py-3 px-4 items-center border-b border-[#1e293b] last:border-0">
                    <div className="w-10 flex items-center">
                      <div className={`w-6 h-6 flex items-center justify-center rounded-lg text-[11px] font-black ${
                        set.is_warmup ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 'bg-[#151b2d] text-[#4a5568] border border-[#334155]'
                      }`}>
                        {set.is_warmup ? 'W' : set.set_number}
                      </div>
                    </div>
                    <div className="flex-1 text-center text-white font-black">
                      <EditSetModal setId={set.id} initialWeight={set.weight_kg} initialReps={set.reps}>
                        {set.weight_kg}
                      </EditSetModal>
                    </div>
                    <div className="flex-1 text-center text-white font-black">
                      <EditSetModal setId={set.id} initialWeight={set.weight_kg} initialReps={set.reps}>
                        {set.reps}
                      </EditSetModal>
                    </div>
                    <div className="w-10 flex justify-end items-center">
                      {prMap.has(set.id) && (
                        <div title={`PR: ${prMap.get(set.id)?.join(', ')}`} className="bg-[#CCFF00]/10 p-1 rounded-lg border border-[#CCFF00]/20">
                          <Trophy className="w-3 h-3 text-[#CCFF00]" />
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
