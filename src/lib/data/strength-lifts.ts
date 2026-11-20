import { cache } from 'react'
import { getTrackedLifts, type TrackedLift } from '@/lib/data/tracked-lifts'
import { getProgressSnapshot } from '@/lib/data/progress-snapshot'
import { liftsForIndex, resolveStrengthLifts } from '@/lib/tracked-lifts'
import { isAssisted } from '@/lib/load'
import type { KeyLift } from '@/lib/data/phase-coach'

export interface StrengthLifts {
  lifts: TrackedLift[]
  source: 'picked' | 'auto'
  /** The lifts the strength index averages: the same everywhere in the app. */
  indexLifts: KeyLift[]
}

export const getStrengthLifts = cache(async (userId: string): Promise<StrengthLifts> => {
  const [picks, snapshot] = await Promise.all([getTrackedLifts(userId), getProgressSnapshot(userId)])
  const { lifts, source } = resolveStrengthLifts(picks, snapshot.keyLifts)
  return { lifts, source, indexLifts: liftsForIndex(lifts, snapshot.exerciseWeeklyE1RM, isAssisted) }
})
