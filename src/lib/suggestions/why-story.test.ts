import { describe, expect, it } from 'vitest'
import { buildWhyStory, chipTeaser } from './why-story'
import type { ExercisePlan, LoggedSet, PlanExplanation, SetSuggestion } from './types'

function logged(weightKg: number, reps: number, rpe: number | null = null, rpeSource: LoggedSet['rpeSource'] = null): LoggedSet {
  return { weightKg, reps, rpe, rpeSource, suggestedWeightKg: null, suggestedReps: null }
}

function planned(weightKg: number, reps: number, overrides: Partial<SetSuggestion> = {}): SetSuggestion {
  return { weightKg, reps, repsMax: null, rpeTarget: 7, role: 'straight', optional: false, ...overrides }
}

function makeExplanation(overrides: Partial<PlanExplanation> = {}): PlanExplanation {
  return {
    rule: 'come-down',
    referenceDate: '2026-11-27T10:00:00Z',
    referenceWeekKind: 'volume',
    referenceSets: [logged(65, 10, 8, 'entered'), logged(65, 7), logged(60, 10)],
    effortSources: ['entered', 'inferred', 'inferred'],
    modifiers: [],
    confidence: 'high',
    reason: 'Last time was too heavy to reach this rep range — drop to 57.5 kg for 14, 12, 12 reps.',
    weekKind: 'volume',
    repRange: { min: 13, max: 20 },
    isDeloadWeek: false,
    isReferenceNewest: true,
    ...overrides,
  }
}

function makePlan(sets: SetSuggestion[], overrides: Partial<PlanExplanation> = {}): ExercisePlan {
  return { sets, explanation: makeExplanation(overrides) }
}

const BENCH = [planned(57.5, 14), planned(57.5, 12), planned(57.5, 12)]

describe('buildWhyStory — the bench example', () => {
  const story = buildWhyStory(makePlan(BENCH), 'load', 75)

  it('tells last time, this week and today in plain words', () => {
    expect(story.lastTime).toEqual({ heading: 'Last time · 27 Nov', sets: '65×10, 65×7, 60×10', total: '27 reps in total' })
    expect(story.thisWeek).toEqual({
      title: 'High-rep week: 13 to 20 reps per set',
      note: '65 kg only got you 10 reps — too heavy for that.',
    })
    expect(story.today).toBe('Last time was too heavy to reach this rep range — drop to 57.5 kg for 14, 12, 12 reps.')
  })

  it('states the target, its total and how hard to go, without jargon', () => {
    expect(story.target).toEqual({
      sets: '57.5 kg × 14 · 12 · 12',
      total: '38 reps in total',
      effort: 'Stop each set when you could still do about 3 more.',
    })
  })

  it('explains effort per set in plain words, grouping repeats', () => {
    expect(story.effort).toEqual([
      { label: 'Set 1', value: 'You rated it 8 out of 10' },
      { label: 'Sets 2 and 3', value: 'Guessed from how your reps dropped' },
    ])
    expect(story.confidence).toEqual({ text: 'Confident', isConfident: true })
  })
})

