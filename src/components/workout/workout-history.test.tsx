import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

vi.mock('@/app/(app)/workout/actions', () => ({ deleteWorkoutAction: vi.fn() }))
vi.mock('@/providers/DialogProvider', () => ({ useDialog: () => ({ confirm: vi.fn() }) }))
vi.mock('@/providers/ToastProvider', () => ({ useToast: () => ({ error: vi.fn(), success: vi.fn() }) }))

import { WorkoutHistoryList } from './WorkoutHistoryList'
import type { WorkoutItem } from '@/types/workout-history'

const workout: WorkoutItem = {
  id: 'w1',
  title: 'Hams & arms',
  started_at: '2026-11-24T07:10:00Z',
  duration_seconds: 6667,
  prTypes: [],
  workout_exercises: [
    { exercise: { name: 'Romanian deadlift', muscle_group: 'hamstrings', secondary_muscles: null }, sets: [{ weight_kg: 110, reps: 6, is_warmup: false }] },
  ],
}

describe('WorkoutHistoryList', () => {
  it('lists each workout as a card that opens it', () => {
    const markup = renderToStaticMarkup(<WorkoutHistoryList workouts={[workout]} />)
    expect(markup).toContain('href="/workout/w1"')
    expect(markup).toContain('Hams &amp; arms')
    expect(markup).toContain('Romanian deadlift')
    expect(markup).not.toMatch(/\bglass\b/)
  })

  it('makes delete a full-size target', () => {
    expect(renderToStaticMarkup(<WorkoutHistoryList workouts={[workout]} />)).toMatch(/aria-label="Delete workout"[^>]*size-11|size-11[^>]*aria-label="Delete workout"/)
  })

  it('invites a first workout in plain words', () => {
    const markup = renderToStaticMarkup(<WorkoutHistoryList workouts={[]} />)
    expect(markup).toContain('No workouts yet')
    expect(markup).not.toMatch(/\bglass\b/)
  })
})
