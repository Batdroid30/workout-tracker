import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { BottomNavBar } from './BottomNav'

const noop = () => {}

function countMatches(markup: string, needle: string): number {
  return markup.split(needle).length - 1
}

describe('BottomNavBar', () => {
  it('renders the four tabs with the active one marked', () => {
    const markup = renderToStaticMarkup(
      <BottomNavBar activeTab="progress" collapsed={false} accessory={null} onExpand={noop} />,
    )
    for (const href of ['/dashboard', '/routines', '/progress', '/coach']) {
      expect(markup).toContain(`href="${href}"`)
    }
    for (const label of ['Home', 'Train', 'Progress', 'Coach']) {
      expect(markup).toContain(label)
    }
    expect(countMatches(markup, 'aria-current="page"')).toBe(1)
    expect(markup).toMatch(/href="\/progress"[^>]*aria-current="page"|aria-current="page"[^>]*href="\/progress"/)
    expect(markup).toContain('aria-label="Main"')
    expect(markup).toContain('bg-accent-soft')
    expect(markup).not.toContain('Start workout')
  })

  it('shows the accessory and keeps the active tab when collapsed', () => {
    const markup = renderToStaticMarkup(
      <BottomNavBar
        activeTab="home"
        collapsed
        accessory={{ label: 'Resume workout', href: '/workout' }}
        onExpand={noop}
      />,
    )
    expect(markup).toContain('href="/workout"')
    expect(markup).toContain('Resume workout')
    expect(countMatches(markup, 'aria-current="page"')).toBe(1)
    expect(markup).toContain('bg-accent ')
  })

  it('marks no tab when the page belongs to none', () => {
    const markup = renderToStaticMarkup(
      <BottomNavBar activeTab={null} collapsed={false} accessory={null} onExpand={noop} />,
    )
    expect(markup).not.toContain('aria-current')
  })
})
