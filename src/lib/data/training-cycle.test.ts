import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getSupabaseServer: vi.fn() }))

import { toWorkoutDates } from './training-cycle'

describe('toWorkoutDates', () => {
  it('keeps the start dates in order and drops missing ones', () => {
    expect(toWorkoutDates([
      { started_at: '2026-10-05T10:00:00Z' },
      { started_at: null },
      { started_at: '2026-10-07T18:30:00Z' },
    ])).toEqual(['2026-10-05T10:00:00Z', '2026-10-07T18:30:00Z'])
  })
})