describe('buildWhyStory — other situations', () => {
  it('counts the reps beaten when the weight is the same as last time', () => {
    const story = buildWhyStory(
      makePlan([planned(30, 10), planned(30, 9), planned(30, 8)], {
        rule: 'hold-add-reps', referenceSets: [logged(30, 10), logged(30, 9), logged(30, 7)],
        weekKind: 'hypertrophy', repRange: { min: 8, max: 12 },
      }),
      'load', 75,
    )
    expect(story.target.total).toBe('27 reps — 1 more than last time')
    expect(story.thisWeek.title).toBe('Muscle-building week: 8 to 12 reps per set')
    expect(story.closing).toBe('Beat it and the weight goes up next time.')
  })

  it('names the week when comparing against an older session', () => {
    const story = buildWhyStory(makePlan(BENCH, { isReferenceNewest: false }), 'load', 75)
    expect(story.lastTime?.heading).toBe('Your last high-rep week · 27 Nov')
  })

  it('shows a top set and back-offs as separate weights', () => {
    const story = buildWhyStory(
      makePlan([planned(102.5, 4, { role: 'top', rpeTarget: 8.5 }), planned(90, 5, { role: 'backoff' }), planned(90, 5, { role: 'backoff' })], {
        rule: 'top-set-up', weekKind: 'strength', repRange: { min: 3, max: 5 },
        referenceSets: [logged(100, 5, 8.5, 'prompt'), logged(90, 6), logged(90, 6)],
      }),
      'load', 75,
    )
    expect(story.target.sets).toBe('102.5 kg × 4, then 90 kg × 5 · 5')
    expect(story.target.effort).toBe('Stop each set when you could still do 1–2 more.')
    expect(story.thisWeek).toEqual({ title: 'Heavy week: 3 to 5 reps per set', note: 'You got 5 reps at 100 kg — you\'re ready for more.' })
    expect(story.effort[0]).toEqual({ label: 'Set 1', value: 'You said about 1 rep left' })
    expect(story.closing).toBe('New weight. Own it, then we go again.')
  })

  it('shows a rep range and no total on a first go at a rep range', () => {
    const story = buildWhyStory(
      makePlan([planned(35, 3, { repsMax: 5, rpeTarget: 8.5, role: 'top' })], {
        rule: 'calibration', weekKind: 'strength', repRange: { min: 3, max: 5 }, confidence: 'low',
        effortSources: ['assumed'], referenceSets: [logged(30, 10)],
      }),
      'load', 75,
    )
    expect(story.target.sets).toBe('35 kg × 3–5')
    expect(story.target.total).toBeNull()
    expect(story.thisWeek.note).toBe('Your first heavy week on this lift — we start a touch light to find your level.')
    expect(story.effort).toEqual([{ label: 'Set 1', value: 'Estimated — rate your last set to sharpen this' }])
    expect(story.confidence).toEqual({ text: 'First estimate — it sharpens after today', isConfident: false })
  })

  it('reads a deload week as recovery', () => {
    const story = buildWhyStory(
      makePlan([planned(85, 8), planned(85, 8), planned(85, 8, { optional: true })], {
        rule: 'deload', isDeloadWeek: true, referenceSets: [logged(100, 8), logged(100, 8), logged(100, 8)],
      }),
      'load', 75,
    )
    expect(story.thisWeek.title).toBe('Deload week: lighter work so you recover')
    expect(story.target.effort).toBe('Keep it easy — stop well before it gets hard.')
    expect(story.closing).toBe('Recover this week, push next week.')
  })

  it('frames a cut hold as a win', () => {
    const story = buildWhyStory(
      makePlan([planned(30, 10)], { rule: 'hold-match', modifiers: ['cut'], referenceSets: [logged(30, 10)] }),
      'load', 75,
    )
    expect(story.thisWeek.note).toBe('On a cut, holding your numbers is a win.')
    expect(story.closing).toBe('Hold the line.')
  })

  it('formats assisted and bodyweight loads', () => {
    const assisted = buildWhyStory(
      makePlan([planned(25, 9)], { referenceSets: [logged(20, 6)] }), 'assisted', 80,
    )
    expect(assisted.thisWeek.note).toBe('20 kg assistance only got you 6 reps — too heavy for that.')
    expect(assisted.target.sets).toBe('25 kg assistance × 9')
    const bodyweight = buildWhyStory(
      makePlan([planned(0, 16), planned(0, 14)], {
        rule: 'hold-add-reps', referenceSets: [logged(0, 15), logged(0, 14)],
      }),
      'bodyweight', 80,
    )
    expect(bodyweight.lastTime?.sets).toBe('BW×15, BW×14')
    expect(bodyweight.target.sets).toBe('Bodyweight × 16 · 14')
    expect(bodyweight.target.total).toBe('30 reps — 1 more than last time')
  })
})

describe('chipTeaser', () => {
  it('sums up the change in a few words', () => {
    expect(chipTeaser(makeExplanation(), 'load')).toBe('Lighter than last time')
    expect(chipTeaser(makeExplanation({ rule: 'weight-up' }), 'load')).toBe('Heavier than last time')
    expect(chipTeaser(makeExplanation({ rule: 'hold-add-reps' }), 'load')).toBe('Same weight, more reps than last time')
    expect(chipTeaser(makeExplanation({ rule: 'deload' }), 'load')).toBe('Recovery week')
  })

  it('names the week when the comparison is not the Last column session', () => {
    expect(chipTeaser(makeExplanation({ isReferenceNewest: false }), 'load')).toBe('Lighter than your last high-rep week')
  })

  it('reads assistance the right way round', () => {
    expect(chipTeaser(makeExplanation({ rule: 'weight-up' }), 'assisted')).toBe('Less assistance than last time')
    expect(chipTeaser(makeExplanation({ rule: 'come-down' }), 'assisted')).toBe('A little more assistance')
  })
})
