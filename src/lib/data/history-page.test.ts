import { describe, it, expect } from 'vitest'
import { splitPage, nextCursor } from './history-page'

describe('splitPage', () => {
  it('returns hasMore when there is an extra row', () => {
    expect(splitPage([1, 2, 3], 2)).toEqual({ items: [1, 2], hasMore: true })
  })

  it('returns hasMore false on the last page', () => {
    expect(splitPage([1, 2], 2)).toEqual({ items: [1, 2], hasMore: false })
    expect(splitPage([], 2)).toEqual({ items: [], hasMore: false })
  })
})

describe('nextCursor', () => {
  it('points at the last row', () => {
    const rows = [
      { id: 'a', started_at: '2026-05-02T10:00:00Z' },
      { id: 'b', started_at: '2026-05-01T10:00:00Z' },
    ]
    expect(nextCursor(rows)).toEqual({ startedAt: '2026-05-01T10:00:00Z', id: 'b' })
  })

  it('is null for no rows', () => {
    expect(nextCursor([])).toBeNull()
  })
})
