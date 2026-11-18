import { describe, it, expect } from 'vitest'
import { isAssisted, effectiveLoad, setVolume, formatVolume } from './load'

describe('isAssisted', () => {
  it('matches assisted exercise names case-insensitively', () => {
    expect(isAssisted('Pull Up (Assisted)')).toBe(true)
    expect(isAssisted('assisted dip')).toBe(true)
  })

  it('does not match normal or weighted exercises', () => {
    expect(isAssisted('Pull Up')).toBe(false)
    expect(isAssisted('Pull Up (Weighted)')).toBe(false)
  })
})

describe('effectiveLoad', () => {
  it('returns the logged weight for normal exercises', () => {
    expect(effectiveLoad(60, 'Bench Press', 75)).toBe(60)
  })

  it('returns the stored total for weighted exercises', () => {
    expect(effectiveLoad(95, 'Pull Up (Weighted)', 75)).toBe(95)
  })

  it('subtracts assistance from bodyweight for assisted exercises', () => {
    expect(effectiveLoad(20, 'Pull Up (Assisted)', 75)).toBe(55)
  })

  it('clamps to zero when assistance meets or exceeds bodyweight', () => {
    expect(effectiveLoad(75, 'Pull Up (Assisted)', 75)).toBe(0)
    expect(effectiveLoad(80, 'Pull Up (Assisted)', 75)).toBe(0)
  })
})

describe('setVolume', () => {
  it('is weight × reps for normal exercises', () => {
    expect(setVolume(60, 10, 'Bench Press', 75)).toBe(600)
  })

  it('is (bodyweight − assistance) × reps for assisted exercises', () => {
    expect(setVolume(20, 8, 'Pull Up (Assisted)', 75)).toBe(440)
  })

  it('is zero for assisted sets where assistance exceeds bodyweight', () => {
    expect(setVolume(80, 8, 'Chest Dip (Assisted)', 75)).toBe(0)
  })
})

describe('formatVolume', () => {
  it('rounds floating-point noise to whole kilograms', () => {
    expect(formatVolume(599.9999999)).toBe('600')
    expect(formatVolume(95.3 * 6)).toBe('572')
  })

  it('uses a k suffix from 1000 upwards', () => {
    expect(formatVolume(1000)).toBe('1.0k')
    expect(formatVolume(12345)).toBe('12.3k')
  })

  it('handles zero', () => {
    expect(formatVolume(0)).toBe('0')
  })
})
