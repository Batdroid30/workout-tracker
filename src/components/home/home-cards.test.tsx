import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

vi.mock('@/providers/ToastProvider', () => ({ useToast: () => ({ error: vi.fn() }) }))
vi.mock('@/app/(app)/dashboard/actions', () => ({ logReadinessAction: vi.fn() }))
vi.mock('@/app/(app)/account/training-actions', () => ({ restartPhaseAction: vi.fn(), dismissBreakPromptAction: vi.fn() }))

import { ThisWeekStats } from './ThisWeekStats'
import { CoachNoteCard } from './CoachNoteCard'
import { LatestHighlight } from './LatestHighlight'
import { HomeHeader } from './HomeHeader'

describe('ThisWeekStats', () => {
  it('shows workouts, volume and a readiness score with its word', () => {
    const markup = renderToStaticMarkup(
      <ThisWeekStats workoutsDone={2} workoutsGoal={4} volumeTonnes="12.3" readiness={{ score: 75, word: 'Good', tone: 'positive' }} />,
    )
    expect(markup).toContain('2/4')
    expect(markup).toContain('12.3 t')
    expect(markup).toContain('75')
    expect(markup).toContain('Good')
    expect(markup).not.toContain('Check in')
  })

  it('asks for a check-in when there is none today', () => {
    const markup = renderToStaticMarkup(<ThisWeekStats workoutsDone={0} workoutsGoal={3} volumeTonnes="0.0" readiness={null} />)
    expect(markup).toContain('—')
    expect(markup).toContain('Check in')
    expect(markup).toMatch(/<button[^>]*min-h-11[^>]*>Check in</)
  })
})

describe('CoachNoteCard', () => {
  it('shows one note with a link to its detail', () => {
    const markup = renderToStaticMarkup(
      <CoachNoteCard note={{ kind: 'stalled_lift', title: 'Bench press has stalled', body: 'Try a variation.', href: '/exercises', cta: 'See options', prompt: 'Why has my bench stalled?' }} missedWeeks={0} />,
    )
    expect(markup).toContain('Bench press has stalled')
    expect(markup).toContain('href="/exercises"')
  })

  it('offers restart and keep going for a long break', () => {
    const markup = renderToStaticMarkup(
      <CoachNoteCard note={{ kind: 'long_break', title: '3 light weeks in a row', body: '', href: '/account', cta: 'Restart', prompt: 'How do I restart?' }} missedWeeks={3} />,
    )
    expect(markup).toContain('3 light weeks in a row')
    expect(markup).toContain('Keep going')
  })
})

describe('LatestHighlight', () => {
  it('celebrates a new best', () => {
    const markup = renderToStaticMarkup(
      <LatestHighlight highlight={{ kind: 'pr', exerciseName: 'Bench press', value: 102.5, prType: 'best_weight', daysAgo: 1 }} />,
    )
    expect(markup).toContain('New best')
    expect(markup).toContain('Bench press')
    expect(markup).toContain('102.5 kg')
  })

  it('links to the last workout otherwise', () => {
    const markup = renderToStaticMarkup(
      <LatestHighlight highlight={{ kind: 'workout', id: 'w1', title: 'Push A', startedAt: '2026-11-18T10:00:00Z', durationSeconds: 3900, volumeKg: 8200 }} />,
    )
    expect(markup).toContain('href="/workout/w1"')
    expect(markup).toContain('Push A')
    expect(markup).toContain('65 min')
    expect(markup).toContain('8.2 t')
  })
})

describe('HomeHeader', () => {
  it('greets the lifter and links the avatar to the account', () => {
    const markup = renderToStaticMarkup(<HomeHeader greeting="Good morning" firstName="Sam" dateLabel="Friday 20 Nov" avatarUrl={null} initial="S" />)
    expect(markup).toContain('Good morning, Sam')
    expect(markup).toContain('Friday 20 Nov')
    expect(markup).toContain('href="/account"')
  })
})
