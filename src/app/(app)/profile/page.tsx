import { auth } from '@/lib/auth'
import { getProfile } from '@/lib/data/profile'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { ProfileTabs } from './ProfileTabs'
import { ProfileForm } from './ProfileForm'
import { ProgressionLineChart } from '@/components/ui/ProgressionLineChart'
import { WeeklyMuscleRadarChart } from '@/components/ui/WeeklyMuscleRadarChart'
import { ExerciseListClient } from '@/app/(app)/exercises/ExerciseListClient'
import { getWorkoutsSummary, getVolumeHistory, getAllWorkouts } from '@/lib/data/workouts'
import { getWeeklyMuscleGroupStats } from '@/lib/data/stats'
import { getExercises } from '@/lib/data/exercises'
import { getWeeklyTrainingSummary, getMostImprovedExercises, deriveWeeklySummary } from '@/lib/data/insights'
import { WeeklySummaryCard } from '@/components/dashboard/WeeklySummaryCard'
import { MostImprovedCard }  from '@/components/dashboard/MostImprovedCard'
import { MilestonesCard }    from '@/components/dashboard/MilestonesCard'
import { DeleteWorkoutButton } from '@/components/workout/DeleteWorkoutButton'
import { Trophy, User, Upload } from 'lucide-react'
import Link from 'next/link'
import { ClearDataButton } from '@/components/profile/ClearDataButton'

type Tab = 'stats' | 'history' | 'exercises' | 'account'

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const userId = session.user.id
  const { tab: rawTab } = await searchParams
  const tab: Tab = (rawTab as Tab) || 'stats'

  const profile = await getProfile(userId)

  return (
    <div className="min-h-screen bg-[#070d1f] text-[#dce1fb] pb-24">
      {/* Header */}
      <div className="pt-8 pb-5 px-4">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-xl overflow-hidden border-2 border-[#CCFF00]/40 bg-[#0c1324] flex items-center justify-center shrink-0">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <User className="w-7 h-7 text-[#334155]" />
            )}
          </div>
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight text-white">
              {profile?.first_name
                ? `${profile.first_name}${profile.last_name ? ` ${profile.last_name}` : ''}`
                : 'Your Profile'}
            </h1>
            <p className="text-[11px] text-[#4a5568] font-body mt-0.5 tracking-wide">{session.user.email}</p>
          </div>
        </div>
        <ProfileTabs activeTab={tab} />
      </div>

      <div className="px-4">
        <Suspense fallback={<div className="text-[#334155] text-xs font-black uppercase tracking-widest text-center mt-12">Loading...</div>}>
          {tab === 'stats' && <StatsTab userId={userId} />}
          {tab === 'history' && <HistoryTab userId={userId} />}
          {tab === 'exercises' && <ExercisesTab />}
          {tab === 'account' && <ProfileForm profile={profile} userEmail={session.user.email || ''} />}
        </Suspense>
      </div>
    </div>
  )
}

