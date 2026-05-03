import Link from 'next/link'
import { Suspense } from 'react'
import { auth } from '@/lib/auth'
import { getWorkoutsSummary, getRecentWorkouts } from '@/lib/data/workouts'
import { getProfile } from '@/lib/data/profile'
import { getLatestBodyweight } from '@/lib/data/bodyweight'
import { WorkoutHistoryList } from '@/components/workout/WorkoutHistoryList'
import { InsightsSection } from '@/components/dashboard/InsightsSection'
import { BodyweightLogger } from '@/components/progress/BodyweightLogger'
import { Dumbbell } from 'lucide-react'

export default async function DashboardPage() {
  const session = await auth()
  const userId = session?.user?.id as string
  const [{ totalWorkouts, totalVolume }, recentWorkouts, profile, latestBodyweight] = await Promise.all([
    getWorkoutsSummary(userId),
    getRecentWorkouts(userId),
    getProfile(userId),
    getLatestBodyweight(userId),
  ])

  const initial = session?.user?.email?.[0].toUpperCase() ?? 'U'
  const firstName = profile?.first_name ?? session?.user?.email?.split('@')[0] ?? 'athlete'

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 5)  return 'Late night'
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
  })()

  // Phase label shown in the hero pill
  const phaseLabel = (() => {
    const p = profile?.training_phase
    if (!p) return null
    return p.charAt(0).toUpperCase() + p.slice(1).replace(/_/g, ' ')
  })()

  return (
    <div className="min-h-screen p-5 pb-36">

      {/* ── Top bar ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-8 pt-4">
        <div className="t-label">Lifts</div>
        <Link href="/profile">
          <div
            className="w-10 h-10 rounded-full border border-[var(--accent-line)] flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, var(--accent-soft), transparent)' }}
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover rounded-full" />
            ) : (
              <span className="font-semibold text-sm text-[var(--accent)]">{initial}</span>
            )}
          </div>
        </Link>
      </div>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <div className="mb-7 fade-up">
        {/* Greeting line */}
        <p className="text-[13px] text-[var(--text-mid)] mb-1.5">
          {greeting}, <span className="text-[var(--text-hi)]">{firstName}</span>
        </p>

        {/* Display headline */}
        <h1 className="t-display-l mb-4">
          Welcome back<span className="t-display-em">.</span>
        </h1>

        {/* Phase + context pills */}
        <div className="flex items-center gap-2 mb-6">
          {phaseLabel && (
            <span className="inline-flex items-center h-6 px-3 rounded-full text-[10px] font-medium tracking-widest uppercase bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent-line)]">
              {phaseLabel}
            </span>
          )}
          {totalWorkouts > 0 && (
            <span className="inline-flex items-center h-6 px-3 rounded-full text-[10px] font-medium tracking-widest uppercase bg-white/[0.04] text-[var(--text-low)] border border-[var(--glass-border)]">
              {totalWorkouts} sessions
            </span>
          )}
        </div>

        {/* Start workout CTA card */}
        <Link href="/routines">
          <div
            className="relative overflow-hidden rounded-[var(--radius-card)] p-5 flex items-center justify-between group active:scale-[0.98] transition-transform"
            style={{
              background: 'linear-gradient(135deg, rgba(243,192,138,0.18) 0%, rgba(243,192,138,0.06) 100%)',
              border: '1px solid var(--accent-line)',
              boxShadow: '0 0 40px rgba(243,192,138,0.08)',
            }}
          >
            {/* Ambient glow behind icon */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 w-24 h-24 rounded-full opacity-20 blur-2xl"
              style={{ background: 'var(--accent)' }} />

            <div className="relative z-10">
              <p className="t-label mb-1">Ready to train?</p>
              <p className="font-semibold text-[17px] text-[var(--text-hi)] leading-tight">
                Start a workout
              </p>
              <p className="text-[12px] text-[var(--text-mid)] mt-0.5">
                Pick a routine or go empty
              </p>
            </div>

            <div className="relative z-10 w-12 h-12 rounded-[var(--radius-inner)] flex items-center justify-center shrink-0"
              style={{ background: 'var(--accent)' }}>
              <Dumbbell className="w-5 h-5" style={{ color: 'var(--accent-on)' }} />
            </div>
          </div>
        </Link>
      </div>

      {/* ── Stat grid ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="glass p-4">
          <div className="t-label mb-2">Workouts</div>
          <p className="mono text-4xl font-medium text-[var(--text-hi)] tracking-tighter">
            {totalWorkouts}
          </p>
        </div>
        <div className="glass p-4 relative overflow-hidden">
          <div className="t-label mb-2">Volume</div>
          <p className="mono text-4xl font-medium text-[var(--accent)] tracking-tighter relative z-10"
            style={{ textShadow: '0 0 24px var(--accent-glow)' }}>
            {totalVolume >= 1000 ? `${(totalVolume / 1000).toFixed(1)}k` : totalVolume}
            <span className="text-base text-[var(--text-low)] ml-1">kg</span>
          </p>
          <div className="absolute -right-3 -bottom-3 opacity-[0.07] text-[var(--accent)]">
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M6 4v16M18 4v16M2 9h4m12 0h4M2 15h4m12 0h4M6 9h12M6 15h12"/>
            </svg>
          </div>
        </div>
      </div>

      {/* ── Bodyweight ─────────────────────────────────────────── */}
      <div className="glass px-4 py-3 mb-5">
        <div className="flex items-center justify-between mb-2">
          <div className="t-label">Bodyweight</div>
          {latestBodyweight && (
            <Link href="/progress" className="text-[9px] font-medium tracking-widest uppercase text-[var(--accent)] opacity-70 hover:opacity-100 transition-opacity">
              View trend →
            </Link>
          )}
        </div>
        <BodyweightLogger latestWeight={latestBodyweight?.weight_kg ?? null} />
      </div>

      {/* ── Insights ───────────────────────────────────────────── */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="t-display-s">Insights</h2>
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

      {/* ── Recent ─────────────────────────────────────────────── */}
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
