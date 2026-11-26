import { calculate1RM } from '@/lib/algorithms'
import { averageRepLossPerSet, sessionEfforts } from './effort'
import type { PastSession } from './types'

const MAX_USABLE_REPS_TO_FAILURE = 20
const MAX_CONVERSION_REPS_TO_FAILURE = 12
const OUTLIER_RATIO = 1.15
const OUTLIER_WINDOW_MS = 8 * 7 * 24 * 60 * 60 * 1000
const FATIGUE_SESSIONS_CONSIDERED = 4
const MAX_FATIGUE = 3
const BISECTION_TOLERANCE = 0.001

/** Set-1 reps-to-failure for a session: reps done plus estimated reps in reserve. */
function setOneRepsToFailure(session: PastSession): number | null {
  const [firstSet] = session.sets
  if (!firstSet || firstSet.weightKg <= 0) return null
  const [firstEffort] = sessionEfforts(session.sets)
  return firstSet.reps + firstEffort.rir
}

export function sessionE1rm(session: PastSession): number | null {
  const repsToFailureValue = setOneRepsToFailure(session)
  if (repsToFailureValue === null || repsToFailureValue > MAX_USABLE_REPS_TO_FAILURE) return null
  return calculate1RM(session.sets[0].weightKg, repsToFailureValue)
}

interface SessionEstimate { startedAtMs: number; e1rm: number }

function isOutlier(estimate: SessionEstimate, all: SessionEstimate[]): boolean {
  const windowStart = estimate.startedAtMs - OUTLIER_WINDOW_MS
  const priorEstimates = all.filter(other =>
    other !== estimate && other.startedAtMs < estimate.startedAtMs && other.startedAtMs >= windowStart)
  if (priorEstimates.length === 0) return false
  const priorBest = Math.max(...priorEstimates.map(other => other.e1rm))
  return estimate.e1rm > OUTLIER_RATIO * priorBest
}

function pickCurrentE1rm(sessions: PastSession[], maxRepsToFailure: number): number | null {
  const estimates: SessionEstimate[] = []
  for (const session of sessions) {
    if (session.isDeload) continue
    const repsToFailureValue = setOneRepsToFailure(session)
    if (repsToFailureValue === null || repsToFailureValue > maxRepsToFailure) continue
    const e1rm = sessionE1rm(session)
    if (e1rm === null) continue
    estimates.push({ startedAtMs: Date.parse(session.startedAt), e1rm })
  }
  const usable = estimates.filter(estimate => !isOutlier(estimate, estimates))
  if (usable.length === 0) return null
  return Math.max(...usable.slice(0, 2).map(estimate => estimate.e1rm))
}

/** Sessions are newest first. Higher of the two most recent usable estimates. */
export function currentE1rm(sessions: PastSession[]): number | null {
  return pickCurrentE1rm(sessions, MAX_USABLE_REPS_TO_FAILURE)
}

/** Like currentE1rm, but high-rep estimates are excluded: they inflate conversions. */
export function conversionE1rm(sessions: PastSession[]): number | null {
  return pickCurrentE1rm(sessions, MAX_CONVERSION_REPS_TO_FAILURE)
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

export function sessionFatigue(sessions: PastSession[], fallback: number): number {
  const losses: number[] = []
  for (const session of sessions) {
    const loss = averageRepLossPerSet(session.sets)
    if (loss === null) continue
    losses.push(loss)
    if (losses.length === FATIGUE_SESSIONS_CONSIDERED) break
  }
  if (losses.length === 0) return fallback
  return Math.min(MAX_FATIGUE, Math.max(0, median(losses)))
}

/**
 * Same piecewise formula as calculate1RM, as a ratio of e1RM to weight, but
 * unrounded: calculate1RM rounds to 0.1, which makes it a step function that
 * cannot be inverted by bisection.
 */
function e1rmToWeightRatio(repsToFailureValue: number): number {
  if (repsToFailureValue <= 1) return 1
  const epley = 1 + repsToFailureValue / 30
  if (repsToFailureValue > 10) return epley
  const brzycki = 36 / (37 - repsToFailureValue)
  return (epley + brzycki) / 2
}

export function repsToFailure(e1rm: number, weightKg: number): number {
  if (weightKg >= e1rm) return 1
  const targetRatio = e1rm / weightKg
  let low = 1
  let high = 40
  while (high - low > BISECTION_TOLERANCE) {
    const middle = (low + high) / 2
    if (e1rmToWeightRatio(middle) < targetRatio) low = middle
    else high = middle
  }
  // Upper bound, so an exact whole answer (e.g. 11) never floors down to 10.
  return high
}

export function predictReps(
  e1rm: number, weightKg: number, rir: number, setIndex: number, fatigue: number,
): number {
  const predicted = repsToFailure(e1rm, weightKg) - rir - fatigue * setIndex
  return Math.max(0, Math.floor(predicted + 1e-9))
}
