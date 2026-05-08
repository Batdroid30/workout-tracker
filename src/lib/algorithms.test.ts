import { describe, it, expect } from 'vitest'
import {
  calculateEpley1RM,
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
})

describe('generateDeloadRoutine', () => {
  // medium confidence (default): intensityFactor = 0.65, sets = 3, repReduction = 2
  it('drops weight to 65% rounded to nearest 2.5kg and trims 2 reps (medium confidence)', () => {
    const [out] = generateDeloadRoutine([
      { exerciseId: 'a', exerciseName: 'Squat', muscleGroup: 'legs', lastWeight: 100, lastReps: 8 },
    ])
    expect(out.weight_kg).toBe(65)   // 100 * 0.65 = 65, already on a plate
    expect(out.reps).toBe(6)          // 8 - 2
    expect(out.sets).toBe(3)
  })

  it('floors reps at 5', () => {
    const [out] = generateDeloadRoutine([
      { exerciseId: 'a', exerciseName: 'Curl', muscleGroup: 'arms', lastWeight: 20, lastReps: 5 },
    ])
    expect(out.reps).toBe(5)          // max(5, 5 - 2) = 5
  })

  it('rounds the deload weight to the nearest 2.5kg plate', () => {
    const [out] = generateDeloadRoutine([
      { exerciseId: 'a', exerciseName: 'Row', muscleGroup: 'back', lastWeight: 77.5, lastReps: 8 },
    ])
    // 77.5 * 0.65 = 50.375 → nearest 2.5 = 50
    expect(out.weight_kg).toBe(50)
  })

  it('applies a shallower taper under low confidence', () => {
    // low confidence: intensityFactor = 0.75
    const [out] = generateDeloadRoutine([
      { exerciseId: 'a', exerciseName: 'Squat', muscleGroup: 'legs', lastWeight: 100, lastReps: 8 },
    ], 'low')
    expect(out.weight_kg).toBe(75)   // 100 * 0.75 = 75
    expect(out.sets).toBe(3)
  })

  it('applies a deeper deload and fewer sets under high confidence', () => {
    // high confidence: intensityFactor = 0.55, sets = 2, repReduction = 3
    const [out] = generateDeloadRoutine([
      { exerciseId: 'a', exerciseName: 'Squat', muscleGroup: 'legs', lastWeight: 100, lastReps: 8 },
    ], 'high')
    expect(out.weight_kg).toBe(55)   // 100 * 0.55 = 55
    expect(out.sets).toBe(2)
    expect(out.reps).toBe(5)          // 8 - 3 = 5
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

  it('returns no suggestion with fewer than 3 weeks of data', () => {
    const result = assessFatigueLevel([mkWeek('2026-04-20', 5000, 3)], null)
    expect(result.shouldSuggest).toBe(false)
    expect(result.signals).toEqual([])
  })

  it('flags volume decline across 3 stable-frequency weeks', () => {
    const weeks: WeekSummary[] = [
      mkWeek('2026-04-13', 10000, 4),
      mkWeek('2026-04-20',  8500, 4),
      mkWeek('2026-04-27',  7000, 4),
    ]
    const result = assessFatigueLevel(weeks, null)
    expect(result.shouldSuggest).toBe(true)
    expect(result.signals.some(s => s.toLowerCase().includes('volume'))).toBe(true)
  })

  it('flags PR drought when training consistently and no PR for 21+ days', () => {
    const weeks: WeekSummary[] = [
      mkWeek('2026-04-06', 9000, 3),
      mkWeek('2026-04-13', 9000, 3),
      mkWeek('2026-04-20', 9000, 3),
      mkWeek('2026-04-27', 9000, 3),
    ]
    const result = assessFatigueLevel(weeks, 25)
    expect(result.shouldSuggest).toBe(true)
    expect(result.signals.some(s => s.includes('25 days'))).toBe(true)
  })

  it('does not flag PR drought when frequency is too low to count as consistent', () => {
    const weeks: WeekSummary[] = [
      mkWeek('2026-04-06', 9000, 1),
      mkWeek('2026-04-13', 9000, 1),
      mkWeek('2026-04-20', 9000, 1),
      mkWeek('2026-04-27', 9000, 1),
    ]
    const result = assessFatigueLevel(weeks, 25)
    // PR drought signal needs >=2 sessions/week — should not contribute
    expect(result.signals.some(s => s.includes('PRs in'))).toBe(false)
  })
})
