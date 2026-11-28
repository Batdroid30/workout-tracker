import { describe, it, expect, vi } from 'vitest'

const swrResult = vi.hoisted(() => ({ current: { data: undefined as unknown, error: undefined as unknown, isLoading: false } }))
vi.mock('swr', () => ({ default: () => swrResult.current }))
vi.mock('@/app/(app)/account/training-actions', () => ({ getTrainingCycleAction: vi.fn() }))

import { useTrainingCycle } from './useTrainingCycle'

describe('useTrainingCycle', () => {
  it('surfaces a failed fetch instead of reporting no cycle', () => {
    const failure = new Error('cycle down')
    swrResult.current = { data: undefined, error: failure, isLoading: false }
    expect(useTrainingCycle()).toEqual({ cycle: null, isLoading: false, error: failure })
  })

  it('reports no error when the cycle loaded as null', () => {
    swrResult.current = { data: null, error: undefined, isLoading: false }
    expect(useTrainingCycle()).toEqual({ cycle: null, isLoading: false, error: null })
  })
})
