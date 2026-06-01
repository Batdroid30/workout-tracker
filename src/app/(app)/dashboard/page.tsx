import { requireAuth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getWorkoutsSummary, getRecentWorkouts } from '@/lib/data/workouts'
import { getProfile } from '@/lib/data/profile'
import { getLatestBodyweight, getBodyweightHistory } from '@/lib/data/bodyweight'
import { getRecentReadinessLogs, getTodayReadiness } from '@/lib/data/readiness'
import {
  getTrainingStreak,
  deriveWeeklySummary,
  getRecentPRs,
  getNeglectedMuscles,
  detectHypertrophicDissociation,
  deriveNextWorkoutSuggestion,
} from '@/lib/data/insights'
import {
  computeStrengthIndex,
  getVolumeLandmarksByMuscle,
  buildThisWeekMissions,
} from '@/lib/data/phase-coach'
import { getWeeksInPhase, buildMesocycleTimeline } from '@/lib/phase-coach'
import { DELOAD_THRESHOLDS, isCurrentWeekDeload } from '@/lib/workout-intelligence'
import { getBadges } from '@/lib/data/achievements'
import { assessFatigueLevel } from '@/lib/algorithms'
import { DashboardTabs } from '@/components/dashboard/DashboardTabs'
import { getProgressSnapshot } from '@/lib/data/progress-snapshot'
import { PUSH_MUSCLES, PULL_MUSCLES } from '@/lib/training-constants'
import { STALL_VARIATION_ADVICE } from '@/lib/workout-intelligence'

