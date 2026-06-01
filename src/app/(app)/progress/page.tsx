import { Suspense } from 'react'
import { ProgressionLineChart } from '@/components/ui/ProgressionLineChart'
import { WeeklyMuscleRadarChart } from '@/components/ui/WeeklyMuscleRadarChart'
import { PhaseCoachDetail } from '@/components/progress/PhaseCoachDetail'
import { BodyweightSection } from '@/components/progress/BodyweightSection'
import { TopPRsTable } from '@/components/profile/TopPRsTable'
import { requireAuth } from '@/lib/auth'
import { getWorkoutsSummary } from '@/lib/data/workouts'
import { getTopPersonalRecords } from '@/lib/data/stats'
import { getProfile } from '@/lib/data/profile'
import { getProgressSnapshot, getMondayOf } from '@/lib/data/progress-snapshot'
import { computeStrengthIndex, getVolumeLandmarksByMuscle } from '@/lib/data/phase-coach'
import { getBodyweightHistory } from '@/lib/data/bodyweight'
import { getWorkoutCalendarData } from '@/lib/data/insights'
import { getWeeksInPhase, buildMesocycleTimeline } from '@/lib/phase-coach'
import { OverviewStatsRow } from '@/components/progress/OverviewStatsRow'
import { MonthOverMonthCard } from '@/components/progress/MonthOverMonthCard'
import { WorkoutCalendar } from '@/components/progress/WorkoutCalendar'
import { FrequencyTrendChart } from '@/components/progress/FrequencyTrendChart'
import { KeyLiftsTrendSection } from '@/components/progress/KeyLiftsTrendSection'
import type { KeyLiftTrendData } from '@/components/progress/KeyLiftsTrendSection'
import { StaleLiftAlerts } from '@/components/progress/StaleLiftAlerts'
import { PRVelocityChart } from '@/components/progress/PRVelocityChart'
import { PRTimelineList } from '@/components/progress/PRTimelineList'
import { getPersonalRecordsData } from '@/lib/data/insights'
import { PushPullLegsCard } from '@/components/progress/PushPullLegsCard'
import { AntagonistBalanceCard } from '@/components/progress/AntagonistBalanceCard'
import type { AntagonistSetCounts } from '@/components/progress/AntagonistBalanceCard'
import { MuscleVolumeTrendChart } from '@/components/progress/MuscleVolumeTrendChart'
import { DeloadReadinessCard } from '@/components/progress/DeloadReadinessCard'
import { ReadinessTrendCharts } from '@/components/progress/ReadinessTrendCharts'
import { WeightChangeSummary } from '@/components/progress/WeightChangeSummary'
import { BodyCompositionOverlayChart } from '@/components/progress/BodyCompositionOverlayChart'
import type { OverlayPoint } from '@/components/progress/BodyCompositionOverlayChart'
import type { StrengthIndexPoint } from '@/lib/data/phase-coach'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { TrendingUp, Activity } from 'lucide-react'
import type { BodyweightPoint } from '@/lib/data/bodyweight'
import type { TrainingPhase } from '@/types/database'

// ── Async sub-components for Suspense streaming ───────────────────────────────

async function BodyweightLoader({
  userId,
  trainingPhase,
}: {
  userId:        string
  trainingPhase: TrainingPhase | null
  accessToken?:  string
}) {
  const history     = await getBodyweightHistory(userId, 12)
  const latestWeight: BodyweightPoint | null = history.length > 0 ? history[history.length - 1] : null
  return (
    <BodyweightSection
      history={history}
      latestWeight={latestWeight}
      trainingPhase={trainingPhase}
    />
  )
}

async function TopPRsLoader({ userId }: { userId: string }) {
  const topPRs = await getTopPersonalRecords(userId)
  return <TopPRsTable prs={topPRs} />
}

