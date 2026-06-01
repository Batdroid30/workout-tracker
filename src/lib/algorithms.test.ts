import { describe, it, expect } from 'vitest'
import {
  calculateEpley1RM,
  calculateWeightFrom1RM,
  suggestNextSet,
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

describe('suggestNextSet', () => {
  it('adds a compound increment and resets reps when at the top of the range', () => {
    const out = suggestNextSet({
      lastWeight: 100,
      lastReps: 15,
      exerciseType: 'compound',
      trainingGoal: 'muscle',
      experienceLevel: 'intermediate',
    })
    expect(out.weight_kg).toBeGreaterThan(100)
    expect(out.target_reps).toBeLessThan(15)
  })

  it('keeps weight steady and adds one rep when inside the rep range', () => {
    const out = suggestNextSet({
      lastWeight: 80,
      lastReps: 10,
      trainingGoal: 'muscle',
      experienceLevel: 'intermediate',
    })
    expect(out.weight_kg).toBe(80)
    expect(out.target_reps).toBe(11)
  })

  it('drops weight when reps fall below the minimum', () => {
    const out = suggestNextSet({
      lastWeight: 80,
      lastReps: 4,
      trainingGoal: 'muscle',
      experienceLevel: 'intermediate',
    })
    expect(out.weight_kg).toBeLessThan(80)
  })

  it('never returns a negative weight', () => {
    const out = suggestNextSet({
      lastWeight: 1,
      lastReps: 0,
      trainingGoal: 'muscle',
      experienceLevel: 'intermediate',
    })
    expect(out.weight_kg).toBeGreaterThanOrEqual(0)
  })

  it('always includes rpe_target matching the goal-based target', () => {
    // muscle goal → TARGET_RPE['muscle'] = 7.5
    const out = suggestNextSet({
      lastWeight: 80,
      lastReps: 10,
      trainingGoal: 'muscle',
      experienceLevel: 'intermediate',
    })
    expect(out.rpe_target).toBe(7.5)
  })

  it('uses dupRpeTarget when provided, overriding the goal-based value', () => {
    const out = suggestNextSet({
      lastWeight: 80,
      lastReps: 10,
      trainingGoal: 'muscle',
      experienceLevel: 'intermediate',
      dupRpeTarget: 7.0,
    })
    expect(out.rpe_target).toBe(7.0)
  })

  it('backs off weight when last RPE was well above target', () => {
    // deviation = 9.5 - 7.5 = +2.0 > 1.5 → reduce load
    const out = suggestNextSet({
      lastWeight: 100,
      lastReps: 8,
      lastRPE: 9.5,
      trainingGoal: 'muscle',
      experienceLevel: 'intermediate',
    })
    expect(out.weight_kg).toBeLessThan(100)
    expect(out.rpe_target).toBe(7.5)
  })

  it('progresses more aggressively when last RPE was well below target', () => {
    // deviation = 5.5 - 7.5 = -2.0 < -1.5 → push harder
    const out = suggestNextSet({
      lastWeight: 100,
      lastReps: 12,
      lastRPE: 5.5,
      trainingGoal: 'muscle',
      experienceLevel: 'intermediate',
    })
    // Either more reps or more weight — either counts as "pushed harder"
    const progressedWeight = out.weight_kg > 100
    const progressedReps   = out.target_reps > 12
    expect(progressedWeight || progressedReps).toBe(true)
  })

  it('uses e1RM to suggest weight when WUP phase changes to a higher rep range', () => {
    // Hyp week: 27.5kg × 10 reps. Now Volume Week (13–20 reps, RPE 7.0).
    // Old behaviour would suggest 25kg × 20 — physically impossible.
    const out = suggestNextSet({
      lastWeight: 27.5,
      lastReps: 10,
      dupRepRange: { min: 13, max: 20 },
      dupRpeTarget: 7.0,
    })
    expect(out.target_reps).toBe(13)
    expect(out.weight_kg).toBeLessThan(27.5)
    expect(out.weight_kg).toBeGreaterThanOrEqual(20)
  })

  it('uses e1RM to suggest weight when WUP phase changes to a lower rep range', () => {
    // Volume week: 25kg × 18 reps. Now Strength Week (3–5 reps, RPE 8.5).
    // e1RM ≈ 40kg → target ~35kg, well above the old +2.5kg suggestion.
    const out = suggestNextSet({
      lastWeight: 25,
      lastReps: 18,
      dupRepRange: { min: 3, max: 5 },
      dupRpeTarget: 8.5,
    })
    expect(out.target_reps).toBe(3)
    expect(out.weight_kg).toBeGreaterThan(25)
  })

  it('uses e1RM recalculation when isPhaseTransition is explicitly true, regardless of last reps', () => {
    // Strength week (3-5), user did 30kg x 8 reps (ignored the target).
    // Now Hypertrophy week (8-12), so lastReps (8) is technically inside the new range!
    // But since it is a phase transition, it MUST recalculate, not just do lastReps + 1.
    const out = suggestNextSet({
      lastWeight: 30,
      lastReps: 8,
      lastRPE: 8, // 2 RIR -> equivalent to 10 reps to failure
      dupRepRange: { min: 8, max: 12 },
      dupRpeTarget: 7.5,
      isPhaseTransition: true,
    })
    
    // e1RM = calculate1RM(30, 10) = 40kg
    // new target reps to failure = 8 + (10 - 7.5) = 10.5
    // target weight = calculateWeightFrom1RM(40, 10.5) = 29.6kg -> 30kg
    expect(out.target_reps).toBe(8)
    expect(out.weight_kg).toBe(30)
    expect(out.reason).toContain('Phase changed')
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
})
