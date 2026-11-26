import { describe, it, expect } from 'vitest'
import { weekTypeAt, type BackfillProfile } from '@/lib/week-type-backfill'

const BASE_PROFILE: BackfillProfile = {
  cycleStartedAt: null,
  phaseStartedAt: null,
  breakPromptDismissedAt: null,
  weeklyGoalSessions: 3,
  experienceLevel: 'intermediate',
  trainingPhase: 'maingaining',
}

// Three sessions on Mon/Wed/Fri of the week starting at the given Monday.
function sessionsInWeek(monday: string): string[] {
  const start = new Date(`${monday}T09:00:00Z`).getTime()
  return [0, 2, 4].map(offset => new Date(start + offset * 86_400_000).toISOString())
}

describe('weekTypeAt', () => {
  it('labels a workout in the first eligible week as Strength', () => {
    const profile = { ...BASE_PROFILE, cycleStartedAt: '2026-01-05T00:00:00Z' }
    const dates = ['2026-01-06T09:00:00Z']
    expect(weekTypeAt(profile, dates, dates[0])).toEqual({ weekType: 'strength', isDeload: false })
  })

  it('advances the cycle after a completed training week', () => {
    const profile = { ...BASE_PROFILE, cycleStartedAt: '2026-01-05T00:00:00Z' }
    const dates = [...sessionsInWeek('2026-01-05'), '2026-01-13T09:00:00Z']
    expect(weekTypeAt(profile, dates, '2026-01-13T09:00:00Z').weekType).toBe('hypertrophy')
  })

  it('flags a workout in the deload slot', () => {
    const profile = { ...BASE_PROFILE, phaseStartedAt: '2026-01-05T00:00:00Z' }
    const blockWeeks = ['2026-01-05', '2026-01-12', '2026-01-19', '2026-01-26', '2026-02-02', '2026-02-09']
    const deloadWorkout = '2026-02-16T09:00:00Z'
    const dates = [...blockWeeks.flatMap(sessionsInWeek), deloadWorkout]
    expect(weekTypeAt(profile, dates, deloadWorkout).isDeload).toBe(true)
  })

  it('anchors to the first workout when the profile has no cycle or phase start', () => {
    const firstWorkout = '2026-01-06T09:00:00Z'
    const secondWeek = ['2026-01-12T09:00:00Z', '2026-01-14T09:00:00Z', '2026-01-16T09:00:00Z']
    const lateWorkout = '2026-01-20T09:00:00Z'
    const dates = [firstWorkout, ...secondWeek, lateWorkout]
    expect(weekTypeAt(BASE_PROFILE, dates, firstWorkout)).toEqual({ weekType: 'strength', isDeload: false })
    expect(weekTypeAt(BASE_PROFILE, dates, lateWorkout).weekType).toBe('hypertrophy')
  })
})
