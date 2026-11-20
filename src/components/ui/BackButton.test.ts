import { describe, it, expect } from 'vitest'
import { canGoBack } from './BackButton'

describe('canGoBack', () => {
  it('goes back when the tab has earlier history', () => {
    expect(canGoBack(3)).toBe(true)
  })

  it('uses the fallback when the page was opened directly', () => {
    expect(canGoBack(1)).toBe(false)
  })
})
