import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DatabaseError } from '@/lib/errors'

const mocks = vi.hoisted(() => ({
  userId: 'user-1' as string | null,
  result: { data: null as unknown, error: null as { message: string } | null },
  calls: [] as Array<[string, unknown[]]>,
}))

vi.mock('@/lib/supabase/client', () => {
  const builder: Record<string, unknown> = {}
  const resolve = () => Promise.resolve(mocks.result)
  for (const method of ['from', 'select', 'eq', 'gte', 'gt', 'not', 'order', 'limit']) {
    builder[method] = (...args: unknown[]) => {
      mocks.calls.push([method, args])
      return builder
    }
  }
  builder.maybeSingle = () => {
    mocks.calls.push(['maybeSingle', []])
    return resolve()
  }
  builder.then = (onFulfilled: (value: unknown) => unknown, onRejected?: (reason: unknown) => unknown) =>
    resolve().then(onFulfilled, onRejected)
  return {
    getSupabaseClient: () => builder,
    getCurrentUserId: async () => mocks.userId,
  }
})

import {
  fetchSuggestionHistory,
  fetchSuggestionProfile,
  fetchTodayReadinessAverage,
  fetchWeightStep,
  toPastSessions,
} from './suggestion-history'
import { hitRate } from '@/lib/suggestions/hit-rate'

const NORMAL = { isAssisted: false, isBodyweightOnly: false }

interface RowOverrides {
  workoutId?: string
  startedAt?: string
  setNumber?: number
  weight?: number | string
  reps?: number | string
  bodyweight?: number | string | null
  join?: 'object' | 'array'
  weekType?: string | null
  isDeload?: boolean | null
  suggestedWeight?: number | null
}

function row(overrides: RowOverrides) {
  const workout = {
    id: overrides.workoutId ?? 'w1',
    started_at: overrides.startedAt ?? '2026-11-01T10:00:00Z',
    bodyweight_kg: overrides.bodyweight === undefined ? 80 : overrides.bodyweight,
    week_type: overrides.weekType === undefined ? 'strength' : overrides.weekType,
    is_deload: overrides.isDeload === undefined ? false : overrides.isDeload,
  }
  const exercise = overrides.join === 'array' ? [{ workouts: [workout] }] : { workouts: workout }
  return {
    set_number: overrides.setNumber ?? 1,
    weight_kg: overrides.weight ?? 100,
    reps: overrides.reps ?? 5,
    rpe: null,
    rpe_source: null,
    suggested_weight_kg: overrides.suggestedWeight ?? null,
    suggested_reps: overrides.suggestedWeight == null ? null : overrides.reps ?? 5,
    workout_exercises: exercise,
  }
}

beforeEach(() => {
  mocks.userId = 'user-1'
  mocks.result = { data: null, error: null }
  mocks.calls.length = 0
  vi.restoreAllMocks()
})

describe('toPastSessions', () => {
  it('groups rows by workout, orders sets by set_number, newest first', () => {
    const rows = [
      row({ workoutId: 'old', startedAt: '2026-10-01T10:00:00Z', setNumber: 1 }),
      row({ workoutId: 'new', startedAt: '2026-11-01T10:00:00Z', setNumber: 2, weight: 90 }),
      row({ workoutId: 'new', startedAt: '2026-11-01T10:00:00Z', setNumber: 1, weight: 100 }),
    ]
    const sessions = toPastSessions(rows, NORMAL)
    expect(sessions.map(s => s.workoutId)).toEqual(['new', 'old'])
    expect(sessions[0].sets.map(s => s.weightKg)).toEqual([100, 90])
  })

  it('caps at 8 sessions', () => {
    const rows = Array.from({ length: 10 }, (_, i) =>
      row({ workoutId: `w${i}`, startedAt: `2026-11-${String(i + 1).padStart(2, '0')}T10:00:00Z` }))
    const sessions = toPastSessions(rows, NORMAL)
    expect(sessions).toHaveLength(8)
    expect(sessions[0].workoutId).toBe('w9')
  })

  it('converts assisted sets to load using that workout bodyweight', () => {
    const sessions = toPastSessions([row({ weight: 20, bodyweight: 80 })], { isAssisted: true, isBodyweightOnly: true })
    expect(sessions[0].sets[0].weightKg).toBe(60)
    expect(sessions[0].bodyweightKg).toBe(80)
  })

  it('converts an assisted suggested weight to load so hit-rate counts the hit', () => {
    const options = { isAssisted: true, isBodyweightOnly: false }
    const sessions = toPastSessions([row({ weight: 20, suggestedWeight: 20, bodyweight: 80 })], options)
    expect(sessions[0].sets[0].suggestedWeightKg).toBe(60)
    expect(hitRate(sessions)).toEqual({ hits: 1, total: 1 })
  })

  it('uses the fallback bodyweight when the workout has none', () => {
    const sessions = toPastSessions([row({ weight: 20, bodyweight: null })], { isAssisted: true, isBodyweightOnly: true })
    expect(sessions[0].sets[0].weightKg).toBe(55)
    expect(sessions[0].bodyweightKg).toBe(75)
  })

  it('sets weightKg to 0 for bodyweight-only sets', () => {
    const sessions = toPastSessions([row({ weight: 0, reps: 12 })], { isAssisted: false, isBodyweightOnly: true })
    expect(sessions[0].sets[0].weightKg).toBe(0)
  })

  it('accepts array joins, string numerics and null week data', () => {
    const sessions = toPastSessions(
      [row({ join: 'array', weight: '62.5', reps: '8', weekType: null, isDeload: null })], NORMAL)
    expect(sessions[0]).toMatchObject({ weekKind: null, isDeload: false })
    expect(sessions[0].sets[0]).toMatchObject({ weightKg: 62.5, reps: 8, rpe: null })
  })

  it('skips malformed rows and warns once with the count', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const rows = [row({}), { nonsense: true }, row({ weekType: 'bogus' })]
    const sessions = toPastSessions(rows, NORMAL)
    expect(sessions).toHaveLength(1)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0].join(' ')).toContain('2')
  })
})

