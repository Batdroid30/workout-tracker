import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getSupabaseServer: vi.fn() }))

import { toTrackedLifts } from './tracked-lifts'

describe('toTrackedLifts', () => {
  it('lists the picks in the order the lifter chose', () => {
    expect(toTrackedLifts([
      { exercise_id: 'squat', position: 1, exercise: { name: 'Squat', muscle_group: 'quads' } },
      { exercise_id: 'bench', position: 0, exercise: { name: 'Bench Press', muscle_group: 'chest' } },
    ])).toEqual([
      { exerciseId: 'bench', exerciseName: 'Bench Press', muscleGroup: 'chest' },
      { exerciseId: 'squat', exerciseName: 'Squat', muscleGroup: 'quads' },
    ])
  })

  it('skips a pick whose exercise is no longer visible', () => {
    expect(toTrackedLifts([{ exercise_id: 'gone', position: 0, exercise: null }])).toEqual([])
  })
})
