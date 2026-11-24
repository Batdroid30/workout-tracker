import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/supabase/middleware', () => ({ updateSession: vi.fn() }))

import { config } from './middleware'

// Next matches the whole path against the matcher, like an anchored regex.
const runsMiddleware = (path: string) => new RegExp(`^${config.matcher[0]}$`).test(path)

describe('middleware matcher', () => {
  it('checks the session on pages and server actions', () => {
    expect(runsMiddleware('/dashboard')).toBe(true)
    expect(runsMiddleware('/login')).toBe(true)
    expect(runsMiddleware('/progress/more')).toBe(true)
  })

  it('skips files the browser fetches on every page load', () => {
    // Each of these ran a session refresh; with a dead session that was six
    // refreshes per page, enough to hit Supabase's rate limit.
    expect(runsMiddleware('/manifest.json')).toBe(false)
    expect(runsMiddleware('/icons/icon-192.png')).toBe(false)
    expect(runsMiddleware('/icons/apple-icon-180.png')).toBe(false)
    expect(runsMiddleware('/logo.svg')).toBe(false)
    expect(runsMiddleware('/_next/static/chunks/app.js')).toBe(false)
    expect(runsMiddleware('/favicon.ico')).toBe(false)
  })
})