describe('fetchSuggestionHistory', () => {
  it('returns [] without querying when signed out', async () => {
    mocks.userId = null
    expect(await fetchSuggestionHistory('ex-1', NORMAL)).toEqual([])
    expect(mocks.calls).toHaveLength(0)
  })

  it('filters by exercise and user, orders and limits', async () => {
    mocks.result = { data: [row({})], error: null }
    const sessions = await fetchSuggestionHistory('ex-1', NORMAL)
    expect(sessions).toHaveLength(1)
    expect(mocks.calls).toContainEqual(['eq', ['workout_exercises.exercise_id', 'ex-1']])
    expect(mocks.calls).toContainEqual(['eq', ['workout_exercises.workouts.user_id', 'user-1']])
    expect(mocks.calls).toContainEqual(['eq', ['is_warmup', false]])
    expect(mocks.calls).toContainEqual(['gt', ['reps', 0]])
    expect(mocks.calls).toContainEqual(['not', ['workout_exercises.workouts.completed_at', 'is', null]])
    expect(mocks.calls).toContainEqual(['order', ['completed_at', { ascending: false }]])
    expect(mocks.calls).toContainEqual(['limit', [200]])
    expect(mocks.calls.some(([m, a]) => m === 'gte' && a[0] === 'workout_exercises.workouts.started_at')).toBe(true)
  })

  it('rejects with DatabaseError on query error', async () => {
    mocks.result = { data: null, error: { message: 'boom' } }
    await expect(fetchSuggestionHistory('ex-1', NORMAL)).rejects.toBeInstanceOf(DatabaseError)
  })
})

describe('fetchTodayReadinessAverage', () => {
  it('returns null when signed out or no row', async () => {
    mocks.userId = null
    expect(await fetchTodayReadinessAverage()).toBeNull()
    mocks.userId = 'user-1'
    mocks.result = { data: null, error: null }
    expect(await fetchTodayReadinessAverage()).toBeNull()
  })

  it('averages the three scores for today (UTC)', async () => {
    mocks.result = { data: { sleep_score: 2, soreness_score: 3, energy_score: 4 }, error: null }
    expect(await fetchTodayReadinessAverage()).toBe(3)
    const today = new Date().toISOString().split('T')[0]
    expect(mocks.calls).toContainEqual(['eq', ['user_id', 'user-1']])
    expect(mocks.calls).toContainEqual(['eq', ['logged_at', today]])
  })

  it('throws DatabaseError on query error', async () => {
    mocks.result = { data: null, error: { message: 'boom' } }
    await expect(fetchTodayReadinessAverage()).rejects.toBeInstanceOf(DatabaseError)
  })
})

describe('fetchSuggestionProfile', () => {
  const EMPTY = { training_goal: null, experience_level: null, training_phase: null }

  it('returns an empty profile when signed out', async () => {
    mocks.userId = null
    expect(await fetchSuggestionProfile()).toEqual(EMPTY)
    mocks.userId = 'user-1'
  })

  it('returns an empty profile when the lifter has never saved one', async () => {
    mocks.result = { data: null, error: null }
    expect(await fetchSuggestionProfile()).toEqual(EMPTY)
    expect(mocks.calls).toContainEqual(['maybeSingle', []])
  })

  it('returns the saved profile scoped to the user', async () => {
    mocks.result = {
      data: { training_goal: 'muscle', experience_level: 'intermediate', training_phase: 'cutting' },
      error: null,
    }
    expect(await fetchSuggestionProfile()).toEqual({
      training_goal: 'muscle', experience_level: 'intermediate', training_phase: 'cutting',
    })
    expect(mocks.calls).toContainEqual(['eq', ['id', 'user-1']])
  })

  it('throws DatabaseError on query error', async () => {
    mocks.result = { data: null, error: { message: 'boom' } }
    await expect(fetchSuggestionProfile()).rejects.toBeInstanceOf(DatabaseError)
  })
})

describe('fetchWeightStep', () => {
  it('returns null when signed out or no preference', async () => {
    mocks.userId = null
    expect(await fetchWeightStep('ex-1')).toBeNull()
    mocks.userId = 'user-1'
    mocks.result = { data: null, error: null }
    expect(await fetchWeightStep('ex-1')).toBeNull()
  })

  it('returns the stored step scoped by user and exercise', async () => {
    mocks.result = { data: { weight_step_kg: '5' }, error: null }
    expect(await fetchWeightStep('ex-1')).toBe(5)
    expect(mocks.calls).toContainEqual(['eq', ['user_id', 'user-1']])
    expect(mocks.calls).toContainEqual(['eq', ['exercise_id', 'ex-1']])
  })

  it('throws DatabaseError on query error', async () => {
    mocks.result = { data: null, error: { message: 'boom' } }
    await expect(fetchWeightStep('ex-1')).rejects.toBeInstanceOf(DatabaseError)
  })
})
