import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { isValidElement, type ReactElement, type ReactNode } from 'react'
import { BottomNavBar, collapsedTabClick } from './BottomNav'

const noop = () => {}

function findElement(node: ReactNode, type: string): ReactElement<Record<string, unknown>> | null {
  if (!isValidElement<Record<string, unknown> & { children?: ReactNode }>(node)) {
    if (Array.isArray(node)) {
      for (const child of node) {
        const found = findElement(child, type)
        if (found) return found
      }
    }
    return null
  }
  if (node.type === type) return node
  return findElement(node.props.children, type)
}

describe('collapsedTabClick', () => {
  it('expands the bar instead of navigating', () => {
    let prevented = false
    let expanded = false
    collapsedTabClick(() => { expanded = true })({ preventDefault: () => { prevented = true } })
    expect(prevented).toBe(true)
    expect(expanded).toBe(true)
  })
})

describe('BottomNavBar focus', () => {
  it('expands a collapsed bar when keyboard focus enters it', () => {
    let expanded = false
    const tree = BottomNavBar({ activeTab: 'home', collapsed: true, accessory: null, onExpand: () => { expanded = true } })
    const nav = findElement(tree, 'nav')
    const onFocus = nav?.props.onFocus
    expect(typeof onFocus).toBe('function')
    if (typeof onFocus === 'function') onFocus()
    expect(expanded).toBe(true)
  })
})

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
