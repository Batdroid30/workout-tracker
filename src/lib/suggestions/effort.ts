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

function stepDownFromEnteredSet(efforts: SetEffort[], index: number): number | null {
  for (let earlier = index - 1; earlier >= 0; earlier--) {
    if (efforts[earlier].source !== 'entered') continue
    return Math.max(0, efforts[earlier].rir - 0.5 * (index - earlier))
  }
  return null
}

export function sessionEfforts(sets: LoggedSet[]): SetEffort[] {
  const inferredSetOneRir = inferSetOneRir(sets)
  const efforts: SetEffort[] = []

  sets.forEach((set, index) => {
    const rpe = trustedRpe(set)
    if (rpe !== null) {
      efforts.push({ rir: 10 - rpe, source: 'entered' })
      return
    }
    if (inferredSetOneRir !== null) {
      efforts.push({ rir: Math.max(0, inferredSetOneRir - 0.5 * index), source: 'inferred' })
      return
    }
    const steppedDown = stepDownFromEnteredSet(efforts, index)
    efforts.push(steppedDown === null
      ? { rir: ASSUMED_RIR, source: 'assumed' }
      : { rir: steppedDown, source: 'inferred' })
  })

  return efforts
}
