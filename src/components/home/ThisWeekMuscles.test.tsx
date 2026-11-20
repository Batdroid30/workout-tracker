import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

vi.mock('@/components/progress/WeeklyBodyMapCard', () => ({ WeeklyBodyMapCard: () => <div data-body-map="" /> }))

import { ThisWeekMuscles } from './ThisWeekMuscles'

describe('ThisWeekMuscles', () => {
  it('shows this week\u2019s muscle map with a way into the detail', () => {
    const markup = renderToStaticMarkup(<ThisWeekMuscles volumeLandmarks={[]} />)
    expect(markup).toContain('This week\u2019s muscles')
    expect(markup).toContain('href="/progress/more"')
    expect(markup).toContain('data-body-map')
  })
})
