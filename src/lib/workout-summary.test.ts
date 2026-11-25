import { describe, it, expect } from 'vitest'
import { workoutSummary } from './workout-summary'

const set = (id: string, isWarmup = false) => ({ id, is_warmup: isWarmup })

describe('workoutSummary', () => {
  it('reads a long session as hours and minutes', () => {
    expect(workoutSummary({ durationSeconds: 6667, volumeKg: 0, sets: [], prSetIds: new Set() }).duration).toBe('1h 51')
  })

  it('reads a short session in minutes, and a missing time as 0m', () => {
    expect(workoutSummary({ durationSeconds: 2700, volumeKg: 0, sets: [], prSetIds: new Set() }).duration).toBe('45m')
    expect(workoutSummary({ durationSeconds: null, volumeKg: 0, sets: [], prSetIds: new Set() }).duration).toBe('0m')
  })

  it('shows volume in tonnes from a tonne up, in kilos below', () => {
    expect(workoutSummary({ durationSeconds: null, volumeKg: 9800, sets: [], prSetIds: new Set() }).volume).toBe('9.8 t')
    expect(workoutSummary({ durationSeconds: null, volumeKg: 640, sets: [], prSetIds: new Set() }).volume).toBe('640 kg')
    expect(workoutSummary({ durationSeconds: null, volumeKg: 0, sets: [], prSetIds: new Set() }).volume).toBe('0 kg')
  })

  it('counts working sets and PRs, never warm-ups', () => {
    const summary = workoutSummary({
      durationSeconds: 600,
      volumeKg: 500,
      sets: [set('w', true), set('a'), set('b'), set('c')],
      prSetIds: new Set(['w', 'b']),
    })
    expect(summary.workingSets).toBe(3)
    expect(summary.prCount).toBe(1)
  })

  it('never shows NaN or undefined for an empty workout', () => {
    const summary = workoutSummary({ durationSeconds: null, volumeKg: Number.NaN, sets: [], prSetIds: new Set() })
    expect(Object.values(summary).join(' ')).not.toMatch(/NaN|undefined/)
    expect(summary).toEqual({ duration: '0m', volume: '0 kg', workingSets: 0, prCount: 0 })
  })
})
