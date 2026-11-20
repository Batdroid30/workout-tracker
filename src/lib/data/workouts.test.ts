import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getSupabaseServer: vi.fn() }))

import { isDeletedRoutineError } from './workouts'

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
