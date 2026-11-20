import { describe, it, expect } from 'vitest'
import { expandedAt, nextCollapsed, type CollapseState } from './scroll-collapse'

describe('expandedAt', () => {
  it('starts expanded at the current position, whatever the bar was before', () => {
    expect(expandedAt(0)).toEqual({ collapsed: false, anchorY: 0 })
    expect(expandedAt(420)).toEqual({ collapsed: false, anchorY: 420 })
  })
})

const expanded = (anchorY: number): CollapseState => ({ collapsed: false, anchorY })
const collapsed = (anchorY: number): CollapseState => ({ collapsed: true, anchorY })

describe('nextCollapsed', () => {
  it('stays expanded near the top of the page', () => {
    expect(nextCollapsed(expanded(0), 50).collapsed).toBe(false)
  })

  it('ignores a small downward scroll', () => {
    expect(nextCollapsed(expanded(100), 110).collapsed).toBe(false)
  })

  it('collapses after scrolling down past the threshold', () => {
    expect(nextCollapsed(expanded(100), 130).collapsed).toBe(true)
  })

  it('ignores a small upward scroll while collapsed', () => {
    expect(nextCollapsed(collapsed(300), 290).collapsed).toBe(true)
  })

  it('expands after scrolling up past the threshold', () => {
    expect(nextCollapsed(collapsed(300), 270).collapsed).toBe(false)
  })

  it('expands on an iOS rubber-band overscroll above the top', () => {
    expect(nextCollapsed(collapsed(300), -20).collapsed).toBe(false)
  })

  it('expands when returning near the top', () => {
    expect(nextCollapsed(collapsed(300), 60).collapsed).toBe(false)
  })

  it('collapses on a slow continuous downward scroll', () => {
    const states = [110, 120, 130].reduce<CollapseState[]>(
      (acc, y) => [...acc, nextCollapsed(acc[acc.length - 1], y)],
      [expanded(100)],
    )
    expect(states.map(state => state.collapsed)).toEqual([false, false, false, true])
  })
})
