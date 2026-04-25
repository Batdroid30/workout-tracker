import { assessFatigueLevel } from '@/lib/algorithms'
import {
  getWeeklyTrainingSummary,
  getRecentPRs,
  getMostImprovedExercises,
  getTrainingStreak,
  getNeglectedMuscles,
  getStalledMovements,
  deriveWeeklySummary,
} from '@/lib/data/insights'

import { DeloadCard }           from './DeloadCard'
import { WeeklySummaryCard }    from './WeeklySummaryCard'
import { TrainingStreakCard }    from './TrainingStreakCard'
import { RecentPRsCard }        from './RecentPRsCard'
import { MostImprovedCard }     from './MostImprovedCard'
import { NeglectedMusclesCard } from './NeglectedMusclesCard'
import { StalledMovementsCard } from './StalledMovementsCard'
import { MilestonesCard }       from './MilestonesCard'

interface InsightsSectionProps {
  userId: string
  totalVolume: number
}

export async function InsightsSection({ userId, totalVolume }: InsightsSectionProps) {
  const [weeks, recentPRs, mostImproved, streak, neglectedMuscles, stalledMovements] =
    await Promise.all([
      getWeeklyTrainingSummary(userId),
      getRecentPRs(userId, 30),
      getMostImprovedExercises(userId),
      getTrainingStreak(userId),
      getNeglectedMuscles(userId),
      getStalledMovements(userId),
    ])

  const weeklySummary   = deriveWeeklySummary(weeks)
  const daysSinceLastPR = recentPRs.length > 0 ? recentPRs[0].daysAgo : null
  const fatigue         = assessFatigueLevel(weeks, daysSinceLastPR)

  return (
    <div className="space-y-3">
      {/* Deload — highest priority, shown first when active */}
      {fatigue.shouldSuggest && <DeloadCard assessment={fatigue} />}

      {/* Weekly summary — always visible */}
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

      {/* Lifetime tonnage milestones — always visible */}
      <MilestonesCard totalVolume={totalVolume} />
    </div>
  )
}
