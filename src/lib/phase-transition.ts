import { DELOAD_THRESHOLDS } from '@/lib/workout-intelligence'
import type { ExperienceLevel, TrainingPhase } from '@/types/database'

// Weeks past the deload point before suggesting a new phase, so the planned
// deload and a short run-out never read as "your phase is complete".
const TRANSITION_GRACE_WEEKS = 4

interface PhaseTransitionInput {
  experienceLevel: ExperienceLevel | null
  trainingPhase: TrainingPhase | null
  /** Training-week position in the phase (src/lib/training-cycle.ts). */
  phaseWeek: number | null
}

export function isPhaseTransitionDue({ experienceLevel, trainingPhase, phaseWeek }: PhaseTransitionInput): boolean {
  if (!trainingPhase || phaseWeek === null) return false
  const threshold = DELOAD_THRESHOLDS[experienceLevel ?? 'intermediate'][trainingPhase]
  const weeksInPhase = phaseWeek - 1
  return weeksInPhase >= threshold + TRANSITION_GRACE_WEEKS
}
