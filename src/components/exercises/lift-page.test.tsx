import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

vi.mock('@/components/ui/ProgressionLineChart', () => ({ ProgressionLineChart: () => <div data-chart="" /> }))

import { LiftHeroCard } from './LiftHeroCard'
import { RecentSessions } from './RecentSessions'

const points = [
  { date: '2026-10-30', best1RM: 88 },
  { date: '2026-11-18', best1RM: 92 },
]

describe('LiftHeroCard', () => {
  it('leads with the estimated max, marks a best and shows the change', () => {
    const markup = renderToStaticMarkup(<LiftHeroCard points={points} today="2026-11-21" />)
    expect(markup).toContain('Estimated max')
    expect(markup).toContain('92')
    expect(markup).toContain('Best ever')
    expect(markup).toMatch(/text-positive[^>]*>↑ 4 kg in 12 weeks/)
    expect(markup).toContain('aria-pressed="true"')
  })

  it('invites a first session when there is no data', () => {
    expect(renderToStaticMarkup(<LiftHeroCard points={[]} today="2026-11-21" />)).toContain('Log this lift to see its estimated max')
  })
})

describe('RecentSessions', () => {
  it('lists each session’s sets', () => {
    const markup = renderToStaticMarkup(
      <RecentSessions sessions={[{ date: '2026-11-18', sets: [{ weight: 80, reps: 8 }, { weight: 80, reps: 7 }] }]} />,
    )
    expect(markup).toContain('80×8 · 80×7')
  })
})
