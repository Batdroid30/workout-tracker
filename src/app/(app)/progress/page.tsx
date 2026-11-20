import { Suspense } from 'react'
import { ProgressionLineChart } from '@/components/ui/ProgressionLineChart'
import { Card, Chip } from '@/components/ui'
import { WeeklyBodyMapCard } from '@/components/progress/WeeklyBodyMapCard'
import { PhaseCoachDetail } from '@/components/progress/PhaseCoachDetail'
import { BodyweightSection } from '@/components/progress/BodyweightSection'
import { requireAuth } from '@/lib/auth'
import { getWorkoutsSummary } from '@/lib/data/workouts'
import { getProfile } from '@/lib/data/profile'
import { getProgressSnapshot, getMondayOf } from '@/lib/data/progress-snapshot'
import { computeStrengthIndex, getVolumeLandmarksByMuscle } from '@/lib/data/phase-coach'
import { getBodyweightHistory } from '@/lib/data/bodyweight'
import { getWorkoutCalendarData } from '@/lib/data/insights'
import { buildMesocycleTimeline } from '@/lib/phase-coach'
import { getTrainingCycle } from '@/lib/data/training-cycle'
import { getStrengthLifts } from '@/lib/data/strength-lifts'
import { OverviewStatsRow } from '@/components/progress/OverviewStatsRow'
import { CoachingSection } from '@/components/progress/CoachingSection'
import { WorkoutCalendar } from '@/components/progress/WorkoutCalendar'
import { FrequencyTrendChart } from '@/components/progress/FrequencyTrendChart'
import { KeyLiftsTrendSection } from '@/components/progress/KeyLiftsTrendSection'
import type { KeyLiftTrendData } from '@/components/progress/KeyLiftsTrendSection'
import { StaleLiftAlerts } from '@/components/progress/StaleLiftAlerts'
import { PRTimelineList } from '@/components/progress/PRTimelineList'
import { getPersonalRecordsData } from '@/lib/data/insights'
import { AntagonistBalanceCard } from '@/components/progress/AntagonistBalanceCard'
import type { AntagonistSetCounts } from '@/components/progress/AntagonistBalanceCard'
import { ReadinessTrendCharts } from '@/components/progress/ReadinessTrendCharts'
import { WeightChangeSummary } from '@/components/progress/WeightChangeSummary'
import { BodyCompositionOverlayChart } from '@/components/progress/BodyCompositionOverlayChart'
import type { OverlayPoint } from '@/components/progress/BodyCompositionOverlayChart'
import type { StrengthIndexPoint } from '@/lib/data/phase-coach'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

