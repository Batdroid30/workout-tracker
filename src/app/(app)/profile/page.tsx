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
import { getWeeklyMuscleGroupStats, getTopPersonalRecords } from '@/lib/data/stats'
import { getExercises } from '@/lib/data/exercises'
import { TopPRsTable }       from '@/components/profile/TopPRsTable'
import { WorkoutHistoryList } from '@/components/workout/WorkoutHistoryList'
import { User, Upload } from 'lucide-react'
import Link from 'next/link'
import { ClearDataButton } from '@/components/profile/ClearDataButton'
import { RecalculatePRsButton } from '@/components/profile/RecalculatePRsButton'

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
  // 12-week chart — separate from the 8-week dashboard chart
  const [{ totalVolume }, volumeHistory, radarData, topPRs] = await Promise.all([
    getWorkoutsSummary(userId),
    getVolumeHistory(userId, 12),
    getWeeklyMuscleGroupStats(userId),
    getTopPersonalRecords(userId),
  ])

  const chartData = volumeHistory.map((item) => ({
    date: new Date(item.date).toLocaleDateString([], { month: 'short', day: 'numeric' }),
    value: item.volume,
  }))

  return (
    <div className="space-y-6">

      {/* Top PRs — unique to this page, not on dashboard */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-black uppercase tracking-[0.15em] text-[#adb4ce]">Personal Records</h2>
          <div className="flex items-center gap-3">
            <RecalculatePRsButton />
            <span className="text-[9px] font-black uppercase tracking-widest text-[#CCFF00] bg-[#CCFF00]/10 border border-[#CCFF00]/20 px-2.5 py-1 rounded-lg">
              All-Time
            </span>
          </div>
        </div>
        <TopPRsTable prs={topPRs} />
      </section>

      {/* Volume chart — 12 weeks, unique depth vs dashboard 8-week */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-black uppercase tracking-[0.15em] text-[#adb4ce]">Volume Trend</h2>
          <span className="text-[9px] font-black uppercase tracking-widest text-[#CCFF00] bg-[#CCFF00]/10 border border-[#CCFF00]/20 px-2.5 py-1 rounded-lg">
            12 Weeks
          </span>
        </div>
        <div className="glass-panel border border-[#334155] rounded-xl p-4">
          <div className="flex items-baseline gap-2 mb-4">
            <p className="text-3xl font-black text-white tracking-tighter">
              {totalVolume >= 1_000_000
                ? `${(totalVolume / 1_000_000).toFixed(2)}M`
                : totalVolume >= 1_000
                ? `${(totalVolume / 1_000).toFixed(1)}k`
                : totalVolume}
            </p>
            <span className="text-sm text-[#334155] font-black">kg total</span>
          </div>
          {chartData.length > 1 ? (
            <div className="h-[180px] w-full">
              <ProgressionLineChart data={chartData} color="#CCFF00" formatType="volume" />
            </div>
          ) : (
            <p className="text-[11px] text-[#334155] font-body text-center py-8">Log more workouts to see your trend.</p>
          )}
        </div>
      </section>

      {/* Muscle focus radar */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-black uppercase tracking-[0.15em] text-[#adb4ce]">Muscle Focus</h2>
          <span className="text-[9px] font-black uppercase tracking-widest text-[#CCFF00] bg-[#CCFF00]/10 border border-[#CCFF00]/20 px-2.5 py-1 rounded-lg">
            Last 7 Days
          </span>
        </div>
        <div className="glass-panel border border-[#334155] rounded-xl p-4 flex flex-col items-center">
          <div className="h-[240px] w-full">
            <WeeklyMuscleRadarChart data={radarData} />
          </div>
          <p className="text-[11px] text-[#4a5568] font-body mt-2 text-center tracking-wide">
            Distribution of working sets across muscle groups.
          </p>
        </div>
      </section>

      {/* Milestones — lifetime tonnage progress */}
      <section>
        <h2 className="text-xs font-black uppercase tracking-[0.15em] text-[#adb4ce] mb-3">Tonnage Milestones</h2>
        <TonnageMilestones totalVolume={totalVolume} />
      </section>

    </div>
  )
}

// ─── Lifetime tonnage milestones — only used on this page ────────────────────

const TONNAGE_MILESTONES = [
  { threshold:        1_000, label: '1k Club'   },
  { threshold:        5_000, label: '5k Club'   },
  { threshold:       10_000, label: '10k Club'  },
  { threshold:       25_000, label: '25k Club'  },
  { threshold:       50_000, label: '50k Club'  },
  { threshold:      100_000, label: '100k Club' },
  { threshold:      250_000, label: '250k Club' },
  { threshold:      500_000, label: '500k Club' },
  { threshold:    1_000_000, label: '1M Club'   },
] as const

function formatTonnage(kg: number): string {
  if (kg >= 1_000_000) return `${(kg / 1_000_000).toFixed(1)}M`
  if (kg >= 1_000)     return `${(kg / 1_000).toFixed(1)}k`
  return String(kg)
}

function TonnageMilestones({ totalVolume }: { totalVolume: number }) {
  const achieved = TONNAGE_MILESTONES.filter(m => totalVolume >= m.threshold)
  const next     = TONNAGE_MILESTONES.find(m => totalVolume < m.threshold)
  const previous = achieved[achieved.length - 1]

  const progressPct = next && previous
    ? Math.min(100, Math.round(((totalVolume - previous.threshold) / (next.threshold - previous.threshold)) * 100))
    : next
      ? Math.min(100, Math.round((totalVolume / next.threshold) * 100))
      : 100

  return (
    <div className="glass-panel border border-[#334155] rounded-xl p-4">
      <div className="flex items-end justify-between mb-3">
        <div>
          <p className="text-3xl font-black text-white tracking-tighter">
            {formatTonnage(totalVolume)}
            <span className="text-sm text-[#4a5568] ml-1 font-bold">kg lifted</span>
          </p>
          {achieved.length > 0 && (
            <p className="text-[10px] font-black text-[#CCFF00] uppercase tracking-widest mt-1">
              ✦ {achieved[achieved.length - 1].label} achieved
            </p>
          )}
        </div>
      </div>

      {next ? (
        <>
          <div className="flex justify-between text-[9px] font-black text-[#334155] uppercase tracking-widest mb-1.5">
            <span>Next: {next.label}</span>
            <span>{progressPct}%</span>
          </div>
          <div className="h-1.5 bg-[#151b2d] rounded-full overflow-hidden">
            <div className="h-full bg-[#CCFF00] rounded-full transition-all" style={{ width: `${progressPct}%` }} />
          </div>
          <p className="text-[10px] text-[#4a5568] font-body mt-1.5">
            {formatTonnage(next.threshold - totalVolume)} kg to go
          </p>
        </>
      ) : (
        <p className="text-[10px] font-black text-[#CCFF00] uppercase tracking-widest">
          All milestones achieved 🚀
        </p>
      )}
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
