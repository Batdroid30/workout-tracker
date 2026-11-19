import { describe, it, expect } from 'vitest'
import type { MuscleGroup } from '@/types/database'
import { MUSCLE_REGIONS, toRegionValues, isMuscleGroup } from './muscle-regions'

const ALL_GROUPS: MuscleGroup[] = [
  'chest', 'back', 'shoulders',
  'biceps', 'triceps', 'forearms',
  'quads', 'hamstrings', 'glutes', 'calves',
  'core', 'traps', 'lats',
]

describe('MUSCLE_REGIONS', () => {
  it('maps every MuscleGroup to at least one region', () => {
    for (const muscle of ALL_GROUPS) expect(MUSCLE_REGIONS[muscle].length).toBeGreaterThan(0)
  })
})

describe('toRegionValues', () => {
  it('spreads a muscle value onto all its regions', () => {
    expect(toRegionValues({ core: 3 }, Math.max)).toEqual({ abs: 3, obliques: 3 })
  })

  it('shared upper-back takes the stronger of lats and back', () => {
    expect(toRegionValues({ lats: 2, back: 5 }, Math.max)['upper-back']).toBe(5)
    expect(toRegionValues({ back: 5, lats: 2 }, Math.max)['upper-back']).toBe(5)
  })
})

describe('isMuscleGroup', () => {
  it('accepts known muscle groups', () => {
    expect(isMuscleGroup('chest')).toBe(true)
  })

  it('rejects unknown strings', () => {
    expect(isMuscleGroup('neck')).toBe(false)
  })
})
