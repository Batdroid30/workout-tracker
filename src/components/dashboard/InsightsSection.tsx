import { assessFatigueLevel } from '@/lib/algorithms'
import {
  getWeeklyTrainingSummary,
  getRecentPRs,
  getMostImprovedExercises,
  getTrainingStreak,
  getNeglectedMuscles,
  getStalledMovements,
  getPushPullBalance,
  getRecentExerciseLoads,
  deriveWeeklySummary,
  deriveNextWorkoutSuggestion,
} from '@/lib/data/insights'
import {
  getKeyLifts,
  getVolumeLandmarksByMuscle,
  getStrengthIndex,
  buildThisWeekMissions,
} from '@/lib/data/phase-coach'
import { getWeeksInPhase, buildMesocycleTimeline } from '@/lib/phase-coach'
import { getBadges } from '@/lib/data/achievements'
import { getProfile } from '@/lib/data/profile'

import { DeloadCard }           from './DeloadCard'
import { ThisWeekCard }         from './ThisWeekCard'
import { PhaseCoachCard }       from './PhaseCoachCard'
import { MomentumStrip }        from './MomentumStrip'
import { PhaseTransitionCard }  from './PhaseTransitionCard'

interface InsightsSectionProps {
  userId: string
  totalVolume: number
  totalWorkouts: number
  weeklyGoalSessions: number
}

export async function InsightsSection({
  userId,
  totalVolume,
  totalWorkouts,
  weeklyGoalSessions,
}: InsightsSectionProps) {
  const [
    weeks,
    recentPRs,
    mostImproved,
    streak,
    neglectedMuscles,
    stalledMovements,
    badges,
    pushPull,
    profile,
    keyLifts,
    recentLoads,
  ] = await Promise.all([
    getWeeklyTrainingSummary(userId),
    getRecentPRs(userId, 60),
    getMostImprovedExercises(userId),
    getTrainingStreak(userId),
    getNeglectedMuscles(userId),
    getStalledMovements(userId),
    getBadges(userId, totalVolume, totalWorkouts),
    getPushPullBalance(userId),
    getProfile(userId),
    getKeyLifts(userId),
    getRecentExerciseLoads(userId),
  ])

  // Both depend on profile — fetch in parallel after profile resolves.
  // getWeeklySetsByMuscle / getKeyLifts inside are cached(), no extra queries.
  const [volumeLandmarks, strengthIndex] = await Promise.all([
    getVolumeLandmarksByMuscle(userId, profile),
    getStrengthIndex(userId, profile),
  ])

  const weeklySummary   = deriveWeeklySummary(weeks)
  const daysSinceLastPR = recentPRs.length > 0 ? recentPRs[0].daysAgo : null
  const fatigue         = assessFatigueLevel(weeks, daysSinceLastPR, profile ? {
    experience_level: profile.experience_level,
    training_phase:   profile.training_phase,
    phase_started_at: profile.phase_started_at,
  } : null)
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
      ? { training_goal: profile.training_goal, experience_level: profile.experience_level }
      : null,
  })

  return (
    <div className="space-y-3">
      {/* Deload — highest priority, shown first when active */}
      {fatigue.shouldSuggest && <DeloadCard assessment={fatigue} />}

      {/* Phase transition prompt — fires when user is well overdue for a phase swap */}
      <PhaseTransitionCard
        experienceLevel={profile?.experience_level ?? null}
        trainingPhase={profile?.training_phase ?? null}
        phaseStartedAt={profile?.phase_started_at ?? null}
      />

      {/* Headline: This Week — sessions + volume + missions + next session */}
      <ThisWeekCard
        thisWeekCount={weeklySummary.thisWeekCount}
        goalSessions={weeklyGoalSessions}
        weeklySummary={weeklySummary}
        missions={missions}
        nextWorkout={nextWorkout}
      />

      {/* Phase Coach — strength index, volume landmarks, most improved */}
      <PhaseCoachCard
        trainingPhase={profile?.training_phase    ?? null}
        experienceLevel={profile?.experience_level ?? null}
        weeksInPhase={getWeeksInPhase(profile?.phase_started_at ?? null)}
        strengthIndex={strengthIndex}
        volumeLandmarks={volumeLandmarks}
        mostImproved={mostImproved}
        mesocycle={mesocycle}
      />

      {/* Momentum — PRs, streak, badges, lifetime tonnage in one 2x2 strip */}
      <MomentumStrip
        prs={recentPRs}
        streak={streak}
        badges={badges}
        totalVolume={totalVolume}
      />
    </div>
  )
}
