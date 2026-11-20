import { describe, it, expect } from 'vitest'
import { DELOAD_THRESHOLDS } from '@/lib/workout-intelligence'
import { WUP_CYCLE } from '@/lib/workout-intelligence'
import {
  cycleSignals,
  resolveCycleAnchor,
  buildTrainingCycle,
  countCompletedTrainingWeeks,
  countRecentMissedWeeks,
  trainingWeekThreshold,
  type CycleInput,
} from './training-cycle'

// Week 1 starts Monday 2026-10-05; weeks run Monday–Sunday (UTC).
const WEEK1 = Date.UTC(2026, 9, 5)
const DAY = 86_400_000
const at = (week: number, dayOffset = 0, hour = 10) =>
  new Date(WEEK1 + ((week - 1) * 7 + dayOffset) * DAY + hour * 3_600_000)
const iso = (week: number, dayOffset = 0) => at(week, dayOffset).toISOString()
const sessions = (week: number, count: number) =>
  Array.from({ length: count }, (_, i) => iso(week, i))

function input(overrides: Partial<CycleInput>): CycleInput {
  return {
    completedWorkoutDates: [],
    weeklyGoal: 4,
    cycleStartedAt: iso(1),
    phaseStartedAt: iso(1),
    breakPromptDismissedAt: null,
    experienceLevel: 'intermediate',
    trainingPhase: 'maingaining',
    now: at(4, 2),
    ...overrides,
  }
}

describe('trainingWeekThreshold', () => {
  it.each([[3, 2], [4, 2], [5, 3], [1, 1], [0, 1]])('goal %i needs %i workouts', (goal, expected) => {
    expect(trainingWeekThreshold(goal)).toBe(expected)
  })
})

describe('weekly cycle', () => {
  it('advances once per completed training week', () => {
    const cycle = buildTrainingCycle(input({
      completedWorkoutDates: [...sessions(1, 2), ...sessions(2, 1), ...sessions(3, 3)],
    }))
    expect(cycle.scheme.label).toBe('Volume Week')
    expect(cycle.cycleWeek).toBe(3)
  })

  it('stays put through a week below half the goal', () => {
    const cycle = buildTrainingCycle(input({
      completedWorkoutDates: [...sessions(1, 2), ...sessions(2, 1)],
    }))
    expect(cycle.scheme.label).toBe('Hypertrophy Week')
  })

  it('does not lose the Strength week when it is skipped', () => {
    const cycle = buildTrainingCycle(input({
      completedWorkoutDates: [...sessions(2, 2)],
    }))
    expect(cycle.scheme.label).toBe('Hypertrophy Week')
  })

  it('never counts the current, unfinished week', () => {
    const cycle = buildTrainingCycle(input({
      completedWorkoutDates: sessions(1, 3),
      now: at(1, 6),
    }))
    expect(cycle.scheme.label).toBe('Strength Week')
  })

  it('ignores the week of a mid-week restart', () => {
    expect(countCompletedTrainingWeeks(sessions(2, 3), iso(2, 2), at(4, 2), 4)).toBe(0)
  })

  it('counts the week of a Monday restart', () => {
    expect(countCompletedTrainingWeeks(sessions(2, 3), iso(2, 0), at(4, 2), 4)).toBe(1)
  })

  it('judges past weeks with the current weekly goal', () => {
    expect(countCompletedTrainingWeeks(
      [...sessions(1, 2), ...sessions(2, 1), ...sessions(3, 3)], iso(1), at(4, 2), 5,
    )).toBe(1)
  })
})

describe('phase week and deload', () => {
  it('counts only training weeks since the phase started', () => {
    const cycle = buildTrainingCycle(input({
      completedWorkoutDates: [...sessions(1, 2), ...sessions(3, 2)],
    }))
    expect(cycle.phaseWeek).toBe(3)
  })

  it('makes the week after N training weeks the deload week', () => {
    const block = DELOAD_THRESHOLDS.intermediate.maingaining
    const trainedWeeks = (n: number) => Array.from({ length: n }, (_, i) => sessions(i + 1, 2)).flat()
    const deload = buildTrainingCycle(input({ completedWorkoutDates: trainedWeeks(block), now: at(block + 1, 2) }))
    const before = buildTrainingCycle(input({ completedWorkoutDates: trainedWeeks(block - 1), now: at(block, 2) }))
    expect(deload.phaseWeek).toBe(block + 1)
    expect(deload.isDeloadWeek).toBe(true)
    expect(before.isDeloadWeek).toBe(false)
  })

  it('lists the phase training weeks with their session counts', () => {
    const cycle = buildTrainingCycle(input({
      completedWorkoutDates: [...sessions(1, 2), ...sessions(2, 1), ...sessions(3, 3), ...sessions(4, 1)],
    }))
    expect(cycle.phaseTrainingWeeks).toEqual([
      { weekStart: '2026-10-05', sessions: 2 },
      { weekStart: '2026-10-19', sessions: 3 },
    ])
    expect(cycle.currentWeekStart).toBe('2026-10-26')
    expect(cycle.currentWeekSessions).toBe(1)
  })
})