// Entry points to the lifter's full data, until Progress is redesigned.
const DATA_LINKS = [
  { href: '/history',   label: 'Workout history', hint: "Every session you've logged" },
  { href: '/exercises', label: 'Exercises',       hint: 'Your library and per-lift stats' },
] as const
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
        <div className="card p-4">
          <div className="t-label mb-3">Weight vs strength</div>
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
      {prData.history.length > 0 && (
        <div>
          <div className="t-label mb-2">PR timeline</div>
          <PRTimelineList history={prData.history} />
        </div>
      )}
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function ProgressPage() {
  const { userId, session } = await requireAuth()

  // Core queries — run in parallel. Snapshot replaces 6 independent sets scans.
  // calendarData fetches workouts table only (no joins) — very lightweight.
  const [snapshot, profile, { totalVolume }, calendarData, trainingCycle] = await Promise.all([
    getProgressSnapshot(userId),
    getProfile(userId),
    getWorkoutsSummary(userId),
    getWorkoutCalendarData(userId),
    getTrainingCycle(userId),
  ])

  // Pure — no DB call
  const { indexLifts } = await getStrengthLifts(userId)
  const strengthIndex = computeStrengthIndex(
    snapshot.exerciseWeeklyE1RM,
    indexLifts,
    profile,
  )

  // Passes snapshot.currentWeekSetsByMuscle → skips one sets scan internally
  const volumeLandmarks = await getVolumeLandmarksByMuscle(
    userId,
    profile,
    snapshot.currentWeekSetsByMuscle,
    undefined
  )

  const weeksInPhase = profile?.phase_started_at ? trainingCycle.phaseWeek : null

  const mesocycle = buildMesocycleTimeline({
    phaseStartedAt:     profile?.phase_started_at   ?? null,
    experienceLevel:    profile?.experience_level   ?? null,
    trainingPhase:      profile?.training_phase     ?? null,
    weeklyGoalSessions: profile?.weekly_goal_sessions ?? 3,
    phaseWeek:           trainingCycle.phaseWeek,
    phaseTrainingWeeks:  trainingCycle.phaseTrainingWeeks,
    currentWeekStart:    trainingCycle.currentWeekStart,
    currentWeekSessions: trainingCycle.currentWeekSessions,
  })

  // Volume chart derived from snapshot — oldest to newest, label-formatted
  const chartData = snapshot.weeklyData.map(w => ({
    date:  new Date(w.weekStart).toLocaleDateString([], { month: 'short', day: 'numeric' }),
    value: w.totalVolume,
  }))

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

  return (
    <div className="min-h-screen p-5 pb-28">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="pt-4 mb-7">
        <div className="t-label mb-1.5">Progress</div>
        <h1 className="t-display-l">
          Your data<span className="italic">.</span>
        </h1>
      </div>

      <div className="space-y-5">

        <Card padding="none" as="section">
          {DATA_LINKS.map((link, index) => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex min-h-14 items-center justify-between gap-3 px-4 py-3 ${index > 0 ? 'border-t border-border' : ''}`}
            >
              <span className="min-w-0">
                <span className="t-body block">{link.label}</span>
                <span className="t-caption block truncate">{link.hint}</span>
              </span>
              <ChevronRight className="w-5 h-5 shrink-0 text-tertiary" aria-hidden="true" />
            </Link>
          ))}
        </Card>

        <CoachingSection userId={userId} />

        {/* ── Muscle focus body map ───────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="t-display-s">Muscle focus</h2>
            <Chip>This week</Chip>
          </div>
          <WeeklyBodyMapCard volumeLandmarks={volumeLandmarks} />
        </section>

        {/* ── Overview stats row ───────────────────────────────────────── */}
        <OverviewStatsRow
          currentStreak={calendarData.currentStreak}
          longestStreak={calendarData.longestStreak}
          trainingAgeWeeks={calendarData.trainingAgeWeeks}
          daysSinceLastSession={daysSinceLastSession}
          totalVolumeKg={totalVolume}
        />

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

        {/* ── Consistency section ─────────────────────────────────────── */}
        <section>
          <h2 className="t-display-s mb-3">Consistency</h2>

          {/* Calendar heatmap */}
          <div className="mb-3">
            <WorkoutCalendar entries={calendarData.calendarEntries} />
          </div>

          {/* Frequency trend */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="t-label">Sessions / week</div>
              <span className="t-caption text-tertiary">
                — goal: {profile?.weekly_goal_sessions ?? 3}×
              </span>
            </div>
            <FrequencyTrendChart
              weeklyData={snapshot.weeklyData}
              weeklyGoal={profile?.weekly_goal_sessions ?? 3}
            />
          </div>
        </section>

        {/* ── Strength section ─────────────────────────────────────────── */}
        <section>
          <h2 className="t-display-s mb-3">Strength</h2>

          {/* Key lifts e1RM sparklines — no DB call, derived from snapshot */}
          <div className="mb-3">
            <div className="t-label mb-2">Key lift trends (e1RM)</div>
            <KeyLiftsTrendSection lifts={keyLiftsTrendData} />
          </div>

          {/* Stale lift alerts — no DB call, derived from snapshot */}
          {staleLifts.length > 0 && (
            <div className="mb-3">
              <div className="t-label mb-2">Stalled lifts</div>
              <StaleLiftAlerts staleness={staleLifts} />
            </div>
          )}

          {/* PR timeline — streamed (separate personal_records query) */}
          <Suspense fallback={<PRSectionSkeleton />}>
            <StrengthPRLoader userId={userId} />
          </Suspense>
        </section>

        {/* ── Volume over time ─────────────────────────────────────────── */}
        <section>
          <h2 className="t-display-s mb-3">Volume</h2>
          <div className="card p-4">
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
          <div className="card p-4 mt-3">
            <ReadinessTrendCharts weeklyData={snapshot.weeklyData} />
          </div>
        </section>

        {/* ── Antagonist balance ───────────────────────────────────────── */}
        <AntagonistBalanceCard sets={antagonistSets} />

        {/* ── Bodyweight + composition (streamed) ──────────────────────── */}
        <div className="space-y-3">
          <Suspense fallback={<BodyweightSkeleton />}>
            <BodyweightLoader
              userId={userId}
              trainingPhase={profile?.training_phase ?? null}
            />
          </Suspense>
          {strengthIndex.history.length >= 2 && (
            <Suspense fallback={<BodyCompSkeleton />}>
              <BodyCompositionLoader
                userId={userId}
                trainingPhase={profile?.training_phase ?? null}
                strengthHistory={strengthIndex.history}
              />
            </Suspense>
          )}
        </div>


      </div>
    </div>
  )
}

// ── Loading skeletons ─────────────────────────────────────────────────────────

function BodyweightSkeleton() {
  return (
    <div className="card p-4 motion-safe:animate-pulse">
      <div className="h-4 w-32 bg-surface-raised rounded mb-3" />
      <div className="h-24 bg-surface-raised rounded" />
    </div>
  )
}

function BodyCompSkeleton() {
  return (
    <div className="space-y-3 motion-safe:animate-pulse">
      <div className="card p-4 h-[80px]">
        <div className="h-3 w-28 bg-surface-raised rounded mb-3" />
        <div className="h-5 w-40 bg-surface-raised rounded" />
      </div>
      <div className="card p-4 h-[220px]">
        <div className="h-3 w-32 bg-surface-raised rounded mb-3" />
        <div className="h-[160px] bg-surface-raised rounded" />
      </div>
    </div>
  )
}

function PRSectionSkeleton() {
  return (
    <div className="space-y-4 motion-safe:animate-pulse">
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card p-3 flex items-center gap-3">
            <div className="w-7 h-7 rounded bg-surface-raised" />
            <div className="flex-1">
              <div className="h-3 w-28 bg-surface-raised rounded mb-1.5" />
              <div className="h-2.5 w-16 bg-surface-raised rounded" />
            </div>
            <div className="h-3 w-16 bg-surface-raised rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
