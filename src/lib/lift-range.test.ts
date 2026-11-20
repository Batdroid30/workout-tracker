import { describe, it, expect } from 'vitest'
import { bestRecentSet, defaultRange, liftHeadline, pointsInRange, recentSessionsFrom } from './lift-range'

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
    expect(liftHeadline(points, now)).toEqual({ current: 92, best: 92, isBest: true, change12w: 4, lastTrained: '2026-11-18', isStale: false })
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

  it('flags a lift not trained in the last 12 weeks, with when it was last done', () => {
    const old = [{ date: '2026-03-02', best1RM: 80 }, { date: '2026-03-09', best1RM: 82 }]
    expect(liftHeadline(old, now)).toMatchObject({ current: 82, lastTrained: '2026-03-09', isStale: true })
  })

  it('has nothing before the first session', () => {
    expect(liftHeadline([], now)).toEqual({ current: null, best: null, isBest: false, change12w: null, lastTrained: null, isStale: false })
  })
})

describe('defaultRange', () => {
  it('opens on 12 weeks when there is something to chart', () => {
    expect(defaultRange(points, now)).toBe('12w')
  })

  it('widens until the chart has at least two sessions', () => {
    expect(defaultRange([{ date: '2026-03-02', best1RM: 80 }, { date: '2026-03-09', best1RM: 82 }], now)).toBe('1y')
    expect(defaultRange([{ date: '2024-03-02', best1RM: 80 }, { date: '2024-03-09', best1RM: 82 }], now)).toBe('all')
  })
})

describe('recentSessionsFrom', () => {
  it('lists working sets, newest session first', () => {
    const sessions = recentSessionsFrom([
      { id: 'w1', startedAt: '2026-11-14T09:00:00Z', sets: [{ weight_kg: 77.5, reps: 8, is_warmup: false, set_number: 1 }] },
      { id: 'w2', startedAt: '2026-11-18T09:00:00Z', sets: [{ weight_kg: 40, reps: 10, is_warmup: true, set_number: 1 }, { weight_kg: 80, reps: 8, is_warmup: false, set_number: 2 }, { weight_kg: 80, reps: 7, is_warmup: false, set_number: 3 }] },
    ], 5)
    expect(sessions).toEqual([
      { id: 'w2', date: '2026-11-18', sets: [{ weight: 80, reps: 8 }, { weight: 80, reps: 7 }] },
      { id: 'w1', date: '2026-11-14', sets: [{ weight: 77.5, reps: 8 }] },
    ])
  })

  it('keeps two workouts on the same day apart, later one first, sets in the order done', () => {
    const sessions = recentSessionsFrom([
      { id: 'am', startedAt: '2026-11-18T07:00:00Z', sets: [{ weight_kg: 60, reps: 5, is_warmup: false, set_number: 1 }] },
      { id: 'pm', startedAt: '2026-11-18T18:00:00Z', sets: [{ weight_kg: 70, reps: 3, is_warmup: false, set_number: 2 }, { weight_kg: 65, reps: 5, is_warmup: false, set_number: 1 }] },
    ], 5)
    expect(sessions.map(session => session.id)).toEqual(['pm', 'am'])
    expect(sessions[0].sets).toEqual([{ weight: 65, reps: 5 }, { weight: 70, reps: 3 }])
  })
})

describe('bestRecentSet', () => {
  it('picks the set with the highest estimated max', () => {
    expect(bestRecentSet([{ id: 'w', date: 'd', sets: [{ weight: 80, reps: 8 }, { weight: 90, reps: 3 }] }])).toEqual({ weight: 80, reps: 8 })
  })

  it('has none without sets', () => {
    expect(bestRecentSet([])).toBeNull()
  })
})
