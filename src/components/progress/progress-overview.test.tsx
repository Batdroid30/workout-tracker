import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { YourLiftsCard } from './YourLiftsCard'
import { ProgressTiles } from './ProgressTiles'

const up = { current: 92.5, change: 5, direction: 'up' as const, points: [87.5, 90, 92.5] }

describe('YourLiftsCard', () => {
  it('shows each lift with its estimate, change and a link to its page', () => {
    const markup = renderToStaticMarkup(<YourLiftsCard rows={[{ exerciseId: 'e1', name: 'Bench Press', trend: up }]} source="picked" action={null} />)
    expect(markup).toContain('Bench Press')
    expect(markup).toContain('92.5')
    expect(markup).toMatch(/text-positive[^>]*>↑ 5 kg/)
    expect(markup).toContain('href="/exercises/e1"')
  })

  it('says when a lift has no recent sets', () => {
    const markup = renderToStaticMarkup(<YourLiftsCard rows={[{ exerciseId: 'e2', name: 'Deadlift', trend: null }]} source="picked" action={null} />)
    expect(markup).toContain('No sets in 12 weeks')
    expect(renderToStaticMarkup(<YourLiftsCard rows={[{ exerciseId: 'e1', name: 'Bench', trend: up }]} source="auto" action={null} />)).toContain('>Estimated max<')
  })

  it('guides a new lifter instead of showing an empty list', () => {
    const markup = renderToStaticMarkup(<YourLiftsCard rows={[]} source="auto" action={<button type="button">Pick lifts</button>} />)
    expect(markup).toContain('Log a few workouts and your main lifts appear here')
    expect(markup).toContain('Pick lifts')
  })

  it('never shows NaN or undefined', () => {
    const markup = renderToStaticMarkup(<YourLiftsCard rows={[{ exerciseId: 'e1', name: 'Bench', trend: up }, { exerciseId: 'e2', name: 'Row', trend: null }]} source="auto" action={null} />)
    expect(markup).not.toMatch(/NaN|undefined/)
  })
})

describe('ProgressTiles', () => {
  it('asks for more lifts when there are too few for an overall trend', () => {
    const markup = renderToStaticMarkup(<ProgressTiles strengthPctPerWeek={null} indexLiftCount={2} prsThisMonth={0} workoutsThisMonth={0} streakWeeks={0} bodyweight={null} />)
    expect(markup).toContain('Pick 3 or more lifts you train to see your overall trend')
    expect(markup).not.toMatch(/NaN|undefined/)
  })

  it('explains a missing trend when there are enough lifts but too few weeks', () => {
    const markup = renderToStaticMarkup(<ProgressTiles strengthPctPerWeek={null} indexLiftCount={5} prsThisMonth={5} workoutsThisMonth={4} streakWeeks={2} bodyweight={null} />)
    expect(markup).not.toContain('Pick 3 or more lifts')
    expect(markup).toContain('Your trend appears after a couple more weeks of training')
  })

  it('shows the weekly strength trend and the month at a glance', () => {
    const markup = renderToStaticMarkup(<ProgressTiles strengthPctPerWeek={1.2} indexLiftCount={4} prsThisMonth={3} workoutsThisMonth={14} streakWeeks={3} bodyweight={{ latest: 78.4, perWeek: 0.3 }} />)
    expect(markup).toContain('+1.2%')
    expect(markup).toContain('14')
    expect(markup).toContain('78.4 kg')
  })
})
