import { describe, it, expect, vi } from 'vitest'

vi.mock('next/headers', () => ({ cookies: vi.fn() }))

import * as server from './server'

describe('supabase server module', () => {
  // App code must only reach the database as the signed-in user, so RLS always
  // applies. A service-role (admin) client exported from here would bypass RLS
  // for any caller that imports it.
  it('exports only the per-user client', () => {
    expect(Object.keys(server)).toEqual(['getSupabaseServer'])
  })
})
