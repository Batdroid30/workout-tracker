import { describe, it, expect } from 'vitest'
import { addSetToMuscleCounts, formatSetCount, readSecondaryMuscles } from './muscle-sets'

describe('addSetToMuscleCounts', () => {
  it('credits primary 1 and each secondary 0.5', () => {
    const c: Record<string, number> = {}
    addSetToMuscleCounts(c, 'chest', ['triceps', 'shoulders'])
    expect(c).toEqual({ chest: 1, triceps: 0.5, shoulders: 0.5 })
  })
  it('skips a secondary equal to the primary and duplicate secondaries', () => {
    const c: Record<string, number> = {}
    addSetToMuscleCounts(c, 'back', ['back', 'biceps', 'biceps'])
    expect(c).toEqual({ back: 1, biceps: 0.5 })
  })
  it('multiplies by set count and accumulates', () => {
    const c: Record<string, number> = { chest: 2 }
    addSetToMuscleCounts(c, 'chest', ['triceps'], 3)
    expect(c).toEqual({ chest: 5, triceps: 1.5 })
  })
  it('handles null secondaries', () => {
    const c: Record<string, number> = {}
    addSetToMuscleCounts(c, 'quads', null)
    expect(c).toEqual({ quads: 1 })
  })
  it('still credits secondaries when primary is missing', () => {
    const c: Record<string, number> = {}
    addSetToMuscleCounts(c, null, ['biceps'])
    expect(c).toEqual({ biceps: 0.5 })
  })
})

describe('readSecondaryMuscles', () => {
  it('returns only string entries of an array', () => {
    expect(readSecondaryMuscles(['a', 3, null, 'b'])).toEqual(['a', 'b'])
  })
  it('returns null for non-arrays', () => {
    expect(readSecondaryMuscles(null)).toBeNull()
    expect(readSecondaryMuscles('x')).toBeNull()
  })
})

describe('formatSetCount', () => {
  it('prints at most one decimal', () => {
    expect(formatSetCount(7.5)).toBe('7.5')
    expect(formatSetCount(8)).toBe('8')
    expect(formatSetCount(7.25)).toBe('7.3')
    expect(formatSetCount(0.04)).toBe('0')
  })
})
