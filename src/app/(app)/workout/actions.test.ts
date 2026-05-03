import { describe, it, expect, vi, beforeEach } from 'vitest'

// Hoisted mocks — referenced inside vi.mock factories.
const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  saveActiveWorkout: vi.fn(),
  evaluateAndSavePRs: vi.fn(),
  evaluateAndSaveAllPRs: vi.fn(),
  deleteWorkout: vi.fn(),
  revalidateAll: vi.fn(),
  getSupabaseAdmin: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({ auth: mocks.auth }))
vi.mock('@/lib/data/workouts', () => ({
  saveActiveWorkout: mocks.saveActiveWorkout,
  deleteWorkout: mocks.deleteWorkout,
}))
vi.mock('@/lib/data/stats', () => ({
  evaluateAndSavePRs: mocks.evaluateAndSavePRs,
  evaluateAndSaveAllPRs: mocks.evaluateAndSaveAllPRs,
}))
vi.mock('@/lib/cache', () => ({ revalidateAll: mocks.revalidateAll }))
vi.mock('@/lib/supabase/server', () => ({ getSupabaseAdmin: mocks.getSupabaseAdmin }))

import { finishWorkoutAction } from './actions'

describe('finishWorkoutAction', () => {
  const userId = 'user-1'
  const savedWorkout = { id: 'w-1', started_at: '2026-05-03T10:00:00Z' }
  const savedSets: any[] = []

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.auth.mockResolvedValue({ user: { id: userId } })
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
    mocks.auth.mockResolvedValue(null)
    await expect(finishWorkoutAction({} as any)).rejects.toThrow('User not authenticated')
  })
})
