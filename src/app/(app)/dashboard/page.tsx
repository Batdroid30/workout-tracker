import { Dumbbell, Plus, Trophy, Zap } from 'lucide-react'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { getWorkoutsSummary, getRecentWorkouts } from '@/lib/data/workouts'
import { getProfile } from '@/lib/data/profile'
import { redirect } from 'next/navigation'
import { DeleteWorkoutButton } from '@/components/workout/DeleteWorkoutButton'

export default async function DashboardPage() {
  const session = await auth()
  const userId = session?.user?.id as string
  const { totalWorkouts, totalVolume } = await getWorkoutsSummary(userId)
  const recentWorkouts = await getRecentWorkouts(userId)
  const profile = await getProfile(userId)

  return (
    <div className="min-h-screen bg-[#070d1f] text-[#dce1fb] p-4 pb-28">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 pt-6">
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#4a5568] mb-1">Activity Report</p>
          <h1 className="text-3xl font-black uppercase tracking-tight text-white">Weekly Overview</h1>
        </div>
        <Link href="/profile">
          <div className="w-10 h-10 rounded-full border-2 border-[#CCFF00] overflow-hidden bg-[#0c1324] flex items-center justify-center">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="font-black text-sm text-[#CCFF00]">
                {session?.user?.email?.[0].toUpperCase() || 'U'}
              </span>
            )}
          </div>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="glass-panel rounded-xl p-4 border border-[#334155]">
          <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#4a5568] mb-2">Workouts</p>
          <p className="text-4xl font-black font-sans text-white tracking-tighter">{totalWorkouts}</p>
        </div>
        <div className="glass-panel rounded-xl p-4 border border-[#CCFF00]/30 relative overflow-hidden">
          <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#4a5568] mb-2">Volume</p>
          <p className="text-4xl font-black font-sans text-[#CCFF00] tracking-tighter z-10 relative">
            {totalVolume >= 1000 ? `${(totalVolume / 1000).toFixed(1)}k` : totalVolume}
            <span className="text-base text-[#CCFF00]/40 ml-1">kg</span>
          </p>
          <div className="absolute -right-3 -bottom-3 opacity-10">
            <Dumbbell className="w-16 h-16 text-[#CCFF00]" />
          </div>
        </div>
      </div>

      {/* Recent Workouts */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold tracking-[0.2em] uppercase text-[#4a5568]">Recent Activity</h2>
          <Zap className="w-4 h-4 text-[#CCFF00]" />
        </div>

        <div className="space-y-3">
          {recentWorkouts.length === 0 ? (
            <div className="glass-panel border border-dashed border-[#334155] rounded-xl p-8 text-center">
              <p className="text-[#4a5568] text-sm font-body tracking-wide">No workouts yet. Start your first session!</p>
            </div>
          ) : (
            recentWorkouts.map((workout: any) => {
              const exerciseNames = workout.workout_exercises
                .map((we: any) => we.exercise.name)
                .join(' · ')

              const workoutVolume = workout.workout_exercises.reduce((acc: number, we: any) => {
                const weVolume = we.sets?.reduce((sAcc: number, set: any) => sAcc + ((set.weight_kg || 0) * (set.reps || 0)), 0) || 0
                return acc + weVolume
              }, 0)

              return (
                <Link href={`/workout/${workout.id}`} key={workout.id} className="block">
                  <div className="glass-panel border border-[#334155] hover:border-[#CCFF00]/30 rounded-xl p-4 active:scale-[0.98] transition-all cursor-pointer">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-black text-base text-white uppercase tracking-tight">{workout.title || 'Workout'}</h3>
                        <p className="text-[11px] text-[#4a5568] font-body mt-0.5 tracking-wide">
                          {new Date(workout.started_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {workout.prCount > 0 && (
                          <div className="bg-[#CCFF00]/10 text-[#CCFF00] px-2 py-1 flex items-center gap-1 rounded-lg text-[10px] font-black border border-[#CCFF00]/20 uppercase tracking-wider">
                            <Trophy className="w-3 h-3" />
                            <span>{workout.prCount}</span>
                          </div>
                        )}
                        {workout.duration_seconds && (
                          <div className="bg-[#151b2d] text-[#adb4ce] px-2 py-1 flex items-center justify-center rounded-lg text-[10px] font-bold border border-[#334155] tracking-wide">
                            {Math.floor(workout.duration_seconds / 60)}m
                          </div>
                        )}
                        <div className="-mr-1">
                          <DeleteWorkoutButton workoutId={workout.id} />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-white font-black text-lg tracking-tight">
                        {workoutVolume >= 1000 ? `${(workoutVolume / 1000).toFixed(1)}k` : workoutVolume}
                        <span className="text-[11px] text-[#4a5568] ml-0.5 font-bold">kg</span>
                      </span>
                    </div>

                    <div className="pt-3 border-t border-[#1e293b] text-[11px] font-body text-[#4a5568] truncate tracking-wide">
                      {exerciseNames}
                    </div>
                  </div>
                </Link>
              )
            })
          )}
        </div>
      </div>

      {/* FAB */}
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-30">
        <Link href="/workout">
          <button className="bg-[#CCFF00] text-[#020617] font-black uppercase tracking-widest text-sm px-8 py-4 rounded-xl shadow-[0_8px_32px_rgba(204,255,0,0.3)] flex items-center gap-2 hover:bg-[#abd600] active:scale-95 transition-all whitespace-nowrap">
            <Plus className="w-5 h-5" /> Start Workout
          </button>
        </Link>
      </div>
    </div>
  )
}
