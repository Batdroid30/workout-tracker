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
  const workout = await getWorkoutById(id)

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
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Top Nav */}
      <div className="sticky top-0 z-30 bg-black/90 backdrop-blur border-b border-zinc-900 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="p-2 -ml-2 rounded-full hover:bg-zinc-900 transition-colors">
            <ArrowLeft className="w-5 h-5 text-zinc-400" />
          </Link>
          <h1 className="text-xl font-bold font-sans">Summary</h1>
        </div>
        <div className="flex items-center gap-2">
          <DuplicateWorkoutButton workout={workout} />
          <DeleteWorkoutButton workoutId={workout.id} />
        </div>
      </div>

      <div className="p-4 space-y-6 mt-2">
        {/* Header summary */}
        <EditWorkoutMetaModal 
          workoutId={workout.id} 
          initialTitle={workout.title} 
          initialDuration={workout.duration_seconds} 
          initialNotes={workout.notes}
        >
          <div>
            <h2 className="text-3xl font-bold font-sans pr-8">{workout.title || 'Workout'}</h2>
            <p className="text-zinc-500 font-mono mt-1 text-sm tracking-wide">
              {new Date(workout.started_at).toLocaleString([], { dateStyle: 'full', timeStyle: 'short' })}
            </p>
            {workout.notes && (
              <p className="text-sm text-zinc-400 mt-2 italic">{workout.notes}</p>
            )}
          </div>
        </EditWorkoutMetaModal>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 flex items-center gap-3">
            <div className="bg-brand/10 p-2.5 rounded-lg border border-brand/20">
              <Clock className="w-5 h-5 text-brand" />
            </div>
            <div>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Duration</p>
              <p className="text-lg font-bold font-mono mt-0.5">
                {workout.duration_seconds ? (
                  <>
                    {Math.floor(workout.duration_seconds / 3600) > 0 && `${Math.floor(workout.duration_seconds / 3600)}h `}
                    {Math.floor((workout.duration_seconds % 3600) / 60)}m
                  </>
                ) : '0m'}
              </p>
            </div>
          </div>
          <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 flex items-center gap-3">
            <div className="bg-purple-500/10 p-2.5 rounded-lg border border-purple-500/20">
              <Dumbbell className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Volume</p>
              <p className="text-lg font-bold font-mono mt-0.5">
                {workoutVolume >= 1000 ? `${(workoutVolume / 1000).toFixed(1)}k` : workoutVolume} kg
              </p>
            </div>
          </div>
        </div>

        {/* Exercises */}
        <div className="space-y-6">
          <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-2 mt-8">Exercises Log</h3>
          
          {workout.workout_exercises.map((we: any) => (
            <div key={we.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-800/30">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-white text-lg font-sans tracking-tight">
                    {we.exercise.name}
                  </span>
                  <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded uppercase font-bold tracking-wider">
                    {we.exercise.muscle_group}
                  </span>
                </div>
                <DeleteHistoricalExerciseButton workoutExerciseId={we.id} workoutId={workout.id} />
              </div>
              
              <div className="w-full">
                <div className="flex text-xs font-bold text-zinc-500 uppercase tracking-wider py-3 px-4 bg-zinc-900 border-b border-zinc-800">
                  <div className="w-12">Set</div>
                  <div className="flex-1 text-center">kg</div>
                  <div className="flex-1 text-center">Reps</div>
                  <div className="w-12 text-right">PR</div>
                </div>
                
                {we.sets.map((set: any) => (
                  <div key={set.id} className="flex text-sm py-4 px-4 items-center font-mono border-b border-zinc-800 last:border-0 group">
                    <div className="w-12 flex items-center">
                      <div className={`w-6 h-6 flex items-center justify-center rounded-md font-bold ${
                        set.is_warmup ? 'bg-orange-500/10 text-orange-500' : 'bg-zinc-800 text-zinc-400'
                      }`}>
                        {set.is_warmup ? 'W' : set.set_number}
                      </div>
                    </div>
                    <div className="flex-1 text-center text-white font-bold">
                      <EditSetModal setId={set.id} initialWeight={set.weight_kg} initialReps={set.reps}>
                        {set.weight_kg}
                      </EditSetModal>
                    </div>
                    <div className="flex-1 text-center text-white font-bold">
                      <EditSetModal setId={set.id} initialWeight={set.weight_kg} initialReps={set.reps}>
                        {set.reps}
                      </EditSetModal>
                    </div>
                    <div className="w-12 flex justify-end items-center">
                      {prMap.has(set.id) && (
                        <div title={`PR: ${prMap.get(set.id)?.join(', ')}`}>
                          <Trophy className="w-4 h-4 text-yellow-500 fill-yellow-500/20" />
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
