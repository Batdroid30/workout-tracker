import { Dumbbell, Plus, Zap } from 'lucide-react'
import Link from 'next/link'
import { Suspense } from 'react'
import { auth } from '@/lib/auth'
import { getWorkoutsSummary, getRecentWorkouts } from '@/lib/data/workouts'
import { getProfile } from '@/lib/data/profile'
import { WorkoutHistoryList } from '@/components/workout/WorkoutHistoryList'
import { InsightsSection } from '@/components/dashboard/InsightsSection'

export default async function DashboardPage() {
  const session = await auth()
  const userId = session?.user?.id as string
  const { totalWorkouts, totalVolume } = await getWorkoutsSummary(userId)

  const recentWorkouts = await getRecentWorkouts(userId)
  const profile = await getProfile(userId)

  return (
    <div className="min-h-screen bg-[#070d1f] text-[#dce1fb] p-4 pb-28">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 pt-4">
        {/* App logo — links to root */}
        <img
          src="/icons/icon-512.png"
          alt="Lifts"
          width={52}
          height={52}
          className="rounded-xl"
        />

        {/* Profile avatar */}
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

      {/* Insights — deload check, weekly summary, streak, PRs, most improved */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold tracking-[0.2em] uppercase text-[#4a5568]">Insights</h2>
        </div>
        <Suspense fallback={<InsightsSkeleton />}>
          <InsightsSection
            userId={userId}
            totalVolume={totalVolume}
            totalWorkouts={totalWorkouts}
            weeklyGoalSessions={profile?.weekly_goal_sessions ?? 3}
          />
        </Suspense>
      </div>

      {/* Recent Workouts */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold tracking-[0.2em] uppercase text-[#4a5568]">Recent Activity</h2>
          <Zap className="w-4 h-4 text-[#CCFF00]" />
        </div>
        <WorkoutHistoryList workouts={recentWorkouts as any} />
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

// ─── Content-shaped skeleton for InsightsSection ─────────────────────────────
// Mirrors the shape of the first 4 visible cards so the layout doesn't jump.

function InsightsSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {/* RecentPRsCard shape */}
      <div className="glass-panel border border-[#334155] rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="h-2.5 w-20 bg-[#1e293b] rounded" />
          <div className="h-5 w-14 bg-[#1e293b] rounded-lg" />
        </div>
        <div className="space-y-2">
          {[1, 2].map(i => (
            <div key={i} className="flex items-center gap-3 py-1.5">
              <div className="w-6 h-6 rounded bg-[#1e293b] shrink-0" />
              <div className="flex-1 h-3 bg-[#1e293b] rounded" />
              <div className="h-3 w-12 bg-[#1e293b] rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* WeeklyGoalCard shape */}
      <div className="glass-panel border border-[#334155] rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="h-2.5 w-24 bg-[#1e293b] rounded" />
          <div className="h-5 w-10 bg-[#1e293b] rounded-lg" />
        </div>
        <div className="h-2 w-full bg-[#1e293b] rounded-full" />
      </div>

      {/* WeeklySummaryCard shape */}
      <div className="glass-panel border border-[#334155] rounded-xl p-4">
        <div className="h-2.5 w-28 bg-[#1e293b] rounded mb-3" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-[#0c1324] rounded-xl p-3">
              <div className="h-2 w-10 bg-[#1e293b] rounded mb-2" />
              <div className="h-5 w-8 bg-[#1e293b] rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* TrainingStreakCard shape */}
      <div className="glass-panel border border-[#334155] rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1e293b] shrink-0" />
          <div className="flex-1">
            <div className="h-2.5 w-16 bg-[#1e293b] rounded mb-2" />
            <div className="h-4 w-24 bg-[#1e293b] rounded" />
          </div>
        </div>
      </div>
    </div>
  )
}
