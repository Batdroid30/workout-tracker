import type { MuscleGroup } from '@/types/database'
import { addSetToMuscleCounts } from '@/lib/muscle-sets'
import { isMuscleGroup } from './muscle-regions'

export interface SessionExerciseInput {
  muscleGroup: string | null
  secondaryMuscles: string[] | null
  workingSetCount: number
}

/** Heat buckets a body-map region can be shaded with, lightest to fullest. */
export const HEAT_LEVELS = [0.25, 0.5, 0.75, 1] as const

/**
 * Raw per-muscle set credit for one session (primary 1 per set, secondary 0.5 per set).
 * Unknown, null, or non-positive entries are skipped; zero-score muscles are omitted.
 */
export function calculateSessionSets(
  exercises: SessionExerciseInput[],
): Partial<Record<MuscleGroup, number>> {
  const rawScores: Record<string, number> = {}

  for (const exercise of exercises) {
    if (!(exercise.workingSetCount > 0)) continue
    addSetToMuscleCounts(
      rawScores,
      exercise.muscleGroup,
      exercise.secondaryMuscles,
      exercise.workingSetCount,
    )
  }

  const sets: Partial<Record<MuscleGroup, number>> = {}
  for (const [muscle, score] of Object.entries(rawScores)) {
    if (isMuscleGroup(muscle) && score > 0) sets[muscle] = score
  }
  return sets
}

/**
 * Scores each muscle for one session, then scales by the session's hardest-hit
 * muscle so values fall in (0, 1].
 */
export function calculateSessionIntensity(
  exercises: SessionExerciseInput[],
): Partial<Record<MuscleGroup, number>> {
  const sets = calculateSessionSets(exercises)
  const scores = Object.values(sets).filter((score): score is number => score !== undefined)

  const maxScore = Math.max(0, ...scores)
  if (maxScore === 0) return {}

  const intensities: Partial<Record<MuscleGroup, number>> = {}
  for (const muscle of Object.keys(sets)) {
    if (!isMuscleGroup(muscle)) continue
    const score = sets[muscle]
    if (score !== undefined) intensities[muscle] = score / maxScore
  }
  return intensities
}

/** Rounds an intensity up to the smallest heat level that covers it. */
export function toHeatLevel(intensity: number): number {
  return HEAT_LEVELS.find((level) => level >= intensity) ?? HEAT_LEVELS[HEAT_LEVELS.length - 1]
}
