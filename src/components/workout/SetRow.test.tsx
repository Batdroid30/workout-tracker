import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

vi.mock('@/providers/ToastProvider', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }) }))
vi.mock('@/store/workout.store', () => ({
  useWorkoutStore: (select: (state: { userBodyweight: number; bodyweightLogged: boolean }) => unknown) =>
    select({ userBodyweight: 80, bodyweightLogged: true }),
}))

import { SetRow } from './SetRow'
import type { ActiveSet } from '@/types/database'

const set = (overrides: Partial<ActiveSet> = {}): ActiveSet => ({
  id: 's1', set_number: 2, weight_kg: 28, reps: 9, rpe: 7.5, is_warmup: false, completed: false, saved: false, ...overrides,
})

const render = (value: ActiveSet) =>
  renderToStaticMarkup(<SetRow set={value} prevSetText="26×9" onChange={vi.fn()} onDone={vi.fn()} onRemove={vi.fn()} />)

describe('SetRow', () => {
  it('puts last time in its own column next to the set', () => {
    const markup = render(set())
    expect(markup).toMatch(/data-col="last"[^>]*>26×9</)
    expect(markup).toContain('grid-cols-[28px_52px_1fr_1fr_44px]')
  })

  it('keeps a full-size lime tick on a completed set', () => {
    const markup = render(set({ completed: true }))
    expect(markup).toMatch(/<button class="[^"]*w-11 h-11[^"]*bg-accent[^"]*" aria-label="Untick set"/)
  })
})
