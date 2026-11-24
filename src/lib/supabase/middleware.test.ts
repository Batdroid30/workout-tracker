import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

type CookieWrite = { name: string; value: string; options: { path?: string; maxAge?: number } }

// The Supabase client is replaced by one that writes the given cookies and
// reports the given user, which is all the middleware reacts to.
let cookieWrites: CookieWrite[] = []
let signedInUser: { id: string } | null = null

vi.mock('@supabase/ssr', () => ({
  createServerClient: (_url: string, _key: string, { cookies }: { cookies: { setAll(writes: CookieWrite[]): void } }) => ({
    auth: {
      getUser: async () => {
        if (cookieWrites.length > 0) cookies.setAll(cookieWrites)
        return { data: { user: signedInUser } }
      },
    },
  }),
}))

import { updateSession } from './middleware'

const SESSION_COOKIE = 'sb-project-auth-token'

function requestFor(path: string) {
  return new NextRequest(`https://app.test${path}`, { headers: { cookie: `${SESSION_COOKIE}=dead-session` } })
}

describe('updateSession', () => {
  beforeEach(() => {
    cookieWrites = []
    signedInUser = null
  })

  it('clears a dead session on the redirect to login, so it is not retried on every request', async () => {
    // Supabase rejects the revoked refresh token and asks for the cookie to be removed.
    cookieWrites = [{ name: SESSION_COOKIE, value: '', options: { path: '/', maxAge: 0 } }]

    const response = await updateSession(requestFor('/dashboard'))

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('https://app.test/login')
    expect(response.headers.get('set-cookie')).toContain(`${SESSION_COOKIE}=;`)
  })

  it('keeps a refreshed session on the redirect away from login', async () => {
    signedInUser = { id: 'user-1' }
    cookieWrites = [{ name: SESSION_COOKIE, value: 'fresh-session', options: { path: '/' } }]

    const response = await updateSession(requestFor('/login'))

    expect(response.headers.get('location')).toBe('https://app.test/dashboard')
    expect(response.headers.get('set-cookie')).toContain(`${SESSION_COOKIE}=fresh-session`)
  })
})
