import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/store/workout.store', () => ({ useWorkoutStore: () => vi.fn() }))
vi.mock('@/providers/DialogProvider', () => ({ useDialog: () => ({ confirm: vi.fn() }) }))
vi.mock('@/providers/ToastProvider', () => ({ useToast: () => ({ error: vi.fn() }) }))
vi.mock('@/app/(app)/routines/split-actions', () => ({
  setActiveSplitAction: vi.fn(),
  setSplitPositionAction: vi.fn(),
}))

import { MySplitSection } from './MySplitSection'
import type { SessionSuggestion, SplitWithItems } from '@/lib/data/splits'

const split: SplitWithItems = {
  id: 's1', name: 'Push pull legs', isActive: true, skip: null,
  items: [
    { id: 'a', position: 0, routineId: 'push', routineTitle: 'Push A' },
    { id: 'b', position: 1, routineId: 'pull', routineTitle: 'Pull A' },
    { id: 'c', position: 2, routineId: null, routineTitle: null },
  ],
}

function splitSuggestion(index: number, extra: Partial<{ welcomeBack: boolean; daysSinceLast: number }> = {}): SessionSuggestion {
  const item = split.items[index]
  return {
    kind: 'split',
    split: { id: 's1', name: 'Push pull legs' },
    next: { item, index, isRest: item.routineId === null, daysSinceLast: extra.daysSinceLast ?? 1, welcomeBack: extra.welcomeBack ?? false },
    routineTitle: item.routineTitle,
    exerciseCount: 6,
    setCount: 18,
    skipToPosition: (index + 1) % split.items.length,
    lastSplitWorkout: null,
  }
}

const render = (suggestion: SessionSuggestion | null, splits: SplitWithItems[] = [split]) =>
  renderToStaticMarkup(<MySplitSection splits={splits} suggestion={suggestion} routines={[]} />)

describe('MySplitSection', () => {
  it('shows the split in order with the next day selected', () => {
    const markup = render(splitSuggestion(1))
    expect(markup.indexOf('Push A')).toBeLessThan(markup.indexOf('Pull A'))
    expect(markup).toMatch(/aria-current="step"[^>]*>Pull A|class="[^"]*bg-primary[^"]*"[^>]*aria-current="step"/)
    expect(markup).toContain('6 exercises · 18 sets')
    expect(markup).toContain('Not today')
  })

  it('offers rest on a rest day, without a lime start button', () => {
    const markup = render(splitSuggestion(2))
    expect(markup).toContain('Rest day')
    expect(markup).toContain('Train anyway')
    expect(markup).not.toContain('bg-accent ')
  })

  it('welcomes the lifter back after a long break', () => {
    expect(render(splitSuggestion(0, { welcomeBack: true, daysSinceLast: 9 }))).toContain('Welcome back — it&#x27;s been 9 days.')
    expect(render(splitSuggestion(0))).not.toContain('Welcome back')
  })

  it('invites setting up a split and shows the smart suggestion without one', () => {
    const markup = render({ kind: 'routine', routineId: 'pull', title: 'Pull A', reason: 'Covers back — 6 days since you trained it' }, [])
    expect(markup).toContain('Set up your split')
    expect(markup).toContain('Pull A')
    expect(markup).toContain('Covers back')
  })
})
