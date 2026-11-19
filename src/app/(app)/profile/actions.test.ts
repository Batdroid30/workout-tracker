import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  revalidateAll: vi.fn(),
  getSupabaseServer: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({ requireAuth: mocks.requireAuth, signOutUser: vi.fn() }))
vi.mock('@/lib/data/profile', () => ({ updateProfile: vi.fn() }))
vi.mock('@/lib/data/workouts', () => ({ getWorkoutHistoryPage: vi.fn() }))
vi.mock('@/lib/cache', () => ({ revalidateAll: mocks.revalidateAll }))
vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServer: mocks.getSupabaseServer,
}))

import { clearAllWorkoutDataAction, uploadAvatarAction } from './actions'

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
      `workouts.delete(user_id=${userId})`,
      `personal_records.delete(user_id=${userId})`,
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

  it('refreshes pages when the PR delete fails after workouts are gone', async () => {
    const { client, queries } = makeClient({ personal_records: { message: 'pr boom' } })
    mocks.getSupabaseServer.mockResolvedValue(client)

    const result = await clearAllWorkoutDataAction()

    expect(result).toEqual({ success: false, error: 'pr boom' })
    expect(queries.some(query => query.startsWith('exercises.'))).toBe(false)
    expect(mocks.revalidateAll).toHaveBeenCalledOnce()
  })

  it('keeps PRs when the workouts delete fails', async () => {
    const { client, queries } = makeClient({ workouts: { message: 'boom' } })
    mocks.getSupabaseServer.mockResolvedValue(client)

    await clearAllWorkoutDataAction()

    expect(queries.some(query => query.startsWith('personal_records.'))).toBe(false)
  })

  it('reports failure when a custom exercise is still used by a program', async () => {
    const { client } = makeClient({ exercises: { code: '23503', message: 'violates foreign key' } })
    mocks.getSupabaseServer.mockResolvedValue(client)

    const result = await clearAllWorkoutDataAction()

    expect(result.success).toBe(false)
    expect((result as { error: string }).error).toMatch(/program/i)
    // Workouts and PRs are already gone, so cached pages must refresh.
    expect(mocks.revalidateAll).toHaveBeenCalledOnce()
  })
})

describe('uploadAvatarAction', () => {
  const upload = vi.fn()
  const getPublicUrl = vi.fn(() => ({ data: { publicUrl: 'https://cdn.example/avatar.jpg' } }))

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.requireAuth.mockResolvedValue({ userId, session: {} })
    mocks.getSupabaseServer.mockResolvedValue({ storage: { from: () => ({ upload, getPublicUrl }) } })
    upload.mockResolvedValue({ error: null })
  })

  it('stores the image under the user folder with its real content type', async () => {
    const result = await uploadAvatarAction('data:image/jpeg;base64,/9j/4AAQ', 'avatar.jpg')

    expect(result).toEqual({ success: true, url: 'https://cdn.example/avatar.jpg' })
    const [path, , options] = upload.mock.calls[0]
    expect(path).toMatch(/^user-1\/\d+-avatar\.jpg$/)
    expect(options).toEqual({ contentType: 'image/jpeg', upsert: true })
  })

  it('rejects data that is not a supported image without uploading', async () => {
    const result = await uploadAvatarAction('data:text/html;base64,PGgxPg==', 'page.html')

    expect(result.success).toBe(false)
    expect((result as { error: string }).error).toMatch(/image/i)
    expect(upload).not.toHaveBeenCalled()
  })
})
