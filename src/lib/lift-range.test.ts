import { describe, it, expect } from 'vitest'
import { bestRecentSet, liftHeadline, pointsInRange, recentSessionsFrom } from './lift-range'

const now = new Date('2026-11-21T12:00:00Z')
const points = [
  { date: '2025-10-01', best1RM: 70 },
  { date: '2026-08-01', best1RM: 85 },
  { date: '2026-10-30', best1RM: 88 },
  { date: '2026-11-18', best1RM: 92 },
]

describe('pointsInRange', () => {
  it('keeps the last four weeks for 4W', () => {
    expect(pointsInRange(points, '4w', now).map(p => p.date)).toEqual(['2026-10-30', '2026-11-18'])
  })

  it('keeps everything for All', () => {
    expect(pointsInRange(points, 'all', now)).toHaveLength(4)
  })
})

describe('liftHeadline', () => {
  it('reads the latest estimate, the best ever and the 12-week change', () => {
    expect(liftHeadline(points, now)).toEqual({ current: 92, best: 92, isBest: true, change12w: 4 })
  })

  it('measures the change week to week, like Progress does', () => {
    // Two sessions in the first week: the week's best (89) is the starting point.
    const sessions = [
      { date: '2026-10-26', best1RM: 88 },
      { date: '2026-10-28', best1RM: 89 },
      { date: '2026-11-18', best1RM: 92.4 },
    ]
    expect(liftHeadline(sessions, now)).toMatchObject({ current: 92.4, change12w: 3.4 })
  })

  it('has no 12-week change without an older point in the window', () => {
    expect(liftHeadline([{ date: '2026-11-18', best1RM: 92 }], now).change12w).toBeNull()
  })

  it('has nothing before the first session', () => {
    expect(liftHeadline([], now)).toEqual({ current: null, best: null, isBest: false, change12w: null })
  })
})

describe('recentSessionsFrom', () => {
  it('lists working sets, newest session first', () => {
    const sessions = recentSessionsFrom([
      { date: '2026-11-14', sets: [{ weight_kg: 77.5, reps: 8, is_warmup: false }] },
      { date: '2026-11-18', sets: [{ weight_kg: 40, reps: 10, is_warmup: true }, { weight_kg: 80, reps: 8, is_warmup: false }, { weight_kg: 80, reps: 7, is_warmup: false }] },
    ], 5)
    expect(sessions).toEqual([
      { date: '2026-11-18', sets: [{ weight: 80, reps: 8 }, { weight: 80, reps: 7 }] },
      { date: '2026-11-14', sets: [{ weight: 77.5, reps: 8 }] },
    ])
  })
})

describe('bestRecentSet', () => {
  it('picks the set with the highest estimated max', () => {
    expect(bestRecentSet([{ date: 'd', sets: [{ weight: 80, reps: 8 }, { weight: 90, reps: 3 }] }])).toEqual({ weight: 80, reps: 8 })
  })

  it('has none without sets', () => {
    expect(bestRecentSet([])).toBeNull()
  })
})
