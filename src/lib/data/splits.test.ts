import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getSupabaseServer: vi.fn() }))

import { toSplitWithItems } from './splits'

describe('toSplitWithItems', () => {
  it('orders items, names routines and marks rest days', () => {
    expect(toSplitWithItems({
      id: 's1',
      name: 'Push pull legs',
      is_active: true,
      skip_to_position: null,
      skip_set_at: null,
      training_split_items: [
        { id: 'b', position: 1, routine_id: null, routine: null },
        { id: 'a', position: 0, routine_id: 'r1', routine: { title: 'Push A' } },
      ],
    })).toEqual({
      id: 's1',
      name: 'Push pull legs',
      isActive: true,
      skip: null,
      items: [
        { id: 'a', position: 0, routineId: 'r1', routineTitle: 'Push A' },
        { id: 'b', position: 1, routineId: null, routineTitle: null },
      ],
    })
  })

  it('keeps a skip only when both its position and time are set', () => {
    const base = { id: 's', name: 'S', is_active: false, training_split_items: [] }
    expect(toSplitWithItems({ ...base, skip_to_position: 2, skip_set_at: '2026-11-03T09:00:00Z' }).skip)
      .toEqual({ position: 2, setAt: '2026-11-03T09:00:00Z' })
    expect(toSplitWithItems({ ...base, skip_to_position: 2, skip_set_at: null }).skip).toBeNull()
  })
})
