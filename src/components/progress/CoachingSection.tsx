import { getCoachSignals } from '@/lib/data/coach-signals'
import { getProfile } from '@/lib/data/profile'
import { getWorkoutsSummary } from '@/lib/data/workouts'
import { getProgressSnapshot } from '@/lib/data/progress-snapshot'
import { getBadges } from '@/lib/data/achievements'
import { getLatestBodyweight } from '@/lib/data/bodyweight'
import { getTrainingStreak, getRecentPRs, deriveWeeklySummary, deriveNextWorkoutSuggestion } from '@/lib/data/insights'
import { DeloadCard } from '@/components/dashboard/DeloadCard'
import { HypertrophicDissociationCard } from '@/components/dashboard/HypertrophicDissociationCard'
import { PhaseTransitionCard } from '@/components/dashboard/PhaseTransitionCard'
import { ThisWeekCard } from '@/components/dashboard/ThisWeekCard'
import { MomentumStrip } from '@/components/dashboard/MomentumStrip'
import { NutritionTargetsCard } from './NutritionTargetsCard'
import { MostImprovedCard } from './MostImprovedCard'

const PR_WINDOW_DAYS = 60
const DEFAULT_WEEKLY_GOAL = 3

// The coaching detail that used to fill Home: why a note was raised, this
// week's missions, and streaks and badges. Home links here with #coaching.
export async function CoachingSection({ userId }: { userId: string }) {
  const [signals, profile, { totalVolume }, snapshot, streak, recentPRs, latestBodyweight, badges] = await Promise.all([
    getCoachSignals(userId),
    getProfile(userId),
    getWorkoutsSummary(userId),
    getProgressSnapshot(userId),
    getTrainingStreak(userId),
    getRecentPRs(userId, PR_WINDOW_DAYS),
    getLatestBodyweight(userId),
    getBadges(userId),
  ])

  const weeklySummary = deriveWeeklySummary(snapshot.weeklyData.map(week => ({
    week_start: week.weekStart,
    total_volume: week.totalVolume,
    workout_count: week.sessionCount,
    avg_rpe: week.avgRpe,
  })))
  const hasPhase = Boolean(profile?.phase_started_at)
  const weeklyGoal = profile?.weekly_goal_sessions ?? DEFAULT_WEEKLY_GOAL
  const mostImproved = snapshot.mostImprovedExercises[0] ?? null

  return (
    <section id="coaching" className="scroll-mt-5 space-y-3">
      <h2 className="t-display-s">Coaching</h2>
      {signals.fatigue.shouldSuggest && <DeloadCard assessment={signals.fatigue} />}
      <HypertrophicDissociationCard dissociation={signals.dissociation} />
      <PhaseTransitionCard
        experienceLevel={profile?.experience_level ?? null}
        trainingPhase={profile?.training_phase ?? null}
        phaseWeek={signals.phaseWeek}
      />
      <ThisWeekCard
        thisWeekCount={weeklySummary.thisWeekCount}
        goalSessions={weeklyGoal}
        weeklySummary={weeklySummary}
        missions={signals.missions}
        nextWorkout={deriveNextWorkoutSuggestion(signals.neglectedMuscles)}
        isDeloadWeek={signals.isDeloadWeek}
        scheme={hasPhase ? signals.trainingCycle.scheme : null}
      />
      <NutritionTargetsCard
        heightCm={profile?.height_cm ?? null}
        ageYears={profile?.age_years ?? null}
        sex={profile?.sex ?? null}
        trainingPhase={profile?.training_phase ?? null}
        latestWeightKg={latestBodyweight?.weight_kg ?? null}
        weeklyGoal={weeklyGoal}
      />
      {mostImproved && <MostImprovedCard exercise={mostImproved} />}
      <MomentumStrip prs={recentPRs} streak={streak} badges={badges} totalVolume={totalVolume} />
    </section>
  )
}
