import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getSupabaseServer: vi.fn() }))
vi.mock('@/lib/auth', () => ({ requireAuth: vi.fn() }))
vi.mock('@/lib/cache', () => ({ revalidateAll: vi.fn() }))

import { requireAuth } from '@/lib/auth'
import { saveTrackedLiftsAction } from './tracked-lifts-actions'

describe('saveTrackedLiftsAction', () => {
  it('lets the login redirect through when the session has expired', async () => {
    // requireAuth signals "go to login" by throwing Next's redirect error.
    const redirectToLogin = Object.assign(new Error('NEXT_REDIRECT'), { digest: 'NEXT_REDIRECT;replace;/login;307;' })
    vi.mocked(requireAuth).mockRejectedValueOnce(redirectToLogin)

    await expect(saveTrackedLiftsAction([])).rejects.toBe(redirectToLogin)
  })
})
