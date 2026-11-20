import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ActiveWorkout } from '@/types/database'

const STARTED = Date.UTC(2026, 10, 20, 10, 0, 0)
const NOW = STARTED + (24 * 60 + 13) * 1000

let pathname = '/dashboard'
let running: ActiveWorkout | null = null

vi.mock('next/navigation', () => ({ usePathname: () => pathname }))
vi.mock('@/hooks/useNow', () => ({ useNow: () => NOW }))
vi.mock('@/hooks/useHydrated', () => ({ useHydrated: () => true }))
vi.mock('@/store/workout.store', () => ({
  useWorkoutStore: (select: (state: { activeWorkout: ActiveWorkout | null }) => unknown) => select({ activeWorkout: running }),
}))

import { WorkoutBar } from './WorkoutBar'

const doneSet = { id: 's', set_number: 1, weight_kg: 50, reps: 8, rpe: null, is_warmup: false, completed: true, saved: false }
const openSet = { ...doneSet, completed: false }
const exercise = (clientId: string, done: boolean) => ({
  clientId, workout_exercise_id: null, order_index: 0, sets: [done ? doneSet : openSet],
  exercise: { id: clientId, name: clientId, muscle_group: 'chest', secondary_muscles: null, equipment: null, movement_pattern: '', is_custom: null, created_by: null, created_at: null, youtube_video_id: null },
})

describe('WorkoutBar', () => {
  beforeEach(() => {
    pathname = '/dashboard'
    running = {
      id: null, title: 'Push A', started_at: new Date(STARTED), openExerciseId: null, rest: null,
      exercises: [exercise('a', true), exercise('b', true), exercise('c', false), exercise('d', false)],
    }
  })

  it('shows the running workout with its clock and progress', () => {
    const markup = renderToStaticMarkup(<WorkoutBar />)
    expect(markup).toContain('Push A')
    expect(markup).toContain('24:13')
    expect(markup).toContain('2 of 4')
    expect(markup).toContain('href="/workout"')
  })

  it('stays out of the way on the logger itself', () => {
    pathname = '/workout'
    expect(renderToStaticMarkup(<WorkoutBar />)).toBe('')
  })

  it('shows nothing without a workout', () => {
    running = null
    expect(renderToStaticMarkup(<WorkoutBar />)).toBe('')
  })
})
