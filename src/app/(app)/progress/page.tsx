import { ProgressionLineChart } from '@/components/ui/ProgressionLineChart'
import { WeeklyMuscleRadarChart } from '@/components/ui/WeeklyMuscleRadarChart'
import { PhaseCoachDetail } from '@/components/progress/PhaseCoachDetail'
import { BodyweightSection } from '@/components/progress/BodyweightSection'
import { auth } from '@/lib/auth'
import { getWorkoutsSummary, getVolumeHistory } from '@/lib/data/workouts'
import { getWeeklyMuscleGroupStats } from '@/lib/data/stats'
import { getProfile } from '@/lib/data/profile'
import { getWeeklyTrainingSummary } from '@/lib/data/insights'
import {
  getStrengthIndex,
  getVolumeLandmarksByMuscle,
  getKeyLifts,
} from '@/lib/data/phase-coach'
import { getBodyweightHistory, getLatestBodyweight } from '@/lib/data/bodyweight'
import { getWeeksInPhase, buildMesocycleTimeline } from '@/lib/phase-coach'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { TrendingUp, Activity } from 'lucide-react'

export default async function ProgressPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const userId = session.user.id

  const [{ totalVolume }, volumeHistory, radarData, profile, keyLifts, weeks, bwHistory, bwLatest] = await Promise.all([
    getWorkoutsSummary(userId),
    getVolumeHistory(userId),
    getWeeklyMuscleGroupStats(userId),
    getProfile(userId),
    getKeyLifts(userId),
    getWeeklyTrainingSummary(userId),
    getBodyweightHistory(userId),
    getLatestBodyweight(userId),
  ])

  const [strengthIndex, volumeLandmarks] = await Promise.all([
    getStrengthIndex(userId, profile),
    getVolumeLandmarksByMuscle(userId, profile),
  ])

  const mesocycle = buildMesocycleTimeline({
    phaseStartedAt:     profile?.phase_started_at ?? null,
    experienceLevel:    profile?.experience_level ?? null,
    trainingPhase:      profile?.training_phase   ?? null,
    weeklyData:         weeks,
    weeklyGoalSessions: profile?.weekly_goal_sessions ?? 3,
  })

  const chartData = volumeHistory.map(item => ({
    date:  new Date(item.date).toLocaleDateString([], { month: 'short', day: 'numeric' }),
    value: item.volume,
  }))

  const formattedVolume = totalVolume >= 1_000_000
    ? `${(totalVolume / 1_000_000).toFixed(2)}M`
    : totalVolume >= 1_000
    ? `${(totalVolume / 1_000).toFixed(1)}k`
    : String(totalVolume)

  return (
    <div className="min-h-screen pb-24 p-5">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="pt-4 mb-7">
        <div className="t-label mb-1.5">Progress</div>
        <h1 className="t-display-l">
          Your data<span style={{ fontStyle: 'italic', color: 'var(--accent)' }}>.</span>
        </h1>
      </div>

      <div className="space-y-5">

        {/* ── Lifetime volume ──────────────────────────────────────────── */}
        <div
          className="glass p-4 flex items-center justify-between"
          style={{ borderColor: 'var(--accent-line)' }}
        >
          <div>
            <div className="t-label mb-1">Total Volume Lifted</div>
            <p
              className="mono text-4xl font-medium tracking-tighter"
              style={{ color: 'var(--accent)', textShadow: '0 0 24px var(--accent-glow)' }}
            >
              {formattedVolume}
              <span className="text-base ml-1" style={{ color: 'var(--accent-line)' }}>kg</span>
            </p>
          </div>
          <div
            className="w-12 h-12 rounded-[var(--radius-inner)] flex items-center justify-center"
            style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-line)' }}
          >
            <TrendingUp className="w-5 h-5" style={{ color: 'var(--accent)' }} />
          </div>
        </div>

        {/* ── Phase Coach detail ───────────────────────────────────────── */}
        <PhaseCoachDetail
          trainingPhase={profile?.training_phase    ?? null}
          experienceLevel={profile?.experience_level ?? null}
          weeksInPhase={getWeeksInPhase(profile?.phase_started_at ?? null)}
          strengthIndex={strengthIndex}
          volumeLandmarks={volumeLandmarks}
          keyLifts={keyLifts}
          mesocycle={mesocycle}
        />

        {/* ── Volume over time ─────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="t-display-s">Volume Trend</h2>
          </div>
          <div className="glass p-4">
            {chartData.length > 1 ? (
              <div className="h-[200px] w-full">
                <ProgressionLineChart data={chartData} color="#f3c08a" formatType="volume" />
              </div>
            ) : (
              <div className="h-[120px] flex items-center justify-center">
                <p className="t-caption text-center">Log a few workouts to see your volume trend.</p>
              </div>
            )}
          </div>
        </section>

        {/* ── Bodyweight ───────────────────────────────────────────────── */}
        <BodyweightSection
          history={bwHistory}
          latestWeight={bwLatest}
          trainingPhase={profile?.training_phase ?? null}
        />

        {/* ── Muscle focus radar ───────────────────────────────────────── */}
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
            <p className="t-caption text-center mt-2">
              Distribution of working sets across muscle groups this week.
            </p>
          </div>
        </section>

        {/* ── Exercise drill-down ──────────────────────────────────────── */}
        <section>
          <h2 className="t-display-s mb-3">Exercise Detail</h2>
          <div className="glass p-4 flex items-center gap-4">
            <div
              className="w-11 h-11 rounded-[var(--radius-inner)] flex items-center justify-center shrink-0"
              style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-line)' }}
            >
              <Activity className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            </div>
            <div className="flex-1">
              <p className="text-[13px] font-semibold text-[var(--text-hi)]">Per-Exercise Stats</p>
              <p className="t-caption mt-0.5">View e1RM progression, max weight and PRs for any exercise.</p>
            </div>
            <Link
              href="/exercises"
              className="shrink-0 h-9 px-4 rounded-[var(--radius-pill)] text-[10px] font-semibold uppercase tracking-widest transition-all active:scale-95 hover:opacity-90 flex items-center justify-center"
              style={{ background: 'var(--accent)', color: 'var(--accent-on)' }}
            >
              Browse
            </Link>
          </div>
        </section>

      </div>
    </div>
  )
}
