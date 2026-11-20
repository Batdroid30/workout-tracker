import { getCoachSignals } from '@/lib/data/coach-signals'
import { getProfile } from '@/lib/data/profile'
import { getWorkoutsSummary } from '@/lib/data/workouts'
import { getProgressSnapshot } from '@/lib/data/progress-snapshot'
import { getBadges } from '@/lib/data/achievements'
import { getTrainingStreak, getRecentPRs, deriveWeeklySummary, deriveNextWorkoutSuggestion } from '@/lib/data/insights'
import { DeloadCard } from '@/components/dashboard/DeloadCard'
import { HypertrophicDissociationCard } from '@/components/dashboard/HypertrophicDissociationCard'
import { PhaseTransitionCard } from '@/components/dashboard/PhaseTransitionCard'
import { ThisWeekCard } from '@/components/dashboard/ThisWeekCard'
import { MomentumStrip } from '@/components/dashboard/MomentumStrip'

const PR_WINDOW_DAYS = 60
const DEFAULT_WEEKLY_GOAL = 3

// The coaching detail that used to fill Home: why a note was raised, this
// week's missions, and streaks and badges. Home links here with #coaching.
export async function CoachingSection({ userId }: { userId: string }) {
  const [signals, profile, { totalVolume, totalWorkouts }, snapshot, streak, recentPRs] = await Promise.all([
    getCoachSignals(userId),
    getProfile(userId),
    getWorkoutsSummary(userId),
    getProgressSnapshot(userId),
    getTrainingStreak(userId),
    getRecentPRs(userId, PR_WINDOW_DAYS),
  ])
  const badges = await getBadges(userId, totalVolume, totalWorkouts)

  const weeklySummary = deriveWeeklySummary(snapshot.weeklyData.map(week => ({
    week_start: week.weekStart,
    total_volume: week.totalVolume,
    workout_count: week.sessionCount,
    avg_rpe: week.avgRpe,
  })))
  const hasPhase = Boolean(profile?.phase_started_at)

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
        goalSessions={profile?.weekly_goal_sessions ?? DEFAULT_WEEKLY_GOAL}
        weeklySummary={weeklySummary}
        missions={signals.missions}
        nextWorkout={deriveNextWorkoutSuggestion(signals.neglectedMuscles)}
        isDeloadWeek={signals.isDeloadWeek}
        scheme={hasPhase ? signals.trainingCycle.scheme : null}
      />
      <MomentumStrip prs={recentPRs} streak={streak} badges={badges} totalVolume={totalVolume} />
    </section>
  )
}
