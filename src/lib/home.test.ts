import { describe, it, expect } from 'vitest'
import { greetingFor, homeDateLabel, pickCoachNote, pickCoachNotes, pickHighlight, readinessSummary, tonnes, weekLabel, type CoachSignalsInput } from './home'
import type { RecentPR } from '@/lib/data/insights'

const log = (sleep: number, soreness: number, energy: number) => ({ sleep_score: sleep, soreness_score: soreness, energy_score: energy })

describe('readinessSummary', () => {
  it('has nothing to say without a check-in', () => {
    expect(readinessSummary(null)).toBeNull()
  })

  it.each([
    [log(1, 1, 1), 0, 'Low', 'negative'],
    [log(5, 5, 5), 100, 'Good', 'positive'],
    [log(3, 3, 3), 50, 'Fair', 'caution'],
    [log(4, 4, 3), 67, 'Fair', 'caution'],
    [log(4, 4, 4), 75, 'Good', 'positive'],
  ])('scores %o as %i %s', (input, score, word, tone) => {
    expect(readinessSummary(input)).toEqual({ score, word, tone })
  })
})

const quiet: CoachSignalsInput = {
  offerRestart: false,
  missedWeeks: 0,
  shouldDeload: false,
  deloadReason: null,
  phaseTransitionDue: false,
  dissociation: { hasDissociation: false, message: null },
  stalledLift: null,
  neglectedMuscle: null,
}

const loud: CoachSignalsInput = {
  offerRestart: true,
  missedWeeks: 3,
  shouldDeload: true,
  deloadReason: 'Volume has climbed four weeks in a row.',
  phaseTransitionDue: true,
  dissociation: { hasDissociation: true, message: 'Weight is up but strength is flat.' },
  stalledLift: { exerciseName: 'Bench press', pctPerWeek: 0.2 },
  neglectedMuscle: { muscleGroup: 'back', daysSinceLastTrained: 12 },
}

describe('pickCoachNote', () => {
  it('stays quiet when nothing needs saying', () => {
    expect(pickCoachNote(quiet)).toBeNull()
  })

  it('shows only the most important note', () => {
    expect(pickCoachNote(loud)?.kind).toBe('long_break')
  })

  it.each([
    ['deload', { ...loud, offerRestart: false }],
    ['phase_transition', { ...loud, offerRestart: false, shouldDeload: false }],
    ['dissociation', { ...loud, offerRestart: false, shouldDeload: false, phaseTransitionDue: false }],
    ['stalled_lift', { ...quiet, stalledLift: loud.stalledLift, neglectedMuscle: loud.neglectedMuscle }],
    ['neglected_muscle', { ...quiet, neglectedMuscle: loud.neglectedMuscle }],
  ])('ranks %s next', (kind, input) => {
    expect(pickCoachNote(input)?.kind).toBe(kind)
  })

  it('names the muscle and the days for a neglected muscle', () => {
    const note = pickCoachNote({ ...quiet, neglectedMuscle: loud.neglectedMuscle })
    expect(note?.title).toBe('Back — 12 days since you trained it')
    expect(note?.href).toBe('/routines')
  })
})

const pr = (exerciseName: string, daysAgo: number): RecentPR => ({
  exerciseName, muscleGroup: 'chest', prType: 'best_weight', value: 100, achievedAt: '2026-11-18T10:00:00Z', daysAgo,
})
const workout = { id: 'w1', title: 'Push A', startedAt: '2026-11-18T10:00:00Z', durationSeconds: 3600, volumeKg: 8200 }

describe('pickHighlight', () => {
  it('celebrates a PR from this week', () => {
    expect(pickHighlight([pr('Bench press', 2)], workout)).toMatchObject({ kind: 'pr', exerciseName: 'Bench press' })
  })

  it('falls back to the last workout when the PR is older than a week', () => {
    expect(pickHighlight([pr('Bench press', 9)], workout)).toMatchObject({ kind: 'workout', id: 'w1' })
  })

  it('picks the newest PR', () => {
    expect(pickHighlight([pr('Squat', 5), pr('Bench press', 1)], workout)).toMatchObject({ exerciseName: 'Bench press' })
  })

  it('has nothing to show for a new lifter', () => {
    expect(pickHighlight([], null)).toBeNull()
  })
})

describe('weekLabel', () => {
  it('uses sentence case', () => {
    expect(weekLabel({ label: 'Strength Week' }, false)).toBe('Strength week')
  })

  it('calls a deload week a deload week', () => {
    expect(weekLabel({ label: 'Strength Week' }, true)).toBe('Deload week')
  })

  it('has no label without a cycle', () => {
    expect(weekLabel(null, false)).toBeNull()
  })
})

describe('pickCoachNotes', () => {
  it('lists every note that applies, most important first', () => {
    const input = { ...quiet, stalledLift: loud.stalledLift, neglectedMuscle: loud.neglectedMuscle }
    expect(pickCoachNotes(input).map(note => note.kind)).toEqual(['stalled_lift', 'neglected_muscle'])
  })

  it('has nothing to list when nothing needs saying', () => {
    expect(pickCoachNotes(quiet)).toEqual([])
  })

  it('always agrees with the one note Home shows', () => {
    const three = { ...quiet, shouldDeload: true, stalledLift: loud.stalledLift, neglectedMuscle: loud.neglectedMuscle }
    expect(pickCoachNote(three)).toEqual(pickCoachNotes(three)[0])
    expect(pickCoachNote(quiet)).toBeNull()
  })

  it('gives every note something to ask the coach', () => {
    for (const note of pickCoachNotes(loud)) expect(note.prompt.trim().length).toBeGreaterThan(0)
    expect(pickCoachNotes(loud)).toHaveLength(6)
  })

  it('asks about a stalled lift by its exact name', () => {
    const odd = { ...quiet, stalledLift: { exerciseName: 'Cable Fly 50% & Hold', pctPerWeek: -0.25 } }
    const prompt = pickCoachNotes(odd)[0].prompt
    expect(prompt).toContain('Cable Fly 50% & Hold')
    expect(prompt).toContain('-0.3%')
  })

  it('asks about a neglected muscle by name', () => {
    expect(pickCoachNotes({ ...quiet, neglectedMuscle: loud.neglectedMuscle })[0].prompt).toContain('back')
  })
})

describe('tonnes', () => {
  it('shows one decimal', () => {
    expect(tonnes(12_340)).toBe('12.3')
    expect(tonnes(0)).toBe('0.0')
  })
})

describe('greetingFor', () => {
  it.each([[4, 'Late night'], [5, 'Good morning'], [11, 'Good morning'], [12, 'Good afternoon'], [17, 'Good afternoon'], [18, 'Good evening']])(
    'says the right thing at %i:00', (hour, greeting) => {
      expect(greetingFor(hour)).toBe(greeting)
    },
  )
})

describe('homeDateLabel', () => {
  it('reads like a diary date', () => {
    expect(homeDateLabel(new Date(2026, 10, 20, 9))).toBe('Friday 20 Nov')
  })
})
