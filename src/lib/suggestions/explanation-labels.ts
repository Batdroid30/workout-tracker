import { formatAddedWeight } from '@/lib/load'
import type { LoggedSet } from './types'

/** How the lifter's logged weight is read: plain kg, reps only, added to bodyweight, or assistance. */
export type LoadMode = 'load' | 'bodyweight' | 'weighted' | 'assisted'

const SET_FORMATTERS: Record<LoadMode, (set: LoggedSet, bodyweightKg: number) => string> = {
  load: set => `${set.weightKg}×${set.reps}`,
  bodyweight: set => `BW×${set.reps}`,
  weighted: (set, bodyweightKg) => `${formatAddedWeight(set.weightKg, bodyweightKg)}×${set.reps}`,
  assisted: set => `${set.weightKg} kg assist ×${set.reps}`,
}

export function formatReferenceSet(set: LoggedSet, mode: LoadMode, bodyweightKg: number): string {
  return SET_FORMATTERS[mode](set, bodyweightKg)
}

/** "19 Nov". Read in UTC so a late-evening session never shows as the next day. */
export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
}
