import { buildTrainingCycle, resolveCycleAnchor } from '@/lib/training-cycle'
import type { WeekKind } from '@/lib/suggestions/types'
import type { ExperienceLevel, TrainingPhase } from '@/types/database'

const DEFAULT_WEEKLY_GOAL = 3

export interface BackfillProfile {
  cycleStartedAt: string | null
  phaseStartedAt: string | null
  breakPromptDismissedAt: string | null
  weeklyGoalSessions: number | null
  experienceLevel: ExperienceLevel | null
  trainingPhase: TrainingPhase | null
}

export interface WeekTypeResult {
  weekType: WeekKind
  isDeload: boolean
}

function earliestOf(dates: string[]): string | null {
  if (dates.length === 0) return null
  return dates.reduce((a, b) => (new Date(a) < new Date(b) ? a : b))
}

// Mirrors getTrainingCycle (src/lib/data/training-cycle.ts) evaluated at the
// workout's own start, so history gets the same label the lifter saw then.
export function weekTypeAt(
  profile: BackfillProfile,
  completedWorkoutDates: string[],
  startedAt: string,
): WeekTypeResult {
  const { phaseStartedAt } = profile
  let { cycleStartedAt } = profile
  if (!cycleStartedAt && !phaseStartedAt) {
    cycleStartedAt = resolveCycleAnchor(null, null, earliestOf(completedWorkoutDates))
  }

  const cycle = buildTrainingCycle({
    completedWorkoutDates,
    weeklyGoal: profile.weeklyGoalSessions ?? DEFAULT_WEEKLY_GOAL,
    cycleStartedAt,
    phaseStartedAt,
    breakPromptDismissedAt: profile.breakPromptDismissedAt,
    experienceLevel: profile.experienceLevel,
    trainingPhase: profile.trainingPhase,
    now: new Date(startedAt),
  })
  return { weekType: cycle.scheme.kind, isDeload: cycle.isDeloadWeek }
}
