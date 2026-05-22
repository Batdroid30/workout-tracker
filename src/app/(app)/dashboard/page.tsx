import Link from 'next/link'
import { Suspense } from 'react'
import { auth } from '@/lib/auth'
import { getWorkoutsSummary, getRecentWorkouts } from '@/lib/data/workouts'
import { getProfile } from '@/lib/data/profile'
import { getLatestBodyweight } from '@/lib/data/bodyweight'
import {
  getTrainingStreak,
  getWeeklyTrainingSummary,
  deriveWeeklySummary,
  getRecentPRs,
} from '@/lib/data/insights'
import { getWeeksInPhase } from '@/lib/phase-coach'
import { DELOAD_THRESHOLDS } from '@/lib/workout-intelligence'
import { WorkoutHistoryList } from '@/components/workout/WorkoutHistoryList'
import { InsightsSection } from '@/components/dashboard/InsightsSection'
import { BodyweightLogger } from '@/components/progress/BodyweightLogger'
import { HeroBanner } from '@/components/dashboard/HeroBanner'
import { QuickStatsRow } from '@/components/dashboard/QuickStatsRow'

export default async function DashboardPage() {
  const session = await auth()
  const userId = session?.user?.id as string

  const [
    { totalWorkouts, totalVolume },
    recentWorkouts,
    profile,
    latestBodyweight,
    streak,
    weeks,
    recentPRs,
  ] = await Promise.all([
    getWorkoutsSummary(userId),
    getRecentWorkouts(userId),
    getProfile(userId),
    getLatestBodyweight(userId),
    getTrainingStreak(userId),
    getWeeklyTrainingSummary(userId),
    getRecentPRs(userId, 60),
  ])

  const weeklySummary      = deriveWeeklySummary(weeks)
  const weeklyGoalSessions = profile?.weekly_goal_sessions ?? 3
  const firstName          = profile?.first_name ?? session?.user?.email?.split('@')[0] ?? 'athlete'
  const initial            = session?.user?.email?.[0].toUpperCase() ?? 'U'

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 5)  return 'Late night'
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
  })()

  const dateLabel = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day:     'numeric',
    month:   'short',
  })

  const phaseLabel = (() => {
    const p = profile?.training_phase
    if (!p) return null
    return p.charAt(0).toUpperCase() + p.slice(1).replace(/_/g, ' ')
  })()

  const phaseWeek   = getWeeksInPhase(profile?.phase_started_at ?? null)
  const cycleLength = (profile?.training_phase && profile?.experience_level)
    ? DELOAD_THRESHOLDS[profile.experience_level][profile.training_phase]
    : null

  return (
    <div className="min-h-screen p-5 pb-36">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between mb-6 pt-4">
        <div className="t-label">Lifts</div>
        <Link href="/profile">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center overflow-hidden"
            style={{
              border:     '1px solid var(--accent-line)',
              background: 'var(--accent-soft)',
            }}
          >
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="font-semibold text-xs" style={{ color: 'var(--accent)' }}>
                {initial}
              </span>
            )}
          </div>
        </Link>
      </div>

      {/* ── Hero ── */}
      <HeroBanner
        greeting={greeting}
        firstName={firstName}
        dateLabel={dateLabel}
        done={weeklySummary.thisWeekCount}
        goal={weeklyGoalSessions}
        streak={streak.currentStreak}
        phaseLabel={phaseLabel}
        phaseWeek={phaseWeek}
        cycleLength={cycleLength}
      />

      {/* ── Quick stats ── */}
      <QuickStatsRow
        prCount={recentPRs.length}
        volumeChangePct={weeklySummary.volumeChangePct}
        totalWorkouts={totalWorkouts}
        totalVolume={totalVolume}
      />

      {/* ── Bodyweight ── */}
      <div className="glass px-4 py-3 mb-5">
        <div className="flex items-center justify-between mb-2">
          <div className="t-label">Bodyweight</div>
          {latestBodyweight && (
            <Link
              href="/progress"
              className="text-[9px] font-medium tracking-widest uppercase opacity-70 hover:opacity-100 transition-opacity"
              style={{ color: 'var(--accent)' }}
            >
              View trend →
            </Link>
          )}
        </div>
        <BodyweightLogger latestWeight={latestBodyweight?.weight_kg ?? null} />
      </div>

      {/* ── Insights ── */}
      <div className="mb-5">
        <h2 className="t-display-s mb-4">Insights</h2>
        <Suspense fallback={<InsightsSkeleton />}>
          <InsightsSection
            userId={userId}
            totalVolume={totalVolume}
            totalWorkouts={totalWorkouts}
            weeklyGoalSessions={weeklyGoalSessions}
          />
        </Suspense>
      </div>

      {/* ── Recent ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="t-display-s">Recent</h2>
          <span className="t-caption">{totalWorkouts} sessions</span>
        </div>
        <WorkoutHistoryList workouts={recentWorkouts as any} />
      </div>
    </div>
  )
}

function InsightsSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[130, 90, 110, 80].map((h, i) => (
        <div key={i} className="glass p-4" style={{ minHeight: h }} />
      ))}
    </div>
  )
}
