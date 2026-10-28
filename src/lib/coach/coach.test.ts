import { describe, it, expect, beforeEach, vi } from 'vitest'
import { isComplexQuery } from './context'
import { getCachedContext, setCachedContext } from './context-cache'

describe('Coach Query Classification (Model Routing)', () => {
  it('correctly classifies routine and programming requests as complex', () => {
    expect(isComplexQuery('Build me a 4-day upper lower routine')).toBe(true)
    expect(isComplexQuery('Can you create a training split for hypertrophy?')).toBe(true)
    expect(isComplexQuery('I need a workout plan for chest and back')).toBe(true)
    expect(isComplexQuery('Should I deload this week?')).toBe(true)
    expect(isComplexQuery('How should I design my next mesocycle?')).toBe(true)
  })

  it('correctly classifies simple Q&A queries as non-complex (routes to Haiku)', () => {
    expect(isComplexQuery('How is my bench press form?')).toBe(false)
    expect(isComplexQuery('What is RPE 8 in simple terms?')).toBe(false)
    expect(isComplexQuery('Why are my hamstrings sore?')).toBe(false)
    expect(isComplexQuery('How much protein should I eat daily?')).toBe(false)
  })
})

describe('Coach Context Cache', () => {
  const userId = 'user-test-123'

  beforeEach(() => {
    vi.useRealTimers()
  })

  it('stores and retrieves cached context within TTL window', () => {
    const mockContext = '### ATHLETE PROFILE\n- Name: Test Athlete'
    setCachedContext(userId, mockContext)

    const retrieved = getCachedContext(userId)
    expect(retrieved).toBe(mockContext)
  })

  it('returns null for nonexistent users', () => {
    expect(getCachedContext('unknown-user')).toBeNull()
  })
})
