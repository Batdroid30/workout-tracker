import { describe, it, expect } from 'vitest'
import { bodyweightTrend, workoutsInMonth } from './progress-overview'

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
