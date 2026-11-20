import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getSupabaseServer: vi.fn() }))

import { buildHomeModel, toHighlightWorkout, type HomeModelParts } from './home'
import type { CoachSignalsInput } from '@/lib/home'

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

const newLifter: HomeModelParts = {
  scheme: null,
  isDeloadWeek: false,
  currentWeekStart: '2026-11-16',
  currentWeekSessions: 0,
  weeklyGoal: null,
  weeklyData: [],
  todayReadiness: null,
  coachInput: quiet,
  recentPRs: [],
  lastWorkout: null,
}

describe('buildHomeModel', () => {
  it('gives a brand-new lifter an empty but complete Home', () => {
    expect(buildHomeModel(newLifter)).toEqual({
      weekLabel: null,
      workoutsDone: 0,
      workoutsGoal: 3,
      volumeTonnes: '0.0',
      readiness: null,
      coachNote: null,
      highlight: null,
    })
  })

  it("counts this week's volume, not last week's", () => {
    const model = buildHomeModel({
      ...newLifter,
      scheme: { label: 'Strength Week' },
      currentWeekSessions: 2,
      weeklyGoal: 4,
      weeklyData: [
        { weekStart: '2026-11-09', totalVolume: 20_000 },
        { weekStart: '2026-11-16', totalVolume: 12_340 },
      ],
    })
    expect(model).toMatchObject({ weekLabel: 'Strength week', workoutsDone: 2, workoutsGoal: 4, volumeTonnes: '12.3' })
  })
})

describe('toHighlightWorkout', () => {
  it('sums the volume of the last workout', () => {
    expect(toHighlightWorkout({
      id: 'w1',
      title: 'Push A',
      started_at: '2026-11-18T10:00:00Z',
      duration_seconds: 3600,
      bodyweight_kg: 80,
      workout_exercises: [
        { exercise: { name: 'Bench press' }, sets: [{ weight_kg: 100, reps: 5 }, { weight_kg: 100, reps: 5 }] },
        { exercise: { name: 'Dips' }, sets: [{ weight_kg: 0, reps: 10 }] },
      ],
    })).toEqual({ id: 'w1', title: 'Push A', startedAt: '2026-11-18T10:00:00Z', durationSeconds: 3600, volumeKg: 1000 })
  })

  it('names an untitled workout', () => {
    expect(toHighlightWorkout({
      id: 'w2', title: null, started_at: '2026-11-18T10:00:00Z', duration_seconds: null, bodyweight_kg: null, workout_exercises: [],
    }).title).toBe('Workout')
  })
})
