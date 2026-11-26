import { describe, it, expect } from 'vitest'
import { effectiveRpe, isLowReadiness } from './readiness'

describe('isLowReadiness', () => {
  it('no readiness log is not low', () => expect(isLowReadiness(null)).toBe(false))
  it('an average of 2 is low', () => expect(isLowReadiness(2)).toBe(true))
  it('an average of 2.5 is not low', () => expect(isLowReadiness(2.5)).toBe(false))
})

describe('effectiveRpe', () => {
  it('drops the target by 0.5 when readiness is low', () => {
    expect(effectiveRpe({ rpeTarget: 7.5, readinessAverage: 2 })).toBe(7)
  })
  it('keeps the target otherwise', () => {
    expect(effectiveRpe({ rpeTarget: 7.5, readinessAverage: null })).toBe(7.5)
  })
})
