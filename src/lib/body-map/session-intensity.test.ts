import { describe, expect, it } from 'vitest'
import { calculateSessionIntensity, toHeatLevel } from './session-intensity'

describe('calculateSessionIntensity', () => {
  it('weights primary 1 and secondary 0.5 per set, normalised to max', () => {
    const r = calculateSessionIntensity([{ muscleGroup: 'chest', secondaryMuscles: ['triceps'], workingSetCount: 4 }])
    expect(r).toEqual({ chest: 1, triceps: 0.5 })
  })

  it('sums across exercises', () => {
    const r = calculateSessionIntensity([
      { muscleGroup: 'chest', secondaryMuscles: ['triceps'], workingSetCount: 4 },
      { muscleGroup: 'triceps', secondaryMuscles: null, workingSetCount: 2 },
    ])
    expect(r).toEqual({ chest: 1, triceps: 1 }) // triceps 2 + 2 = 4
  })

  it('returns {} when there are no working sets', () => {
    expect(calculateSessionIntensity([{ muscleGroup: 'chest', secondaryMuscles: [], workingSetCount: 0 }])).toEqual({})
    expect(calculateSessionIntensity([])).toEqual({})
  })

  it('skips null and unknown muscle strings', () => {
    const r = calculateSessionIntensity([
      { muscleGroup: null, secondaryMuscles: ['neck'], workingSetCount: 3 },
      { muscleGroup: 'quads', secondaryMuscles: null, workingSetCount: 3 },
    ])
    expect(r).toEqual({ quads: 1 })
  })
})

describe('toHeatLevel', () => {
  it('buckets up to the nearest heat level', () => {
    expect(toHeatLevel(0.1)).toBe(0.25)
    expect(toHeatLevel(0.5)).toBe(0.5)
    expect(toHeatLevel(0.51)).toBe(0.75)
    expect(toHeatLevel(1)).toBe(1)
  })
})
