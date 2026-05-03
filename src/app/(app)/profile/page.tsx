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
import { User } from 'lucide-react'
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
    <div className="min-h-screen pb-24">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="pt-4 px-5 pb-5">
        <div className="t-label mb-1.5">Profile</div>
        <div className="flex items-center gap-4 mb-5">
          <div
            className="w-14 h-14 rounded-[var(--radius-inner)] overflow-hidden flex items-center justify-center shrink-0"
            style={{ background: 'var(--bg-2)', border: '2px solid var(--accent-line)' }}
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <User className="w-7 h-7" style={{ color: 'var(--text-faint)' }} />
            )}
          </div>
          <div>
            <h1 className="t-display-m">
              {profile?.first_name
                ? `${profile.first_name}${profile.last_name ? ` ${profile.last_name}` : ''}`
                : 'Your Profile'}
            </h1>
            <p className="t-caption mt-0.5">{session.user.email}</p>
          </div>
        </div>
        <ProfileTabs activeTab={tab} />
      </div>

      <div className="px-5">
        <Suspense fallback={<ProfileTabSkeleton tab={tab} />}>
          {tab === 'stats'     && <StatsTab userId={userId} />}
          {tab === 'history'   && <HistoryTab userId={userId} />}
          {tab === 'exercises' && <ExercisesTab />}
          {tab === 'account'   && <ProfileForm profile={profile} userEmail={session.user.email || ''} />}
        </Suspense>
      </div>
    </div>
  )
}

async function StatsTab({ userId }: { userId: string }) {
  const [{ totalVolume }, volumeHistory, radarData, topPRs] = await Promise.all([
    getWorkoutsSummary(userId),
    getVolumeHistory(userId, 12),
    getWeeklyMuscleGroupStats(userId),
    getTopPersonalRecords(userId),
  ])

  const chartData = volumeHistory.map((item) => ({
    date:  new Date(item.date).toLocaleDateString([], { month: 'short', day: 'numeric' }),
    value: item.volume,
  }))

  return (
    <div className="space-y-6">

      {/* ── Personal Records ─────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="t-display-s">Personal Records</h2>
          <div className="flex items-center gap-3">
            <RecalculatePRsButton />
            <span
              className="text-[9px] font-medium uppercase tracking-widest px-2.5 py-1 rounded-lg"
              style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-line)', color: 'var(--accent)' }}
            >
              All-Time
            </span>
          </div>
        </div>
        <TopPRsTable prs={topPRs} />
      </section>

      {/* ── Volume Trend ─────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="t-display-s">Volume Trend</h2>
          <span
            className="text-[9px] font-medium uppercase tracking-widest px-2.5 py-1 rounded-lg"
            style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-line)', color: 'var(--accent)' }}
          >
            12 Weeks
          </span>
        </div>
        <div className="glass p-4">
          <div className="flex items-baseline gap-2 mb-4">
            <p
              className="mono text-3xl tracking-tighter"
              style={{ color: 'var(--accent)', textShadow: '0 0 24px var(--accent-glow)' }}
            >
              {totalVolume >= 1_000_000
                ? `${(totalVolume / 1_000_000).toFixed(2)}M`
                : totalVolume >= 1_000
                ? `${(totalVolume / 1_000).toFixed(1)}k`
                : totalVolume}
            </p>
            <span className="t-caption">kg total</span>
          </div>
          {chartData.length > 1 ? (
            <div className="h-[180px] w-full">
              <ProgressionLineChart data={chartData} color="#f3c08a" formatType="volume" />
            </div>
          ) : (
            <p className="t-caption text-center py-8">Log more workouts to see your trend.</p>
          )}
        </div>
      </section>

      {/* ── Muscle Focus ─────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="t-display-s">Muscle Focus</h2>
          <span
            className="text-[9px] font-medium uppercase tracking-widest px-2.5 py-1 rounded-lg"
            style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-line)', color: 'var(--accent)' }}
          >
            Last 7 Days
          </span>
        </div>
        <div className="glass p-4 flex flex-col items-center">
          <div className="h-[240px] w-full">
            <WeeklyMuscleRadarChart data={radarData} />
          </div>
          <p className="t-caption mt-2 text-center">
            Distribution of working sets across muscle groups.
          </p>
        </div>
      </section>

      {/* ── Tonnage Milestones ───────────────────────────────────────── */}
      <section>
        <h2 className="t-display-s mb-3">Tonnage Milestones</h2>
        <TonnageMilestones totalVolume={totalVolume} />
      </section>

    </div>
  )
}

// ─── Lifetime tonnage milestones ──────────────────────────────────────────────

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
    <div className="glass p-4">
      <div className="flex items-end justify-between mb-3">
        <div>
          <p
            className="mono text-3xl tracking-tighter"
            style={{ color: 'var(--text-hi)' }}
          >
            {formatTonnage(totalVolume)}
            <span className="text-sm ml-1" style={{ color: 'var(--text-faint)' }}>kg lifted</span>
          </p>
          {achieved.length > 0 && (
            <p
              className="text-[10px] font-semibold uppercase tracking-widest mt-1"
              style={{ color: 'var(--accent)' }}
            >
              ✦ {achieved[achieved.length - 1].label} achieved
            </p>
          )}
        </div>
      </div>

      {next ? (
        <>
          <div
            className="flex justify-between text-[9px] font-medium uppercase tracking-widest mb-1.5"
            style={{ color: 'var(--text-faint)' }}
          >
            <span>Next: {next.label}</span>
            <span>{progressPct}%</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-1)' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${progressPct}%`, background: 'var(--accent)' }}
            />
          </div>
          <p className="t-caption mt-1.5">
            {formatTonnage(next.threshold - totalVolume)} kg to go
          </p>
        </>
      ) : (
        <p
          className="text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: 'var(--accent)' }}
        >
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
    <div className="-mx-5">
      <ExerciseListClient initialExercises={exercises} hideTitle />
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ProfileTabSkeleton({ tab }: { tab: Tab }) {
  if (tab === 'history') {
    return (
      <div className="space-y-3 animate-pulse">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="glass p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="h-3.5 w-28 rounded mb-2" style={{ background: 'var(--glass-border)' }} />
                <div className="h-2.5 w-20 rounded" style={{ background: 'var(--glass-border)' }} />
              </div>
              <div className="h-6 w-12 rounded-lg" style={{ background: 'var(--glass-border)' }} />
            </div>
            <div className="h-5 w-16 rounded mb-3" style={{ background: 'var(--glass-border)' }} />
            <div className="h-px w-full mb-2" style={{ background: 'var(--glass-border)' }} />
            <div className="h-2.5 w-48 rounded" style={{ background: 'var(--glass-border)' }} />
          </div>
        ))}
      </div>
    )
  }

  if (tab === 'stats') {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="glass p-4">
              <div className="h-2.5 w-24 rounded mb-3" style={{ background: 'var(--glass-border)' }} />
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3].map(j => (
                  <div key={j} className="rounded-xl p-3" style={{ background: 'var(--bg-1)' }}>
                    <div className="h-2 w-10 rounded mb-2" style={{ background: 'var(--glass-border)' }} />
                    <div className="h-5 w-8 rounded" style={{ background: 'var(--glass-border)' }} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="glass p-4">
          <div className="h-2.5 w-28 rounded mb-4" style={{ background: 'var(--glass-border)' }} />
          <div className="h-[180px] w-full rounded-lg" style={{ background: 'var(--bg-1)' }} />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3].map(i => (
        <div key={i} className="glass h-14" />
      ))}
    </div>
  )
}
