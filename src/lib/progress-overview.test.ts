import { describe, it, expect } from 'vitest'
import { bodyweightTrend, monthStart, workoutsInMonth } from './progress-overview'

// Both "this month" tiles (PRs and workouts) count from the same moment.
describe('monthStart', () => {
  it('is the first of the month at midnight UTC', () => {
    expect(monthStart(new Date('2026-11-21T15:30:00Z')).toISOString()).toBe('2026-11-01T00:00:00.000Z')
  })

  it('matches the month workoutsInMonth counts, even late on the last day', () => {
    const lateOnTheLastDay = new Date('2026-11-30T23:30:00Z')
    expect(monthStart(lateOnTheLastDay).toISOString().slice(0, 7)).toBe('2026-11')
    expect(workoutsInMonth([{ date: '2026-11-02', count: 1 }, { date: '2026-12-01', count: 1 }], lateOnTheLastDay)).toBe(1)
  })
})

describe('workoutsInMonth', () => {
  it('counts workouts in the current month only', () => {
    const entries = [{ date: '2026-10-30', count: 1 }, { date: '2026-11-02', count: 1 }, { date: '2026-11-18', count: 2 }]
    expect(workoutsInMonth(entries, new Date(2026, 10, 20))).toBe(3)
  })
})

describe('bodyweightTrend', () => {
  it('gives the latest weight and the weekly change', () => {
    expect(bodyweightTrend([{ date: '2026-10-23', weight_kg: 77.2 }, { date: '2026-11-20', weight_kg: 78.4 }]))
      .toEqual({ latest: 78.4, perWeek: 0.3 })
  })

  it('has no trend from a single weigh-in', () => {
    expect(bodyweightTrend([{ date: '2026-11-20', weight_kg: 78.4 }])).toEqual({ latest: 78.4, perWeek: null })
  })

  it('waits for a week between weigh-ins before giving a weekly rate', () => {
    // A 0.6 kg swing over two days would read as 2.1 kg a week.
    expect(bodyweightTrend([{ date: '2026-11-18', weight_kg: 78.4 }, { date: '2026-11-20', weight_kg: 79 }]))
      .toEqual({ latest: 79, perWeek: null })
  })

  it('has nothing without weigh-ins', () => {
    expect(bodyweightTrend([])).toBeNull()
  })
})
