import { describe, it, expect } from 'vitest'
import { NAV_TABS, getActiveTab, getAccessory } from './nav-config'

describe('NAV_TABS', () => {
  it('lists Home, Train, Progress and Coach in order', () => {
    expect(NAV_TABS.map(tab => [tab.label, tab.href])).toEqual([
      ['Home', '/dashboard'],
      ['Train', '/routines'],
      ['Progress', '/progress'],
      ['Coach', '/coach'],
    ])
  })
})

describe('getActiveTab', () => {
  it.each([
    ['/dashboard', 'home'],
    ['/account/import', 'home'],
    ['/routines/abc/edit', 'train'],
    ['/history', 'progress'],
    ['/exercises/12', 'progress'],
    ['/workout/9f3c', 'progress'],
    ['/coach/xyz', 'coach'],
  ] as const)('maps %s to %s', (pathname, expected) => {
    expect(getActiveTab(pathname)).toBe(expected)
  })

  it.each(['/workout', '/progressive', '/unknown'])('has no active tab on %s', pathname => {
    expect(getActiveTab(pathname)).toBeNull()
  })
})

describe('getAccessory', () => {
  it('offers to start a workout when none is active', () => {
    expect(getAccessory(false)).toEqual({ label: 'Start workout', href: '/routines' })
  })

  it('leaves resuming to the workout bar while a workout is running', () => {
    expect(getAccessory(true)).toBeNull()
  })
})
