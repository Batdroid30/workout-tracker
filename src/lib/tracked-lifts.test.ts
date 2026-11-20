import { describe, it, expect } from 'vitest'
import { liftTrend, liftsForIndex, resolveStrengthLifts } from './tracked-lifts'
import type { TrackedLift } from '@/lib/data/tracked-lifts'
import type { KeyLift } from '@/lib/data/phase-coach'

const weeks = (...values: number[]) => new Map(values.map((value, index) => [`2026-10-${String(index * 7 + 5).padStart(2, '0')}`, value]))
const lift = (exerciseId: string, exerciseName = exerciseId): TrackedLift => ({ exerciseId, exerciseName, muscleGroup: 'chest' })
const key = (exerciseId: string): KeyLift => ({ exerciseId, exerciseName: exerciseId, muscleGroup: 'chest', sessionCount: 10 })

describe('liftTrend', () => {
  it('reports the latest estimate and the gain over the window', () => {
    expect(liftTrend(weeks(85, 87.5, 90))).toEqual({ current: 90, change: 5, direction: 'up', points: [85, 87.5, 90] })
  })

  it('calls a change of a kilo or less flat', () => {
    expect(liftTrend(weeks(100, 101))?.direction).toBe('flat')
    expect(liftTrend(weeks(100, 99))?.direction).toBe('flat')
  })

  it('notices a lift slipping', () => {
    expect(liftTrend(weeks(100, 98))?.direction).toBe('down')
  })

  it('has no change to report after a single week', () => {
    expect(liftTrend(weeks(85))).toEqual({ current: 85, change: null, direction: 'flat', points: [85] })
  })

  it('has nothing to say without sets in the window', () => {
    expect(liftTrend(undefined)).toBeNull()
    expect(liftTrend(new Map())).toBeNull()
  })

  it('reads weeks in date order, whatever order they arrive in', () => {
    const shuffled = new Map([['2026-10-19', 90], ['2026-10-05', 85]])
    expect(liftTrend(shuffled)).toMatchObject({ current: 90, change: 5 })
  })
})

describe('resolveStrengthLifts', () => {
  it('falls back to the most-trained lifts when nothing is picked', () => {
    expect(resolveStrengthLifts([], [key('bench'), key('squat')])).toEqual({
      lifts: [lift('bench'), lift('squat')],
      source: 'auto',
    })
  })

  it('uses the picks, in the lifter\u2019s order', () => {
    expect(resolveStrengthLifts([lift('squat'), lift('bench')], [key('bench')])).toEqual({
      lifts: [lift('squat'), lift('bench')],
      source: 'picked',
    })
  })
})

describe('liftsForIndex', () => {
  const weekly = new Map([
    ['bench', weeks(80, 85)],
    ['pullup', weeks(50, 55)],
  ])

  it('leaves out lifts with no recent sets and assisted lifts', () => {
    const lifts = [lift('bench', 'Bench Press'), lift('row', 'Row'), lift('pullup', 'Assisted Pull-up')]
    expect(liftsForIndex(lifts, weekly, name => /assisted/i.test(name)).map(entry => entry.exerciseId)).toEqual(['bench'])
  })
})
