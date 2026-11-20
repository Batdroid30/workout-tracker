import { describe, it, expect } from 'vitest'
import { pickFallbackSuggestion, type FallbackRoutine } from './split-fallback'

const routine = (id: string, muscleGroups: string[], createdAt = '2026-10-01T00:00:00Z'): FallbackRoutine => ({
  id, title: id.toUpperCase(), createdAt, muscleGroups,
})

const neglected = [
  { muscleGroup: 'back', daysSinceLastTrained: 6 },
  { muscleGroup: 'biceps', daysSinceLastTrained: 5 },
  { muscleGroup: 'hamstrings', daysSinceLastTrained: 4 },
  { muscleGroup: 'calves', daysSinceLastTrained: 3 },
]
const focus = { focus: 'Back & biceps', muscleGroups: ['back', 'biceps'], reason: 'Back last trained 6 days ago' }

describe('pickFallbackSuggestion', () => {
  it('picks the routine covering the most of the top neglected muscles', () => {
    const result = pickFallbackSuggestion(
      [routine('push', ['chest', 'triceps']), routine('pull', ['back', 'biceps']), routine('legs', ['hamstrings'])],
      neglected, focus,
    )
    expect(result).toEqual({ kind: 'routine', routineId: 'pull', title: 'PULL', reason: 'Covers back — 6 days since you trained it' })
  })

  it('breaks ties by exercises on the most neglected muscle', () => {
    const result = pickFallbackSuggestion(
      [routine('a', ['back', 'hamstrings']), routine('b', ['back', 'back', 'hamstrings'])],
      neglected, focus,
    )
    expect(result?.kind === 'routine' && result.routineId).toBe('b')
  })

  it('then prefers the newest routine', () => {
    const result = pickFallbackSuggestion(
      [routine('old', ['back'], '2026-01-01T00:00:00Z'), routine('new', ['back'], '2026-10-01T00:00:00Z')],
      neglected, focus,
    )
    expect(result?.kind === 'routine' && result.routineId).toBe('new')
  })

  it('ignores muscles beyond the top three', () => {
    const result = pickFallbackSuggestion([routine('calf', ['calves'])], neglected, focus)
    expect(result).toEqual({ kind: 'focus', ...focus })
  })

  it('falls back to the focus suggestion when no routine helps', () => {
    expect(pickFallbackSuggestion([routine('push', ['chest'])], neglected, focus)).toEqual({ kind: 'focus', ...focus })
  })

  it('uses the focus suggestion when there are no routines', () => {
    expect(pickFallbackSuggestion([], neglected, focus)).toEqual({ kind: 'focus', ...focus })
  })

  it('has nothing to suggest without neglected muscles or a focus', () => {
    expect(pickFallbackSuggestion([routine('push', ['chest'])], [], null)).toBeNull()
  })
})