describe('long-break prompt', () => {
  const afterBreak = { completedWorkoutDates: sessions(1, 2), now: at(4, 2) }

  it('counts consecutive missed weeks back from last week', () => {
    expect(countRecentMissedWeeks(sessions(1, 2), iso(1), at(4, 2), 4)).toBe(2)
  })

  it('offers a restart after two missed weeks', () => {
    const cycle = buildTrainingCycle(input(afterBreak))
    expect(cycle.missedWeeks).toBe(2)
    expect(cycle.offerRestart).toBe(true)
  })

  it('stays quiet once dismissed during this break', () => {
    expect(buildTrainingCycle(input({ ...afterBreak, breakPromptDismissedAt: iso(3, 1) })).offerRestart).toBe(false)
  })

  it('asks again when the dismissal was before this break', () => {
    expect(buildTrainingCycle(input({ ...afterBreak, breakPromptDismissedAt: iso(1, 3) })).offerRestart).toBe(true)
  })

  it('does not count weeks before the anchor as missed', () => {
    // Anchored on the Monday of week 3: only week 3 can be missed, not weeks 1–2.
    expect(countRecentMissedWeeks([], iso(3), at(4, 2), 4)).toBe(1)
  })
})

describe('new user without anchors', () => {
  it('starts at Strength week, phase week 1, with no prompt', () => {
    const cycle = buildTrainingCycle(input({ cycleStartedAt: null, phaseStartedAt: null }))
    expect(cycle).toMatchObject({
      cycleWeek: 1, phaseWeek: 1, missedWeeks: 0, offerRestart: false, isDeloadWeek: false,
    })
    expect(cycle.scheme.label).toBe('Strength Week')
  })
})

describe('resolveCycleAnchor', () => {
  it('prefers the cycle start, then the phase start, then the first workout', () => {
    expect(resolveCycleAnchor('2026-10-05T00:00:00Z', '2026-09-01T00:00:00Z', '2026-08-01T00:00:00Z')).toBe('2026-10-05T00:00:00Z')
    expect(resolveCycleAnchor(null, '2026-09-01T00:00:00Z', '2026-08-01T00:00:00Z')).toBe('2026-09-01T00:00:00Z')
    expect(resolveCycleAnchor(null, null, '2026-08-01T00:00:00Z')).toBe('2026-08-01T00:00:00Z')
    expect(resolveCycleAnchor(null, null, null)).toBeNull()
  })

  it('lets a lifter with no anchors still advance once a first workout anchors the cycle', () => {
    const cycle = buildTrainingCycle(input({
      cycleStartedAt: resolveCycleAnchor(null, null, iso(1)),
      phaseStartedAt: null,
      completedWorkoutDates: [...sessions(1, 2), ...sessions(2, 2)],
    }))
    expect(cycle.scheme.label).toBe('Volume Week')
  })
})

describe('cycleSignals', () => {
  const current = buildTrainingCycle(input({ completedWorkoutDates: sessions(1, 2) }))

  it('flags a phase transition when the last workout was in a different week type', () => {
    expect(cycleSignals(current, WUP_CYCLE[0]).isPhaseTransition).toBe(true)
    expect(cycleSignals(current, current.scheme).isPhaseTransition).toBe(false)
  })

  it('degrades to no scheme and no flags when the cycle is unavailable', () => {
    expect(cycleSignals(null, null)).toEqual({ scheme: null, isDeloadWeek: false, isPhaseTransition: false })
    expect(cycleSignals(current, null).isPhaseTransition).toBe(false)
  })
})
