import { describe, it, expect } from 'vitest'
import { profileRedirectTarget } from './redirect-target'

describe('profileRedirectTarget', () => {
  it.each([
    [undefined, '/account'],
    ['history', '/history'],
    ['exercises', '/exercises'],
    ['account', '/account'],
    ['garbage', '/account'],
  ])('sends ?tab=%s to %s', (tab, expected) => {
    expect(profileRedirectTarget(tab)).toBe(expected)
  })
})
