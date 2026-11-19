import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { WeeklyBodyMapCard } from './WeeklyBodyMapCard'

describe('WeeklyBodyMapCard', () => {
  it('renders a self-contained neutral body for an empty week', () => {
    const markup = renderToStaticMarkup(<WeeklyBodyMapCard volumeLandmarks={[]} />)

    expect(markup).toContain('<polygon')
    expect(markup).not.toContain('<use')
    expect(markup).toContain('No working sets logged this week yet.')
  })
})
