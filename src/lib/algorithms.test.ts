import { describe, it, expect } from 'vitest'
import { DELOAD_THRESHOLDS } from '@/lib/workout-intelligence'
import {
  calculateEpley1RM,
  calculateWeightFrom1RM,
  suggestRepSum,
  generateDeloadRoutine,
  assessFatigueLevel,
  type WeekSummary,
} from './algorithms'

describe('calculateEpley1RM', () => {
  it('returns the weight unchanged for a single rep', () => {
    expect(calculateEpley1RM(100, 1)).toBe(100)
  })

  it('returns the weight unchanged for zero reps (guard)', () => {
    expect(calculateEpley1RM(100, 0)).toBe(100)
  })

  it('matches the Epley formula for 5 reps', () => {
    // 100 * (1 + 5/30) = 116.666... → rounded to 1dp = 116.7
    expect(calculateEpley1RM(100, 5)).toBe(116.7)
  })

  it('rounds to one decimal place', () => {
    const result = calculateEpley1RM(102.5, 7)
    expect(result.toString()).toMatch(/^\d+(\.\d)?$/)
  })
})

describe('calculateWeightFrom1RM', () => {
  it('returns the exact weight for 1 rep', () => {
    expect(calculateWeightFrom1RM(100, 1)).toBe(100)
  })

  it('correctly inverses the Epley formula for >10 reps', () => {
    // Epley: e1rm = w * (1 + r/30). For w=100, r=15 -> e1rm = 150
    expect(calculateWeightFrom1RM(150, 15)).toBeCloseTo(100, 1)
  })

  it('correctly inverses the blended Epley+Brzycki formula for 2-10 reps', () => {
    // Epley for w=100, r=5 -> 100 * (1 + 5/30) = 116.666
    // Brzycki for w=100, r=5 -> 100 * (36/32) = 112.5
    // Blended e1RM = 114.58333
    expect(calculateWeightFrom1RM(114.58333, 5)).toBeCloseTo(100, 1)
  })

  it('handles fractional reps properly', () => {
    // Testing continuity of the blended formula for RPE adjustments (e.g. 10.5 reps)
    const exactWeight = calculateWeightFrom1RM(120, 10.5)
    expect(exactWeight).toBeGreaterThan(0)
    expect(exactWeight).toBeLessThan(120)
  })
})

describe('suggestRepSum', () => {
  const base = { lastWeight: 40, lastReps: 8, repSumTarget: 30, experienceLevel: 'intermediate' as const }

  it('holds weight and asks for a baseline on the first session', () => {
    const out = suggestRepSum(base)
    expect(out.weight_kg).toBe(40)
    expect(out.target_reps).toBe(8)
    expect(out.reason).toContain('First session')
  })

  it('adds one compound increment once the rep-sum target was reached', () => {
    const out = suggestRepSum({ ...base, prevTotalReps: 30 })
    expect(out.weight_kg).toBe(42.5)
    expect(out.reason).toContain('add 2.5kg')
  })

  it('holds weight and reports the remaining reps below the target', () => {
    const out = suggestRepSum({ ...base, prevTotalReps: 26 })
    expect(out.weight_kg).toBe(40)
    expect(out.reason).toContain('4 more reps')
  })

  it('uses the isolation increment for isolation exercises', () => {
    const out = suggestRepSum({ ...base, exerciseType: 'isolation', prevTotalReps: 30 })
    expect(out.weight_kg).toBe(41.25)
  })

  it('defaults the RPE target to 8 and lets dupRpeTarget override it', () => {
    expect(suggestRepSum({ ...base, prevTotalReps: 20 }).rpe_target).toBe(8)
    expect(suggestRepSum({ ...base, prevTotalReps: 20, dupRpeTarget: 7 }).rpe_target).toBe(7)
  })
})

describe('generateDeloadRoutine', () => {
  // medium confidence (default): intensityFactor = 0.87, sets = 3, repReduction = 0
  it('drops weight to 87.5% rounded to nearest 2.5kg and maintains reps (medium confidence)', () => {
    const [out] = generateDeloadRoutine([
      { exerciseId: 'a', exerciseName: 'Squat', muscleGroup: 'legs', lastWeight: 100, lastReps: 8 },
    ])
    expect(out.weight_kg).toBe(87.5) // 100 * 0.87 = 87 -> rounded to 87.5
    expect(out.reps).toBe(8)          // maintained
    expect(out.sets).toBe(3)
  })

  it('floors reps at 5', () => {
    const [out] = generateDeloadRoutine([
      { exerciseId: 'a', exerciseName: 'Curl', muscleGroup: 'arms', lastWeight: 20, lastReps: 5 },
    ])
    expect(out.reps).toBe(5)
  })

  it('rounds the deload weight to the nearest 2.5kg plate', () => {
    const [out] = generateDeloadRoutine([
      { exerciseId: 'a', exerciseName: 'Row', muscleGroup: 'back', lastWeight: 77.5, lastReps: 8 },
    ])
    // 77.5 * 0.87 = 67.425 → nearest 2.5 = 67.5
    expect(out.weight_kg).toBe(67.5)
  })

  it('applies a shallower taper under low confidence', () => {
    // low confidence: intensityFactor = 0.92
    const [out] = generateDeloadRoutine([
      { exerciseId: 'a', exerciseName: 'Squat', muscleGroup: 'legs', lastWeight: 100, lastReps: 8 },
    ], 'low')
    expect(out.weight_kg).toBe(92.5) // 100 * 0.92 = 92 -> rounded to 92.5
    expect(out.sets).toBe(3)
  })

  it('applies a deeper deload and fewer sets under high confidence', () => {
    // high confidence: intensityFactor = 0.82, sets = 2
    const [out] = generateDeloadRoutine([
      { exerciseId: 'a', exerciseName: 'Squat', muscleGroup: 'legs', lastWeight: 100, lastReps: 8 },
    ], 'high')
    expect(out.weight_kg).toBe(82.5) // 100 * 0.82 = 82 -> rounded to 82.5
    expect(out.sets).toBe(2)
    expect(out.reps).toBe(8)          // maintained
  })

  it('returns an empty array for empty input', () => {
    expect(generateDeloadRoutine([])).toEqual([])
  })
})

