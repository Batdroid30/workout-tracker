import { describe, it, expect } from 'vitest'
import { splitPage } from './history-page'

describe('splitPage', () => {
  it('returns hasMore when there is an extra row', () => {
    expect(splitPage([1, 2, 3], 2)).toEqual({ items: [1, 2], hasMore: true })
  })

  it('returns hasMore false on the last page', () => {
    expect(splitPage([1, 2], 2)).toEqual({ items: [1, 2], hasMore: false })
    expect(splitPage([], 2)).toEqual({ items: [], hasMore: false })
  })
})
