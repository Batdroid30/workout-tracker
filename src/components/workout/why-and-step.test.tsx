import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ReactNode } from 'react'
import type { ExercisePlan, LoggedSet, SetSuggestion } from '@/lib/suggestions/types'
import { formatReferenceSet, formatShortDate } from '@/lib/suggestions/explanation-labels'
import { WhyThisWeightSheet } from './WhyThisWeightSheet'
import { SuggestionChip } from './SuggestionChip'
import { WeightStepSheet } from './WeightStepSheet'

vi.mock('@/components/ui/BottomSheet', () => ({
  BottomSheet: ({ title, children }: { title?: string; children: ReactNode }) => (
    <div data-title={title}>{children}</div>
  ),
}))

function loggedSet(weightKg: number, reps: number): LoggedSet {
  return { weightKg, reps, rpe: null, rpeSource: null, suggestedWeightKg: null, suggestedReps: null }
}

const REFERENCE_DATE = '2026-11-19T10:00:00.000Z'
const SETS = [loggedSet(30, 10), loggedSet(30, 9), loggedSet(30, 7)]

function planned(weightKg: number, reps: number): SetSuggestion {
  return { weightKg, reps, repsMax: null, rpeTarget: 7.5, role: 'straight', optional: false }
}

function makePlan(overrides: Partial<ExercisePlan['explanation']> = {}): ExercisePlan {
  return {
    sets: [planned(30, 11), planned(30, 10), planned(30, 8)],
    explanation: {
      rule: 'hold-add-reps', referenceDate: REFERENCE_DATE, referenceWeekKind: 'hypertrophy',
      referenceSets: SETS, effortSources: ['inferred', 'inferred', 'inferred'], modifiers: [],
      confidence: 'medium', reason: 'Same 30 kg — add a rep to every set.',
      weekKind: 'hypertrophy', repRange: { min: 8, max: 12 }, isDeloadWeek: false, isReferenceNewest: true,
      ...overrides,
    },
  }
}

describe('explanation labels', () => {
  it('reads the reference date in UTC so it never shifts a day by time zone', () => {
    expect(formatShortDate('2026-11-19T23:30:00Z')).toBe('19 Nov')
  })

  it('formats a reference set for each load mode', () => {
    expect(formatReferenceSet(loggedSet(30, 10), 'load', 75)).toBe('30×10')
    expect(formatReferenceSet(loggedSet(0, 10), 'bodyweight', 75)).toBe('BW×10')
    expect(formatReferenceSet(loggedSet(95, 8), 'weighted', 75)).toBe('+20kg×8')
    expect(formatReferenceSet(loggedSet(20, 8), 'assisted', 75)).toBe('20 kg assist ×8')
  })
})

describe('WhyThisWeightSheet', () => {
  const render = (plan: ExercisePlan, hitRate: { hits: number; total: number } | null) =>
    renderToStaticMarkup(
      <WhyThisWeightSheet plan={plan} hitRate={hitRate} loadMode="load" bodyweightKg={75} onClose={vi.fn()} />,
    )

  it('tells the story: last time, this week, today, target and how it was worked out', () => {
    const markup = render(makePlan(), { hits: 4, total: 5 })
    for (const text of [
      'Last time · 19 Nov', '30×10, 30×9, 30×7', '26 reps in total',
      'Muscle-building week: 8 to 12 reps per set', 'Same weight as last time — beat it with extra reps.',
      'Same 30 kg — add a rep to every set.',
      'Your target', '30 kg × 11 · 10 · 8', '29 reps — 3 more than last time',
      'Stop each set when you could still do 2–3 more.',
      'Sets 1–3', 'Guessed from how your reps dropped', 'How sure we are', 'Fairly sure',
      'Beat it and the weight goes up next time.',
    ]) expect(markup).toContain(text)
    expect(markup).toContain('You&#x27;ve hit 4 of 5 suggestions on this lift')
  })

  it('uses no RPE or RIR jargon', () => {
    const markup = render(makePlan(), null)
    expect(markup).not.toMatch(/RPE|RIR/)
  })

  it('hides the hit rate under three suggestions or when missing', () => {
    expect(render(makePlan(), { hits: 1, total: 2 })).not.toContain('suggestions on this lift')
    expect(render(makePlan(), null)).not.toContain('suggestions on this lift')
  })
})

describe('SuggestionChip — see why link', () => {
  const render = (props: { reason?: string; onExplain?: () => void }) => renderToStaticMarkup(
    <SuggestionChip suggestion={planned(57.5, 14)} userBodyweight={75} onUse={vi.fn()} {...props} />,
  )

  it('shows the teaser and a See why link, with a readable label', () => {
    const markup = render({ reason: 'Lighter than last time', onExplain: vi.fn() })
    expect(markup).toContain('Lighter than last time')
    expect(markup).toContain('· See why')
    expect(markup).toContain('aria-label="Suggested 57.5 kg × 14. Why this weight"')
  })

  it('shows no link on later sets of the exercise', () => {
    expect(render({ onExplain: vi.fn() })).not.toContain('See why')
  })
})

describe('WeightStepSheet', () => {
  it('renders the five steps with the current one pressed', () => {
    const markup = renderToStaticMarkup(<WeightStepSheet current={2.5} onPick={vi.fn()} onClose={vi.fn()} />)
    for (const step of ['1', '1.25', '2', '2.5', '5']) expect(markup).toContain(`>${step} kg</button>`)
    expect(markup.match(/aria-pressed="true"/g)).toHaveLength(1)
    expect(markup).toMatch(/aria-pressed="true"[^>]*>2\.5 kg<\/button>/)
  })
})
