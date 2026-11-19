import type { MuscleGroup } from '@/types/database'

export type BodyRegion =
  | 'chest'
  | 'front-deltoids' | 'back-deltoids'
  | 'biceps' | 'triceps' | 'forearm'
  | 'abs' | 'obliques'
  | 'quadriceps' | 'adductor' | 'hamstring'
  | 'gluteal' | 'abductors' | 'calves'
  | 'trapezius' | 'upper-back' | 'lower-back'

// Each muscle lights up one or more body-map regions. Typed as a full Record
// so adding a MuscleGroup without mapping it is a compile error.
export const MUSCLE_REGIONS: Record<MuscleGroup, readonly BodyRegion[]> = {
  chest:      ['chest'],
  shoulders:  ['front-deltoids', 'back-deltoids'],
  biceps:     ['biceps'],
  triceps:    ['triceps'],
  forearms:   ['forearm'],
  core:       ['abs', 'obliques'],
  quads:      ['quadriceps', 'adductor'],
  hamstrings: ['hamstring'],
  glutes:     ['gluteal', 'abductors'],
  calves:     ['calves'],
  traps:      ['trapezius'],
  // lats and back share 'upper-back'; toRegionValues resolves the collision.
  lats:       ['upper-back'],
  back:       ['upper-back', 'lower-back'],
}

// Several muscles can feed one region (lats and back both reach upper-back),
// so the caller decides how to combine them, e.g. Math.max for intensity.
export function toRegionValues<T>(
  byMuscle: Partial<Record<MuscleGroup, T>>,
  pickStronger: (a: T, b: T) => T,
): Partial<Record<BodyRegion, T>> {
  const regionValues: Partial<Record<BodyRegion, T>> = {}

  for (const key of Object.keys(byMuscle)) {
    if (!isMuscleGroup(key)) continue

    const value = byMuscle[key]
    if (value === undefined) continue

    for (const region of MUSCLE_REGIONS[key]) {
      const existing = regionValues[region]
      regionValues[region] = existing === undefined ? value : pickStronger(existing, value)
    }
  }

  return regionValues
}

// Guards against stale or custom exercise muscle strings, which the DB stores
// as free text. hasOwn avoids matching prototype keys like 'toString'.
export function isMuscleGroup(value: string): value is MuscleGroup {
  return Object.hasOwn(MUSCLE_REGIONS, value)
}
