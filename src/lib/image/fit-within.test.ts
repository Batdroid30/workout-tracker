import { describe, it, expect } from 'vitest'
import { fitWithin } from './fit-within'

describe('fitWithin', () => {
  it('scales a landscape image so its width equals the limit', () => {
    expect(fitWithin(4032, 3024, 512)).toEqual({ width: 512, height: 384 })
  })

  it('scales a portrait image so its height equals the limit', () => {
    expect(fitWithin(3024, 4032, 512)).toEqual({ width: 384, height: 512 })
  })

  it('leaves an image that already fits unchanged', () => {
    expect(fitWithin(300, 200, 512)).toEqual({ width: 300, height: 200 })
  })

  it('never rounds a side down to zero', () => {
    expect(fitWithin(10000, 1, 512)).toEqual({ width: 512, height: 1 })
  })
})
