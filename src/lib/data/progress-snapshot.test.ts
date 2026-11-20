import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getSupabaseServer: vi.fn() }))

import { snapshotWindowStart } from './progress-snapshot'

describe('snapshotWindowStart', () => {
  it('starts 12 weeks back at midnight UTC, the same day the lift page starts from', () => {
    expect(snapshotWindowStart(new Date('2026-11-21T15:30:00Z')).toISOString()).toBe('2026-08-29T00:00:00.000Z')
  })
})
