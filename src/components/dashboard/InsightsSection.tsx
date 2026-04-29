import { assessFatigueLevel } from '@/lib/algorithms'
import {
  getWeeklyTrainingSummary,
  getRecentPRs,
  getMostImprovedExercises,
  getTrainingStreak,
  getNeglectedMuscles,
  getStalledMovements,
  getWeeklySetsByMuscle,
  getPushPullBalance,
  deriveWeeklySummary,
  deriveNextWorkoutSuggestion,
  deriveCoachTips,
} from '@/lib/data/insights'
import { getBadges } from '@/lib/data/achievements'
import { getProfile } from '@/lib/data/profile'

import { DeloadCard }           from './DeloadCard'
import { WeeklySummaryCard }    from './WeeklySummaryCard'
import { TrainingStreakCard }    from './TrainingStreakCard'
import { RecentPRsCard }        from './RecentPRsCard'
import { MostImprovedCard }     from './MostImprovedCard'
import { NeglectedMusclesCard } from './NeglectedMusclesCard'
import { StalledMovementsCard } from './StalledMovementsCard'
import { MilestonesCard }       from './MilestonesCard'
import { BadgesCard }           from './BadgesCard'
import { NextWorkoutCard }      from './NextWorkoutCard'
import { CoachTipCard }         from './CoachTipCard'
import { WeeklyGoalCard }       from './WeeklyGoalCard'
import { WeeklySetsCard }       from './WeeklySetsCard'
import { PushPullBalanceCard }  from './PushPullBalanceCard'
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
  const [weeks, recentPRs, mostImproved, streak, neglectedMuscles, stalledMovements, badges, weeklySets, pushPull, profile] =
    await Promise.all([
      getWeeklyTrainingSummary(userId),
      getRecentPRs(userId, 60),
      getMostImprovedExercises(userId),
      getTrainingStreak(userId),
      getNeglectedMuscles(userId),
      getStalledMovements(userId),
      getBadges(userId, totalVolume, totalWorkouts),
      getWeeklySetsByMuscle(userId),
      getPushPullBalance(userId),
      getProfile(userId),
    ])

  const weeklySummary       = deriveWeeklySummary(weeks)
  const daysSinceLastPR     = recentPRs.length > 0 ? recentPRs[0].daysAgo : null
  const fatigue             = assessFatigueLevel(weeks, daysSinceLastPR, profile ? {
    experience_level: profile.experience_level,
    training_phase:   profile.training_phase,
    phase_started_at: profile.phase_started_at,
  } : null)
  const nextWorkout         = deriveNextWorkoutSuggestion(neglectedMuscles)
  const coachTips           = deriveCoachTips(weeklySummary, streak, neglectedMuscles, stalledMovements)

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

      {/* Recent PRs — high-value, shown near the top */}
      <RecentPRsCard prs={recentPRs} />

      {/* Weekly goal — always visible */}
      <WeeklyGoalCard
        thisWeekCount={weeklySummary.thisWeekCount}
        goalSessions={weeklyGoalSessions}
      />

      {/* Next workout recommendation — when there are neglected muscles */}
      {nextWorkout && <NextWorkoutCard suggestion={nextWorkout} />}

      {/* Coach tips — context-aware rotating tips */}
      <CoachTipCard tips={coachTips} />

      {/* Weekly summary */}
      <WeeklySummaryCard data={weeklySummary} />

      {/* Weekly sets vs target — per muscle group */}
      <WeeklySetsCard
        sets={weeklySets}
        style={profile?.training_style ?? null}
        phase={profile?.training_phase ?? null}
      />

      {/* Push/Pull balance — last 4 weeks */}
      <PushPullBalanceCard balance={pushPull} />

      {/* Training streak */}
      <TrainingStreakCard streak={streak} />

      {/* Most improved */}
      <MostImprovedCard exercises={mostImproved} />

      {/* Neglected muscles */}
      <NeglectedMusclesCard muscles={neglectedMuscles} />

      {/* Stalled movements */}
      <StalledMovementsCard movements={stalledMovements} />

      {/* Achievement badges */}
      <BadgesCard badges={badges} />

      {/* Lifetime tonnage milestones */}
      <MilestonesCard totalVolume={totalVolume} />
    </div>
  )
}
