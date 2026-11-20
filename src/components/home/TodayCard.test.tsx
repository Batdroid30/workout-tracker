import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/store/workout.store', () => ({ useWorkoutStore: () => vi.fn() }))
vi.mock('@/providers/DialogProvider', () => ({ useDialog: () => ({ confirm: vi.fn() }) }))
vi.mock('@/providers/ToastProvider', () => ({ useToast: () => ({ error: vi.fn() }) }))
vi.mock('@/app/(app)/routines/split-actions', () => ({ setSplitPositionAction: vi.fn() }))
vi.mock('@/app/(app)/workout/actions', () => ({ getUserExerciseFrequency: vi.fn() }))
vi.mock('@/store/exercise.store', () => ({ useExerciseStore: () => ({ exercises: [], load: vi.fn(), isLoading: false }) }))
vi.mock('@/hooks/useTrainingCycle', () => ({ useTrainingCycle: () => ({ cycle: null }) }))

import { TodayCard } from './TodayCard'
import type { SessionSuggestion } from '@/lib/data/splits'

function splitDay(routineId: string | null): SessionSuggestion {
  const item = { id: 'a', position: 0, routineId, routineTitle: routineId ? 'Push A' : null }
  return {
    kind: 'split',
    split: { id: 's1', name: 'PPL' },
    next: { item, index: 0, isRest: routineId === null, daysSinceLast: 1, welcomeBack: false },
    routineTitle: item.routineTitle,
    exerciseCount: 6,
    setCount: 18,
    skipToPosition: 1,
  }
}

const render = (suggestion: SessionSuggestion | null, weekLabel: string | null = null) =>
  renderToStaticMarkup(<TodayCard suggestion={suggestion} routines={[]} weekLabel={weekLabel} />)

const limeCount = (markup: string) => markup.match(/bg-accent /g)?.length ?? 0

describe('TodayCard', () => {
  it('shows the split day with its week, size and both actions', () => {
    const markup = render(splitDay('push'), 'Strength week')
    expect(markup).toContain('Strength week')
    expect(markup).toContain('Push A')
    expect(markup).toContain('6 exercises · 18 sets')
    expect(markup).toContain('Start workout')
    expect(markup).toContain('Not today')
    expect(limeCount(markup)).toBe(1)
  })

  it('offers rest without a lime button on a rest day', () => {
    const markup = render(splitDay(null))
    expect(markup).toContain('Rest day')
    expect(markup).toContain('Train anyway')
    expect(limeCount(markup)).toBe(0)
  })

  it('shows the smart suggestion without a split', () => {
    const markup = render({ kind: 'routine', routineId: 'pull', title: 'Pull A', reason: 'Covers back — 6 days since you trained it' })
    expect(markup).toContain('Pull A')
    expect(markup).toContain('Covers back')
  })

  it('starts a focus session in place instead of sending the lifter away', () => {
    const markup = render({ kind: 'focus', focus: 'Pull Day', muscleGroups: ['back'], reason: 'Back last trained 12 days ago' })
    expect(markup).toContain('>Pull Day<')
    expect(markup).not.toContain('Pull Day day')
    expect(markup).not.toContain('href="/routines"')
    expect(markup).toMatch(/<button[^>]*bg-accent [^>]*>.*Start workout/)
  })

  it('still gives one clear action when there is nothing to suggest', () => {
    const markup = render(null)
    expect(markup).toContain('Start a workout')
    expect(markup).toContain('href="/routines"')
    expect(limeCount(markup)).toBe(1)
  })
})