async function StatsTab({ userId }: { userId: string }) {
  const [{ totalVolume }, volumeHistory, radarData, weeks, mostImproved] = await Promise.all([
    getWorkoutsSummary(userId),
    getVolumeHistory(userId),
    getWeeklyMuscleGroupStats(userId),
    getWeeklyTrainingSummary(userId),
    getMostImprovedExercises(userId),
  ])

  const weeklySummary = deriveWeeklySummary(weeks)

  const chartData = volumeHistory.map((item) => ({
    date: new Date(item.date).toLocaleDateString([], { month: 'short', day: 'numeric' }),
    value: item.volume,
  }))

  return (
    <div className="space-y-6">
      {/* Quick insight cards */}
      <section className="space-y-3">
        <WeeklySummaryCard data={weeklySummary} />
        <MostImprovedCard exercises={mostImproved} />
        <MilestonesCard totalVolume={totalVolume} />
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-black uppercase tracking-[0.15em] text-[#adb4ce]">Weekly Muscle Focus</h2>
          <span className="bg-[#CCFF00]/10 text-[9px] uppercase font-black text-[#CCFF00] px-3 py-1 rounded-lg border border-[#CCFF00]/20 tracking-widest">
            Last 7 Days
          </span>
        </div>
        <div className="glass-panel border border-[#334155] rounded-xl p-4 flex flex-col items-center">
          <div className="h-[240px] w-full">
            <WeeklyMuscleRadarChart data={radarData} />
          </div>
          <p className="text-[11px] text-[#4a5568] font-body mt-2 text-center">
            Distribution of working sets across muscle groups.
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-xs font-black uppercase tracking-[0.15em] text-[#adb4ce] mb-3">Volume Analysis</h2>
        <div className="glass-panel border border-[#334155] rounded-xl p-4">
          <div className="flex justify-between items-end mb-6">
            <div>
              <p className="text-[9px] text-[#4a5568] font-black uppercase tracking-[0.15em] mb-1">Total Volume</p>
              <p className="text-4xl font-black text-white tracking-tighter">
                {totalVolume.toLocaleString()} <span className="text-base text-[#334155]">kg</span>
              </p>
            </div>
          </div>
          <div className="h-[180px] w-full">
            <ProgressionLineChart data={chartData} color="#CCFF00" formatType="volume" />
          </div>
        </div>
      </section>
    </div>
  )
}

async function HistoryTab({ userId }: { userId: string }) {
  const workouts = await getAllWorkouts(userId)

  if (workouts.length === 0) {
    return (
      <div className="glass-panel border border-dashed border-[#334155] rounded-xl p-8 text-center">
        <p className="text-[#4a5568] text-sm font-body">No workouts yet. Start your first session!</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end pb-2">
        <ClearDataButton />
      </div>

      {workouts.map((workout: any) => {
        const exerciseNames = workout.workout_exercises.map((we: any) => we.exercise.name).join(' · ')
        const workoutVolume = workout.workout_exercises.reduce((acc: number, we: any) => {
          return acc + (we.sets?.reduce((s: number, set: any) => s + ((set.weight_kg || 0) * (set.reps || 0)), 0) || 0)
        }, 0)

        return (
          <Link href={`/workout/${workout.id}`} key={workout.id} className="block">
            <div className="glass-panel border border-[#334155] hover:border-[#CCFF00]/30 rounded-xl p-4 active:scale-[0.98] transition-all cursor-pointer">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-black text-sm text-white uppercase tracking-tight">{workout.title || 'Workout'}</h3>
                  <p className="text-[11px] text-[#4a5568] font-body mt-0.5">
                    {new Date(workout.started_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {workout.prCount > 0 && (
                    <div className="bg-[#CCFF00]/10 text-[#CCFF00] px-2 py-1 flex items-center gap-1 rounded-lg text-[10px] font-black border border-[#CCFF00]/20 uppercase">
                      <Trophy className="w-3 h-3" /><span>{workout.prCount}</span>
                    </div>
                  )}
                  {workout.duration_seconds && (
                    <div className="bg-[#151b2d] text-[#adb4ce] px-2 py-1 rounded-lg text-[10px] font-bold border border-[#334155]">
                      {Math.floor(workout.duration_seconds / 60)}m
                    </div>
                  )}
                  <div className="-mr-1"><DeleteWorkoutButton workoutId={workout.id} /></div>
                </div>
              </div>
              <span className="text-white font-black text-lg tracking-tight">
                {workoutVolume >= 1000 ? `${(workoutVolume / 1000).toFixed(1)}k` : workoutVolume}
                <span className="text-[11px] text-[#4a5568] ml-0.5 font-bold">kg</span>
              </span>
              <div className="mt-2 pt-2 border-t border-[#1e293b] text-[11px] font-body text-[#4a5568] truncate">
                {exerciseNames}
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}

async function ExercisesTab() {
  const exercises = await getExercises()
  return (
    <div className="-mx-4">
      <ExerciseListClient initialExercises={exercises} hideTitle />
    </div>
  )
}
