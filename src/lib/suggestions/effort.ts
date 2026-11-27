import type { EffortSource, LoggedSet } from './types'

/**
 * RPE values the old UI pre-filled on every set. Without an rpe_source marker,
 * these are indistinguishable from a real entry, so they are not trusted.
 */
export const LEGACY_PREFILL_RPES = [7, 7.5, 8, 8.5] as const

export const ASSUMED_RIR = 1.5

export interface SetEffort { rir: number; source: EffortSource }

export function trustedRpe(set: LoggedSet): number | null {
  if (set.rpe === null) return null
  if (set.rpeSource !== null) return set.rpe
  const isLegacyPrefill = (LEGACY_PREFILL_RPES as readonly number[]).includes(set.rpe)
  return isLegacyPrefill ? null : set.rpe
}

/** Sets from the start of the list that share set 1's weight. */
function leadingSetsAtFirstWeight(sets: LoggedSet[]): LoggedSet[] {
  if (sets.length === 0) return []
  const firstWeight = sets[0].weightKg
  const endIndex = sets.findIndex(set => set.weightKg !== firstWeight)
  return endIndex === -1 ? sets : sets.slice(0, endIndex)
}

/** Average reps lost per set across consecutive sets at set 1's weight. */
export function averageRepLossPerSet(sets: LoggedSet[]): number | null {
  const sameWeightSets = leadingSetsAtFirstWeight(sets)
  if (sameWeightSets.length < 2) return null
  const lastSet = sameWeightSets[sameWeightSets.length - 1]
  return (sameWeightSets[0].reps - lastSet.reps) / (sameWeightSets.length - 1)
}

/**
 * Bands of average rep loss mapped to the reps left in the tank on set 1.
 * Steady reps across sets means the first set was far from failure.
 */
const REP_LOSS_TO_RIR_BANDS: { minLoss: number; rir: number }[] = [
  { minLoss: 2, rir: 0 },
  { minLoss: 1.5, rir: 1 },
  { minLoss: 1, rir: 1.5 },
  { minLoss: 0.5, rir: 2 },
  { minLoss: -Infinity, rir: 3 },
]

export function inferSetOneRir(sets: LoggedSet[]): number | null {
  const loss = averageRepLossPerSet(sets)
  if (loss === null) return null
  return REP_LOSS_TO_RIR_BANDS.find(band => loss >= band.minLoss)?.rir ?? null
}

/**
 * Set-1 reps in reserve from a trusted RPE anywhere in the session: set 1's own, else the
 * latest rated set's, stepped back up by half a rep per set. Null when no set has one.
 */
function enteredSetOneRir(sets: LoggedSet[]): number | null {
  const setOneRpe = sets[0] ? trustedRpe(sets[0]) : null
  if (setOneRpe !== null) return 10 - setOneRpe
  for (let index = sets.length - 1; index > 0; index--) {
    const rpe = trustedRpe(sets[index])
    if (rpe !== null) return 10 - rpe + 0.5 * index
  }
  return null
}

function stepDownFromSetOne(sets: LoggedSet[], setOneRir: number): SetEffort[] {
  return sets.map((set, index): SetEffort => {
    const rpe = trustedRpe(set)
    if (rpe !== null) return { rir: 10 - rpe, source: 'entered' }
    if (index === 0) return { rir: setOneRir, source: 'entered' }
    return { rir: Math.max(0, setOneRir - 0.5 * index), source: 'inferred' }
  })
}

/** A trusted RPE on any set beats rep-loss inference; without one, inference, else an assumed effort. */
export function sessionEfforts(sets: LoggedSet[]): SetEffort[] {
  const setOneRir = enteredSetOneRir(sets)
  if (setOneRir !== null) return stepDownFromSetOne(sets, setOneRir)
  const inferredSetOneRir = inferSetOneRir(sets)
  return sets.map((_set, index): SetEffort => inferredSetOneRir === null
    ? { rir: ASSUMED_RIR, source: 'assumed' }
    : { rir: Math.max(0, inferredSetOneRir - 0.5 * index), source: 'inferred' })
}