async function BodyCompositionLoader({
  userId,
  trainingPhase,
  strengthHistory,
}: {
  userId:          string
  trainingPhase:   TrainingPhase | null
  strengthHistory: StrengthIndexPoint[]
  accessToken?:    string
}) {
  // React cache deduplicates — same DB call as BodyweightLoader
  const bwHistory = await getBodyweightHistory(userId, 12)
  if (bwHistory.length === 0) return null

  // Align bodyweight to weeks: compute average bodyweight per ISO week
  const weekBwMap = new Map<string, number[]>()
  for (const pt of bwHistory) {
    const wk = getMondayOf(new Date(pt.date + 'T00:00:00Z'))
    if (!weekBwMap.has(wk)) weekBwMap.set(wk, [])
    weekBwMap.get(wk)!.push(pt.weight_kg)
  }

  // Normalise bodyweight relative to first week's average (% change)
  const weekBwAvg = new Map<string, number>()
  for (const [wk, readings] of weekBwMap) {
    weekBwAvg.set(wk, readings.reduce((s, v) => s + v, 0) / readings.length)
  }
  const firstBwKey = Array.from(weekBwAvg.keys()).sort()[0]
  if (!firstBwKey) return null
  const firstBw = weekBwAvg.get(firstBwKey)!
  const bwNorm  = (kg: number) => ((kg - firstBw) / firstBw) * 100

  // Build overlay: union of weeks from both series
  const allWeeks = new Set<string>([
    ...Array.from(weekBwAvg.keys()),
    ...strengthHistory.map(p => p.weekStart),
  ])

  // Strength index: normalise around its own baseline (index 1.0 = 0%)
  const strengthByWeek = new Map(strengthHistory.map(p => [p.weekStart, (p.index - 1) * 100]))

  const overlayData: OverlayPoint[] = Array.from(allWeeks)
    .sort()
    .slice(-12)   // last 12 weeks
    .map(wk => {
      const bwAvg = weekBwAvg.get(wk)
      const weight  = bwAvg != null ? Number(bwNorm(bwAvg).toFixed(2)) : null
      const strength = strengthByWeek.has(wk)
        ? Number(strengthByWeek.get(wk)!.toFixed(2))
        : null
      return {
        label:     new Date(wk + 'T00:00:00Z').toLocaleDateString([], { month: 'short', day: 'numeric' }),
        weekStart: wk,
        weight,
        strength,
      }
    })

  return (
    <div className="space-y-3">
      <WeightChangeSummary bwHistory={bwHistory} trainingPhase={trainingPhase} />
      {overlayData.some(d => d.strength !== null) && (
        <div className="glass p-4">
          <div className="t-label mb-3">Weight vs Strength</div>
          <BodyCompositionOverlayChart data={overlayData} />
        </div>
      )}
    </div>
  )
}

async function StrengthPRLoader({ userId }: { userId: string }) {
  const prData = await getPersonalRecordsData(userId)
  return (
    <div className="space-y-4">
      {prData.velocityByMonth.length > 0 && (
        <div className="glass p-4">
          <div className="t-label mb-3">PRs per Month</div>
          <PRVelocityChart velocityByMonth={prData.velocityByMonth} />
        </div>
      )}
      {prData.history.length > 0 && (
        <div>
          <div className="t-label mb-2">PR Timeline</div>
          <PRTimelineList history={prData.history} />
        </div>
      )}
    </div>
  )
}

// ── Radar data derived from snapshot (no extra query) ─────────────────────────

const RADAR_MUSCLES = [
  'chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms',
  'quads', 'hamstrings', 'glutes', 'calves', 'core', 'traps', 'lats',
] as const

