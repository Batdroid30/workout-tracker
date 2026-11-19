import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  revalidateAll: vi.fn(),
  getSupabaseServer: vi.fn(),
  getSupabaseAdmin: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({ requireAuth: mocks.requireAuth, signOutUser: vi.fn() }))
vi.mock('@/lib/data/profile', () => ({ updateProfile: vi.fn() }))
vi.mock('@/lib/data/workouts', () => ({ getWorkoutHistoryPage: vi.fn() }))
vi.mock('@/lib/cache', () => ({ revalidateAll: mocks.revalidateAll }))
vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServer: mocks.getSupabaseServer,
  getSupabaseAdmin: mocks.getSupabaseAdmin,
}))

import { clearAllWorkoutDataAction } from './actions'

const userId = 'user-1'

// Minimal PostgREST query-builder stand-in. Each awaited query is recorded as
// "<table>.<operation>(<filters>)"; `errors` makes a table's query fail.
function makeClient(errors: Record<string, { code?: string; message: string }> = {}) {
  const queries: string[] = []
  const from = (table: string) => {
    let operation = ''
    const filters: string[] = []
    const builder = {
      select: () => { operation = 'select'; return builder },
      delete: () => { operation = 'delete'; return builder },
      eq: (column: string, value: unknown) => { filters.push(`${column}=${value}`); return builder },
      in: (column: string) => { filters.push(`${column} in (...)`); return builder },
      then: (resolve: (result: unknown) => void) => {
        queries.push(`${table}.${operation}(${filters.join(',')})`)
        resolve({ data: [], error: errors[table] ?? null })
      },
    }
    return builder
  }
  return { client: { from }, queries }
}

describe('clearAllWorkoutDataAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.requireAuth.mockResolvedValue({ userId, session: {} })
  })

  it('deletes workouts by user_id and relies on cascade', async () => {
    const { client, queries } = makeClient()
    mocks.getSupabaseServer.mockResolvedValue(client)

    const result = await clearAllWorkoutDataAction()

    expect(result).toEqual({ success: true })
    expect(queries).toEqual([
      `personal_records.delete(user_id=${userId})`,
      `workouts.delete(user_id=${userId})`,
      `exercises.delete(is_custom=true,created_by=${userId})`,
    ])
    expect(mocks.revalidateAll).toHaveBeenCalledOnce()
  })

  it('stops at the first error and reports it', async () => {
    const { client, queries } = makeClient({ workouts: { message: 'boom' } })
    mocks.getSupabaseServer.mockResolvedValue(client)

    const result = await clearAllWorkoutDataAction()

    expect(result).toEqual({ success: false, error: 'boom' })
    expect(queries.some(query => query.startsWith('exercises.'))).toBe(false)
    expect(mocks.revalidateAll).not.toHaveBeenCalled()
  })

  it('reports failure when a custom exercise is still used by a program', async () => {
    const { client } = makeClient({ exercises: { code: '23503', message: 'violates foreign key' } })
    mocks.getSupabaseServer.mockResolvedValue(client)

    const result = await clearAllWorkoutDataAction()

    expect(result.success).toBe(false)
    expect((result as { error: string }).error).toMatch(/program/i)
  })

  it('never uses the admin client', async () => {
    const { client } = makeClient()
    mocks.getSupabaseServer.mockResolvedValue(client)

    await clearAllWorkoutDataAction()

    expect(mocks.getSupabaseAdmin).not.toHaveBeenCalled()
  })
})
