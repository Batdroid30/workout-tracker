import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

vi.mock('@/providers/ToastProvider', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }) }))
vi.mock('@/store/workout.store', () => ({
  useWorkoutStore: (select: (state: { userBodyweight: number; bodyweightLogged: boolean }) => unknown) =>
    select({ userBodyweight: 80, bodyweightLogged: true }),
}))

import { SetRow, suggestionFields } from './SetRow'
import type { ActiveSet } from '@/types/database'
import type { SetSuggestion } from '@/lib/suggestions/types'

const set = (overrides: Partial<ActiveSet> = {}): ActiveSet => ({
  id: 's1', set_number: 2, weight_kg: 28, reps: 9, rpe: 7.5, is_warmup: false, completed: false, saved: false, ...overrides,
})

const suggestion = (overrides: Partial<SetSuggestion> = {}): SetSuggestion => ({
  weightKg: 35, reps: 8, repsMax: null, rpeTarget: 7.5, role: 'straight', optional: false, ...overrides,
})

const render = (value: ActiveSet) =>
  renderToStaticMarkup(<SetRow set={value} prevSetText="26×9" onChange={vi.fn()} onDone={vi.fn()} onRemove={vi.fn()} />)

const renderWith = (props: Partial<Parameters<typeof SetRow>[0]>) =>
  renderToStaticMarkup(<SetRow set={set({ rpe: null })} onChange={vi.fn()} onDone={vi.fn()} onRemove={vi.fn()} {...props} />)

describe('SetRow', () => {
  it('puts last time in its own column next to the set', () => {
    const markup = render(set())
    expect(markup).toMatch(/data-col="last"[^>]*>26×9</)
    expect(markup).toContain('grid-cols-[28px_60px_1fr_1fr_44px]')
  })

  it('keeps a full-size lime tick on a completed set', () => {
    const markup = render(set({ completed: true }))
    expect(markup).toMatch(/<button class="[^"]*w-11 h-11[^"]*bg-accent[^"]*" aria-label="Untick set"/)
  })

  it('leaves the RPE empty and shows the target as a placeholder', () => {
    const markup = renderWith({ suggestion: suggestion() })
    expect(markup).toMatch(/<input[^>]*placeholder="7.5" aria-label="RPE"[^>]*value=""/)
    expect(markup).toMatch(/aria-label="RPE" class="[^"]*placeholder:text-sm placeholder:text-tertiary/)
  })

  it('falls back to the week RPE as the placeholder without a suggestion', () => {
    expect(renderWith({ defaultRpe: 8.5 })).toMatch(/<input[^>]*placeholder="8.5" aria-label="RPE"[^>]*value=""/)
  })

  it('shows a rep range, the RPE and the top-set label on the chip', () => {
    const markup = renderWith({ suggestion: suggestion({ reps: 3, repsMax: 5, rpeTarget: 8.5, role: 'top' }) })
    expect(markup).toContain('35 kg × 3–5')
    expect(markup).toContain('· RPE 8.5 (2 RIR)')
    expect(markup).toContain('Top set')
    expect(markup).toMatch(/<button[^>]*class="[^"]*min-h-11[^"]*min-w-11[^"]*"[^>]*>Use<\/button>/)
  })

  it('labels back-off sets and optional deload sets', () => {
    const markup = renderWith({ suggestion: suggestion({ role: 'backoff', optional: true }) })
    expect(markup).toContain('Back-off')
    expect(markup).toContain('Optional — skip this set this deload week')
  })

  it('shows the reason only when given', () => {
    expect(renderWith({ suggestion: suggestion(), reason: 'Beat last time' })).toContain('Beat last time')
    expect(renderWith({ suggestion: suggestion() })).not.toContain('Beat last time')
  })

  it('keeps the bodyweight and weighted-bodyweight chip forms', () => {
    expect(renderWith({ suggestion: suggestion(), isBodyweight: true })).toContain('BW × 8')
    expect(renderWith({ suggestion: suggestion({ weightKg: 90 }), isWeightedBodyweight: true })).toContain('+10kg × 8')
  })

  it('asks for reps left on a completed key set without an RPE', () => {
    const completed = set({ completed: true, rpe: null })
    const markup = renderToStaticMarkup(
      <SetRow set={completed} promptRepsLeft onChange={vi.fn()} onDone={vi.fn()} onRemove={vi.fn()} />,
    )
    expect(markup).toContain('Reps left?')
  })

  it('does not ask for reps left once the set has an RPE', () => {
    const completed = set({ completed: true, rpe: 8 })
    const markup = renderToStaticMarkup(
      <SetRow set={completed} promptRepsLeft onChange={vi.fn()} onDone={vi.fn()} onRemove={vi.fn()} />,
    )
    expect(markup).not.toContain('Reps left?')
  })
})

describe('suggestionFields', () => {
  it('copies the suggested weight and reps', () => {
    expect(suggestionFields(suggestion({ weightKg: 35, reps: 3, repsMax: 5 })))
      .toEqual({ suggested_weight_kg: 35, suggested_reps: 3 })
  })

  it('returns nulls without a suggestion', () => {
    expect(suggestionFields(undefined)).toEqual({ suggested_weight_kg: null, suggested_reps: null })
  })
})