describe('assessFatigueLevel', () => {
  const mkWeek = (start: string, vol: number, count: number, rpe: number | null = null): WeekSummary => ({
    week_start: start,
    total_volume: vol,
    workout_count: count,
    avg_rpe: rpe,
  })

  const getMondayOfWeeksAgo = (weeksAgo: number) => {
    const today = new Date()
    const dayOfWeek = today.getUTCDay()
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    const target = new Date(today)
    target.setUTCDate(today.getUTCDate() - daysToMonday - (weeksAgo * 7))
    return target.toISOString().split('T')[0]
  }

  it('returns no suggestion with fewer than 3 weeks of data', () => {
    const result = assessFatigueLevel([mkWeek(getMondayOfWeeksAgo(0), 5000, 3)], null)
    expect(result.shouldSuggest).toBe(false)
    expect(result.signals).toEqual([])
  })

  it('flags volume decline across 3 stable-frequency weeks', () => {
    const weeks: WeekSummary[] = [
      mkWeek(getMondayOfWeeksAgo(2), 10000, 4),
      mkWeek(getMondayOfWeeksAgo(1),  8500, 4),
      mkWeek(getMondayOfWeeksAgo(0),  7000, 4),
    ]
    const result = assessFatigueLevel(weeks, null)
    expect(result.shouldSuggest).toBe(true)
    expect(result.signals.some(s => s.toLowerCase().includes('volume'))).toBe(true)
  })

  it('flags PR drought when training consistently and no PR for 21+ days', () => {
    const weeks: WeekSummary[] = [
      mkWeek(getMondayOfWeeksAgo(3), 9000, 3),
      mkWeek(getMondayOfWeeksAgo(2), 9000, 3),
      mkWeek(getMondayOfWeeksAgo(1), 9000, 3),
      mkWeek(getMondayOfWeeksAgo(0), 9000, 3),
    ]
    const result = assessFatigueLevel(weeks, 25)
    expect(result.shouldSuggest).toBe(true)
    expect(result.signals.some(s => s.includes('25 days'))).toBe(true)
  })

  it('does not flag PR drought when frequency is too low to count as consistent', () => {
    const weeks: WeekSummary[] = [
      mkWeek(getMondayOfWeeksAgo(3), 9000, 1),
      mkWeek(getMondayOfWeeksAgo(2), 9000, 1),
      mkWeek(getMondayOfWeeksAgo(1), 9000, 1),
      mkWeek(getMondayOfWeeksAgo(0), 9000, 1),
    ]
    const result = assessFatigueLevel(weeks, 25)
    // PR drought signal needs >=2 sessions/week — should not contribute
    expect(result.signals.some(s => s.includes('PRs in'))).toBe(false)
  })

  it('returns active signals (early warnings) and score even when shouldSuggest is false', () => {
    const longStreakWeeks: WeekSummary[] = [
      mkWeek(getMondayOfWeeksAgo(6), 9000, 3),
      mkWeek(getMondayOfWeeksAgo(5), 9000, 3),
      mkWeek(getMondayOfWeeksAgo(4), 9000, 3),
      mkWeek(getMondayOfWeeksAgo(3), 9000, 3),
      mkWeek(getMondayOfWeeksAgo(2), 9000, 3),
      mkWeek(getMondayOfWeeksAgo(1), 9000, 3),
      mkWeek(getMondayOfWeeksAgo(0), 9000, 3),
    ]
    const result = assessFatigueLevel(longStreakWeeks, 10) // Only +1 for streak
    expect(result.shouldSuggest).toBe(false)
    expect(result.score).toBe(1)
    expect(result.signals.length).toBeGreaterThan(0)
    expect(result.signals[0]).toContain('weeks of continuous training')
  })

  describe('mesocycle length (training weeks)', () => {
    const steady = [3, 2, 1, 0].map(ago => mkWeek(getMondayOfWeeksAgo(ago), 9000, 3))
    const longAgo = new Date(Date.now() - 20 * 7 * 86_400_000).toISOString()
    const profileAt = (phaseWeek: number | null) => ({
      experience_level: 'intermediate' as const,
      training_phase:   'maingaining' as const,
      phase_started_at: longAgo,
      phase_week:       phaseWeek,
    })
    const mesocycleSignal = (signals: string[]) => signals.find(s => s.includes('deload'))

    it('ignores calendar time off and counts only training weeks', () => {
      const result = assessFatigueLevel(steady, 10, profileAt(2))
      expect(mesocycleSignal(result.signals)).toBeUndefined()
    })

    it('says a deload is due after the block of training weeks', () => {
      const result = assessFatigueLevel(steady, 10, profileAt(DELOAD_THRESHOLDS.intermediate.maingaining + 1))
      expect(mesocycleSignal(result.signals)).toContain('a deload week is due')
    })

    it('skips the signal when no training-week position is known', () => {
      const result = assessFatigueLevel(steady, 10, profileAt(null))
      expect(mesocycleSignal(result.signals)).toBeUndefined()
    })
  })
})
