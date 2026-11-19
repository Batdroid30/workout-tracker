import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  getSupabaseServer: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({ requireAuth: mocks.requireAuth }))
vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServer: mocks.getSupabaseServer,
}))

import { POST } from './route'

function postBodyweight(body: unknown): Request {
  return new Request('http://localhost/api/bodyweight', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

describe('POST /api/bodyweight', () => {
  const single = vi.fn()
  const insert = vi.fn(() => ({ select: () => ({ single }) }))

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireAuth.mockResolvedValue({ userId: 'user-1' })
    mocks.getSupabaseServer.mockResolvedValue({ from: () => ({ insert }) })
  })

  it('logs the reading through the per-user client', async () => {
    const saved = { id: 'bw-1', weight_kg: 80, logged_at: '2026-11-19T10:00:00Z' }
    single.mockResolvedValue({ data: saved, error: null })

    const response = await POST(postBodyweight({ weight_kg: 80 }))

    expect(response.status).toBe(201)
    expect(await response.json()).toEqual(saved)
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'user-1', weight_kg: 80 }))
  })

  it('returns 503 when the insert is rejected', async () => {
    single.mockResolvedValue({ data: null, error: { message: 'new row violates row-level security policy' } })

    const response = await POST(postBodyweight({ weight_kg: 80 }))

    expect(response.status).toBe(503)
  })
})
