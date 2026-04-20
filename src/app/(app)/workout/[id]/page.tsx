import { ArrowLeft, Clock, Dumbbell, Trophy } from 'lucide-react'
import Link from 'next/link'
import { getWorkoutById } from '@/lib/data/workouts'
import { notFound } from 'next/navigation'

export default async function WorkoutHistoryDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const workout = await getWorkoutById(id)

  if (!workout) {
    notFound()
  }

  const workoutVolume = workout.workout_exercises.reduce((acc: number, we: any) => {
    const weVolume = we.sets?.reduce((sAcc: number, set: any) => sAcc + (set.weight_kg * set.reps), 0) || 0
    return acc + weVolume
  }, 0)

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Top Nav */}
      <div className="sticky top-0 z-30 bg-black/90 backdrop-blur border-b border-zinc-900 p-4 flex items-center gap-3">
        <Link href="/dashboard" className="p-2 -ml-2 rounded-full hover:bg-zinc-900 transition-colors">
          <ArrowLeft className="w-5 h-5 text-zinc-400" />
        </Link>
        <h1 className="text-xl font-bold font-sans">Summary</h1>
      </div>

      <div className="p-4 space-y-6 mt-2">
        {/* Header summary */}
        <div>
          <h2 className="text-3xl font-bold font-sans">{workout.title || 'Workout'}</h2>
          <p className="text-zinc-500 font-mono mt-1 text-sm tracking-wide">
            {new Date(workout.started_at).toLocaleString([], { dateStyle: 'full', timeStyle: 'short' })}
          </p>
        </div>

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
                <span className="font-bold text-white text-lg font-sans tracking-tight">
                  {we.exercise.name}
                </span>
                <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded uppercase font-bold tracking-wider">
                  {we.exercise.muscle_group}
                </span>
              </div>
              
              <div className="w-full">
                <div className="flex text-xs font-bold text-zinc-500 uppercase tracking-wider py-3 px-4 bg-zinc-900 border-b border-zinc-800">
                  <div className="w-12">Set</div>
                  <div className="flex-1 text-center">kg</div>
                  <div className="flex-1 text-center">Reps</div>
                  <div className="w-12 text-right">PR</div>
                </div>
                
                {we.sets.map((set: any) => (
                  <div key={set.id} className="flex text-sm py-4 px-4 items-center font-mono border-b border-zinc-800 last:border-0">
                    <div className="w-12 flex items-center">
                      <div className={`w-6 h-6 flex items-center justify-center rounded-md font-bold ${
                        set.is_warmup ? 'bg-orange-500/10 text-orange-500' : 'bg-zinc-800 text-zinc-400'
                      }`}>
                        {set.is_warmup ? 'W' : set.set_number}
                      </div>
                    </div>
                    <div className="flex-1 text-center text-white font-bold">{set.weight_kg}</div>
                    <div className="flex-1 text-center text-white font-bold">{set.reps}</div>
                    <div className="w-12 flex justify-end">
                      {/* Trophy placeholder for PRs - logic could be added later */}
                      {/* <Trophy className="w-4 h-4 text-yellow-500" /> */}
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