function buildRadarData(setsByMuscle: Record<string, number>) {
  const maxSets = Math.max(10, ...Object.values(setsByMuscle))
  return RADAR_MUSCLES.map(group => ({
    subject:  group.toUpperCase(),
    A:        setsByMuscle[group] ?? 0,
    fullMark: maxSets,
  }))
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function ProgressPage() {
  const { userId, session } = await requireAuth()

  // Core queries — run in parallel. Snapshot replaces 6 independent sets scans.
  // calendarData fetches workouts table only (no joins) — very lightweight.
  const [snapshot, profile, { totalVolume }, calendarData] = await Promise.all([
    getProgressSnapshot(userId),
    getProfile(userId),
    getWorkoutsSummary(userId),
    getWorkoutCalendarData(userId),
  ])

  // Pure — no DB call
  const strengthIndex = computeStrengthIndex(
    snapshot.exerciseWeeklyE1RM,
    snapshot.keyLifts,
    profile,
  )

  // Passes snapshot.currentWeekSetsByMuscle → skips one sets scan internally
  const volumeLandmarks = await getVolumeLandmarksByMuscle(
    userId,
    profile,
    snapshot.currentWeekSetsByMuscle,
    undefined
  )

  const weeksInPhase = getWeeksInPhase(profile?.phase_started_at ?? null)

  const mesocycle = buildMesocycleTimeline({
    phaseStartedAt:     profile?.phase_started_at   ?? null,
    experienceLevel:    profile?.experience_level   ?? null,
    trainingPhase:      profile?.training_phase     ?? null,
    weeklyData:         snapshot.weeklyData.map(w => ({
      week_start:    w.weekStart,
      workout_count: w.sessionCount,
    })),
    weeklyGoalSessions: profile?.weekly_goal_sessions ?? 3,
  })

  // Volume chart derived from snapshot — oldest to newest, label-formatted
  const chartData = snapshot.weeklyData.map(w => ({
    date:  new Date(w.weekStart).toLocaleDateString([], { month: 'short', day: 'numeric' }),
    value: w.totalVolume,
  }))

  // Radar derived from snapshot current-week sets (ISO week, no extra query)
  const radarData = buildRadarData(snapshot.currentWeekSetsByMuscle)

  // ── Key lift trend data: serialise Maps → plain arrays for client components ──
  const keyLiftsTrendData: KeyLiftTrendData[] = snapshot.keyLifts.map(lift => ({
    exerciseId:   lift.exerciseId,
    exerciseName: lift.exerciseName,
    muscleGroup:  lift.muscleGroup,
    weeklyE1RM:   Array.from(
      snapshot.exerciseWeeklyE1RM.get(lift.exerciseId)?.entries() ?? []
    )
      .map(([weekStart, e1rm]) => ({ weekStart, e1rm }))
      .sort((a, b) => a.weekStart.localeCompare(b.weekStart)),
  }))

  // ── Stale lifts: exercises with flat/declining e1RM across 3-week windows ────
  const staleLifts = Array.from(snapshot.exerciseStaleness.values())
    .filter(e =>
      e.previousBest > 0 &&
      e.recentBest   > 0 &&
      e.recentSessions   >= 2 &&
      e.previousSessions >= 2 &&
      (e.recentBest - e.previousBest) / e.previousBest < 0.03,
    )
    .sort((a, b) => {
      const pctA = (a.recentBest - a.previousBest) / a.previousBest
      const pctB = (b.recentBest - b.previousBest) / b.previousBest
      return pctA - pctB  // worst (most negative) first
    })
    .slice(0, 3)

  // ── Antagonist balance: accumulate across all 12 weeks ───────────────────────
  const antagonistSets: AntagonistSetCounts = {
    chest: 0, back: 0, lats: 0, quads: 0, hamstrings: 0, biceps: 0, triceps: 0,
  }
  for (const w of snapshot.weeklyData) {
    for (const [muscle, count] of Object.entries(w.setsByMuscle)) {
      if (muscle in antagonistSets) {
        antagonistSets[muscle as keyof AntagonistSetCounts] += count
      }
    }
  }

  // Days since last session — derived from calendar entries (already loaded)
  const lastDate = calendarData.calendarEntries.at(-1)?.date ?? null
  const daysSinceLastSession = lastDate
    ? Math.floor((Date.now() - new Date(lastDate + 'T00:00:00Z').getTime()) / 86_400_000)
    : null

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

        {/* ── Overview stats row ───────────────────────────────────────── */}
        <OverviewStatsRow
          currentStreak={calendarData.currentStreak}
          longestStreak={calendarData.longestStreak}
          trainingAgeWeeks={calendarData.trainingAgeWeeks}
          daysSinceLastSession={daysSinceLastSession}
        />

        {/* ── Consistency section ─────────────────────────────────────── */}
        <section>
          <h2 className="t-display-s mb-3">Consistency</h2>

          {/* Calendar heatmap */}
          <div className="mb-3">
            <WorkoutCalendar entries={calendarData.calendarEntries} />
          </div>

          {/* Frequency trend */}
          <div className="glass p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="t-label">Sessions / Week</div>
              <span className="t-caption" style={{ color: 'var(--text-lo)' }}>
                — goal: {profile?.weekly_goal_sessions ?? 3}×
              </span>
            </div>
            <FrequencyTrendChart
              weeklyData={snapshot.weeklyData}
              weeklyGoal={profile?.weekly_goal_sessions ?? 3}
            />
          </div>
        </section>

        {/* ── Phase Coach detail ───────────────────────────────────────── */}
        <PhaseCoachDetail
          trainingPhase={profile?.training_phase    ?? null}
          experienceLevel={profile?.experience_level ?? null}
          weeksInPhase={weeksInPhase}
          strengthIndex={strengthIndex}
          volumeLandmarks={volumeLandmarks}
          keyLifts={snapshot.keyLifts}
          mesocycle={mesocycle}
        />

        {/* ── Strength section ─────────────────────────────────────────── */}
        <section>
          <h2 className="t-display-s mb-3">Strength</h2>

          {/* Key lifts e1RM sparklines — no DB call, derived from snapshot */}
          <div className="mb-3">
            <div className="t-label mb-2">Key Lift Trends (e1RM)</div>
            <KeyLiftsTrendSection lifts={keyLiftsTrendData} />
          </div>

          {/* Stale lift alerts — no DB call, derived from snapshot */}
          {staleLifts.length > 0 && (
            <div className="mb-3">
              <div className="t-label mb-2">Stalled Lifts</div>
              <StaleLiftAlerts staleness={staleLifts} />
            </div>
          )}

          {/* PR velocity + timeline — streamed (separate personal_records query) */}
          <Suspense fallback={<PRSectionSkeleton />}>
            <StrengthPRLoader userId={userId} />
          </Suspense>
        </section>

        {/* ── Volume over time ─────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="t-display-s">Volume Trend</h2>
          </div>
          <div className="glass p-4">
            {chartData.length > 1 ? (
              <div className="h-[200px] w-full">
                <ProgressionLineChart data={chartData} formatType="volume" />
              </div>
            ) : (
              <div className="h-[120px] flex items-center justify-center">
                <p className="t-caption text-center">Log a few workouts to see your volume trend.</p>
              </div>
            )}
          </div>
        </section>

        {/* ── Volume Intelligence section ──────────────────────────────── */}
        <section>
          <h2 className="t-display-s mb-3">Volume</h2>

          {/* Stacked weekly volume by category (push/pull/legs) */}
          <div className="glass p-4 mb-3">
            <div className="t-label mb-3">Weekly Sets by Category</div>
            <MuscleVolumeTrendChart weeklyData={snapshot.weeklyData} />
          </div>

          {/* Push/pull/legs 12-week balance */}
          <div className="mb-3">
            <PushPullLegsCard
              pushSets={snapshot.pushSets}
              pullSets={snapshot.pullSets}
              legSets={snapshot.legSets}
            />
          </div>

          {/* Antagonist muscle balance */}
          <AntagonistBalanceCard sets={antagonistSets} />
        </section>

        {/* ── Readiness & Recovery section ─────────────────────────────── */}
        <section>
          <h2 className="t-display-s mb-3">Readiness</h2>
          <div className="space-y-3">
            <DeloadReadinessCard
              weeklyData={snapshot.weeklyData}
              staleLiftsCount={staleLifts.length}
            />
            <div className="glass p-4">
              <ReadinessTrendCharts weeklyData={snapshot.weeklyData} />
            </div>
          </div>
        </section>

        {/* ── Bodyweight (streamed) ────────────────────────────────────── */}
        <Suspense fallback={<BodyweightSkeleton />}>
          <BodyweightLoader
            userId={userId}
            trainingPhase={profile?.training_phase ?? null}
          />
        </Suspense>

        {/* ── Body Composition (streamed — needs bodyweight history) ────── */}
        {strengthIndex.history.length >= 2 && (
          <section>
            <h2 className="t-display-s mb-3">Body Composition</h2>
            <Suspense fallback={<BodyCompSkeleton />}>
              <BodyCompositionLoader
                userId={userId}
                trainingPhase={profile?.training_phase ?? null}
                strengthHistory={strengthIndex.history}
              />
            </Suspense>
          </section>
        )}

        {/* ── Muscle focus radar ───────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="t-display-s">Muscle Focus</h2>
            <span
              className="text-[9px] font-medium uppercase tracking-widest px-2.5 py-1 rounded-lg"
              style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-line)', color: 'var(--accent)' }}
            >
              This Week
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

        {/* ── Top Personal Records (streamed) ──────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="t-display-s">Top Personal Records</h2>
          </div>
          <Suspense fallback={<PRTableSkeleton />}>
            <TopPRsLoader userId={userId} />
          </Suspense>
        </section>

        {/* ── Month-over-month summary ─────────────────────────────────── */}
        <MonthOverMonthCard weeklyData={snapshot.weeklyData} />

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

// ── Loading skeletons ─────────────────────────────────────────────────────────

function BodyweightSkeleton() {
  return (
    <div className="glass p-4 animate-pulse">
      <div className="h-4 w-32 bg-[var(--surface-2)] rounded mb-3" />
      <div className="h-24 bg-[var(--surface-2)] rounded" />
    </div>
  )
}

function PRTableSkeleton() {
  return (
    <div className="glass p-4 animate-pulse space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="h-4 w-32 bg-[var(--surface-2)] rounded" />
          <div className="h-4 flex-1 bg-[var(--surface-2)] rounded" />
        </div>
      ))}
    </div>
  )
}

function BodyCompSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="glass p-4 h-[80px]">
        <div className="h-3 w-28 bg-[var(--surface-2)] rounded mb-3" />
        <div className="h-5 w-40 bg-[var(--surface-2)] rounded" />
      </div>
      <div className="glass p-4 h-[220px]">
        <div className="h-3 w-32 bg-[var(--surface-2)] rounded mb-3" />
        <div className="h-[160px] bg-[var(--surface-2)] rounded" />
      </div>
    </div>
  )
}

function PRSectionSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="glass p-4">
        <div className="h-3 w-24 bg-[var(--surface-2)] rounded mb-3" />
        <div className="h-[120px] bg-[var(--surface-2)] rounded" />
      </div>
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="glass p-3 flex items-center gap-3">
            <div className="w-7 h-7 rounded bg-[var(--surface-2)]" />
            <div className="flex-1">
              <div className="h-3 w-28 bg-[var(--surface-2)] rounded mb-1.5" />
              <div className="h-2.5 w-16 bg-[var(--surface-2)] rounded" />
            </div>
            <div className="h-3 w-16 bg-[var(--surface-2)] rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
