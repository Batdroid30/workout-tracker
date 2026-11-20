import { describe, it, expect } from 'vitest'
import { getNextSplitItem, type SplitItem, type SplitWorkout } from './split-rotation'

// Day 0 is Monday 2026-11-02 (UTC).
const DAY0 = Date.UTC(2026, 10, 2)
const day = (n: number, hour = 18) => new Date(DAY0 + n * 86_400_000 + hour * 3_600_000)
const did = (routineId: string, n: number): SplitWorkout => ({ routineId, startedAt: day(n).toISOString() })

// Push → Pull → Legs → Rest → Upper → Lower → Rest
const PPL_UL: SplitItem[] = ['push', 'pull', 'legs', null, 'upper', 'lower', null].map((routineId, position) => ({
  id: `i${position}`, position, routineId,
}))

function next(recentSplitWorkouts: SplitWorkout[], now: Date, extra: Partial<Parameters<typeof getNextSplitItem>[0]> = {}) {
  return getNextSplitItem({ items: PPL_UL, recentSplitWorkouts, skip: null, now, ...extra })
}

describe('getNextSplitItem', () => {
  it('starts at the first item before any split workout', () => {
    const result = next([], day(0))
    expect(result?.item.routineId).toBe('push')
    expect(result?.daysSinceLast).toBeNull()
  })

  it('suggests the item after the last one done', () => {
    expect(next([did('pull', 0)], day(1))?.item.routineId).toBe('legs')
  })

  it('suggests the rest day the day after the session before it', () => {
    const result = next([did('legs', 0)], day(1))
    expect(result?.isRest).toBe(true)
  })

  it('counts a day off as the rest day', () => {
    expect(next([did('legs', 0)], day(2))?.item.routineId).toBe('upper')
  })

  it('never skips workouts after a long break, only rest days', () => {
    expect(next([did('legs', 2)], day(7))?.item.routineId).toBe('upper')
  })

  it('wraps around the end of the split', () => {
    expect(next([did('lower', 0)], day(3))?.item.routineId).toBe('push')
  })

  it('follows the lifter when they do a different split routine', () => {
    expect(next([did('pull', 0)], day(1))?.item.routineId).toBe('legs')
  })

  it('uses a skip set after the last workout', () => {
    const skip = { position: 4, setAt: day(1, 9).toISOString() }
    expect(next([did('pull', 0)], day(1), { skip })?.item.routineId).toBe('upper')
  })

  it('lets a newer workout win over an older skip', () => {
    const skip = { position: 4, setAt: day(1, 9).toISOString() }
    expect(next([did('pull', 2)], day(3), { skip })?.item.routineId).toBe('legs')
  })

  it('welcomes the lifter back after a week away', () => {
    const result = next([did('pull', 0)], day(8))
    expect(result?.welcomeBack).toBe(true)
    expect(result?.daysSinceLast).toBe(8)
  })

  it('does not say welcome back within a week', () => {
    expect(next([did('pull', 0)], day(6))?.welcomeBack).toBe(false)
  })

  it('uses the occurrence after the previous workout when a routine appears twice', () => {
    const items: SplitItem[] = ['upper', 'lower', 'upper', null].map((routineId, position) => ({ id: `u${position}`, position, routineId }))
    const result = getNextSplitItem({
      items, skip: null, now: day(3),
      recentSplitWorkouts: [did('upper', 2), did('lower', 1)],
    })
    expect(result?.index).toBe(3)
    expect(result?.isRest).toBe(true)
  })

  it('starts from the first item when the last routine left the split', () => {
    expect(next([did('arms', 0)], day(1))?.item.routineId).toBe('push')
  })

  it('has nothing to suggest for a rest-only or empty split', () => {
    const restOnly: SplitItem[] = [{ id: 'r', position: 0, routineId: null }]
    expect(getNextSplitItem({ items: restOnly, recentSplitWorkouts: [], skip: null, now: day(0) })).toBeNull()
    expect(getNextSplitItem({ items: [], recentSplitWorkouts: [], skip: null, now: day(0) })).toBeNull()
  })
})
