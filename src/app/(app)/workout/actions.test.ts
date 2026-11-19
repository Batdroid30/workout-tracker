import { describe, it, expect, vi, beforeEach } from 'vitest'

// Hoisted mocks — referenced inside vi.mock factories.
const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  requireAuth: vi.fn(),
  saveActiveWorkout: vi.fn(),
  evaluateAndSavePRs: vi.fn(),
  evaluateAndSaveAllPRs: vi.fn(),
  deleteWorkout: vi.fn(),
  revalidateAll: vi.fn(),
  getSupabaseServer: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({ auth: mocks.auth, requireAuth: mocks.requireAuth }))
vi.mock('@/lib/data/workouts', () => ({
  saveActiveWorkout: mocks.saveActiveWorkout,
  deleteWorkout: mocks.deleteWorkout,
}))
vi.mock('@/lib/data/stats', () => ({
  evaluateAndSavePRs: mocks.evaluateAndSavePRs,
  evaluateAndSaveAllPRs: mocks.evaluateAndSaveAllPRs,
}))
vi.mock('@/lib/cache', () => ({ revalidateAll: mocks.revalidateAll }))
vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServer: mocks.getSupabaseServer,
}))

import { finishWorkoutAction, deleteWorkoutAction, getUserExerciseFrequency } from './actions'

describe('finishWorkoutAction', () => {
  const userId = 'user-1'
  const savedWorkout = { id: 'w-1', started_at: '2026-05-03T10:00:00Z' }
  const savedSets: any[] = []

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.auth.mockResolvedValue({ user: { id: userId } })
    mocks.requireAuth.mockResolvedValue({ userId, session: {} })
  })

  it('returns success with PRs when both save and PR evaluation succeed', async () => {
    mocks.saveActiveWorkout.mockResolvedValue({ workout: savedWorkout, savedSets })
    mocks.evaluateAndSavePRs.mockResolvedValue([{ pr_type: 'best_weight' }])

    const result = await finishWorkoutAction({} as any)

    expect(result).toEqual({
      success: true,
      workoutId: 'w-1',
      prs: [{ pr_type: 'best_weight' }],
    })
    expect(mocks.revalidateAll).toHaveBeenCalledOnce()
  })

  it('returns failure when the workout save itself throws', async () => {
    mocks.saveActiveWorkout.mockRejectedValue(new Error('db down'))

    const result = await finishWorkoutAction({} as any)

    expect(result.success).toBe(false)
    expect((result as { error: string }).error).toBe('db down')
    // Nothing should have been revalidated, no PR check attempted
    expect(mocks.evaluateAndSavePRs).not.toHaveBeenCalled()
    expect(mocks.revalidateAll).not.toHaveBeenCalled()
  })

  it('returns partial success when PR evaluation throws after save succeeds', async () => {
    mocks.saveActiveWorkout.mockResolvedValue({ workout: savedWorkout, savedSets })
    mocks.evaluateAndSavePRs.mockRejectedValue(new Error('rpc timeout'))

    const result = await finishWorkoutAction({} as any)

    // Workout is reported as saved — UI must not lose it from localStorage
    expect(result.success).toBe(true)
    expect((result as any).workoutId).toBe('w-1')
    expect((result as any).prs).toEqual([])
    expect((result as any).prError).toBe('rpc timeout')
    // Cache still revalidated so the workout shows up in history
    expect(mocks.revalidateAll).toHaveBeenCalledOnce()
  })

  it('throws when there is no authenticated user', async () => {
    mocks.requireAuth.mockRejectedValue(new Error('User not authenticated'))
    await expect(finishWorkoutAction({} as any)).rejects.toThrow('User not authenticated')
  })
})

describe('deleteWorkoutAction', () => {
  const userId = 'user-1'
  const eq = vi.fn()
  const del = vi.fn(() => ({ eq }))
  const from = vi.fn(() => ({ delete: del }))

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireAuth.mockResolvedValue({ userId, session: {} })
    mocks.deleteWorkout.mockResolvedValue(undefined)
    mocks.evaluateAndSaveAllPRs.mockResolvedValue(undefined)
    mocks.getSupabaseServer.mockResolvedValue({ from })
  })

  it('wipes PRs through the per-user client, then rebuilds', async () => {
    eq.mockResolvedValue({ error: null })

    const result = await deleteWorkoutAction('w-1')

    expect(result).toEqual({ success: true })
    expect(from).toHaveBeenCalledWith('personal_records')
    expect(eq).toHaveBeenCalledWith('user_id', userId)
    expect(mocks.evaluateAndSaveAllPRs).toHaveBeenCalledWith(userId)
  })

  it('fails without rebuilding when the PR wipe errors', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    eq.mockResolvedValue({ error: { message: 'wipe failed' } })

    const result = await deleteWorkoutAction('w-1')

    expect(result.success).toBe(false)
    expect(mocks.evaluateAndSaveAllPRs).not.toHaveBeenCalled()
    expect(mocks.revalidateAll).not.toHaveBeenCalled()
  })
})

describe('getUserExerciseFrequency', () => {
  const rpc = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireAuth.mockResolvedValue({ userId: 'user-1', session: { user: { id: 'user-1' } } })
    mocks.getSupabaseServer.mockResolvedValue({ rpc })
  })

  it('calls the RPC without a user id argument', async () => {
    rpc.mockResolvedValue({ data: [], error: null })

    await getUserExerciseFrequency()

    expect(rpc).toHaveBeenCalledOnce()
    expect(rpc.mock.calls[0]).toEqual(['get_user_exercise_frequency'])
  })

  it('maps rows to an exercise-id → count record', async () => {
    rpc.mockResolvedValue({
      data: [{ exercise_id: 'e1', set_count: 3 }, { exercise_id: 'e2', set_count: '7' }],
      error: null,
    })

    expect(await getUserExerciseFrequency()).toEqual({ e1: 3, e2: 7 })
  })

  it('returns an empty record for a user with no history', async () => {
    rpc.mockResolvedValue({ data: [], error: null })

    expect(await getUserExerciseFrequency()).toEqual({})
  })

  it('returns an empty record and logs when the RPC errors', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    rpc.mockResolvedValue({ data: null, error: { message: 'x' } })

    expect(await getUserExerciseFrequency()).toEqual({})
    expect(consoleError).toHaveBeenCalled()
    consoleError.mockRestore()
  })
})
