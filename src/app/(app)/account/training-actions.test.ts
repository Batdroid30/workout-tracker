import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getSupabaseServer: vi.fn() }))
vi.mock('@/lib/auth', () => ({ requireAuth: vi.fn() }))
vi.mock('@/lib/cache', () => ({ revalidateAll: vi.fn() }))

import { restartPayload } from './restart-payload'

describe('restartPayload', () => {
  const now = new Date('2026-11-20T09:30:00Z')

  it('restarting the cycle moves only the cycle anchor', () => {
    expect(restartPayload('cycle', now)).toEqual({ cycle_started_at: now.toISOString() })
  })

  it('restarting the phase also restarts the cycle at the same moment', () => {
    expect(restartPayload('phase', now)).toEqual({
      cycle_started_at: now.toISOString(),
      phase_started_at: now.toISOString(),
    })
  })
})