export default async function DashboardPage() {
  const { userId, session } = await requireAuth()

  // Parallel fetch 1: core queries, metrics, and progress snapshot
  const [
    workoutsSummary,
    recentWorkouts,
    profile,
    latestBodyweight,
    streak,
    snapshot,
    recentPRs,
    neglectedMuscles,
    bwHistory,
    recentReadiness,
    todayReadiness,
  ] = await Promise.all([
    getWorkoutsSummary(userId),
    getRecentWorkouts(userId),
    getProfile(userId),
    getLatestBodyweight(userId),
    getTrainingStreak(userId),
    getProgressSnapshot(userId),
    getRecentPRs(userId, 60),
    getNeglectedMuscles(userId),
    getBodyweightHistory(userId, 4),
    getRecentReadinessLogs(userId, 7),
    getTodayReadiness(userId),
  ])

  const totalVolume = workoutsSummary.totalVolume
  const totalWorkouts = workoutsSummary.totalWorkouts

  // Derive sets/volume metrics in memory from the snapshot
  const weeks = snapshot.weeklyData.map(w => ({
    week_start:    w.weekStart,
    total_volume:  w.totalVolume,
    workout_count: w.sessionCount,
    avg_rpe:       w.avgRpe,
  }))
  const keyLifts = snapshot.keyLifts
  const recentLoads = snapshot.recentLoads
  const mostImproved = snapshot.mostImprovedExercises

  // Derive push/pull balance from last 4 weeks of snapshot
  const pushPull = (() => {
    let pushSets = 0
    let pullSets = 0
    const last4Weeks = snapshot.weeklyData.slice(-4)
    for (const w of last4Weeks) {
      for (const [muscle, count] of Object.entries(w.setsByMuscle)) {
        if (PUSH_MUSCLES.has(muscle))      pushSets += count
        else if (PULL_MUSCLES.has(muscle)) pullSets += count
      }
    }
    const ratio = pushSets === 0 && pullSets === 0
      ? null
      : pullSets === 0
        ? Infinity
        : pushSets / pullSets
    return { pushSets, pullSets, ratio }
  })()

  // Derive stalled movements in memory from snapshot
  const stalledMovements = Array.from(snapshot.exerciseStaleness.values())
    .filter(ex =>
      ex.previousBest > 0 &&
      ex.recentBest   > 0 &&
      ex.recentSessions   >= 2 &&
      ex.previousSessions >= 2 &&
      (ex.recentBest - ex.previousBest) / ex.previousBest < 0.03
    )
    .map(ex => {
      const WEEKS_IN_WINDOW = 3
      const totalKg    = ex.recentBest - ex.previousBest
      const pctPerWeek = (totalKg / ex.previousBest) * 100 / WEEKS_IN_WINDOW
      const kgPerWeek  = totalKg / WEEKS_IN_WINDOW
      const movementKey = `${ex.muscleGroup}-${ex.movementPattern}`
      return {
        exerciseName: ex.name,
        currentBest:  Math.round(ex.recentBest  * 10) / 10,
        previousBest: Math.round(ex.previousBest * 10) / 10,
        pctPerWeek:   Math.round(pctPerWeek * 100) / 100,
        kgPerWeek:    Math.round(kgPerWeek  * 100) / 100,
        advice:       STALL_VARIATION_ADVICE[movementKey as keyof typeof STALL_VARIATION_ADVICE] ?? [],
      }
    })
    .sort((a, b) => a.pctPerWeek - b.pctPerWeek)
    .slice(0, 3)

  // Parallel fetch 2: queries needing profile resolution
  const [
    volumeLandmarks,
    badges,
  ] = await Promise.all([
    getVolumeLandmarksByMuscle(userId, profile, snapshot.currentWeekSetsByMuscle, snapshot.muscleFrequency),
    getBadges(userId, totalVolume, totalWorkouts),
  ])

  // Pure in-memory calculation for Strength Index
  const strengthIndex = computeStrengthIndex(
    snapshot.exerciseWeeklyE1RM,
    snapshot.keyLifts,
    profile,
  )

  // Derived coaching calculations
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

  const dissociation    = detectHypertrophicDissociation(bwHistory, strengthIndex.pctPerWeek, profile?.training_phase ?? null)
  const daysSinceLastPR = recentPRs.length > 0 ? recentPRs[0].daysAgo : null
  const fatigue         = assessFatigueLevel(weeks, daysSinceLastPR, profile ? {
    experience_level: profile.experience_level,
    training_phase:   profile.training_phase,
    phase_started_at: profile.phase_started_at,
  } : null, recentReadiness)
  
  const isDeloadWeek = fatigue.shouldSuggest || isCurrentWeekDeload(profile
    ? { phase_started_at: profile.phase_started_at ?? null, experience_level: profile.experience_level, training_phase: profile.training_phase }
    : null)
  
  const nextWorkout     = deriveNextWorkoutSuggestion(neglectedMuscles)
  const mesocycle       = buildMesocycleTimeline({
    phaseStartedAt:     profile?.phase_started_at ?? null,
    experienceLevel:    profile?.experience_level ?? null,
    trainingPhase:      profile?.training_phase   ?? null,
    weeklyData:         weeks,
    weeklyGoalSessions,
  })

  const missions = buildThisWeekMissions({
    stalledMovements,
    neglectedMuscles,
    volumeLandmarks,
    pushPullBalance: pushPull,
    keyLifts,
    recentLoads,
    profile: profile
      ? {
          training_goal:    profile.training_goal,
          experience_level: profile.experience_level,
          phase_started_at: profile.phase_started_at ?? null,
          training_phase:   profile.training_phase   ?? null,
        }
      : null,
  })

  return (
    <div className="min-h-screen p-5 pb-36">
      <DashboardTabs
        userId={userId}
        firstName={firstName}
        greeting={greeting}
        dateLabel={dateLabel}
        avatarUrl={profile?.avatar_url ?? null}
        initial={initial}
        totalWorkouts={totalWorkouts}
        totalVolume={totalVolume}
        weeklyGoalSessions={weeklyGoalSessions}
        recentWorkouts={recentWorkouts}
        latestBodyweight={latestBodyweight}
        streak={streak}
        weeks={weeks}
        recentPRs={recentPRs}
        profile={profile}
        mostImproved={mostImproved}
        neglectedMuscles={neglectedMuscles}
        stalledMovements={stalledMovements}
        badges={badges}
        pushPull={pushPull}
        keyLifts={keyLifts}
        recentLoads={recentLoads}
        bwHistory={bwHistory}
        volumeLandmarks={volumeLandmarks}
        strengthIndex={strengthIndex}
        dissociation={dissociation}
        weeklySummary={weeklySummary}
        fatigue={fatigue}
        isDeloadWeek={isDeloadWeek}
        nextWorkout={nextWorkout}
        mesocycle={mesocycle}
        missions={missions}
        phaseLabel={phaseLabel}
        phaseWeek={phaseWeek}
        cycleLength={cycleLength}
        todayReadiness={todayReadiness}
      />
    </div>
  )
}
