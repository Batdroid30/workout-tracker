import { assessFatigueLevel } from '@/lib/algorithms'
import {
  getWeeklyTrainingSummary,
  getRecentPRs,
  getMostImprovedExercises,
  getTrainingStreak,
  deriveWeeklySummary,
} from '@/lib/data/insights'

import { DeloadCard }        from './DeloadCard'
import { WeeklySummaryCard } from './WeeklySummaryCard'
import { TrainingStreakCard } from './TrainingStreakCard'
import { RecentPRsCard }     from './RecentPRsCard'
import { MostImprovedCard }  from './MostImprovedCard'

interface InsightsSectionProps {
  userId: string
}

export async function InsightsSection({ userId }: InsightsSectionProps) {
  const [weeks, recentPRs, mostImproved, streak] = await Promise.all([
    getWeeklyTrainingSummary(userId),
    getRecentPRs(userId, 30),
    getMostImprovedExercises(userId),
    getTrainingStreak(userId),
  ])

  const weeklySummary  = deriveWeeklySummary(weeks)
  const daysSinceLastPR = recentPRs.length > 0 ? recentPRs[0].daysAgo : null
  const fatigue        = assessFatigueLevel(weeks, daysSinceLastPR)

  return (
    <div className="space-y-3">
      {/* Deload recommendation — highest priority, shown first when active */}
      {fatigue.shouldSuggest && <DeloadCard assessment={fatigue} />}

      {/* Weekly summary — always visible */}
      <WeeklySummaryCard data={weeklySummary} />

      {/* Training streak */}
      <TrainingStreakCard streak={streak} />

      {/* Recent PRs — only shown when PRs exist in the last 30 days */}
      <RecentPRsCard prs={recentPRs} />

      {/* Most improved exercises — only shown when enough data exists */}
      <MostImprovedCard exercises={mostImproved} />
    </div>
  )
}
