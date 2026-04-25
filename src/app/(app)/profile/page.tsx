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
import { WorkoutHistoryList } from '@/components/workout/WorkoutHistoryList'
import { User, Upload } from 'lucide-react'
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
        <Suspense fallback={<ProfileTabSkeleton tab={tab} />}>
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

  return (
    <div className="space-y-3">
      <div className="flex justify-end pb-2">
        <ClearDataButton />
      </div>
      <WorkoutHistoryList workouts={workouts as any} />
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

// ─── Content-shaped loading skeleton per tab ──────────────────────────────────

function ProfileTabSkeleton({ tab }: { tab: Tab }) {
  if (tab === 'history') {
    return (
      <div className="space-y-3 animate-pulse">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="glass-panel border border-[#334155] rounded-xl p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="h-3.5 w-28 bg-[#1e293b] rounded mb-2" />
                <div className="h-2.5 w-20 bg-[#1e293b] rounded" />
              </div>
              <div className="h-6 w-12 bg-[#1e293b] rounded-lg" />
            </div>
            <div className="h-5 w-16 bg-[#1e293b] rounded mb-3" />
            <div className="h-px w-full bg-[#1e293b] mb-2" />
            <div className="h-2.5 w-48 bg-[#1e293b] rounded" />
          </div>
        ))}
      </div>
    )
  }

  if (tab === 'stats') {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Summary cards */}
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="glass-panel border border-[#334155] rounded-xl p-4">
              <div className="h-2.5 w-24 bg-[#1e293b] rounded mb-3" />
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3].map(j => (
                  <div key={j} className="bg-[#0c1324] rounded-xl p-3">
                    <div className="h-2 w-10 bg-[#1e293b] rounded mb-2" />
                    <div className="h-5 w-8 bg-[#1e293b] rounded" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        {/* Chart */}
        <div className="glass-panel border border-[#334155] rounded-xl p-4">
          <div className="h-2.5 w-28 bg-[#1e293b] rounded mb-4" />
          <div className="h-[180px] w-full bg-[#0c1324] rounded-lg" />
        </div>
      </div>
    )
  }

  // account / exercises — minimal single-line pulse
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3].map(i => (
        <div key={i} className="glass-panel border border-[#334155] rounded-xl p-4 h-14" />
      ))}
    </div>
  )
}
