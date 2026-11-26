import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({ getSupabaseServer: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ getSupabaseServer: mocks.getSupabaseServer }))

import { isDeletedRoutineError, saveActiveWorkout } from './workouts'
import type { FinishPayload } from '@/lib/workout-session'

describe('isDeletedRoutineError', () => {
  it('spots a workout pointing at a routine deleted mid-session', () => {
    expect(isDeletedRoutineError({
      code: '23503',
      message: 'insert or update on table "workouts" violates foreign key constraint "workouts_routine_id_fkey"',
    })).toBe(true)
  })

  it('leaves every other save failure alone', () => {
    expect(isDeletedRoutineError({ code: '23503', message: 'violates foreign key constraint "workouts_user_id_fkey"' })).toBe(false)
    expect(isDeletedRoutineError({ code: '23505', message: 'duplicate key value' })).toBe(false)
  })
})

describe('saveActiveWorkout', () => {
  const inserts: Record<string, unknown[]> = {}

  function fakeClient() {
    return {
      from: (table: string) => ({
        insert: (row: unknown) => {
          inserts[table] = [...(inserts[table] ?? []), row]
          const result = { data: { id: `${table}-1` }, error: null }
          return { select: (columns?: string) => (columns ? Promise.resolve({ data: [], error: null }) : { single: () => Promise.resolve(result) }) }
        },
      }),
    }
  }

  const payload = {
    id: null,
    title: 'Push',
    started_at: new Date('2026-11-20T10:00:00Z'),
    exercises: [{
      workout_exercise_id: null,
      order_index: 0,
      exercise: { id: 'ex-1', name: 'Bench' },
      sets: [
        { id: 's1', set_number: 1, weight_kg: 80, reps: 5, rpe: 8, is_warmup: false, completed: true, saved: false,
          rpe_source: 'prompt', suggested_weight_kg: 82.5, suggested_reps: 5 },
        { id: 's2', set_number: 2, weight_kg: 80, reps: 5, rpe: null, is_warmup: false, completed: true, saved: false },
      ],
    }],
  } as unknown as FinishPayload

  beforeEach(() => {
    for (const key of Object.keys(inserts)) delete inserts[key]
    mocks.getSupabaseServer.mockResolvedValue(fakeClient())
  })

  it('stores the week type and deload flag on the workout row', async () => {
    await saveActiveWorkout('user-1', payload, { weekType: 'strength', isDeload: false })
    expect(inserts.workouts[0]).toMatchObject({ week_type: 'strength', is_deload: false })
  })

  it('stores nulls when the week is unknown', async () => {
    await saveActiveWorkout('user-1', payload, { weekType: null, isDeload: null })
    expect(inserts.workouts[0]).toMatchObject({ week_type: null, is_deload: null })
  })

  it('stores rpe source and the shown suggestion on each set, null when absent', async () => {
    await saveActiveWorkout('user-1', payload, { weekType: 'strength', isDeload: false })
    const [first, second] = inserts.sets[0] as Record<string, unknown>[]
    expect(first).toMatchObject({ rpe_source: 'prompt', suggested_weight_kg: 82.5, suggested_reps: 5 })
    expect(second).toMatchObject({ rpe_source: null, suggested_weight_kg: null, suggested_reps: null })
  })
})
