import { assessFatigueLevel } from '@/lib/algorithms'
import {
  getWeeklyTrainingSummary,
  getRecentPRs,
  getMostImprovedExercises,
  getTrainingStreak,
  getNeglectedMuscles,
  getStalledMovements,
  deriveWeeklySummary,
  deriveNextWorkoutSuggestion,
  deriveCoachTips,
} from '@/lib/data/insights'
import { getBadges } from '@/lib/data/achievements'

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
  const [weeks, recentPRs, mostImproved, streak, neglectedMuscles, stalledMovements, badges] =
    await Promise.all([
      getWeeklyTrainingSummary(userId),
      getRecentPRs(userId, 30),
      getMostImprovedExercises(userId),
      getTrainingStreak(userId),
      getNeglectedMuscles(userId),
      getStalledMovements(userId),
      getBadges(userId, totalVolume, totalWorkouts),
    ])

  const weeklySummary       = deriveWeeklySummary(weeks)
  const daysSinceLastPR     = recentPRs.length > 0 ? recentPRs[0].daysAgo : null
  const fatigue             = assessFatigueLevel(weeks, daysSinceLastPR)
  const nextWorkout         = deriveNextWorkoutSuggestion(neglectedMuscles)
  const coachTips           = deriveCoachTips(weeklySummary, streak, neglectedMuscles, stalledMovements)

  return (
    <div className="space-y-3">
      {/* Deload — highest priority, shown first when active */}
      {fatigue.shouldSuggest && <DeloadCard assessment={fatigue} />}

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

      {/* Training streak */}
      <TrainingStreakCard streak={streak} />

      {/* Recent PRs */}
      <RecentPRsCard prs={recentPRs} />

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
