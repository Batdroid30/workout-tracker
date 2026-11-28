import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ReactNode } from 'react'
import type { ExercisePlan, LoggedSet } from '@/lib/suggestions/types'
import {
  confidenceLabel, effortLabel, formatReferenceLine, modifierLabel,
} from '@/lib/suggestions/explanation-labels'
import { WhyThisWeightSheet } from './WhyThisWeightSheet'
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

function makePlan(overrides: Partial<ExercisePlan['explanation']> = {}): ExercisePlan {
  return {
    sets: [],
    explanation: {
      rule: 'hold-add-reps', referenceDate: REFERENCE_DATE, referenceWeekKind: 'hypertrophy',
      referenceSets: SETS, effortSources: ['entered', 'inferred', 'assumed'], modifiers: ['cut'],
      confidence: 'high', reason: 'Same 30 kg — add a rep to every set.', ...overrides,
    },
  }
}

describe('explanation labels', () => {
  it('reads the reference date in UTC so it never shifts a day by time zone', () => {
    const lateEvening = makePlan({ referenceDate: '2026-11-19T23:30:00Z' }).explanation
    expect(formatReferenceLine(lateEvening, 'load', 75)).toContain(' · 19 Nov · ')
  })

  it('formats the reference line for each load mode', () => {
    const { explanation } = makePlan()
    expect(formatReferenceLine(explanation, 'load', 75)).toBe('Last Hypertrophy week · 19 Nov · 30×10, 30×9, 30×7')
    expect(formatReferenceLine(explanation, 'bodyweight', 75)).toBe('Last Hypertrophy week · 19 Nov · BW×10, BW×9, BW×7')
    expect(formatReferenceLine({ ...explanation, referenceSets: [loggedSet(95, 8)] }, 'weighted', 75))
      .toBe('Last Hypertrophy week · 19 Nov · +20kg×8')
    expect(formatReferenceLine({ ...explanation, referenceSets: [loggedSet(20, 8)] }, 'assisted', 75))
      .toBe('Last Hypertrophy week · 19 Nov · 20 kg assist ×8')
  })

  it('falls back to "Last session" without a week kind and to null without a date', () => {
    const { explanation } = makePlan({ referenceWeekKind: null })
    expect(formatReferenceLine(explanation, 'load', 75)).toBe('Last session · 19 Nov · 30×10, 30×9, 30×7')
    expect(formatReferenceLine({ ...explanation, referenceDate: null }, 'load', 75)).toBeNull()
  })

  it('words effort, confidence and modifiers', () => {
    expect(effortLabel('entered')).toBe('Entered')
    expect(effortLabel('inferred')).toBe('From your rep drop-off')
    expect(effortLabel('assumed')).toBe('Assumed')
    expect(confidenceLabel('high')).toBe('Based on your logged effort')
    expect(confidenceLabel('medium')).toBe('Based on your reps')
    expect(confidenceLabel('low')).toBe('First estimate — it will sharpen after this session')
    expect(modifierLabel('low-readiness')).toBe('Low readiness')
  })
})

describe('WhyThisWeightSheet', () => {
  const render = (plan: ExercisePlan, hitRate: { hits: number; total: number } | null) =>
    renderToStaticMarkup(
      <WhyThisWeightSheet plan={plan} hitRate={hitRate} loadMode="load" bodyweightKg={75} onClose={vi.fn()} />,
    )

  it('renders reference line, per-set effort, reason, modifiers, confidence and hit rate', () => {
    const markup = render(makePlan(), { hits: 4, total: 5 })
    expect(markup).toContain('Last Hypertrophy week · 19 Nov · 30×10, 30×9, 30×7')
    for (const text of ['Set 1', 'Entered', 'From your rep drop-off', 'Assumed']) expect(markup).toContain(text)
    expect(markup).toContain('Same 30 kg — add a rep to every set.')
    expect(markup).toContain('Cut')
    expect(markup).toContain('Based on your logged effort')
    expect(markup).toContain('You&#x27;ve hit 4 of 5 suggestions on this lift')
  })

  it('hides the hit rate under three suggestions or when missing', () => {
    expect(render(makePlan(), { hits: 1, total: 2 })).not.toContain('suggestions on this lift')
    expect(render(makePlan(), null)).not.toContain('suggestions on this lift')
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
