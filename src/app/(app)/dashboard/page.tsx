import { auth } from '@/lib/auth'
import { getWorkoutsSummary, getRecentWorkouts } from '@/lib/data/workouts'
import { getProfile } from '@/lib/data/profile'
import { getLatestBodyweight, getBodyweightHistory } from '@/lib/data/bodyweight'
import {
  getTrainingStreak,
  getWeeklyTrainingSummary,
  deriveWeeklySummary,
  getRecentPRs,
  getMostImprovedExercises,
  getNeglectedMuscles,
  getStalledMovements,
  getPushPullBalance,
  getRecentExerciseLoads,
  detectHypertrophicDissociation,
  deriveNextWorkoutSuggestion,
} from '@/lib/data/insights'
import {
  getKeyLifts,
  getVolumeLandmarksByMuscle,
  getStrengthIndex,
  buildThisWeekMissions,
} from '@/lib/data/phase-coach'
import { getWeeksInPhase, buildMesocycleTimeline } from '@/lib/phase-coach'
import { DELOAD_THRESHOLDS, isCurrentWeekDeload } from '@/lib/workout-intelligence'
import { getBadges } from '@/lib/data/achievements'
import { assessFatigueLevel } from '@/lib/algorithms'
import { DashboardTabs } from '@/components/dashboard/DashboardTabs'

export default async function DashboardPage() {
  const session = await auth()
  const userId = session?.user?.id as string

  // Parallel fetch 1: core queries & metrics
  const [
    workoutsSummary,
    recentWorkouts,
    profile,
    latestBodyweight,
    streak,
    weeks,
    recentPRs,
    mostImproved,
    neglectedMuscles,
    stalledMovements,
    pushPull,
    keyLifts,
    recentLoads,
    bwHistory,
  ] = await Promise.all([
    getWorkoutsSummary(userId),
    getRecentWorkouts(userId),
    getProfile(userId),
    getLatestBodyweight(userId),
    getTrainingStreak(userId),
    getWeeklyTrainingSummary(userId),
    getRecentPRs(userId, 60),
    getMostImprovedExercises(userId),
    getNeglectedMuscles(userId),
    getStalledMovements(userId),
    getPushPullBalance(userId),
    getKeyLifts(userId),
    getRecentExerciseLoads(userId),
    getBodyweightHistory(userId, 4),
  ])

  const totalVolume = workoutsSummary.totalVolume
  const totalWorkouts = workoutsSummary.totalWorkouts

  // Parallel fetch 2: queries needing profile resolution
  const [
    volumeLandmarks,
    strengthIndex,
    badges,
  ] = await Promise.all([
    getVolumeLandmarksByMuscle(userId, profile),
    getStrengthIndex(userId, profile),
    getBadges(userId, totalVolume, totalWorkouts),
  ])

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
  } : null)
  
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
      />
    </div>
  )
}
