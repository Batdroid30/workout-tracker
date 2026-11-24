import { describe, it, expect } from 'vitest'
import { checkResetLink } from './check-reset-link'

const authWith = (session: unknown) => ({ getSession: async () => ({ data: { session } }) })

describe('checkResetLink', () => {
  it('opens the new-password form once the link has signed the lifter in', async () => {
    expect(await checkResetLink(authWith({ access_token: 't' }))).toBe('ready')
  })

  it('says the link is no good instead of verifying forever', async () => {
    // An expired or used link, or one opened in a different browser than it was
    // requested from, leaves no session once Supabase has finished with the URL.
    expect(await checkResetLink(authWith(null))).toBe('error')
  })

  it('treats a failed session check as a bad link', async () => {
    expect(await checkResetLink({ getSession: async () => { throw new Error('network') } })).toBe('error')
  })
})
