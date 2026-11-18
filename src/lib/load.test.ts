import { describe, it, expect } from 'vitest'
import { isAssisted, effectiveLoad, assistanceFor, setVolume, formatVolume, workoutBodyweight, prCandidates, beatsPR } from './load'
import { calculate1RM } from './algorithms'

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

describe('workoutBodyweight', () => {
  it('uses the stored value, including numeric strings from Postgres', () => {
    expect(workoutBodyweight(80.5)).toBe(80.5)
    expect(workoutBodyweight('72.30')).toBe(72.3)
  })

  it('falls back to 75 kg when missing', () => {
    expect(workoutBodyweight(null)).toBe(75)
    expect(workoutBodyweight(undefined)).toBe(75)
  })
})

describe('prCandidates', () => {
  it('returns weight, volume and 1RM for normal exercises (unchanged behaviour)', () => {
    expect(prCandidates(100, 5, 'Bench Press')).toEqual([
      { type: 'best_weight', value: 100 },
      { type: 'best_volume', value: 500 },
      { type: 'best_1rm',    value: calculate1RM(100, 5) },
    ])
  })

  it('returns only least-assistance for assisted exercises', () => {
    expect(prCandidates(25, 8, 'Pull Up (Assisted)')).toEqual([{ type: 'best_weight', value: 25 }])
  })
})

describe('beatsPR', () => {
  it('higher beats lower for normal exercises', () => {
    expect(beatsPR(105, 100, 'best_weight', 'Bench Press')).toBe(true)
    expect(beatsPR(95, 100, 'best_weight', 'Bench Press')).toBe(false)
    expect(beatsPR(100, 100, 'best_weight', 'Bench Press')).toBe(false)
  })

  it('treats a missing record as zero for normal exercises (unchanged behaviour)', () => {
    expect(beatsPR(20, undefined, 'best_volume', 'Bench Press')).toBe(true)
  })

  it('less assistance beats more for assisted exercises', () => {
    expect(beatsPR(25, 30, 'best_weight', 'Pull Up (Assisted)')).toBe(true)
    expect(beatsPR(30, 25, 'best_weight', 'Pull Up (Assisted)')).toBe(false)
    expect(beatsPR(25, 25, 'best_weight', 'Pull Up (Assisted)')).toBe(false)
  })

  it('the first assisted set always sets the baseline', () => {
    expect(beatsPR(40, undefined, 'best_weight', 'Chest Dip (Assisted)')).toBe(true)
  })

  it('weighted exercises still use higher-is-better', () => {
    expect(beatsPR(100, 95, 'best_weight', 'Pull Up (Weighted)')).toBe(true)
  })
})

describe('assistanceFor', () => {
  it('converts a target load back into assistance', () => {
    // 20 kg assistance at 75 kg = 55 kg lifted; suggestion of 57.5 kg → 17.5 kg assistance
    expect(assistanceFor(57.5, 75)).toBe(17.5)
  })

  it('rounds to the nearest 0.5 kg for decimal bodyweights', () => {
    expect(assistanceFor(55, 75.3)).toBe(20.5)
  })

  it('never goes below zero assistance', () => {
    expect(assistanceFor(80, 75)).toBe(0)
  })

  it('round-trips with effectiveLoad', () => {
    expect(assistanceFor(effectiveLoad(30, 'Pull Up (Assisted)', 80), 80)).toBe(30)
  })
})
