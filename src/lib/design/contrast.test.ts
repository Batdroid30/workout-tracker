import { describe, expect, it } from 'vitest'
import { contrastRatio, parseColor } from './contrast'

describe('contrastRatio', () => {
  it('gives 21:1 for white on black', () => {
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 1)
  })

  it('gives 1:1 for identical colours, accepting 3-digit hex', () => {
    expect(contrastRatio('#000', '#000')).toBeCloseTo(1, 5)
  })

  it('matches the known value for #777 on white', () => {
    expect(contrastRatio('#777777', '#ffffff')).toBeCloseTo(4.48, 2)
  })

  it('composites a translucent foreground over the background first', () => {
    expect(contrastRatio('rgba(255,255,255,0.5)', '#000000')).toBeCloseTo(5.3, 1)
  })
})

describe('parseColor', () => {
  it('parses rgb() and rgba()', () => {
    expect(parseColor('rgb(1, 2, 3)')).toEqual({ r: 1, g: 2, b: 3, a: 1 })
    expect(parseColor('rgba(1, 2, 3, 0.5)')).toEqual({ r: 1, g: 2, b: 3, a: 0.5 })
  })

  it('throws on unsupported formats', () => {
    expect(() => parseColor('red')).toThrow()
  })
})
