import { describe, it, expect } from 'vitest'
import { DELOAD_THRESHOLDS } from '@/lib/workout-intelligence'
import { buildMesocycleTimeline } from './phase-coach'

const BEFORE_DELOAD = DELOAD_THRESHOLDS.intermediate.maingaining

const base = {
  phaseStartedAt: '2026-10-05T10:00:00Z',
  experienceLevel: 'intermediate' as const,
  trainingPhase: 'maingaining' as const,
  weeklyGoalSessions: 4,
  currentWeekStart: '2026-11-02',
  currentWeekSessions: 1,
}

describe('buildMesocycleTimeline (training weeks)', () => {
  it('places the current cell after the completed training weeks, skipping missed calendar weeks', () => {
    const timeline = buildMesocycleTimeline({
      ...base,
      phaseWeek: 3,
      phaseTrainingWeeks: [
        { weekStart: '2026-10-05', sessions: 4 },
        { weekStart: '2026-10-19', sessions: 2 },
      ],
    })
    expect(timeline?.totalWeeks).toBe(BEFORE_DELOAD + 1)
    expect(timeline?.currentWeek).toBe(3)
    expect(timeline?.cells.slice(0, 3).map(cell => [cell.weekStart, cell.status])).toEqual([
      ['2026-10-05', 'good'],
      ['2026-10-19', 'low'],
      ['2026-11-02', 'current'],
    ])
    expect(timeline?.cells.some(cell => cell.status === 'missed')).toBe(false)
  })

  it('shows the deload as the current cell once the block is done', () => {
    const timeline = buildMesocycleTimeline({
      ...base,
      phaseWeek: BEFORE_DELOAD + 1,
      phaseTrainingWeeks: Array.from({ length: BEFORE_DELOAD }, (_, i) => ({
        weekStart: `2026-09-${String(i + 1).padStart(2, '0')}`, sessions: 4,
      })),
    })
    const current = timeline?.cells.find(cell => cell.isCurrent)
    expect(current?.isDeload).toBe(true)
    expect(current?.status).toBe('deload')
  })

  it('starts a new block after the deload week', () => {
    const timeline = buildMesocycleTimeline({
      ...base,
      phaseWeek: BEFORE_DELOAD + 2,
      phaseTrainingWeeks: Array.from({ length: BEFORE_DELOAD + 1 }, (_, i) => ({
        weekStart: `2026-08-${String(i + 1).padStart(2, '0')}`, sessions: 4,
      })),
    })
    expect(timeline?.currentWeek).toBe(1)
  })

  it('returns nothing before a phase is set', () => {
    expect(buildMesocycleTimeline({ ...base, phaseStartedAt: null, phaseWeek: 1, phaseTrainingWeeks: [] })).toBeNull()
  })
})
