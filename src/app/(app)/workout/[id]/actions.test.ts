import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getSupabaseServer: vi.fn(),
  revalidateAll: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({ auth: mocks.auth }))
vi.mock('@/lib/supabase/server', () => ({ getSupabaseServer: mocks.getSupabaseServer }))
vi.mock('@/lib/cache', () => ({ revalidateAll: mocks.revalidateAll }))

import {
  updateHistoricalSetAction,
  deleteHistoricalExerciseAction,
} from './actions'

// Helper to build a chainable supabase-client mock where each query terminates
// in either a `single()` for ownership reads or an awaited update/delete.
function buildSupabase(opts: {
  ownerLookup: { data: any; error: any } | null
  mutationError?: any
}) {
  const update = vi.fn().mockReturnThis()
  const del    = vi.fn().mockReturnThis()
  const eqMutation = vi.fn().mockResolvedValue({ error: opts.mutationError ?? null })

  const single = vi.fn().mockResolvedValue(opts.ownerLookup ?? { data: null, error: null })
  const eqSelect = vi.fn().mockReturnValue({ single })
  const select = vi.fn().mockReturnValue({ eq: eqSelect })

  // First .from() call → ownership select, second .from() call → mutation
  let call = 0
  const from = vi.fn(() => {
    call += 1
    if (call === 1) return { select }
    return {
      update: update.mockReturnValue({ eq: eqMutation }),
      delete: del.mockReturnValue({ eq: eqMutation }),
    }
  })

  return { client: { from }, update, del, eqMutation }
}

describe('updateHistoricalSetAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.auth.mockResolvedValue({ user: { id: 'user-A' } })
  })

  it('throws Unauthorized when there is no session', async () => {
    mocks.auth.mockResolvedValue(null)
    await expect(updateHistoricalSetAction('s-1', 100, 5)).rejects.toThrow('Unauthorized')
  })

  it('throws when the set does not exist', async () => {
    const { client } = buildSupabase({
      ownerLookup: { data: null, error: { message: 'no rows' } },
    })
    mocks.getSupabaseServer.mockResolvedValue(client)
    await expect(updateHistoricalSetAction('s-1', 100, 5)).rejects.toThrow('Set not found')
  })

  it('throws Unauthorized when another user tries to mutate the set', async () => {
    const { client, eqMutation } = buildSupabase({
      ownerLookup: {
        data: { workout_exercises: { workouts: { user_id: 'user-B' } } },
        error: null,
      },
    })
    mocks.getSupabaseServer.mockResolvedValue(client)

    await expect(updateHistoricalSetAction('s-1', 100, 5)).rejects.toThrow('Unauthorized')
    // Mutation must NOT have been issued
    expect(eqMutation).not.toHaveBeenCalled()
    expect(mocks.revalidateAll).not.toHaveBeenCalled()
  })

  it('updates the set when the caller owns it', async () => {
    const { client, eqMutation } = buildSupabase({
      ownerLookup: {
        data: { workout_exercises: { workouts: { user_id: 'user-A' } } },
        error: null,
      },
    })
    mocks.getSupabaseServer.mockResolvedValue(client)

    await updateHistoricalSetAction('s-1', 100, 5)
    expect(eqMutation).toHaveBeenCalledWith('id', 's-1')
    expect(mocks.revalidateAll).toHaveBeenCalledOnce()
  })
})

describe('deleteHistoricalExerciseAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.auth.mockResolvedValue({ user: { id: 'user-A' } })
  })

  it('throws Unauthorized when there is no session', async () => {
    mocks.auth.mockResolvedValue(null)
    await expect(deleteHistoricalExerciseAction('we-1')).rejects.toThrow('Unauthorized')
  })

  it('throws when the workout_exercise does not exist', async () => {
    const { client } = buildSupabase({
      ownerLookup: { data: null, error: { message: 'no rows' } },
    })
    mocks.getSupabaseServer.mockResolvedValue(client)
    await expect(deleteHistoricalExerciseAction('we-1')).rejects.toThrow('Exercise not found')
  })

  it('throws Unauthorized when another user owns the parent workout', async () => {
    const { client, eqMutation } = buildSupabase({
      ownerLookup: { data: { workouts: { user_id: 'user-B' } }, error: null },
    })
    mocks.getSupabaseServer.mockResolvedValue(client)

    await expect(deleteHistoricalExerciseAction('we-1')).rejects.toThrow('Unauthorized')
    expect(eqMutation).not.toHaveBeenCalled()
    expect(mocks.revalidateAll).not.toHaveBeenCalled()
  })

  it('deletes when the caller owns the parent workout', async () => {
    const { client, eqMutation } = buildSupabase({
      ownerLookup: { data: { workouts: { user_id: 'user-A' } }, error: null },
    })
    mocks.getSupabaseServer.mockResolvedValue(client)

    await deleteHistoricalExerciseAction('we-1')
    expect(eqMutation).toHaveBeenCalledWith('id', 'we-1')
    expect(mocks.revalidateAll).toHaveBeenCalledOnce()
  })
})
