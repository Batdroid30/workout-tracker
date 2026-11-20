import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getSupabaseServer: vi.fn() }))

import { countDistinctPRSets } from './recent-pr-count'

describe('countDistinctPRSets', () => {
  it('counts each record-breaking set once, however many records it set', () => {
    expect(countDistinctPRSets([
      { set_id: 'a' }, { set_id: 'a' }, { set_id: 'b' }, { set_id: 'c' }, { set_id: 'd' }, { set_id: 'e' }, { set_id: 'f' },
    ])).toBe(6)
  })

  it('counts records without a set on their own', () => {
    expect(countDistinctPRSets([{ set_id: null }, { set_id: null }, { set_id: 'a' }])).toBe(3)
  })
})
