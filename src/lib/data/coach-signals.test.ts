import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getSupabaseServer: vi.fn() }))

import { stalledMovementsFrom } from './coach-signals'
import type { StalenessEntry } from './progress-snapshot'

const entry = (name: string, previousBest: number, recentBest: number, sessions = 2): StalenessEntry => ({
  name, muscleGroup: 'chest', movementPattern: 'horizontal_push',
  previousBest, recentBest, recentSessions: sessions, previousSessions: sessions,
})

describe('stalledMovementsFrom', () => {
  it('keeps lifts that gained under 3% over the window, slowest first', () => {
    const staleness = new Map([
      ['a', entry('Bench press', 100, 101)],
      ['b', entry('Incline press', 80, 79)],
      ['c', entry('Squat', 140, 150)],
    ])
    expect(stalledMovementsFrom(staleness).map(m => m.exerciseName)).toEqual(['Incline press', 'Bench press'])
  })

  it('needs two sessions on each side to call a lift stalled', () => {
    expect(stalledMovementsFrom(new Map([['a', entry('Bench press', 100, 100, 1)]]))).toEqual([])
  })

  it('returns at most three', () => {
    const staleness = new Map(['a', 'b', 'c', 'd'].map(id => [id, entry(`Lift ${id}`, 100, 100)] as const))
    expect(stalledMovementsFrom(staleness)).toHaveLength(3)
  })
})
